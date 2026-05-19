import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Movie } from '../database/entities/movie.entity';
import { Cinema } from '../database/entities/cinema.entity';
import { QueryMoviesDto } from './dto/query-movies.dto';
import { CreateMovieDto } from './dto/create-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie) private moviesRepo: Repository<Movie>,
    @InjectRepository(Cinema) private cinemasRepo: Repository<Cinema>,
    private config: ConfigService,
  ) {}

  resolvePosterUrl(posterUrl: string | null): string | null {
    if (!posterUrl) return null;
    if (posterUrl.startsWith('http')) return posterUrl;
    const base = this.config.get('API_URL', 'http://localhost:3000');
    return `${base}${posterUrl.startsWith('/') ? '' : '/'}${posterUrl}`;
  }

  toMovieDto(movie: Movie, includeSlots = false, slots?: unknown[]) {
    return {
      id: movie.slug,
      uuid: movie.id,
      title: movie.title,
      poster: this.resolvePosterUrl(movie.posterUrl),
      genre: movie.genre,
      language: movie.language,
      duration: movie.duration,
      rating: Number(movie.rating),
      ageRating: movie.ageRating,
      releaseDate: movie.releaseDate,
      description: movie.description,
      cast: movie.cast,
      director: movie.director,
      status: movie.status,
      ...(includeSlots ? { slots: slots ?? [] } : {}),
    };
  }

  async findAll(query: QueryMoviesDto) {
    const qb = this.moviesRepo.createQueryBuilder('movie');

    if (query.status) {
      qb.andWhere('movie.status = :status', { status: query.status });
    }
    if (query.genre) {
      qb.andWhere('movie.genre LIKE :genre', { genre: `%${query.genre}%` });
    }
    if (query.language) {
      qb.andWhere('movie.language = :language', { language: query.language });
    }
    if (query.q) {
      qb.andWhere('LOWER(movie.title) LIKE LOWER(:q)', { q: `%${query.q}%` });
    }

    qb.orderBy('movie.createdAt', 'DESC');
    const movies = await qb.getMany();
    return movies.map((m) => this.toMovieDto(m));
  }

  async findBySlug(slug: string) {
    const movie = await this.moviesRepo.findOne({ where: { slug } });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  async findOnePublic(slug: string) {
    const movie = await this.findBySlug(slug);
    return this.toMovieDto(movie);
  }

  async getFilters() {
    const movies = await this.moviesRepo.find();
    const cinemas = await this.cinemasRepo.find({ order: { name: 'ASC' } });
    const genres = Array.from(new Set(movies.flatMap((m) => m.genre))).sort();
    const languages = Array.from(new Set(movies.map((m) => m.language))).sort();
    return {
      genres,
      languages,
      cinemas: cinemas.map((c) => c.name),
    };
  }

  private rethrowUniqueSlug(error: unknown, slug: string): never {
    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { code?: string }).code === '23505'
    ) {
      throw new ConflictException(`Movie slug "${slug}" already exists`);
    }
    throw error;
  }

  async create(dto: CreateMovieDto) {
    const movie = this.moviesRepo.create({
      ...dto,
      rating: dto.rating,
    });
    try {
      await this.moviesRepo.save(movie);
    } catch (error) {
      this.rethrowUniqueSlug(error, dto.slug);
    }
    return this.toMovieDto(movie);
  }

  async update(slug: string, dto: Partial<CreateMovieDto>) {
    const movie = await this.findBySlug(slug);
    Object.assign(movie, dto);
    try {
      await this.moviesRepo.save(movie);
    } catch (error) {
      this.rethrowUniqueSlug(error, dto.slug ?? slug);
    }
    return this.toMovieDto(movie);
  }

  async updatePoster(slug: string, posterPath: string) {
    const movie = await this.findBySlug(slug);
    movie.posterUrl = posterPath;
    await this.moviesRepo.save(movie);
    return this.toMovieDto(movie);
  }

  async remove(slug: string) {
    const movie = await this.findBySlug(slug);
    await this.moviesRepo.remove(movie);
    return { deleted: true };
  }

  async findAllAdmin() {
    const movies = await this.moviesRepo.find({ order: { title: 'ASC' } });
    return movies.map((m) => this.toMovieDto(m));
  }
}
