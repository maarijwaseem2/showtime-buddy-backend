import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { MovieStatus } from '../../common/enums';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsString({ each: true })
  genre: string[];

  @IsString()
  language: string;

  @IsString()
  duration: string;

  @IsNumber()
  @Min(0)
  rating: number;

  @IsString()
  ageRating: string;

  @IsDateString()
  releaseDate: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  cast: string[];

  @IsString()
  director: string;

  @IsEnum(MovieStatus)
  status: MovieStatus;

  @IsOptional()
  @IsString()
  posterUrl?: string;
}
