import { DataSource } from 'typeorm';
import 'dotenv/config';

export default new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH || './data/signage.db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
