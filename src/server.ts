// server.js

import express from 'express';
import { connect } from 'mongoose';
import cors from 'cors';
import { PORT, MONGO_URI } from './config/config';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerOptions from './swagger/swagger';
import { authenticateToken } from './middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Swagger setup
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root route for base URL
app.get('/', (req, res) => {
    res.send("cristianbrinza.com backend - working");
});

// Public portfolio GET route
app.get('/json/portfolio', (req, res) => {
    try {
        const portfolioData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/portfolioData.json'), 'utf-8'));
        res.json(portfolioData);
    } catch (error) {
        console.error("Error reading portfolio data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Protected portfolio update route
app.put('/json/portfolio', authenticateToken(['admin', 'user']), (req, res) => {
    try {
        const newPortfolioData = req.body;

        // Optional: add validation here for newPortfolioData

        fs.writeFileSync(path.join(__dirname, 'data/portfolioData.json'), JSON.stringify(newPortfolioData, null, 2));
        res.json({ message: "Portfolio data updated successfully" });
    } catch (error) {
        console.error("Error updating portfolio data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Routes
app.use('/auth', authRoutes);

// Test environment variables
console.log('Environment Variables:', {
    PORT,
    MONGO_URI,
    JWT_SECRET: '****', // Hide secret when logging
});

// Connect to MongoDB and start the server
connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
