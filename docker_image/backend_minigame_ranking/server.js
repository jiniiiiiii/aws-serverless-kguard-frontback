//.env 파일에서 환경변수를 가져옵니다.
/* AWS_REGION =
AWS_ACCESS_KEY_ID =
    AWS_SECRET_ACCESS_KEY =
    DYNAMODB_TABLE_NAME = 
    require('dotenv').config(); */

const express = require('express');
const cors = require('cors');
const { dynamo } = require('./dynamoClient');
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
const PORT = 3001; // Run on port 3001 to avoid conflict with React (3000)

app.use(cors());
app.use(express.json());

// Table Name & Region from Environment Variable
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const REGION = process.env.AWS_REGION || 'ap-northeast-2';

// 1. Root / Health Check (for ALB)
app.get('/', (req, res) => {
    res.send('Mini Game Backend is running!');
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// Create Router for /minigame path
const router = express.Router();

// 1. Submit Score (POST /minigame/score)
router.post('/score', async (req, res) => {
    const { userId, nickname, score } = req.body;

    if (!userId || !nickname || score === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // [Corrected] Check existing score with 'user' and 'game' keys
        const existing = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "#u = :userVal AND #g = :gameVal",
            ExpressionAttributeNames: {
                "#u": "user",
                "#g": "game"
            },
            ExpressionAttributeValues: {
                ":userVal": `user#${userId}`,
                ":gameVal": `game#1`
            }
        }));

        let currentBest = 0;
        if (existing.Items && existing.Items.length > 0) {
            currentBest = existing.Items[0].BestScore || 0;
        }

        if (score > currentBest) {
            // New High Score!
            await dynamo.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    user: `user#${userId}`,   // PK
                    game: `game#1`,          // SK (and GSI Partition Key)
                    BestScore: score,        // (GSI Sort Key)
                    NickName: nickname,
                    PlayDate: new Date().toISOString()
                    // Note: 'GSI_PK' is NOT needed because GSI uses 'game' attribute as its Partition Key.
                }
            }));
            res.json({ success: true, message: "New High Score Updated!", newBest: score });
        } else {
            res.json({ success: true, message: "Score recorded but not a high score.", currentBest });
        }

    } catch (error) {
        console.error("Error saving score:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Ranking (GET /minigame/ranking)
router.get('/ranking', async (req, res) => {
    try {
        // Query GSI: TopScoreIndex (PK: game, SK: BestScore)
        // Since 'game' is a reserved keyword in DynamoDB, we MUST use ExpressionAttributeNames.
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "TopScoreIndex",
            KeyConditionExpression: "#g = :gameVal",
            ExpressionAttributeNames: {
                "#g": "game"
            },
            ExpressionAttributeValues: {
                ":gameVal": "game#1"
            },
            ScanIndexForward: false, // Descending (High score first)
            Limit: 10
        });

        const result = await dynamo.send(command);

        const ranking = result.Items.map((item, index) => ({
            rank: index + 1,
            nickname: item.NickName,
            score: item.BestScore
        }));

        res.json(ranking);

    } catch (error) {
        console.error("Error fetching ranking:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. CPU Stress Test Endpoint (Inside Router -> /minigame/stress-cpu)
router.get('/stress-cpu', async (req, res) => {
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

// Mount the router
app.use('/minigame', router);

app.listen(PORT, () => {
    console.log(`Minigame Ranking Server running on port ${PORT}`);
    console.log(`Region: ${REGION}, Table: ${TABLE_NAME}`);
});

