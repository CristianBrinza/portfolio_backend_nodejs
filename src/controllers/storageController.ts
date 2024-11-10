// controllers/storageController.ts

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { SharedItem } from '../models/SharedItem';
import { IUser } from '../models/User';

// Set up multer storage configuration
const storageDir = path.join(__dirname, '../storage');

// Ensure the storage directory exists
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderPath = req.body.folderPath || '';
        const dest = path.join(storageDir, folderPath);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

// Multer upload instance
export const upload = multer({ storage });

// List files and folders
export const listItems = (req: Request, res: Response) => {
    const folderPath = req.query.path as string || '';
    const fullPath = path.join(storageDir, folderPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.readdir(fullPath, { withFileTypes: true }, (err, items) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).json({ message: 'Error reading directory' });
        }

        const results = items.map((item) => {
            const itemPath = path.join(folderPath, item.name);
            const stats = fs.statSync(path.join(fullPath, item.name));
            return {
                name: item.name,
                path: itemPath,
                isFile: item.isFile(),
                isFolder: item.isDirectory(),
                size: stats.size,
                modifiedAt: stats.mtime,
                createdAt: stats.birthtime,
            };
        });

        res.json({ items: results });
    });
};

// Create a new folder
export const createFolder = (req: Request, res: Response) => {
    const { folderName, parentPath } = req.body;

    // Validate folder name
    if (!/^[^<>:"/\\|?*]+$/.test(folderName)) {
        return res.status(400).json({ message: 'Invalid folder name' });
    }

    const newFolderPath = path.join(storageDir, parentPath || '', folderName);

    // Prevent directory traversal
    if (!newFolderPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.mkdir(newFolderPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating folder:', err);
            return res.status(500).json({ message: 'Error creating folder' });
        }

        res.status(201).json({ message: 'Folder created successfully' });
    });
};

// Upload files
export const uploadFiles = (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    res.status(201).json({ message: 'Files uploaded successfully' });
};

// Rename a file or folder
export const renameItem = (req: Request, res: Response) => {
    const { oldPath, newName } = req.body;

    // Validate new name
    if (!/^[^<>:"/\\|?*]+$/.test(newName)) {
        return res.status(400).json({ message: 'Invalid name' });
    }

    const oldFullPath = path.join(storageDir, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    // Prevent directory traversal
    if (!oldFullPath.startsWith(storageDir) || !newFullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.rename(oldFullPath, newFullPath, (err) => {
        if (err) {
            console.error('Error renaming item:', err);
            return res.status(500).json({ message: 'Error renaming item' });
        }

        res.json({ message: 'Item renamed successfully' });
    });
};

// Delete a file or folder
export const deleteItem = (req: Request, res: Response) => {
    const { itemPath } = req.body;

    const fullPath = path.join(storageDir, itemPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.stat(fullPath, (err, stats) => {
        if (err) {
            console.error('Error accessing item:', err);
            return res.status(500).json({ message: 'Error accessing item' });
        }

        const deleteCallback = (err: NodeJS.ErrnoException | null) => {
            if (err) {
                console.error('Error deleting item:', err);
                return res.status(500).json({ message: 'Error deleting item' });
            }

            res.json({ message: 'Item deleted successfully' });
        };

        if (stats.isDirectory()) {
            fs.rmdir(fullPath, { recursive: true }, deleteCallback);
        } else {
            fs.unlink(fullPath, deleteCallback);
        }
    });
};

// Download a file
export const downloadFile = (req: Request, res: Response) => {
    const filePath = req.query.path as string;

    const fullPath = path.join(storageDir, filePath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    res.download(fullPath, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({ message: 'Error downloading file' });
        }
    });
};

// Share a file or folder
export const shareItem = async (req: Request, res: Response) => {
    const { itemPath } = req.body;
    const fullPath = path.join(storageDir, itemPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    // Check if item exists
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: 'Item not found' });
    }

    // Create a unique token for sharing
    const token = uuidv4();

    const sharedItem = new SharedItem({
        token,
        itemPath,
        sharedBy: (req.user as IUser)._id,
        createdAt: new Date(),
    });

    await sharedItem.save();

    res.json({ message: 'Item shared successfully', shareUrl: `/storage/shared/${token}` });
};

// Access shared item
export const accessSharedItem = async (req: Request, res: Response) => {
    const { token } = req.params;

    const sharedItem = await SharedItem.findOne({ token });

    if (!sharedItem) {
        return res.status(404).json({ message: 'Shared item not found or expired' });
    }

    const fullPath = path.join(storageDir, sharedItem.itemPath);

    // Check if item exists
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: 'Item not found' });
    }

    fs.stat(fullPath, (err, stats) => {
        if (err) {
            console.error('Error accessing item:', err);
            return res.status(500).json({ message: 'Error accessing item' });
        }

        if (stats.isDirectory()) {
            // List directory contents
            fs.readdir(fullPath, { withFileTypes: true }, (err, items) => {
                if (err) {
                    console.error('Error reading directory:', err);
                    return res.status(500).json({ message: 'Error reading directory' });
                }

                const results = items.map((item) => {
                    return {
                        name: item.name,
                        isFile: item.isFile(),
                        isFolder: item.isDirectory(),
                    };
                });

                res.json({ items: results });
            });
        } else {
            // Send file
            res.download(fullPath, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    res.status(500).json({ message: 'Error downloading file' });
                }
            });
        }
    });
};
