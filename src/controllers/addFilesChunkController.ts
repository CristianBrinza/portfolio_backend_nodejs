// controllers/addFilesChunkController.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ChunkUpload from '../models/ChunkUpload';
import ChangeLog from '../models/ChangeLog';
import { isKnownCode } from './addFilesController';
import { isSafeFileName } from '../utils/safePath';

const MAX_CHUNKS = 100000;

const isValidUpload = (code: unknown, fileName: unknown, totalChunks: unknown) => {
    const chunks = Number(totalChunks);
    return isKnownCode(code) && isSafeFileName(fileName) && Number.isInteger(chunks) && chunks > 0 && chunks <= MAX_CHUNKS;
};

// POST /add-files/upload-chunk
export const uploadChunkAddFiles = async (req: Request, res: Response) => {
    try {
        const { chunkIndex, totalChunks, fileName, uploadId, path: code } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No chunk file provided' });
        }
        if (typeof uploadId !== 'string' || !uploadId || !fileName || !totalChunks || !code) {
            fs.rmSync(file.path, { force: true });
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Multipart fields arrive with the chunk, so a rejected chunk is removed here.
        if (!isValidUpload(code, fileName, totalChunks)) {
            fs.rmSync(file.path, { force: true });
            return res.status(403).json({ message: 'Invalid upload' });
        }

        // Optionally track in DB
        const chunkUpload = await ChunkUpload.findOneAndUpdate(
            { uploadId },
            {
                $setOnInsert: {
                    uploadId,
                    fileName,
                    totalChunks,
                    path: code,

                },
                $inc: { receivedChunks: 1 },
            },
            { new: true, upsert: true }
        );



        return res.status(200).json({ message: 'Chunk uploaded', chunkIndex });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// POST /add-files/complete-upload
export const completeUploadAddFiles = async (req: Request, res: Response) => {
    try {
        const { uploadId } = req.body;
        if (typeof uploadId !== 'string' || !uploadId) {
            return res.status(400).json({ message: 'Missing uploadId' });
        }

        // Find the record
        const chunkUpload = await ChunkUpload.findOne({ uploadId });
        if (!chunkUpload) {
            return res.status(404).json({ message: 'No chunk upload data found' });
        }

        const { fileName, totalChunks, path: code } = chunkUpload;
        if (!isValidUpload(code, fileName, totalChunks)) {
            await ChunkUpload.deleteOne({ uploadId });
            return res.status(403).json({ message: 'Invalid upload' });
        }

        const chunkDir = path.join(__dirname, '../temp_chunks');
        for (let i = 0; i < totalChunks; i++) {
            if (!fs.existsSync(path.join(chunkDir, `${fileName}-chunk-${i}`))) {
                return res.status(400).json({ message: `Missing chunk at index ${i}` });
            }
        }

        const basePath = path.join(__dirname, '../get_files');
        const targetFolder = path.join(basePath, code);
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Create the final file
        const finalFilePath = path.join(targetFolder, fileName);
        const writeStream = fs.createWriteStream(finalFilePath);

        // Append each chunk in order
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(chunkDir, `${fileName}-chunk-${i}`);
            const data = fs.readFileSync(chunkPath);
            writeStream.write(data);
            fs.unlinkSync(chunkPath);
        }
        writeStream.end();

        // Clean up DB
        await ChunkUpload.deleteOne({ uploadId });


        return res.status(200).json({ message: 'File assembled successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};
