import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Showtime } from '../database/entities/showtime.entity';
import { Movie } from '../database/entities/movie.entity';
import { Booking } from '../database/entities/booking.entity';
import { MoviesService } from '../movies/movies.service';
import { MovieStatus, SlotStatus } from '../common/enums';
import {
  computeSlotStatus,
  getBookedSeatsFromBookings,
  getScreenCapacity,
  getScreenSeatIds,
} from '../common/showtime.util';
import { CreateShowtimeDto } from './dto/create-showtime.dto';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectRepository(Showtime) private showtimesRepo: Repository<Showtime>,
    @InjectRepository(Movie) private moviesRepo: Repository<Movie>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    private moviesService: MoviesService,
  ) {}

  private async loadShowtime(id: string) {
    const showtime = await this.showtimesRepo.findOne({
      where: { id },
      relations: ['movie', 'screen', 'screen.cinema', 'bookings'],
    });
    if (!showtime) throw new NotFoundException('Showtime not found');
    return showtime;
  }

  private mapSlot(showtime: Showtime, excludeFull = false) {
    const booked = getBookedSeatsFromBookings(showtime.bookings ?? []);
    const capacity = getScreenCapacity(showtime.screen);
    const status = computeSlotStatus(booked.size, capacity);

    if (excludeFull && status === SlotStatus.FULL) return null;

    return {
      id: showtime.id,
      time: showtime.startTime,
      status,
      cinema: showtime.screen.cinema.name,
      screen: showtime.screen.name,
      priceStandard: showtime.priceStandard,
      priceVip: showtime.priceVip,
      showDate: showtime.showDate,
      bookedSeats: Array.from(booked),
    };
  }

  async findByMovieAndDate(
    slug: string,
    date: string,
    options?: { hideFull?: boolean; includeUpcoming?: boolean },
  ) {
    const movie = await this.moviesService.findBySlug(slug);
    const hideFull = options?.hideFull ?? true;
    if (
      !options?.includeUpcoming &&
      movie.status === MovieStatus.UPCOMING
    ) {
      return [];
    }

    const showtimes = await this.showtimesRepo.find({
      where: { movieId: movie.id, showDate: date },
      relations: ['screen', 'screen.cinema', 'bookings'],
      order: { startTime: 'ASC' },
    });

    return showtimes
      .map((s) => this.mapSlot(s, hideFull))
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  async getSeatsAvailability(showtimeId: string) {
    const showtime = await this.loadShowtime(showtimeId);
    const booked = getBookedSeatsFromBookings(showtime.bookings);
    const allSeats = getScreenSeatIds(showtime.screen);
    const capacity = getScreenCapacity(showtime.screen);

    return {
      showtimeId: showtime.id,
      bookedSeats: Array.from(booked),
      availableSeats: allSeats.filter((s) => !booked.has(s)),
      status: computeSlotStatus(booked.size, capacity),
      vipRows: showtime.screen.vipRows,
      priceStandard: showtime.priceStandard,
      priceVip: showtime.priceVip,
      cinema: showtime.screen.cinema.name,
      screen: showtime.screen.name,
      time: showtime.startTime,
      showDate: showtime.showDate,
      movie: {
        id: showtime.movie.slug,
        title: showtime.movie.title,
        poster: this.moviesService.resolvePosterUrl(showtime.movie.posterUrl),
      },
    };
  }

  async getShowtimePublic(showtimeId: string) {
    const showtime = await this.loadShowtime(showtimeId);
    const slot = this.mapSlot(showtime, false);
    if (!slot) throw new BadRequestException('Showtime is sold out');
    return slot;
  }

  async createForMovie(slug: string, dto: CreateShowtimeDto) {
    const movie = await this.moviesService.findBySlug(slug);
    const showtime = this.showtimesRepo.create({
      movieId: movie.id,
      ...dto,
    });
    await this.showtimesRepo.save(showtime);
    return this.loadShowtime(showtime.id).then((s) => this.mapSlot(s, false));
  }

  async remove(id: string) {
    const showtime = await this.loadShowtime(id);
    await this.showtimesRepo.remove(showtime);
    return { deleted: true };
  }

  /** Generate showtimes for next N days from templates (used in seed) */
  async ensureShowtimesForMovie(
    movieId: string,
    templates: Omit<CreateShowtimeDto, 'showDate'>[],
    days = 7,
  ) {
    const start = new Date();
    for (let d = 0; d < days; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + d);
      const showDate = date.toISOString().slice(0, 10);

      for (const t of templates) {
        const exists = await this.showtimesRepo.findOne({
          where: {
            movieId,
            screenId: t.screenId,
            showDate,
            startTime: t.startTime,
          },
        });
        if (!exists) {
          await this.showtimesRepo.save(
            this.showtimesRepo.create({ movieId, showDate, ...t }),
          );
        }
      }
    }
  }
}
