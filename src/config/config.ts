// config/config.ts

import dotenv from 'dotenv';
dotenv.config({ path: './../.env' });

dotenv.config();

console.log('PORT:', process.env.PORT);

export const PORT = process.env.PORT;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;

