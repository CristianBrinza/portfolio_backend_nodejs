// swagger/swagger.ts

import { PORT } from '../config/config';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Portfolio Backend API',
            version: '1.0.0',
            description: 'API documentation for the Portfolio Backend',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
            {
                url: `https://backend.cristianbrinza.com`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};

export default swaggerOptions;
