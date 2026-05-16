import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  User,
  Cinema,
  Screen,
  Movie,
  Showtime,
  Booking,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        entities: [User, Cinema, Screen, Movie, Showtime, Booking],
        synchronize: config.get('DATABASE_SYNC') === 'true',
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: config.get('DATABASE_RUN_MIGRATIONS') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
