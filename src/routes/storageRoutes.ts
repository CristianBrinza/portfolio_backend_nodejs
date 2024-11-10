// routes/storageRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    listItems,
    createFolder,
    upload,
    uploadFiles,
    renameItem,
    deleteItem,
    downloadFile,
    shareItem,
    accessSharedItem,
} from '../controllers/storageController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Storage
 *   description: Storage management routes
 */

/**
 * @swagger
 * /storage/items:
 *   get:
 *     summary: List files and folders
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: false
 *         description: Path to the folder
 *     responses:
 *       200:
 *         description: Successful response with list of items
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/storage/items', authenticateToken(['admin', 'user']), listItems);

/**
 * @swagger
 * /storage/folder:
 *   post:
 *     summary: Create a new folder
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Folder creation data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderName
 *             properties:
 *               folderName:
 *                 type: string
 *               parentPath:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created successfully
 *       400:
 *         description: Invalid folder name or path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/storage/folder', authenticateToken(['admin', 'user']), createFolder);

/**
 * @swagger
 * /storage/upload:
 *   post:
 *     summary: Upload files
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Files to upload
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               folderPath:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: No files uploaded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
    '/storage/upload',
    authenticateToken(['admin', 'user']),
    upload.array('files', 100),
    uploadFiles
);

/**
 * @swagger
 * /storage/rename:
 *   put:
 *     summary: Rename a file or folder
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Rename data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPath
 *               - newName
 *             properties:
 *               oldPath:
 *                 type: string
 *               newName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item renamed successfully
 *       400:
 *         description: Invalid name or path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/storage/rename', authenticateToken(['admin', 'user']), renameItem);

/**
 * @swagger
 * /storage/delete:
 *   delete:
 *     summary: Delete a file or folder
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Delete data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemPath
 *             properties:
 *               itemPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/storage/delete', authenticateToken(['admin', 'user']), deleteItem);

/**
 * @swagger
 * /storage/download:
 *   get:
 *     summary: Download a file
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: true
 *         description: Path to the file
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       400:
 *         description: Invalid path
 *       500:
 *         description: Server error
 */
router.get('/storage/download', downloadFile);

/**
 * @swagger
 * /storage/share:
 *   post:
 *     summary: Share a file or folder
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Share data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemPath
 *             properties:
 *               itemPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item shared successfully
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/storage/share', authenticateToken(['admin', 'user']), shareItem);

/**
 * @swagger
 * /storage/shared/{token}:
 *   get:
 *     summary: Access shared item
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Share token
 *     responses:
 *       200:
 *         description: Shared item accessed successfully
 *       404:
 *         description: Shared item not found or expired
 *       500:
 *         description: Server error
 */
router.get('/storage/shared/:token', accessSharedItem);

export default router;
