const http = require('http');

// Helper to make HTTP requests
const request = (method, path, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

const runVerification = async () => {
    console.log("🚀 Starting Backend Verification...");

    // 1. Test POST /score
    console.log("\n1. Testing POST /score...");
    const scoreData = {
        userId: "test_user_" + Date.now(),
        nickname: "TestPlayer",
        score: Math.floor(Math.random() * 100)
    };

    try {
        const postResult = await request('POST', '/score', scoreData);
        console.log("✅ Score Submit Result:", postResult);
    } catch (e) {
        console.error("❌ Score Submit Failed:", e);
    }

    // 2. Test GET /ranking
    console.log("\n2. Testing GET /ranking...");
    try {
        const rankingResult = await request('GET', '/ranking');
        console.log("✅ Ranking Result:", JSON.stringify(rankingResult, null, 2));

        if (Array.isArray(rankingResult) && rankingResult.some(r => r.nickname === "TestPlayer")) {
            console.log("\n🎉 Verification SUCCESS: Test score found in ranking!");
        } else {
            console.log("\n⚠️ Note: If this is the first run, GSI propagation might take a moment. Or check if the score was high enough to be in Top 10.");
        }

    } catch (e) {
        console.error("❌ Ranking Fetch Failed:", e);
    }
};

runVerification();
