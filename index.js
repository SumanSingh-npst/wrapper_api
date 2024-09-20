const express = require('express');
const axios = require('axios');
const winston = require('winston');
const app = express();
const port = 3002;

app.use(express.json());

// Define clients
const clients = {
    DECENTRO: 'DECENTRO',
    SUREPASS: 'SUREPASS',
};

// Define authorization token
const AUTH_TOKEN = 'aurfva7jg9t0i9rj_dsauvZufwhjnbasduwebcsahd';

// Set up Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'api-wrapper' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console(),
    ],
});

// Middleware for CORS and authorization check
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    logger.info(`Incoming request: ${req.method} ${req.url}`);

    const authHeader = req.headers['authorization'];
    console.log("🚀 ~ app.use ~ authHeader:", req.headers)
    if (authHeader === AUTH_TOKEN) {
        next();
    } else {
        logger.warn('Unauthorized access attempt');
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// Simple root endpoint
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Helper function for Surepass API call
const callSurepassAxios = async (headers, data) => {
    try {
        const response = await axios({
            method: 'post',
            url: headers.req_url,
            headers: {
                'Content-Type': headers.req_content_type,
                'Authorization': headers.req_Authorization_token,
            },
            data: data,
        });
        logger.info("Surepass Response:", response.data);
        return response.data;
    } catch (error) {
        logger.error("Surepass Error:", error.message);
        return { message: error.message, stack: error.stack };
    }
};

// Helper function for Decentro API call
const callDecentroAxios = async (headers, data) => {
    try {
        const response = await axios({
            method: 'post',
            url: headers.req_url,
            headers: {
                'Content-Type': headers.req_content_type,
                'client_id': headers.req_client_id,
                'client_secret': headers.req_client_secret,
                'module_secret': headers.req_module_secret,
            },
            data: data,
        });
        logger.info("Decentro Response:", response.data);
        return response.data;
    } catch (error) {
        logger.error("Decentro Error:", error.message);
        return { message: error.message, stack: error.stack };
    }
};

// Wrapper API endpoint
app.post('/wrapper', async (req, res) => {
    const clientType = req.headers.type;
    logger.info(`Client type: ${clientType}`);

    switch (clientType) {
        case clients.SUREPASS:
            try {
                const surepassRes = await callSurepassAxios(req.headers, req.body);
                return res.json({ message: 'Surepass Response', ...surepassRes });
            } catch (err) {
                logger.error(`Error in Surepass flow: ${err.message}`);
                return res.status(500).json({ error: 'Surepass API failed' });
            }
        case clients.DECENTRO:
            try {
                const decentroRes = await callDecentroAxios(req.headers, req.body);
                return res.json({ message: 'Decentro Response', ...decentroRes });
            } catch (err) {
                logger.error(`Error in Decentro flow: ${err.message}`);
                return res.status(500).json({ error: 'Decentro API failed' });
            }
        default:
            logger.warn('Invalid client type');
            return res.status(400).json({ error: 'Invalid client type' });
    }
});

// Start server
app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});
