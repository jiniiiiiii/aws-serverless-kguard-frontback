const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const app = express();
app.use(express.json());

// --- Configuration ---
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'KG-db-ddb-ap-ne-2-userdata';
const PORT = process.env.PORT || 3000;

// --- AWS Client ---
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// --- Helper: Get KST Date (YYYY-MM-DD) ---
function getKSTDate() {
    // AWS Lambda/ECS might have UTC timezone. We force KST (UTC+9).
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9 hours in ms
    const kstDate = new Date(now.getTime() + kstOffset);
    return kstDate.toISOString().split('T')[0];
}

// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Attendance API ---
app.post('/attendance', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ status: "error", message: "Missing user_id" });
    }

    const todayDate = getKSTDate();

    // Reward Config
    const REWARD_GOLD = 10;

    const params = {
        TableName: TABLE_NAME,
        Key: { 'user_id': user_id },
        // Update: Add Gold, Set Date
        UpdateExpression: "SET gold = if_not_exists(gold, :zero) + :reward, last_attendance_date = :today",
        // Condition: Ensure date is NOT today
        ConditionExpression: "last_attendance_date <> :today",
        ExpressionAttributeValues: {
            ":reward": REWARD_GOLD,
            ":today": todayDate,
            ":zero": 0
        },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        const result = await docClient.send(new UpdateCommand(params));

        console.log(`[Success] User: ${user_id}, Date: ${todayDate}`);
        res.status(200).json({
            status: "success",
            message: "출석체크 완료! 10 Gold 지급",
            data: {
                reward: REWARD_GOLD,
                date: todayDate,
                updatedAttributes: result.Attributes
            }
        });

    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            console.log(`[Fail] Already Attended - User: ${user_id}`);
            return res.status(409).json({ // 409 Conflict
                status: "fail",
                message: "이미 오늘 출석체크를 완료했습니다.",
                date: todayDate
            });
        }

        console.error("DynamoDB Error:", err);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            detail: err.message,
            stack: err.stack
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Attendance Service running on port ${PORT}`);
    console.log(`Region: ${REGION}, Table: ${TABLE_NAME}`);
});
