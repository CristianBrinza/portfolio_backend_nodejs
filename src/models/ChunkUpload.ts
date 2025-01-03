// models/ChunkUpload.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChunkUpload extends Document {
    uploadId: string;         // Unique identifier for the entire file upload
    fileName: string;         // Original file name
    totalChunks: number;      // Total number of chunks
    receivedChunks: number;   // Number of chunks received so far
    path: string;             // The target path (folder) on your server
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const ChunkUploadSchema = new Schema<IChunkUpload>({
    uploadId: { type: String, required: true },
    //uploadId: { type: String, required: true, unique: true },

    fileName: { type: String, required: true },
    totalChunks: { type: Number, required: true },
    receivedChunks: { type: Number, default: 0 },
    path: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IChunkUpload>('ChunkUpload', ChunkUploadSchema);
