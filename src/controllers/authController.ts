// controllers/authController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWT_SECRET } from '../config/config';

export const register = async (req: Request, res: Response) => {
    const { username, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser)
            return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            role,
        });

        await user.save();

        res.status(201).json({
            message: 'User created',
            user: { id: user._id, username: user.username, role: user.role },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(401).json({ message: 'Invalid credentials' });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch)
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
            expiresIn: '12h',
        });

        res.json({
            message: 'Login successful',
            token,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
