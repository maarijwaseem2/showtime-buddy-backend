import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MovieStatus } from '../../common/enums';
import { Showtime } from './showtime.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ name: 'poster_url', type: 'varchar', nullable: true })
  posterUrl: string | null;

  @Column('simple-array')
  genre: string[];

  @Column()
  language: string;

  @Column()
  duration: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'age_rating' })
  ageRating: string;

  @Column({ name: 'release_date', type: 'date' })
  releaseDate: string;

  @Column({ type: 'text' })
  description: string;

  @Column('simple-array')
  cast: string[];

  @Column()
  director: string;

  @Column({ type: 'enum', enum: MovieStatus, default: MovieStatus.NOW_SHOWING })
  status: MovieStatus;

  @OneToMany(() => Showtime, (s) => s.movie)
  showtimes: Showtime[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
