import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.bookingsService.findMine(user);
  }

  @Get(':code')
  findOne(@CurrentUser() user: User, @Param('code') code: string) {
    return this.bookingsService.findOne(user, code);
  }

  @Patch(':code/cancel')
  cancel(@CurrentUser() user: User, @Param('code') code: string) {
    return this.bookingsService.cancel(user, code);
  }
}
