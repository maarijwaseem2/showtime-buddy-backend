import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { QueryMoviesDto } from './dto/query-movies.dto';

@Controller('movies')
export class MoviesController {
  constructor(private moviesService: MoviesService) {}

  @Get('filters/meta')
  getFilters() {
    return this.moviesService.getFilters();
  }

  @Get()
  findAll(@Query() query: QueryMoviesDto) {
    return this.moviesService.findAll(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.moviesService.findOnePublic(slug);
  }
}
