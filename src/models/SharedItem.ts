// models/SharedItem.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedItem extends Document {
    token: string;
    itemPath: string;
    sharedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SharedItemSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true },
    itemPath: { type: String, required: true },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true },
});

export const SharedItem = mongoose.model<ISharedItem>('SharedItem', SharedItemSchema);
