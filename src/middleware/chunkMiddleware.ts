// middleware/chunkMiddleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    filename: (req, file, cb) => {
        // We can keep the original name or make a custom name
        // but we'll do it with the chunkIndex in the route
        cb(null, file.originalname);
    },
});

export const chunkUploadMiddleware = multer({
    storage,
    limits: {
        //fileSize: Infinity, // Let the chunk be large, but typically each chunk is ~5-10MB
        fileSize: 6 * 1024 * 1024 * 1024, // 6 GB
    },
});
