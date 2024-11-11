// models/FileActivity.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IFileActivity extends Document {
    userId: mongoose.Types.ObjectId;
    username: string;
    name?: string;
    surname?: string;
    action: 'created' | 'updated' | 'deleted' | 'renamed' | 'moved';
    filePath: string;
    timestamp: Date;
}

const FileActivitySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    name: { type: String },
    surname: { type: String },
    action: { type: String, enum: ['created', 'updated', 'deleted', 'renamed', 'moved'], required: true },
    filePath: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IFileActivity>('FileActivity', FileActivitySchema);
