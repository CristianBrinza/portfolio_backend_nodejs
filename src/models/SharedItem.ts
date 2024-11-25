// models/SharedItem.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedItem extends Document {
    code: string;
    paths: string[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SharedItemSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    paths: [{ type: String, required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISharedItem>('SharedItem', SharedItemSchema);
