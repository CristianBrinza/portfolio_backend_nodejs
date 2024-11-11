// models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    role: 'admin' | 'user' | 'guest';
    name?: string;
    surname?: string;
    image?: string;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'user', 'guest'],
        default: 'user',
    },
    name: { type: String },
    surname: { type: String },
    image: { type: String },
});

export default mongoose.model<IUser>('User', UserSchema);
