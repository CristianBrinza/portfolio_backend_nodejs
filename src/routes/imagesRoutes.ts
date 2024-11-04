// routes/imagesRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    upload,
    uploadImage,
    updateImageName,
    deleteImage,
    listImages,
} from '../controllers/imageController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Image management routes
 */

/**
 * @swagger
 * /images:
 *   get:
 *     summary: List all images
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: Successful response with list of images
 *       500:
 *         description: Server error
 */
router.get('/images', listImages);

/**
 * @swagger
 * /images/upload:
 *   post:
 *     summary: Upload a new image (admin or user only)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Image file to upload
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
    '/images/upload',
    authenticateToken(['admin', 'user']),
    upload.single('image'),
    uploadImage
);

/**
 * @swagger
 * /images/update:
 *   put:
 *     summary: Update (rename) an image (admin or user only)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Old and new image names
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldName
 *               - newName
 *             properties:
 *               oldName:
 *                 type: string
 *               newName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Image renamed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
    '/images/update',
    authenticateToken(['admin', 'user']),
    updateImageName
);

/**
 * @swagger
 * /images/{filename}:
 *   delete:
 *     summary: Delete an image by filename (admin or user only)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the image file to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Invalid filename
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete(
    '/images/:filename',
    authenticateToken(['admin', 'user']),
    deleteImage
);

export default router;
