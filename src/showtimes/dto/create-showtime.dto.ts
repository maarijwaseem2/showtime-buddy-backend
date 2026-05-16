import { IsDateString, IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateShowtimeDto {
  @IsUUID()
  screenId: string;

  @IsDateString()
  showDate: string;

  @IsString()
  startTime: string;

  @IsInt()
  @Min(0)
  priceStandard: number;

  @IsInt()
  @Min(0)
  priceVip: number;
}
