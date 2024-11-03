// middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { JWT_SECRET } from '../config/config';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const authenticateToken = (roles: ('admin' | 'user' | 'guest')[]) => {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user || !roles.includes(user.role)) {
                return res.status(403).json({ message: 'Forbidden: Access denied' });
            }

            req.user = user;
            next();
        } catch (err) {
            res.status(403).json({ message: 'Token is invalid or expired' });
        }
    };
};
