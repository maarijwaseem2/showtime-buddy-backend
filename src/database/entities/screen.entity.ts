import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SEAT_COLS, SEAT_ROWS, VIP_ROWS } from '../../common/enums';
import { Cinema } from './cinema.entity';
import { Showtime } from './showtime.entity';

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cinema_id' })
  cinemaId: string;

  @ManyToOne(() => Cinema, (c) => c.screens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;

  @Column()
  name: string;

  @Column('simple-array', { default: SEAT_ROWS.join(',') })
  rows: string[];

  @Column({ name: 'seat_cols', default: SEAT_COLS })
  seatCols: number;

  @Column('simple-array', { name: 'vip_rows', default: VIP_ROWS.join(',') })
  vipRows: string[];

  @OneToMany(() => Showtime, (s) => s.screen)
  showtimes: Showtime[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
