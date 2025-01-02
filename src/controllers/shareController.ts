import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import SharedItem from '../models/SharedItem';
import ChangeLog from '../models/ChangeLog';
import archiver from 'archiver';


// Configure multer for multiple file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { path: uploadPathParam } = req.body;
        const basePath = path.join(__dirname, '../share');
        const uploadPath = uploadPathParam ? path.join(basePath, uploadPathParam) : basePath;
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

export const upload = multer({ storage });

// Upload multiple files and folders
export const uploadFiles = [
    upload.array('files', 20),
    async (req: Request, res: Response) => {
        if (!req.files) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const { path: uploadPathParam } = req.body;
        const basePath = path.join(__dirname, '../share');
        const uploadPath = uploadPathParam ? path.join(basePath, uploadPathParam) : basePath;

        // Log the upload action
        for (const file of req.files as Express.Multer.File[]) {
            const relativePath = path.relative(basePath, path.join(uploadPath, file.originalname));
            const log = new ChangeLog({
                user: req.user._id,
                action: 'upload',
                itemPath: relativePath,
            });
            await log.save();
        }

        res.status(201).json({ message: 'Files uploaded successfully' });
    },
];

// Create a new folder
export const createFolder = async (req: Request, res: Response) => {
    const { folderName, path: folderPathParam } = req.body;
    const basePath = path.join(__dirname, '../share');
    const folderPath = folderPathParam ? path.join(basePath, folderPathParam, folderName) : path.join(basePath, folderName);

    if (fs.existsSync(folderPath)) {
        return res.status(400).json({ message: 'Folder already exists' });
    }

    fs.mkdirSync(folderPath, { recursive: true });

    // Log the folder creation
    const log = new ChangeLog({
        user: req.user._id,
        action: 'createFolder',
        itemPath: path.relative(basePath, folderPath),
    });
    await log.save();

    res.status(201).json({ message: 'Folder created successfully' });
};

// Rename a file or folder
export const renameItem = async (req: Request, res: Response) => {
    const { oldPath, newName } = req.body;
    const basePath = path.join(__dirname, '../share');
    const oldFullPath = path.join(basePath, oldPath);
    const newFullPath = path.join(basePath, path.dirname(oldPath), newName);

    if (!fs.existsSync(oldFullPath)) {
        return res.status(404).json({ message: 'Item not found' });
    }

    fs.renameSync(oldFullPath, newFullPath);

    // Log the rename action
    const log = new ChangeLog({
        user: req.user._id,
        action: 'rename',
        itemPath: `${oldPath} -> ${path.relative(basePath, newFullPath)}`,
    });
    await log.save();

    res.json({ message: 'Item renamed successfully' });
};

// Delete a file or folder
export const deleteItem = async (req: Request, res: Response) => {
    const { itemPath } = req.body;

    if (!itemPath || typeof itemPath !== 'string') {
        return res.status(400).json({ message: 'Invalid item path' });
    }

    const basePath = path.join(__dirname, '../share');
    const fullPath = path.join(basePath, itemPath);

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: 'Item not found' });
    }

    fs.rmSync(fullPath, { recursive: true, force: true });

    // Log the delete action
    const log = new ChangeLog({
        user: req.user._id,
        action: 'delete',
        itemPath: itemPath,
    });
    await log.save();

    res.json({ message: 'Item deleted successfully' });
};

// Move a file or folder
export const moveItem = async (req: Request, res: Response) => {
    const { itemPath, destinationPath } = req.body;
    const basePath = path.join(__dirname, '../share');
    const fullItemPath = path.join(basePath, itemPath);
    const fullDestPath = path.join(basePath, destinationPath, path.basename(itemPath));

    if (!fs.existsSync(fullItemPath)) {
        return res.status(404).json({ message: 'Item not found' });
    }

    fs.renameSync(fullItemPath, fullDestPath);

    // Log the move action
    const log = new ChangeLog({
        user: req.user._id,
        action: 'move',
        itemPath: `${itemPath} -> ${path.relative(basePath, fullDestPath)}`,
    });
    await log.save();

    res.json({ message: 'Item moved successfully' });
};

