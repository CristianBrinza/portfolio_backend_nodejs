// routes/pagesRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Pages
 *   description: Pages management routes
 */

/**
 * @swagger
 * /json/pages:
 *   get:
 *     summary: Get the pages data
 *     tags: [Pages]
 *     responses:
 *       200:
 *         description: Successful response with pages data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get('/json/pages', (req, res) => {
    try {
        const portfolioData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pagesData.json'), 'utf-8'));
        res.json(portfolioData);
    } catch (error) {
        console.error("Error reading pages data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/**
 * @swagger
 * /json/pages:
 *   put:
 *     summary: Update the pages data (admin or user only)
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Pages data to be updated
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pages data updated successfully
 *       403:
 *         description: Forbidden - Access denied
 *       500:
 *         description: Server error
 */
router.put('/json/pages', authenticateToken(['admin', 'user']), (req, res) => {
    try {
        const newPagesData = req.body;

        // Optional: add validation here for newPagesData

        fs.writeFileSync(path.join(__dirname, '../data/pagesData.json'), JSON.stringify(newPagesData, null, 2));
        res.json({ message: "Pages data updated successfully" });
    } catch (error) {
        console.error("Error updating pages data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
