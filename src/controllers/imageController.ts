// controllers/imageController.ts

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../images'));
    },
    filename: (req, file, cb) => {
        // Use original file name
        cb(null, file.originalname);
    },
});

// File filter to allow only image files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (/\.(jpg|jpeg|png|gif)$/i.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

export const upload = multer({ storage, fileFilter });

// Upload a new image
export const uploadImage = (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }
    res.status(201).json({ message: 'Image uploaded successfully', filename: req.file.filename });
};

// Update (rename) an existing image
export const updateImageName = (req: Request, res: Response) => {
    const { oldName, newName } = req.body;

    // Updated regex to include parentheses
    const validFilenameRegex = /^[a-zA-Z0-9_\-\.\(\)]+\.(jpg|jpeg|png|gif)$/i;

    // Validate file names to prevent directory traversal attacks
    if (!validFilenameRegex.test(oldName) || !validFilenameRegex.test(newName)) {
        return res.status(400).json({ message: 'Invalid file names' });
    }

    const oldPath = path.join(__dirname, '../images', oldName);
    const newPath = path.join(__dirname, '../images', newName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error('Error renaming image:', err);
            return res.status(500).json({ message: 'Error renaming image' });
        }
        res.json({ message: 'Image renamed successfully' });
    });
};

// Delete an image
export const deleteImage = (req: Request, res: Response) => {
    const { filename } = req.params;

    // Updated regex to include parentheses
    const validFilenameRegex = /^[a-zA-Z0-9_\-\.\(\)]+\.(jpg|jpeg|png|gif)$/i;

    // Validate filename
    if (!validFilenameRegex.test(filename)) {
        return res.status(400).json({ message: 'Invalid filename' });
    }

    const filePath = path.join(__dirname, '../images', filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting image:', err);
            return res.status(500).json({ message: 'Error deleting image' });
        }
        res.json({ message: 'Image deleted successfully' });
    });
};

// List all images
export const listImages = (req: Request, res: Response) => {
    const imagesDir = path.join(__dirname, '../images');

    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            return res.status(500).json({ error: 'Unable to scan images directory' });
        }

        const imageFiles = files.filter((file) => {
            return /\.(jpg|jpeg|png|gif)$/i.test(file);
        });

        res.json({ images: imageFiles });
    });
};
