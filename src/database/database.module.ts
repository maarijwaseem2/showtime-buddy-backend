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
import { postgresConfigFromConfigService } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = postgresConfigFromConfigService(config);
        console.log(
          `[Database] Connecting to ${db.host}:${db.port}/${db.database} (ssl=${Boolean(db.ssl)})`,
        );
        return {
          type: 'postgres' as const,
          ...db,
          entities: [User, Cinema, Screen, Movie, Showtime, Booking],
          synchronize: config.get('DATABASE_SYNC') === 'true',
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: config.get('DATABASE_RUN_MIGRATIONS') === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
