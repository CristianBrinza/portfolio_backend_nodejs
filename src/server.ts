// server.ts

import express from 'express';
import { connect } from 'mongoose';
import cors from 'cors';
import { PORT, MONGO_URI } from './config/config';
import authRoutes from './routes/authRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import imagesRoutes from './routes/imagesRoutes';
import storageRoutes from './routes/storageRoutes'; // Import storage routes
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerOptions from './swagger/swagger';
import certificationsRoutes from './routes/certificationsRoutes';
import path from 'path';
import userRoutes from './routes/userRoutes';
import pagesRoutes from "./routes/pagesRoutes";
import blogRoutes from "./routes/blogRoutes";
import shareRoutes from "./routes/shareRoutes";
import addFilesRoutes from "./routes/ addFilesRoutes";

const app = express();

// Middleware
app.use(express.json({ limit: '10gb' }));
// app.use(express.json());
app.use(express.urlencoded({ limit: '10gb', extended: true }));
app.use(cors());

// Swagger setup
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root route for base URL
app.get('/', (req, res) => {
    res.send('cristianbrinza.com backend - working');
});

// Status endpoint
app.get('/status', (req, res) => {
    res.status(200).send({ status: 'OK' });
});

// Serve images from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve shared items
app.use('/storage/shared', express.static(path.join(__dirname, 'storage')));

// Routes
app.use('/auth', authRoutes);
app.use('/', userRoutes);
app.use('/', portfolioRoutes);
app.use('/', certificationsRoutes);
app.use('/', pagesRoutes);
app.use('/', imagesRoutes);
app.use('/', storageRoutes);
app.use('/', blogRoutes);
app.use('/', shareRoutes);
app.use('/', addFilesRoutes);

// Serve images from the 'uploads/profile_images' directory
app.use(
    '/user/profile-image',
    express.static(path.join(__dirname, 'uploads/profile_images'))
);

// Serve shared items and storage files
app.use('/storage/shared', express.static(path.join(__dirname, 'storage')));
app.use('/storage/download', express.static(path.join(__dirname, 'storage')));

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
