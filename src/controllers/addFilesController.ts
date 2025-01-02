import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import archiver from 'archiver';

// Basic "in-memory" storage for codes. Replace with DB in production.
let codesMemory: { code: string; createdAt: Date }[] = [];

// (1) Generate code
export const generateCode = (req: Request, res: Response) => {
    const code = uuidv4().replace(/-/g, '').slice(0, 14); // short code
    codesMemory.push({ code, createdAt: new Date() });
    return res.status(200).json({ code });
};

// (2) Get all codes
export const getAllCodes = (req: Request, res: Response) => {
    return res.json(codesMemory);
};

// (3) Delete code + folder
export const deleteCode = (req: Request, res: Response) => {
    const { code } = req.params;
    codesMemory = codesMemory.filter((c) => c.code !== code);

    // Remove the folder
    const basePath = path.join(__dirname, '../get_files');
    const folderPath = path.join(basePath, code);
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
    return res.json({ message: `Code ${code} deleted` });
};

// (4) Setup Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { code } = req.params;
        const basePath = path.join(__dirname, '../get_files');
        const folderPath = path.join(basePath, code);
        fs.mkdirSync(folderPath, { recursive: true });
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage });

// (5) Upload multiple files
export const uploadFiles = [
    (req: Request, res: Response, next: Function) => {
        // 1) Verify code is known
        const { code } = req.params;
        const codeExists = codesMemory.some((entry) => entry.code === code);
        if (!codeExists) {
            return res.status(404).json({ message: 'Code not found' });
        }
        next();
    },
    upload.array('files', 20),
    (req: Request, res: Response) => {
        // 2) If code is valid, proceed with upload
        return res.status(201).json({ message: 'Files uploaded successfully' });
    },
];


// (6) List all files in a folder
export const listFiles = (req: Request, res: Response) => {
    const { code } = req.params;

    // 1) Verify code is known
    const codeExists = codesMemory.some((entry) => entry.code === code);
    if (!codeExists) {
        return res.status(404).json({ message: 'Code not found' });
    }

    const basePath = path.join(__dirname, '../get_files');
    const folderPath = path.join(basePath, code);

    if (!fs.existsSync(folderPath)) {
        // Folder doesn't exist => no files
        return res.json([]);
    }

    const fileNames = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter((item) => item.isFile())
        .map((item) => item.name);

    res.json(fileNames);
};

// (7) Download a single file
export const downloadFile = (req: Request, res: Response) => {
    const { code, fileName } = req.params;
    const basePath = path.join(__dirname, '../get_files');
    const filePath = path.join(basePath, code, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            return res.status(500).send('Error downloading file');
        }
    });
};

// (8) Download all files in a folder (ZIP)
export const downloadAllFiles = (req: Request, res: Response) => {
    const { code } = req.params;
    const basePath = path.join(__dirname, '../get_files');
    const folderPath = path.join(basePath, code);

    if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ message: 'Folder not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${code}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
        console.error('Error creating zip archive:', err);
        res.status(500).send('Error creating zip file');
    });

    archive.pipe(res);
    archive.directory(folderPath, false);
    archive.finalize();
};
