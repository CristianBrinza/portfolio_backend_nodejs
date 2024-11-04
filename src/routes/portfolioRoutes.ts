// routes/portfolioRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Portfolio
 *   description: Portfolio management routes
 */

/**
 * @swagger
 * /json/portfolio:
 *   get:
 *     summary: Get the portfolio data
 *     tags: [Portfolio]
 *     responses:
 *       200:
 *         description: Successful response with portfolio data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get('/json/portfolio', (req, res) => {
    try {
        const portfolioData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/portfolioData.json'), 'utf-8'));
        res.json(portfolioData);
    } catch (error) {
        console.error("Error reading portfolio data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/**
 * @swagger
 * /json/portfolio:
 *   put:
 *     summary: Update the portfolio data (admin or user only)
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Portfolio data to be updated
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Portfolio data updated successfully
 *       403:
 *         description: Forbidden - Access denied
 *       500:
 *         description: Server error
 */
router.put('/json/portfolio', authenticateToken(['admin', 'user']), (req, res) => {
    try {
        const newPortfolioData = req.body;

        // Optional: add validation here for newPortfolioData

        fs.writeFileSync(path.join(__dirname, '../data/portfolioData.json'), JSON.stringify(newPortfolioData, null, 2));
        res.json({ message: "Portfolio data updated successfully" });
    } catch (error) {
        console.error("Error updating portfolio data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
