// middleware/authMiddleware.ts

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { JWT_SECRET } from '../config/config';

declare module 'express' {
    export interface Request {
        user?: any;
    }
}

export const authenticateToken = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) return res.status(401).json({ message: 'Unauthorized: Invalid token' });
            if (!roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden: Access denied' });

            req.user = user;

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(403).json({ message: 'Forbidden: Invalid token' });
        }
    };
};
