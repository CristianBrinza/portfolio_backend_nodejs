// models/ChangeLog.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IChangeLog extends Document {
    user: mongoose.Types.ObjectId;
    action: string;
    itemPath: string;
    timestamp: Date;
}

const ChangeLogSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    itemPath: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IChangeLog>('ChangeLog', ChangeLogSchema);
