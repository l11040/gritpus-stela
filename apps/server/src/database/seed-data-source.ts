import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 50003,
  username: process.env.DB_USERNAME || 'gritpus',
  password: process.env.DB_PASSWORD || 'gritpuspassword',
  database: process.env.DB_DATABASE || 'gritpus',
  migrations: ['src/database/seeds/*.ts'],
});
