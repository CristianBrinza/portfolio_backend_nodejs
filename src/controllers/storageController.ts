// controllers/storageController.ts

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { promisify } from 'util';
import { LRUCache } from 'lru-cache';

const pipeline = promisify(require('stream').pipeline);

// Set up multer storage configuration
const storageDir = path.join(__dirname, '../storage');

// Ensure the storage directory exists
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const ensureDirectory = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Access folderPath from req.query
        const folderPath = sanitizePath(req.query.folderPath as string || '');
        const dest = path.join(storageDir, folderPath);
        ensureDirectory(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});


// Multer upload instance with limits
export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // Limit file size to 100MB
        files: 100, // Limit number of files
    },
});

// Implement caching strategies using LRU cache
const cache = new LRUCache<string, Buffer>({
    maxSize: 500 * 1024 * 1024, // Max cache size in bytes (500MB)
    sizeCalculation: (value, key) => value.length,
    ttl: 1000 * 60 * 5, // Time-to-live in milliseconds
});

// Helper function for sanitizing paths
const sanitizePath = (inputPath: string): string => {
    return inputPath.replace(/(\.\.(\/|\\))/g, '').replace(/^\/+/, '');
};

// List files and folders with search, filter, sort, and pagination
export const listItems = (req: Request, res: Response) => {
    const folderPath = sanitizePath((req.query.path as string) || '');
    const searchQuery = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'name';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

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

        let results = items.map((item) => {
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
                mimeType: item.isFile() ? mime.lookup(item.name) || 'application/octet-stream' : null,
            };
        });

        // Filter by search query
        if (searchQuery) {
            results = results.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort results
        results.sort((a, b) => {
            const compareA = a[sortBy as keyof typeof a];
            const compareB = b[sortBy as keyof typeof b];

            if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
            if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const totalItems = results.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);

        res.json({
            items: paginatedResults,
            page,
            pageSize,
            totalItems,
            totalPages,
        });
    });
};

// Create a new folder
export const createFolder = (req: Request, res: Response) => {
    const { folderName, parentPath } = req.body;

    // Validate folder name
    if (!/^[^<>:"/\\|?*]+$/.test(folderName)) {
        return res.status(400).json({ message: 'Invalid folder name' });
    }

    const sanitizedParentPath = sanitizePath(parentPath || '');
    const newFolderPath = path.join(storageDir, sanitizedParentPath, folderName);

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

// Upload files with versioning
export const uploadFiles = async (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
        for (const file of req.files as Express.Multer.File[]) {
            const folderPath = sanitizePath(req.body.folderPath || '');
            const filePath = path.join(storageDir, folderPath, file.originalname);

            if (fs.existsSync(filePath)) {
                // File exists, move it to versions
                const versionsDir = path.join(storageDir, '.versions', folderPath);
                fs.mkdirSync(versionsDir, { recursive: true });
                const timestamp = new Date()
                    .toISOString()
                    .replace(/[:.]/g, '-')
                    .replace('T', '_')
                    .split('Z')[0];
                const versionedFileName = `${file.originalname}.${timestamp}`;
                fs.renameSync(filePath, path.join(versionsDir, versionedFileName));
            }
            // The new file is already saved by multer
        }

        res.status(201).json({ message: 'Files uploaded successfully' });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ message: 'Error uploading files' });
    }
};

