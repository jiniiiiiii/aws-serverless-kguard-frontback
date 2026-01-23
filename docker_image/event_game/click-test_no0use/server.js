const express = require('express');
const cors = require('cors');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'KG-db-ddb-ap-ne-2-userdata';

// --- Middleware ---
app.use(cors());
app.use(express.json());
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// --- AWS Client ---
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// CPU Stress Test Endpoint
app.get('/api/stress-cpu', async (req, res) => {
    const duration = parseInt(req.query.duration || '10000');
    const targetLoad = parseFloat(req.query.load || '0.7');

    console.log(`[Stress] CPU Stress Started: ${duration}ms, Load: ${targetLoad}`);

    const start = Date.now();
    const end = start + duration;

    const worker = () => {
        const now = Date.now();
        if (now >= end) {
            console.log(`[Stress] CPU Stress Completed`);
            return res.json({ status: 'done', duration });
        }

        const cycleStart = Date.now();
        while (Date.now() - cycleStart < (100 * targetLoad)) {
            Math.sqrt(Math.random() * Math.random());
        }
        setTimeout(worker, 100 * (1 - targetLoad));
    };
    worker();
});

// --- API Routes ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Reward Endpoint
app.post('/api/claim', async (req, res) => {
    const { user_id, score } = req.body;

    if (!user_id || !score) {
        return res.status(400).json({ error: 'Missing user_id or score' });
    }

    if (score < 100) {
        return res.status(400).json({ error: 'Score must be at least 100 to claim reward.' });
    }

    // Reward Logic: 100 Gold for clearing the game
    const REWARD = 100;

    try {
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { user_id: user_id },
            UpdateExpression: "SET gold = if_not_exists(gold, :zero) + :r",
            ExpressionAttributeValues: {
                ":r": REWARD,
                ":zero": 0
            },
            ReturnValues: "UPDATED_NEW"
        });

        const result = await docClient.send(command);
        console.log(`[Game Reward] User: ${user_id}, Awarded: ${REWARD}`);

        res.json({
            success: true,
            message: 'Reward Claimed!',
            data: {
                added_gold: REWARD,
                new_gold_total: result.Attributes?.gold
            }
        });

    } catch (error) {
        console.error("DynamoDB Error:", error);
        res.status(500).json({ error: 'Failed to process reward' });
    }
});

// Catch-all handler: for any request that doesn't match an API route, send back React's index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Game Service running on port ${PORT}`);
});
