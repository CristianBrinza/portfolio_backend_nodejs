// middleware/chunkMiddleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createHash, randomUUID } from 'crypto';

// A dedicated directory for chunks
const CHUNK_DIR = path.join(__dirname, '../temp_chunks');
if (!fs.existsSync(CHUNK_DIR)) {
    fs.mkdirSync(CHUNK_DIR, { recursive: true });
}

// This storage simply places each chunk in /temp_chunks
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CHUNK_DIR);
    },
    // A random name, so an unchecked request can never touch another upload's chunks.
    filename: (req, file, cb) => {
        cb(null, `incoming-${randomUUID()}`);
    },
});

// Moves a checked chunk to the name its upload will look for.
export const chunkPath = (uploadId: string, index: number) =>
    path.join(CHUNK_DIR, `${createHash('sha256').update(uploadId).digest('hex')}-chunk-${index}`);

export const isValidChunk = (uploadId: unknown, chunkIndex: unknown, totalChunks: unknown) => {
    const index = Number(chunkIndex);
    return (
        typeof uploadId === 'string' &&
        uploadId.length > 0 &&
        uploadId.length <= 1000 &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < Number(totalChunks)
    );
};

export const chunkUploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 64 * 1024 * 1024, // The site sends 5 MB chunks
    },
});
