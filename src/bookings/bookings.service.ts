import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from '../database/entities/booking.entity';
import { Showtime } from '../database/entities/showtime.entity';
import { User } from '../database/entities/user.entity';
import { BookingStatus, SlotStatus, UserRole, VIP_ROWS } from '../common/enums';
import {
  computeSlotStatus,
  getBookedSeatsFromBookings,
  getScreenCapacity,
  getScreenSeatIds,
} from '../common/showtime.util';
import { MoviesService } from '../movies/movies.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(Showtime) private showtimesRepo: Repository<Showtime>,
    private dataSource: DataSource,
    private moviesService: MoviesService,
  ) {}

  private generateBookingCode(): string {
    return `BK-${Date.now().toString(36).toUpperCase()}`;
  }

  private mapBooking(booking: Booking) {
    const showtime = booking.showtime;
    const movie = showtime?.movie;
    return {
      id: booking.bookingCode,
      uuid: booking.id,
      movieId: movie?.slug,
      movieTitle: movie?.title,
      poster: this.moviesService.resolvePosterUrl(movie?.posterUrl ?? null),
      cinema: showtime?.screen?.cinema?.name,
      screen: showtime?.screen?.name,
      date: showtime?.showDate,
      time: showtime?.startTime,
      seats: booking.seats,
      total: booking.total,
      status: booking.status,
      createdAt: booking.createdAt.getTime(),
    };
  }

  async create(user: User, dto: CreateBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const showtime = await manager
        .createQueryBuilder(Showtime, 'showtime')
        .leftJoinAndSelect('showtime.movie', 'movie')
        .leftJoinAndSelect('showtime.screen', 'screen')
        .leftJoinAndSelect('screen.cinema', 'cinema')
        .leftJoinAndSelect('showtime.bookings', 'bookings')
        .where('showtime.id = :id', { id: dto.showtimeId })
        .setLock('pessimistic_write')
        .getOne();

      if (!showtime) throw new NotFoundException('Showtime not found');

      const booked = getBookedSeatsFromBookings(showtime.bookings ?? []);
      const capacity = getScreenCapacity(showtime.screen);
      const allSeats = new Set(getScreenSeatIds(showtime.screen));

      for (const seat of dto.seats) {
        if (!allSeats.has(seat)) {
          throw new BadRequestException(`Invalid seat: ${seat}`);
        }
        if (booked.has(seat)) {
          throw new BadRequestException(`Seat ${seat} is already booked`);
        }
      }

      const newBookedCount = booked.size + dto.seats.length;
      if (computeSlotStatus(newBookedCount, capacity) === SlotStatus.FULL && newBookedCount > capacity) {
        throw new BadRequestException('Not enough seats available');
      }

      const vipRows = showtime.screen.vipRows?.length
        ? showtime.screen.vipRows
        : VIP_ROWS;
      const total = dto.seats.reduce((sum, seat) => {
        const isVip = vipRows.includes(seat[0]);
        return sum + (isVip ? showtime.priceVip : showtime.priceStandard);
      }, 0);

      const booking = manager.create(Booking, {
        bookingCode: this.generateBookingCode(),
        userId: user.id,
        showtimeId: showtime.id,
        seats: dto.seats,
        total,
        status: BookingStatus.CONFIRMED,
      });
      await manager.save(booking);

      const full = await manager.findOne(Booking, {
        where: { id: booking.id },
        relations: ['showtime', 'showtime.movie', 'showtime.screen', 'showtime.screen.cinema'],
      });

      return this.mapBooking(full!);
    });
  }

  async findMine(user: User) {
    const bookings = await this.bookingsRepo.find({
      where: { userId: user.id },
      relations: ['showtime', 'showtime.movie', 'showtime.screen', 'showtime.screen.cinema'],
      order: { createdAt: 'DESC' },
    });
    return bookings.map((b) => this.mapBooking(b));
  }

  async findOne(user: User, code: string) {
    const booking = await this.bookingsRepo.findOne({
      where: { bookingCode: code },
      relations: ['showtime', 'showtime.movie', 'showtime.screen', 'showtime.screen.cinema'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    return this.mapBooking(booking);
  }

  async cancel(user: User, code: string) {
    const booking = await this.bookingsRepo.findOne({
      where: { bookingCode: code },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Already cancelled');
    }
    booking.status = BookingStatus.CANCELLED;
    await this.bookingsRepo.save(booking);
    return this.findOne(user, code);
  }

  async findAllAdmin() {
    const bookings = await this.bookingsRepo.find({
      relations: ['showtime', 'showtime.movie', 'showtime.screen', 'showtime.screen.cinema', 'user'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return bookings.map((b) => ({
      ...this.mapBooking(b),
      userEmail: b.user?.email,
      userName: b.user?.fullName,
    }));
  }

  async getStats() {
    const bookings = await this.bookingsRepo.find({
      where: { status: BookingStatus.CONFIRMED },
      relations: ['showtime', 'showtime.movie'],
    });
    const revenue = bookings.reduce((s, b) => s + b.total, 0);
    const totalSeats = bookings.reduce((s, b) => s + b.seats.length, 0);
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const title = b.showtime?.movie?.title ?? 'Unknown';
      counts[title] = (counts[title] || 0) + b.seats.length;
    });
    const topMovies = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, seats]) => ({ title, seats }));

    return {
      totalBookings: bookings.length,
      seatsSold: totalSeats,
      revenue,
      topMovies,
    };
  }
}
