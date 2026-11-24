import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realestate_portal',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_12345',
  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret_change_in_production_12345',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: (process.env.NODE_ENV || 'development') === 'test',
  isProd: process.env.NODE_ENV === 'production',
};
