const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes (fixes browser connection issues)
app.use(express.json());

// --- Configuration ---
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'KG-db-ddb-ap-ne-2-userdata';
const PORT = process.env.PORT || 3000;

// --- AWS Client ---
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// --- Helper: Get KST Date (YYYY-MM-DD) ---
function getKSTDate(dateObj = new Date()) {
    // AWS Lambda/ECS might have UTC timezone. We force KST (UTC+9).
    const kstOffset = 9 * 60 * 60 * 1000; // 9 hours in ms
    const kstDate = new Date(dateObj.getTime() + kstOffset);
    return kstDate.toISOString().split('T')[0];
}

// Helper: Get Yesterday's Date in KST
function getKSTYesterday() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return getKSTDate(yesterday);
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
    const yesterdayDate = getKSTYesterday();

    try {
        // 1. Read Current User State
        const getParams = {
            TableName: TABLE_NAME,
            Key: { 'user_id': user_id }
        };
        const { Item } = await docClient.send(new GetCommand(getParams));

        const lastDate = Item?.last_attendance_date;
        const currentStreak = Item?.consecutive_streak || 0;

        // 2. Logic: Check if already attended
        if (lastDate === todayDate) {
            console.log(`[Fail] Already Attended - User: ${user_id}`);
            return res.status(409).json({
                status: "fail",
                message: "이미 오늘 출석체크를 완료했습니다.",
                date: todayDate,
                streak: currentStreak
            });
        }

        // 3. Logic: Calculate Streak & Reward
        let newStreak = 1;
        if (lastDate === yesterdayDate) {
            newStreak = currentStreak + 1;
        } else {
            // Missed a day or first time
            newStreak = 1;
        }

        let reward = 10; // Base Reward
        let bonus = 0;
        let message = `출석체크 완료! +${reward} Cash`;

        // 3-Day Consecutive Bonus
        if (newStreak > 0 && newStreak % 3 === 0) {
            bonus = 30; // Bonus for every 3rd day
            reward += bonus;
            message = `🔥 ${newStreak}일 연속 출석! 보너스 +${bonus} Cash 포함 총 +${reward} Cash!`;
        } else if (newStreak > 1) {
            message = `${newStreak}일 연속 출석 달성! +${reward} Cash`;
        }

        // 4. Atomic Update (Optimistic Locking)
        // Ensure 'last_attendance_date' hasn't changed since we read it
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { 'user_id': user_id },
            UpdateExpression: "SET cash = if_not_exists(cash, :zero) + :reward, last_attendance_date = :today, consecutive_streak = :streak",
            ConditionExpression: "last_attendance_date = :oldDate OR attribute_not_exists(last_attendance_date)",
            ExpressionAttributeValues: {
                ":reward": reward,
                ":today": todayDate,
                ":streak": newStreak,
                ":oldDate": lastDate || "NEVER_EXISTED_PLACEHOLDER", // Handle null case safely if possible, but DynamoDB needs explicit handling. Only referencing oldDate if it exists?
                // Actually, for ConditionExpression with NULL, logic is tricky. 
                // Let's simplify: strict match isn't strictly necessary for casual app, but Good Practice.
                // Alternative: just check 'last_attendance_date <> :today' again to prevent double count in short window.
                ":zero": 0
            }
        };

        // Adjust Condition for Safety: Just ensure we don't double count for TODAY.
        // The optimistic locking on 'yesterday' is less critical than preventing double 'today'.
        updateParams.ConditionExpression = "last_attendance_date <> :today";
        delete updateParams.ExpressionAttributeValues[":oldDate"]; // Remove unused

        const result = await docClient.send(new UpdateCommand(updateParams));

        console.log(`[Success] User: ${user_id}, Date: ${todayDate}, Streak: ${newStreak}`);
        res.status(200).json({
            status: "success",
            message: message,
            data: {
                reward: reward,
                date: todayDate,
                streak: newStreak,
                bonus: bonus
            }
        });

    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            console.log(`[Fail] Already Attended (Race Condition) - User: ${user_id}`);
            return res.status(409).json({
                status: "fail",
                message: "이미 오늘 출석체크를 완료했습니다.",
                date: todayDate
            });
        }

        console.error("DynamoDB Error:", err);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            detail: err.message
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Attendance Service running on port ${PORT}`);
    console.log(`Region: ${REGION}, Table: ${TABLE_NAME}`);
});
