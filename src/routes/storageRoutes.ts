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
    moveItem,
    restoreItem,
    listTrashItems,
    deleteItemPermanently,
    listVersions,
    uploadChunk, filePreview,
    createShareLink,
    getSharedFile, removeFavorite, addFavorite

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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search query
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         required: false
 *         description: Sort by field (name, size, modifiedAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         required: false
 *         description: Items per page
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
 * /storage/move:
 *   put:
 *     summary: Move a file or folder
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Move data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourcePath
 *               - destinationPath
 *             properties:
 *               sourcePath:
 *                 type: string
 *               destinationPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item moved successfully
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/storage/move', authenticateToken(['admin', 'user']), moveItem);

/**
 * @swagger
 * /storage/delete:
 *   delete:
 *     summary: Delete a file or folder (move to trash)
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
 * /storage/trash/items:
 *   get:
 *     summary: List items in trash
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search query
 *     responses:
 *       200:
 *         description: Successful response with list of trash items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/storage/trash/items', authenticateToken(['admin', 'user']), listTrashItems);

/**
 * @swagger
 * /storage/trash/restore:
 *   put:
 *     summary: Restore an item from trash
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Item to restore
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
 *         description: Item restored successfully
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/storage/trash/restore', authenticateToken(['admin', 'user']), restoreItem);

/**
 * @swagger
 * /storage/trash/delete:
 *   delete:
 *     summary: Permanently delete an item from trash
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Item to delete permanently
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
 *         description: Item permanently deleted
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/storage/trash/delete', authenticateToken(['admin', 'user']), deleteItemPermanently);

/**
 * @swagger
 * /storage/versions:
 *   get:
 *     summary: List versions of a file
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemPath
 *         schema:
 *           type: string
 *         required: true
 *         description: Path to the file
 *     responses:
 *       200:
 *         description: Successful response with list of versions
 *       400:
 *         description: Invalid path
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/storage/versions', authenticateToken(['admin', 'user']), listVersions);

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
router.get('/storage/download', authenticateToken(['admin', 'user']), downloadFile);

/**
 * @swagger
 * /storage/upload-chunk:
 *   post:
 *     summary: Upload a file chunk
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Chunk data
 *       required: true
 *       content:
 *         application/octet-stream:
 *           schema:
 *             type: string
 *             format: binary
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post('/storage/upload-chunk', authenticateToken(['admin', 'user']), uploadChunk);

/**
 * @swagger
 * /storage/preview:
 *   get:
 *     summary: Generate a preview of a file
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: true
 *         description: Path to the file for preview
 *     responses:
 *       200:
 *         description: Preview of the file
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           text/plain:
 *             schema:
 *               type: string
 *         headers:
 *           Content-Type:
 *             description: The content type of the preview
 *             schema:
 *               type: string
 *               example: image/png
 *       400:
 *         description: Preview not available for this file type
 *       404:
 *         description: File not found or invalid path
 *       500:
 *         description: Server error
 */
router.get('/storage/preview', authenticateToken(['admin', 'user']), filePreview);

/**
 * @swagger
 * /storage/share:
 *   post:
 *     summary: Create a shareable link for a file
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Share link data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *               - expiresIn
 *             properties:
 *               filePath:
 *                 type: string
 *               expiresIn:
 *                 type: number
 *                 description: Expiration time in hours
 *     responses:
 *       200:
 *         description: Shareable link created
 *       400:
 *         description: Invalid file path
 *       500:
 *         description: Server error
 */
router.post('/storage/share', authenticateToken(['admin', 'user']), createShareLink);

/**
 * @swagger
 * /storage/shared/{token}:
 *   get:
 *     summary: Access a shared file
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
 *         description: Shared file
 *       404:
 *         description: Shared file not found
 *       410:
 *         description: Shared link has expired
 *       500:
 *         description: Server error
 */
router.get('/storage/shared/:token', getSharedFile);


/**
 * @swagger
 * /storage/favorite:
 *   post:
 *     summary: Add an item to favorites
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Item to add to favorites
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
 *         description: Item added to favorites
 *       500:
 *         description: Server error
 */
router.post('/storage/favorite', authenticateToken(['admin', 'user']), addFavorite);

/**
 * @swagger
 * /storage/favorite:
 *   delete:
 *     summary: Remove an item from favorites
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Item to remove from favorites
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
 *         description: Item removed from favorites
 *       500:
 *         description: Server error
 */
router.delete('/storage/favorite', authenticateToken(['admin', 'user']), removeFavorite);


export default router;
