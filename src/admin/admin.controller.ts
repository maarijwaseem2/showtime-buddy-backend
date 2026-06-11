import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { MoviesService } from '../movies/movies.service';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';
import { UpdateMovieDto } from '../movies/dto/update-movie.dto';
import { CreateShowtimeDto } from '../showtimes/dto/create-showtime.dto';
import { UploadService } from '../upload/upload.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from '../database/entities/cinema.entity';
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private moviesService: MoviesService,
    private showtimesService: ShowtimesService,
    private bookingsService: BookingsService,
    private uploadService: UploadService,
    @InjectRepository(Cinema) private cinemaRepo: Repository<Cinema>,
  ) {}

  @Get('cinemas')
  async cinemas() {
    const list = await this.cinemaRepo.find({
      relations: ['screens'],
      order: { name: 'ASC' },
    });
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      screens: (c.screens ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        label: `${c.name} · ${s.name}`,
      })),
    }));
  }

  @Get('stats')
  stats() {
    return this.bookingsService.getStats();
  }

  @Get('bookings')
  bookings() {
    return this.bookingsService.findAllAdmin();
  }

  @Get('movies')
  movies() {
    return this.moviesService.findAllAdmin();
  }

  @Post('movies')
  createMovie(@Body() dto: CreateMovieDto) {
    return this.moviesService.create(dto);
  }

  @Patch('movies/:slug')
  updateMovie(@Param('slug') slug: string, @Body() dto: UpdateMovieDto) {
    return this.moviesService.update(slug, dto);
  }

  @Delete('movies/:slug')
  deleteMovie(@Param('slug') slug: string) {
    return this.moviesService.remove(slug);
  }

  @Post('movies/:slug/poster')
  @UseInterceptors(
    FileInterceptor('poster', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPoster(
    @Param('slug') slug: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const path = await this.uploadService.savePoster(file);
    return this.moviesService.updatePoster(slug, path);
  }

  @Get('movies/:slug/showtimes')
  listShowtimes(
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    const showDate =
      date || new Date().toISOString().slice(0, 10);
    return this.showtimesService.findByMovieAndDate(slug, showDate, {
      hideFull: false,
      includeUpcoming: true,
    });
  }

  @Post('movies/:slug/showtimes')
  createShowtime(@Param('slug') slug: string, @Body() dto: CreateShowtimeDto) {
    return this.showtimesService.createForMovie(slug, dto);
  }

  @Delete('showtimes/:id')
  deleteShowtime(@Param('id') id: string) {
    return this.showtimesService.remove(id);
  }
}
