import express from 'express';
import { connect } from 'mongoose';
import cors from 'cors';
import { PORT, MONGO_URI } from './config/config';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerOptions from './swagger/swagger';

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