// Create a share link for selected items
export const createShareLink = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        // Validate request body
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No items provided for sharing' });
        }

        const basePath = path.join(__dirname, '../share');

        // Validate items are strings and not null/undefined
        const validItems = items.filter((item: any) => typeof item === 'string' && item.trim() !== '');

        if (validItems.length !== items.length) {
            return res.status(400).json({ message: 'Invalid items in the list' });
        }

        // Filter out folders and validate that files exist
        // Filter out folders and validate that files exist
        const validFiles = validItems.filter((itemPath: string) => {
            const fullPath = path.join(basePath, itemPath);
            const stats = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;
            return stats && stats.isFile(); // Only include files
        });

        if (validFiles.length === 0) {
            return res.status(400).json({ message: 'No valid files to share' });
        }


        // Generate a unique code
        let code: string;
        let existing: SharedItem | null;
        do {
            code = uuidv4().replace(/-/g, '').slice(0, 30); // Generate a 30-character code
            existing = await SharedItem.findOne({ code });
        } while (existing);

        // Create shared item entry
        const sharedItem = new SharedItem({
            code,
            paths: validFiles,
            createdBy: req.user._id,
        });

        await sharedItem.save();

        // Log the sharing action
        const log = new ChangeLog({
            user: req.user._id,
            action: 'share',
            itemPath: validFiles.join(', '),
        });
        await log.save();

        res.status(201).json({ message: 'Share link created', link: `/share/${code}` });
    } catch (error) {
        console.error('Error in createShareLink:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// List all share links created by the user
export const listShareLinks = async (req: Request, res: Response) => {
    const sharedItems = await SharedItem.find({ createdBy: req.user._id });
    res.json(sharedItems);
};

// Delete a share link
export const deleteShareLink = async (req: Request, res: Response) => {
    const { code } = req.params;
    const sharedItem = await SharedItem.findOneAndDelete({ code, createdBy: req.user._id });

    if (!sharedItem) {
        return res.status(404).json({ message: 'Share link not found' });
    }

    // Log the deletion of the share link
    const log = new ChangeLog({
        user: req.user._id,
        action: 'deleteShareLink',
        itemPath: code,
    });
    await log.save();

    res.json({ message: 'Share link deleted' });
};

// Access shared items via link
export const accessSharedItems = async (req: Request, res: Response) => {
    const { code } = req.params;
    const sharedItem = await SharedItem.findOne({ code });

    if (!sharedItem) {
        return res.status(404).json({ message: 'Share link not found or expired' });
    }

    res.json({ items: sharedItem.paths });
};

// Get changelog
export const getChangeLog = async (req: Request, res: Response) => {
    const logs = await ChangeLog.find().populate('user', 'username');
    res.json(logs);
};

// List files and folders
export const listItems = async (req: Request, res: Response) => {
    try {
        const { path: requestedPath } = req.query;
        const basePath = path.join(__dirname, '../share');

        const targetPath = requestedPath ? path.join(basePath, requestedPath as string) : basePath;

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ message: 'Directory not found' });
        }

        const items = fs.readdirSync(targetPath, { withFileTypes: true }).map((item) => ({
            name: item.name,
            type: item.isDirectory() ? 'folder' : 'file',
            path: path.relative(basePath, path.join(targetPath, item.name)),
        }));

        res.json(items);
    } catch (error) {
        console.error('Error listing items:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Download a shared item (file)
export const downloadSharedItem = async (req: Request, res: Response) => {
    const { code } = req.params;
    const { path: filePath } = req.query;

    const sharedItem = await SharedItem.findOne({ code });

    if (!sharedItem) {
        return res.status(404).json({ message: 'Share link not found or expired' });
    }

    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ message: 'Invalid file path' });
    }

    if (!sharedItem.paths.includes(filePath)) {
        return res.status(403).json({ message: 'Access denied to this file' });
    }

    const basePath = path.join(__dirname, '../share');
    const fullPath = path.join(basePath, filePath);

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    res.download(fullPath, path.basename(fullPath), (err) => {
        if (err) {
            res.status(500).json({ message: 'Internal server error' });
        }
    });
};

// Download all shared items as a zip
export const downloadAllSharedItems = async (req: Request, res: Response) => {
    const { code } = req.params;

    const sharedItem = await SharedItem.findOne({ code });

    if (!sharedItem) {
        return res.status(404).json({ message: 'Share link not found or expired' });
    }

    const basePath = path.join(__dirname, '../share');

    // Create an instance of archiver
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set the response headers for downloading the zip file
    res.attachment('shared_files.zip');

    // Pipe archive data to the response
    archive.pipe(res);

    // Iterate over the shared item paths and add them to the archive
    for (const itemPath of sharedItem.paths) {
        const fullPath = path.join(basePath, itemPath);

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);

            if (stats.isFile()) {
                // Add a file to the archive
                archive.file(fullPath, { name: path.relative(basePath, fullPath) });
            } else if (stats.isDirectory()) {
                // Add a directory to the archive
                archive.directory(fullPath, path.relative(basePath, fullPath));
            }
        } else {
            console.warn(`Path not found: ${fullPath}`);
        }
    }

    // Listen for errors and respond appropriately
    archive.on('error', (err) => {
        console.error('Error during archiving:', err);
        res.status(500).send({ message: 'Error creating archive' });
    });

    // Finalize the archive
    archive.finalize().catch((err) => {
        console.error('Error finalizing archive:', err);
        res.status(500).send({ message: 'Error finalizing archive' });
    });
};


export const previewFile = async (req: Request, res: Response) => {
    try {
        // The captured file path from the URL
        const { filePath } = req.params;
        // Construct the absolute path to the file on your server
        const basePath = path.join(__dirname, '../share');
        const fullPath = path.join(basePath, filePath);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Optionally, set appropriate content-type if you want:
        // e.g., image/png, video/mp4, etc. For a quick approach:
        // res.sendFile does set headers automatically if Node can detect the file type
        // or if the OS path library can guess from extension.
        return res.sendFile(fullPath);
    } catch (error) {
        console.error('previewFile error:', error);
        return res.status(500).json({ message: 'Error fetching file' });
    }
};
