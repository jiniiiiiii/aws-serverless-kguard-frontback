import express from 'express';
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify"; // Security Re-enabled
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// AWS Configuration
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const USER_POOL_ID = process.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.VITE_COGNITO_CLIENT_ID;
const TABLE_NAME = process.env.DYNAMODB_TABLE || "KG-db-ddb-ap-ne-2-userdata";

// Verifier Setup
const verifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: "id", // or "access"
    clientId: CLIENT_ID,
});

// Middleware (Configured once)
app.use(cors());
app.use(express.json());

// DynamoDB Client
const client = new DynamoDBClient({ region: REGION });

// API Routes
app.post('/api/claim-reward', async (req, res) => {
    try {
        const { userId, score } = req.body;

        // --- Security Check Start ---
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No Authorization header" });
        }
        const token = authHeader.split(" ")[1];
        try {
            const payload = await verifier.verify(token);
            // Verify that the token's user matches the requested userId
            if (payload.sub !== userId) {
                return res.status(403).json({ error: "Token does not match UserId" });
            }
        } catch (authError) {
            console.error("Auth failed:", authError);
            return res.status(401).json({ error: "Invalid Token" });
        }
        // --- Security Check End ---

        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const REWARD_ID = "event_reward_202601";
        const REWARD_AMOUNT = 3;

        if (!score || score < 50) {
            return res.status(400).json({ error: "Score insufficient" });
        }

        // Atomic Update: Add 3 Cash (Unlimited)
        const command = new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: {
                user_id: { S: userId }
            },
            // Just add cash, don't track claimed_rewards anymore
            UpdateExpression: "SET cash = if_not_exists(cash, :zero) + :amount",
            ExpressionAttributeValues: {
                ":amount": { N: String(REWARD_AMOUNT) },
                ":zero": { N: "0" }
            }
        });

        await client.send(command);
        console.log(`Reward passed to user ${userId}`);
        return res.json({ success: true, message: "Reward claimed!" });

    } catch (error) {
        console.error("DynamoDB Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error.message,
            code: error.code || error.name
        });
    }
});

// CPU Stress Test Endpoint for Auto Scaling Verification
app.get('/api/stress-cpu', async (req, res) => {
    const duration = parseInt(req.query.duration || '10000'); // Default 10s
    const targetLoad = parseFloat(req.query.load || '0.7');   // Default 70% load

    console.log(`[Stress] CPU Stress Started: ${duration}ms, Load: ${targetLoad}`);

    const start = Date.now();
    const end = start + duration;

    // Non-blocking loop (using setImmediate to allow event loop to breathe slightly, but block mostly)
    // To simulate 70% load, we work for 70ms and sleep for 30ms in a 100ms cycle

    // Warning: Node.js is single threaded. This WILL block other requests partially.
    // This is intentional for testing CPU limits.

    const worker = () => {
        const now = Date.now();
        if (now >= end) {
            console.log(`[Stress] CPU Stress Completed`);
            return res.json({ status: 'done', duration });
        }

        // Work phrase
        const cycleStart = Date.now();
        while (Date.now() - cycleStart < (100 * targetLoad)) {
            Math.sqrt(Math.random() * Math.random()); // cpu burn
        }

        // Rest phrase (allow I/O handling)
        setTimeout(worker, 100 * (1 - targetLoad));
    };

    worker();
});

// Health Check for ALB
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Fallback for SPA routing - Removed as this is now Pure API
app.get('/', (req, res) => {
    res.send("K-GUARD Event Game API Service is Running.");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown for Docker --rm
const shutdown = () => {
    console.log("Received kill signal, shutting down gracefully");
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
