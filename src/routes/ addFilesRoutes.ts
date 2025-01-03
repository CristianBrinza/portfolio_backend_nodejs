import { Router } from 'express';
import {
    generateCode,
    getAllCodes,
    deleteCode,
    uploadFiles,
    listFiles,
    downloadFile,
    downloadAllFiles,
} from '../controllers/addFilesController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /add-files/generate:
 *   post:
 *     summary: Generate a new code for file sharing
 *     tags: [Files]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A new code was successfully generated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: rfmot49fwn39f38n
 *       401:
 *         description: Unauthorized
 */
router.post('/add-files/generate',  authenticateToken(['admin', 'user']), generateCode);

/**
 * @swagger
 * /add-files/codes:
 *   get:
 *     summary: Get all generated codes
 *     tags: [Files]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all generated codes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: rfmot49fwn39f38n
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/add-files/codes',  authenticateToken(['admin', 'user']), getAllCodes);

/**
 * @swagger
 * /add-files/{code}:
 *   delete:
 *     summary: Delete a code and its associated files
 *     tags: [Files]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Code of the folder to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Code and associated files deleted successfully.
 *       401:
 *         description: Unauthorized
 */
router.delete('/add-files/:code',  authenticateToken(['admin', 'user']), deleteCode);

/**
 * @swagger
 * /add-files/{code}:
 *   get:
 *     summary: List all files for a given code
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Code to list files for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files for the specified code.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 example: example-file.txt
 */
router.get('/add-files/:code', listFiles);

/**
 * @swagger
 * /add-files/{code}:
 *   post:
 *     summary: Upload files for a given code
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Code to upload files to
 *         schema:
 *           type: string
 *     requestBody:
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
 *     responses:
 *       201:
 *         description: Files uploaded successfully.
 *       400:
 *         description: Bad Request
 */
router.post('/add-files/:code', uploadFiles);

/**
 * @swagger
 * /add-files/{code}/{fileName}:
 *   get:
 *     summary: Download a specific file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Code of the folder containing the file
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileName
 *         required: true
 *         description: Name of the file to download
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File downloaded successfully.
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
router.get('/add-files/:code/:fileName', downloadFile);

/**
 * @swagger
 * /add-files/{code}/download-all:
 *   get:
 *     summary: Download all files in a folder as a ZIP
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Code of the folder to download
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ZIP file downloaded successfully.
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Folder not found
 */
router.get('/add-files/:code/download-all', downloadAllFiles);

export default router;
