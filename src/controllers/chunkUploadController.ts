// controllers/chunkUploadController.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ChunkUpload from '../models/ChunkUpload';
import ChangeLog from '../models/ChangeLog'; // if you want to log
import { isSafeFileName, resolveInside } from '../utils/safePath';
import { chunkPath, isValidChunk } from '../middleware/chunkMiddleware';

// POST /share/upload-chunk
export const uploadChunk = async (req: Request, res: Response) => {
    try {
        /*
          The client will send:
          - chunk (the binary data) as "chunk"
          - chunkIndex, totalChunks, fileName, uploadId, path
        */
        const { chunkIndex, totalChunks, fileName, uploadId, path: destPath } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No chunk file provided' });
        }

        if (!fileName || !totalChunks || !isValidChunk(uploadId, chunkIndex, totalChunks)) {
            fs.rmSync(file.path, { force: true });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        fs.renameSync(file.path, chunkPath(uploadId, Number(chunkIndex)));

        // Optionally, track in DB
        const chunkUpload = await ChunkUpload.findOneAndUpdate(
            { uploadId },
            {
                $setOnInsert: {
                    uploadId,
                    fileName,
                    totalChunks,
                    path: destPath,
                    createdBy: req.user._id
                    // No "receivedChunks" here
                },
                $inc: { receivedChunks: 1 }, // This will create the field if it doesn’t exist yet
            },
            { new: true, upsert: true }
        );



        // (Optional) Log
        const log = new ChangeLog({
            user: req.user._id,
            action: 'uploadChunk',
            itemPath: `${destPath}/${fileName} [chunkIndex=${chunkIndex}]`,
        });
        await log.save();

        // Return success
        return res.status(200).json({ message: 'Chunk uploaded', chunkIndex });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// POST /share/complete-upload
export const completeUpload = async (req: Request, res: Response) => {
    try {
        /*
          The client will send:
          - uploadId
          - fileName
          - path
          We'll read all chunk files from /temp_chunks & assemble them into "share" folder
        */
        const { uploadId } = req.body;
        if (typeof uploadId !== 'string' || !uploadId) {
            return res.status(400).json({ message: 'Missing uploadId' });
        }

        // Find the record
        const chunkUpload = await ChunkUpload.findOne({ uploadId });
        if (!chunkUpload) {
            return res.status(404).json({ message: 'No chunk upload data found' });
        }

        const { fileName, totalChunks, path: destPath } = chunkUpload;
        const basePath = path.join(__dirname, '../share');
        const targetFolder = destPath ? resolveInside(basePath, destPath) : basePath;
        if (!targetFolder || !isSafeFileName(fileName)) {
            await ChunkUpload.deleteOne({ uploadId });
            return res.status(400).json({ message: 'Invalid path' });
        }
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Create the final file
        const finalFilePath = path.join(targetFolder, fileName);
        const writeStream = fs.createWriteStream(finalFilePath);

        // Append each chunk in order
        for (let i = 0; i < totalChunks; i++) {
            const chunkFile = chunkPath(uploadId, i);
            if (!fs.existsSync(chunkFile)) {
                // If a chunk is missing, handle error
                return res.status(400).json({ message: `Missing chunk at index ${i}` });
            }
            const data = fs.readFileSync(chunkFile);
            writeStream.write(data);
            // Remove the chunk after writing
            fs.unlinkSync(chunkFile);
        }
        writeStream.end();

        // Clean up DB
        await ChunkUpload.deleteOne({ uploadId });

        // (Optional) Log final file creation
        const log = new ChangeLog({
            user: req.user._id,
            action: 'completeUpload',
            itemPath: path.relative(basePath, finalFilePath),
        });
        await log.save();

        return res.status(200).json({ message: 'File assembled successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};
