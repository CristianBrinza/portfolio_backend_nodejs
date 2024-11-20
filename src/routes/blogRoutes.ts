// routes/blogRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Blog
 *   description: Blog management routes
 */

/**
 * @swagger
 * /json/blog:
 *   get:
 *     summary: Get the blog data
 *     tags: [Blog]
 *     responses:
 *       200:
 *         description: Successful response with blog data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get('/json/blog', (req, res) => {
    try {
        const portfolioData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/blogData.json'), 'utf-8'));
        res.json(portfolioData);
    } catch (error) {
        console.error("Error reading blog data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/**
 * @swagger
 * /json/blog:
 *   put:
 *     summary: Update the blog data (admin or user only)
 *     tags: [Blog]
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
 *         description: Blog data updated successfully
 *       403:
 *         description: Forbidden - Access denied
 *       500:
 *         description: Server error
 */
router.put('/json/blog', authenticateToken(['admin', 'user']), (req, res) => {
    try {
        const newBlogData = req.body;

        // Optional: add validation here for newBlogData

        fs.writeFileSync(path.join(__dirname, '../data/blogData.json'), JSON.stringify(newBlogData, null, 2));
        res.json({ message: "Blog data updated successfully" });
    } catch (error) {
        console.error("Error updating pages data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
