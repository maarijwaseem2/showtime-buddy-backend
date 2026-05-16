import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Screen } from './screen.entity';
import { Booking } from './booking.entity';

@Entity('showtimes')
@Unique(['movieId', 'screenId', 'showDate', 'startTime'])
export class Showtime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'movie_id' })
  movieId: string;

  @ManyToOne(() => Movie, (m) => m.showtimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'screen_id' })
  screenId: string;

  @ManyToOne(() => Screen, (s) => s.showtimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screen_id' })
  screen: Screen;

  @Column({ name: 'show_date', type: 'date' })
  showDate: string;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column({ name: 'price_standard', type: 'int' })
  priceStandard: number;

  @Column({ name: 'price_vip', type: 'int' })
  priceVip: number;

  @OneToMany(() => Booking, (b) => b.showtime)
  bookings: Booking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
