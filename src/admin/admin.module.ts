import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesModule } from '../movies/movies.module';
import { ShowtimesModule } from '../showtimes/showtimes.module';
import { BookingsModule } from '../bookings/bookings.module';
import { UploadModule } from '../upload/upload.module';
import { AdminController } from './admin.controller';
import { Cinema } from '../database/entities/cinema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cinema]),
    MoviesModule,
    ShowtimesModule,
    BookingsModule,
    UploadModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
