import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import SharedItem from '../models/SharedItem';
import ChangeLog from '../models/ChangeLog';

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

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No items provided for sharing' });
        }

        const basePath = path.join(__dirname, '../share');

        // Validate items are strings and not null/undefined
        const validItems = items.filter((item: any) => typeof item === 'string' && item.trim() !== '');

        if (validItems.length !== items.length) {
            return res.status(400).json({ message: 'Invalid items in the list' });
        }

        // Validate items exist
        const invalidItems = validItems.filter((itemPath: string) => {
            const fullPath = path.join(basePath, itemPath);
            return !fs.existsSync(fullPath);
        });

        if (invalidItems.length > 0) {
            return res.status(404).json({ message: 'Some items do not exist', invalidItems });
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
            paths: validItems,
            createdBy: req.user._id,
        });

        await sharedItem.save();

        // Log the sharing action
        const log = new ChangeLog({
            user: req.user._id,
            action: 'share',
            itemPath: validItems.join(', '),
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
