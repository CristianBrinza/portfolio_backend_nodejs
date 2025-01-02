// controllers/chunkUploadController.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ChunkUpload from '../models/ChunkUpload';
import ChangeLog from '../models/ChangeLog'; // if you want to log

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

        if (!uploadId || !fileName || !totalChunks) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Optionally, track in DB
        let chunkUpload = await ChunkUpload.findOne({ uploadId });
        if (!chunkUpload) {
            chunkUpload = new ChunkUpload({
                uploadId,
                fileName,
                totalChunks,
                receivedChunks: 0,
                path: destPath,
                createdBy: req.user._id,
            });
        }
        chunkUpload.receivedChunks += 1;
        await chunkUpload.save();

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
        if (!uploadId) {
            return res.status(400).json({ message: 'Missing uploadId' });
        }

        // Find the record
        const chunkUpload = await ChunkUpload.findOne({ uploadId });
        if (!chunkUpload) {
            return res.status(404).json({ message: 'No chunk upload data found' });
        }

        const { fileName, totalChunks, path: destPath } = chunkUpload;
        const basePath = path.join(__dirname, '../share');
        const targetFolder = destPath ? path.join(basePath, destPath) : basePath;
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Create the final file
        const finalFilePath = path.join(targetFolder, fileName);
        const writeStream = fs.createWriteStream(finalFilePath);

        // Append each chunk in order
        for (let i = 0; i < totalChunks; i++) {
            // The front end might name each chunk as the originalFileName
            // In practice, you'll store chunkIndex in filename or keep it in memory
            // For demonstration, let's assume it's "fileName-chunkIndex"
            const chunkPath = path.join(__dirname, '../temp_chunks', `${fileName}-chunk-${i}`);
            if (!fs.existsSync(chunkPath)) {
                // If a chunk is missing, handle error
                return res.status(400).json({ message: `Missing chunk at index ${i}` });
            }
            const data = fs.readFileSync(chunkPath);
            writeStream.write(data);
            // Remove the chunk after writing
            fs.unlinkSync(chunkPath);
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
