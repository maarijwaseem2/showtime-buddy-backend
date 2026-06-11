import { Controller, Get, Param, Query } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';

@Controller()
export class ShowtimesController {
  constructor(private showtimesService: ShowtimesService) {}

  @Get('movies/:slug/showtimes')
  findByMovie(
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      return [];
    }
    // Full slots are included so the UI can show "Sold out" instead of hiding them
    return this.showtimesService.findByMovieAndDate(slug, date, {
      hideFull: false,
    });
  }

  @Get('showtimes/:id')
  findOne(@Param('id') id: string) {
    return this.showtimesService.getShowtimePublic(id);
  }

  @Get('showtimes/:id/seats')
  getSeats(@Param('id') id: string) {
    return this.showtimesService.getSeatsAvailability(id);
  }
}
