import mongoose, { Schema, Document } from 'mongoose';

export interface IFavoriteItem extends Document {
    userId: mongoose.Types.ObjectId;
    path: string;
}

const FavoriteItemSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    path: { type: String, required: true },
});

FavoriteItemSchema.index({ userId: 1, path: 1 }, { unique: true });

export default mongoose.model<IFavoriteItem>('FavoriteItem', FavoriteItemSchema);
