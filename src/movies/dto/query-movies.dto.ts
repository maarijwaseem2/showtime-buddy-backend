import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MovieStatus } from '../../common/enums';

export class QueryMoviesDto {
  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
