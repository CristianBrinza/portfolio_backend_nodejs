import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    uploadFiles,
    createFolder,
    renameItem,
    deleteItem,
    moveItem,
    createShareLink,
    listShareLinks,
    deleteShareLink,
    accessSharedItems,
    getChangeLog,
    listItems,
    downloadSharedItem,
    downloadAllSharedItems, previewFile,
} from '../controllers/shareController';
import { uploadChunk, completeUpload } from '../controllers/chunkUploadController';
import {chunkUploadMiddleware} from "../middleware/chunkMiddleware";


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Share
 *   description: File sharing and management routes
 */

/**
 * @swagger
 * /share:
 *   get:
 *     summary: List all files and folders in the share directory
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: false
 *         description: Path to list items from
 *     responses:
 *       200:
 *         description: List of files and folders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [file, folder]
 *                   path:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/share', authenticateToken(['admin', 'user']), listItems);

/**
 * @swagger
 * /share/upload:
 *   post:
 *     summary: Upload multiple files and folders
 *     tags: [Share]
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
 *               path:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: No files uploaded
 *       500:
 *         description: Server error
 */
router.post('/share/upload', authenticateToken(['admin', 'user']), ...uploadFiles);

/**
 * @swagger
 * /share/create-folder:
 *   post:
 *     summary: Create a new folder
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Folder creation data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folderName:
 *                 type: string
 *               path:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created successfully
 *       400:
 *         description: Invalid folder name
 *       500:
 *         description: Server error
 */
router.post('/share/create-folder', authenticateToken(['admin', 'user']), createFolder);

/**
 * @swagger
 * /share/rename:
 *   put:
 *     summary: Rename a file or folder
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Rename data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPath:
 *                 type: string
 *               newName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item renamed successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.put('/share/rename', authenticateToken(['admin', 'user']), renameItem);

/**
 * @swagger
 * /share/delete:
 *   delete:
 *     summary: Delete a file or folder
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Delete data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.delete('/share/delete', authenticateToken(['admin', 'user']), deleteItem);

/**
 * @swagger
 * /share/move:
 *   put:
 *     summary: Move a file or folder
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Move data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemPath:
 *                 type: string
 *               destinationPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item moved successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.put('/share/move', authenticateToken(['admin', 'user']), moveItem);

/**
 * @swagger
 * /share/create-link:
 *   post:
 *     summary: Create a shareable link for selected items
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Share link data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of item paths to share
 *     responses:
 *       201:
 *         description: Share link created successfully
 *       400:
 *         description: No items provided for sharing
 *       500:
 *         description: Server error
 */
router.post('/share/create-link', authenticateToken(['admin', 'user']), createShareLink);

/**
 * @swagger
 * /share/links:
 *   get:
 *     summary: List all share links created by the user
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of share links
 *       500:
 *         description: Server error
 */
router.get('/share/links', authenticateToken(['admin', 'user']), listShareLinks);

/**
 * @swagger
 * /share/links/{code}:
 *   delete:
 *     summary: Delete a share link
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Share code to delete
 *     responses:
 *       200:
 *         description: Share link deleted successfully
 *       404:
 *         description: Share link not found
 *       500:
 *         description: Server error
 */
router.delete('/share/links/:code', authenticateToken(['admin', 'user']), deleteShareLink);

/**
 * @swagger
 * /share/{code}:
 *   get:
 *     summary: Access shared items via a share link
 *     tags: [Share]
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique share code
 *     responses:
 *       200:
 *         description: List of shared items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: string
 *                     description: Relative paths of shared items
 *       404:
 *         description: Share link not found or expired
 *       500:
 *         description: Internal server error
 */
router.get('/share/:code', accessSharedItems);

/**
 * @swagger
 * /share/changelog:
 *   get:
 *     summary: Get changelog of all actions
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Changelog retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/share/changelog', authenticateToken(['admin', 'user']), getChangeLog);


/**
 * @swagger
 * /share/{code}/download:
 *   get:
 *     summary: Download a specific shared file
 *     tags: [Share]
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique share code
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: true
 *         description: Path of the file to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid file path
 *       403:
 *         description: Access denied to this file
 *       404:
 *         description: Share link or file not found
 *       500:
 *         description: Internal server error
 */
router.get('/share/:code/download', downloadSharedItem);

/**
 * @swagger
 * /share/{code}/download-all:
 *   get:
 *     summary: Download all shared items as a zip file
 *     tags: [Share]
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique share code
 *     responses:
 *       200:
 *         description: Zip file downloaded successfully
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Share link not found or expired
 *       500:
 *         description: Internal server error
 */
router.get('/share/:code/download-all', downloadAllSharedItems);

/**
 * @swagger
 * /share/upload-chunk:
 *   post:
 *     summary: Upload a single chunk
 *     tags: [Share Chunk Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Chunk upload data
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *               chunkIndex:
 *                 type: number
 *               totalChunks:
 *                 type: number
 *               fileName:
 *                 type: string
 *               uploadId:
 *                 type: string
 *               path:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chunk uploaded
 *       400:
 *         description: Missing data
 *       500:
 *         description: Server error
 */
router.post(
    '/share/upload-chunk',
    authenticateToken(['admin', 'user']),
    chunkUploadMiddleware.single('chunk'),
    uploadChunk
);

/**
 * @swagger
 * /share/complete-upload:
 *   post:
 *     summary: Complete the chunked upload and assemble the file
 *     tags: [Share Chunk Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Completion data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadId:
 *                 type: string
 *     responses:
 *       200:
 *         description: File assembled successfully
 *       400:
 *         description: Missing chunk or data
 *       404:
 *         description: No chunk upload data found
 *       500:
 *         description: Server error
 */
router.post(
    '/share/complete-upload',
    authenticateToken(['admin', 'user']),
    completeUpload
);


/**
 * @swagger
 * /share/preview/{filePath}:
 *   get:
 *     summary: Preview a file from the share directory
 *     tags: [Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filePath
 *         schema:
 *           type: string
 *         required: true
 *         description: The relative path of the file to preview
 *     responses:
 *       200:
 *         description: Returns the file for preview
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           video/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       500:
 *         description: Error fetching file
 */
router.get(
    '/share/preview/:filePath(*)',
    previewFile
);

export default router;
