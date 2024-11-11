// models/SharedFile.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedFile extends Document {
    filePath: string;
    token: string;
    expiresAt: Date;
    createdBy: mongoose.Types.ObjectId;
}

const SharedFileSchema: Schema = new Schema({
    filePath: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

export default mongoose.model<ISharedFile>('SharedFile', SharedFileSchema);
