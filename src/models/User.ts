import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    role: 'admin' | 'user' | 'guest';
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'user', 'guest'],
        default: 'user',
    },
});

export default mongoose.model<IUser>('User', UserSchema);