// Rename a file or folder
export const renameItem = (req: Request, res: Response) => {
    const { oldPath, newName } = req.body;

    // Validate new name
    if (!/^[^<>:"/\\|?*]+$/.test(newName)) {
        return res.status(400).json({ message: 'Invalid name' });
    }

    const sanitizedOldPath = sanitizePath(oldPath);
    const oldFullPath = path.join(storageDir, sanitizedOldPath);
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

// Move a file or folder
export const moveItem = (req: Request, res: Response) => {
    const { sourcePath, destinationPath } = req.body;

    const sanitizedSourcePath = sanitizePath(sourcePath);
    const sanitizedDestinationPath = sanitizePath(destinationPath);

    const fullSourcePath = path.join(storageDir, sanitizedSourcePath);
    const fullDestinationPath = path.join(storageDir, sanitizedDestinationPath);

    // Prevent directory traversal
    if (
        !fullSourcePath.startsWith(storageDir) ||
        !fullDestinationPath.startsWith(storageDir)
    ) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.rename(fullSourcePath, fullDestinationPath, (err) => {
        if (err) {
            console.error('Error moving item:', err);
            return res.status(500).json({ message: 'Error moving item' });
        }

        res.json({ message: 'Item moved successfully' });
    });
};

// Delete a file or folder (move to trash)
export const deleteItem = (req: Request, res: Response) => {
    const { itemPath } = req.body;

    const sanitizedItemPath = sanitizePath(itemPath);
    const fullPath = path.join(storageDir, sanitizedItemPath);
    const trashPath = path.join(storageDir, '.trash', sanitizedItemPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    // Ensure .trash directory exists
    fs.mkdirSync(path.dirname(trashPath), { recursive: true });

    // Move item to trash
    fs.rename(fullPath, trashPath, (err) => {
        if (err) {
            console.error('Error moving item to trash:', err);
            return res.status(500).json({ message: 'Error deleting item' });
        }

        res.json({ message: 'Item moved to trash successfully' });
    });
};

// List items in trash
export const listTrashItems = (req: Request, res: Response) => {
    const trashDir = path.join(storageDir, '.trash');
    const searchQuery = (req.query.search as string) || '';

    fs.readdir(trashDir, { withFileTypes: true }, (err, items) => {
        if (err) {
            console.error('Error reading trash directory:', err);
            return res.status(500).json({ message: 'Error reading trash directory' });
        }

        let results = items.map((item) => {
            const itemPath = path.join('.trash', item.name);
            const stats = fs.statSync(path.join(trashDir, item.name));
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

        // Filter by search query
        if (searchQuery) {
            results = results.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        res.json({ items: results });
    });
};

// Restore item from trash
export const restoreItem = (req: Request, res: Response) => {
    const { itemPath } = req.body;

    const sanitizedItemPath = sanitizePath(itemPath);
    const trashPath = path.join(storageDir, '.trash', sanitizedItemPath);
    const restorePath = path.join(storageDir, sanitizedItemPath);

    // Prevent directory traversal
    if (!trashPath.startsWith(path.join(storageDir, '.trash'))) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    // Ensure the destination directory exists
    fs.mkdirSync(path.dirname(restorePath), { recursive: true });

    // Move item from trash back to storage
    fs.rename(trashPath, restorePath, (err) => {
        if (err) {
            console.error('Error restoring item:', err);
            return res.status(500).json({ message: 'Error restoring item' });
        }

        res.json({ message: 'Item restored successfully' });
    });
};

// Permanently delete item from trash
export const deleteItemPermanently = (req: Request, res: Response) => {
    const { itemPath } = req.body;

    const sanitizedItemPath = sanitizePath(itemPath);
    const trashPath = path.join(storageDir, '.trash', sanitizedItemPath);

    // Prevent directory traversal
    if (!trashPath.startsWith(path.join(storageDir, '.trash'))) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    fs.stat(trashPath, (err, stats) => {
        if (err) {
            console.error('Error accessing item:', err);
            return res.status(500).json({ message: 'Error accessing item' });
        }

        const deleteCallback = (err: NodeJS.ErrnoException | null) => {
            if (err) {
                console.error('Error deleting item:', err);
                return res.status(500).json({ message: 'Error deleting item' });
            }

            res.json({ message: 'Item permanently deleted' });
        };

        if (stats.isDirectory()) {
            fs.rm(trashPath, { recursive: true, force: true }, deleteCallback);
        } else {
            fs.unlink(trashPath, deleteCallback);
        }
    });
};

// List versions of a file
export const listVersions = (req: Request, res: Response) => {
    const { itemPath } = req.query;
    const sanitizedItemPath = sanitizePath(itemPath as string);
    const versionsDir = path.join(storageDir, '.versions', path.dirname(sanitizedItemPath));

    fs.readdir(versionsDir, (err, files) => {
        if (err) {
            console.error('Error reading versions directory:', err);
            return res.status(500).json({ message: 'Error reading versions directory' });
        }

        const baseName = path.basename(sanitizedItemPath);
        const versions = files
            .filter((file) => file.startsWith(baseName))
            .map((file) => {
                return {
                    versionName: file,
                    path: path.join('.versions', path.dirname(sanitizedItemPath), file),
                };
            });

        res.json({ versions });
    });
};

// Download a file using streams and caching
export const downloadFile = async (req: Request, res: Response) => {
    const filePath = sanitizePath(req.query.path as string);

    const fullPath = path.join(storageDir, filePath);

    // Prevent directory traversal
    if (!fullPath.startsWith(storageDir)) {
        return res.status(400).json({ message: 'Invalid path' });
    }

    try {
        // Check if file is in cache
        if (cache.has(fullPath)) {
            console.log('Serving from cache');
            res.setHeader('Content-Type', mime.lookup(fullPath) || 'application/octet-stream');
            res.send(cache.get(fullPath));
        } else {
            const readStream = fs.createReadStream(fullPath);
            const data: Buffer[] = [];

            readStream.on('data', (chunk) => {
                data.push(chunk);
            });

            readStream.on('end', () => {
                const fileBuffer = Buffer.concat(data);
                cache.set(fullPath, fileBuffer);
                res.setHeader('Content-Type', mime.lookup(fullPath) || 'application/octet-stream');
                res.send(fileBuffer);
            });

            readStream.on('error', (err) => {
                console.error('Error downloading file:', err);
                res.status(500).json({ message: 'Error downloading file' });
            });
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
};

// Upload files using chunked uploads
export const uploadChunk = (req: Request, res: Response) => {
    const { fileName, chunkIndex, totalChunks } = req.body;

    const sanitizedFileName = sanitizePath(fileName);
    const tempDir = path.join(storageDir, '.temp', sanitizedFileName);

    // Ensure temp directory exists
    fs.mkdirSync(tempDir, { recursive: true });

    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);

    const writeStream = fs.createWriteStream(chunkPath);

    req.on('data', (chunk) => {
        writeStream.write(chunk);
    });

    req.on('end', () => {
        writeStream.end();

        if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
            // Last chunk received, assemble the file
            const filePath = path.join(storageDir, sanitizedFileName);
            const writeStream = fs.createWriteStream(filePath);
            let currentChunk = 0;

            const appendChunk = () => {
                const chunkPath = path.join(tempDir, `chunk_${currentChunk}`);
                const readStream = fs.createReadStream(chunkPath);

                readStream.on('end', () => {
                    currentChunk++;
                    if (currentChunk < totalChunks) {
                        appendChunk();
                    } else {
                        writeStream.end();
                        // Cleanup temp files
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        res.json({ message: 'File uploaded successfully' });
                    }
                });

                readStream.pipe(writeStream, { end: false });
            };

            appendChunk();
        } else {
            res.json({ message: 'Chunk uploaded successfully' });
        }
    });

    req.on('error', (err) => {
        console.error('Error uploading chunk:', err);
        res.status(500).json({ message: 'Error uploading chunk' });
    });
};


export const filePreview = async (req: Request, res: Response) => {
    try {
        const filePath = sanitizePath(req.query.path as string);
        const fullPath = path.join(storageDir, filePath);

        // Ensure the path is within the storage directory and the file exists
        if (!fullPath.startsWith(storageDir) || !fs.existsSync(fullPath)) {
            return res.status(404).json({ message: 'File not found or invalid path' });
        }

        const mimeType = mime.lookup(fullPath);

        // Serve image files
        if (mimeType && mimeType.startsWith('image/')) {
            res.setHeader('Content-Type', mimeType);
            return res.sendFile(fullPath);
        }

        // Serve text files with limited preview
        if (mimeType && mimeType.startsWith('text/')) {
            const data = await fs.promises.readFile(fullPath, 'utf-8');
            res.setHeader('Content-Type', 'text/plain');
            return res.send(data.substring(0, 1000));
        }

        // Unsupported preview type
        res.status(400).json({ message: 'Preview not available for this file type' });
    } catch (error) {
        console.error('Error generating file preview:', error);
        res.status(500).json({ message: 'Error generating file preview' });
    }
};

