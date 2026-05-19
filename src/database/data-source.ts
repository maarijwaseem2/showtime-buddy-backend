import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { postgresConfigFromEnv } from './database.config';

config();

const db = postgresConfigFromEnv();

export default new DataSource({
  type: 'postgres',
  ...db,
  entities: [join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
