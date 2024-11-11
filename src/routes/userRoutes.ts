import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    getProfile,
    updateProfile,
    changePassword,
    uploadProfileImage,
    getProfileImage
} from '../controllers/userController';
import { check } from 'express-validator';
import { upload } from '../controllers/userController'; // assuming you import multer upload from the controller

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile management
 */

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized, authentication required
 *       500:
 *         description: Server error
 */
router.get('/user/profile', authenticateToken(['admin', 'user', 'guest']), getProfile);

/**
 * @swagger
 * /user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: User profile data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
    '/user/profile',
    authenticateToken(['admin', 'user', 'guest']),
    [
        check('name', 'Name must be between 2 and 30 characters').optional().isLength({ min: 2, max: 30 }),
        check('surname', 'Surname must be between 2 and 30 characters').optional().isLength({ min: 2, max: 30 }),
        check('image', 'Image must be a valid URL').optional().isURL(),
    ],
    updateProfile
);

/**
 * @swagger
 * /user/password:
 *   put:
 *     summary: Change user password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Current and new password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input or current password incorrect
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
    '/user/password',
    authenticateToken(['admin', 'user', 'guest']),
    [
        check('currentPassword', 'Current password is required').notEmpty(),
        check('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 }),
    ],
    changePassword
);

/**
 * @swagger
 * /user/profile-image:
 *   post:
 *     summary: Upload a profile image
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: The profile image file to upload
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile image uploaded successfully
 *       400:
 *         description: Bad request, file not provided or invalid format
 *       401:
 *         description: Unauthorized, authentication required
 *       500:
 *         description: Server error
 */
router.post(
    '/user/profile-image',
    authenticateToken(['admin', 'user', 'guest']),
    upload.single('profileImage'), // Multer middleware to handle file upload
    uploadProfileImage
);

/**
 * @swagger
 * /user/profile-image/{filename}:
 *   get:
 *     summary: Get a profile image
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: The filename of the profile image
 *     responses:
 *       200:
 *         description: Profile image retrieved successfully
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Profile image not found
 *       500:
 *         description: Server error
 */
router.get('/user/profile-image/:filename', getProfileImage);

export default router;
