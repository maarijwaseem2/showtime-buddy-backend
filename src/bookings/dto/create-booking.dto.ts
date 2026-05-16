import { ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  showtimeId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seats: string[];
}
