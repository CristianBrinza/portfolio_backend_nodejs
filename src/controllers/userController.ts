// controllers/userController.ts

import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import { check, validationResult } from 'express-validator';
import multer from "multer";
import path from 'path';
import fs from 'fs';


// Get user profile
export const getProfile = async (req: Request, res: Response) =>{
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// Change user password
export const changePassword = async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

// Update user profile with validation
export const updateProfile = async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, surname, image } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, surname, image },
            { new: true }
        ).select('-password');

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/profile_images');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${req.user._id}-${uniqueSuffix}${ext}`);
    },
});

export const upload = multer({ storage });


// Upload profile image
export const uploadProfileImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete old profile image if it exists
        if (user.image) {
            const oldImagePath = path.join(__dirname, '../uploads/profile_images', user.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update user profile with new image filename
        user.image = req.file.filename;
        await user.save();

        res.json({ message: 'Profile image uploaded successfully', filename: req.file.filename });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'Error uploading profile image' });
    }
};

// Serve profile image
export const getProfileImage = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/profile_images', filename);

        if (fs.existsSync(imagePath)) {
            res.sendFile(imagePath);
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (error) {
        console.error('Error fetching profile image:', error);
        res.status(500).json({ message: 'Error fetching profile image' });
    }
};
