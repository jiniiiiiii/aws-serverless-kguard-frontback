const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

// AWS Config
const REGION = process.env.AWS_REGION || "ap-northeast-2";

// Configure Client
const clientConfig = {
    region: REGION
};

// [Conditional Credentials]
// 로컬 개발 환경(Local)에서는 .env 파일의 Access Key를 사용합니다.
// ECS 환경(Production)에서는 Task Role을 사용하므로 credentials 설정을 생략합니다(자동 로드).
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    };
    console.log("🔹 Using explicit AWS credentials from environment variables.");
} else {
    console.log("🔹 Using AWS IAM Role (Instance Profile / Task Role).");
}

const client = new DynamoDBClient(clientConfig);

const dynamo = DynamoDBDocumentClient.from(client);

module.exports = { dynamo };
