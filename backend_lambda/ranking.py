import boto3
import json
import redis
import os
from datetime import datetime

# --- 설정 ---
# 환경 변수에서 가져오거나 기본값 사용
REDIS_HOST = os.environ.get("REDIS_HOST", "kg-db-elc-rank-ap-ne-2-1nphvk.serverless.apn2.cache.amazonaws.com")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
USERS_DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", 'KG-db-ddb-ap-ne-2-userdata')

# Redis 키 (하나로 통일)
RANKING_KEY = "rank:global"

# 연결 객체
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(USERS_DYNAMODB_TABLE)

# Redis 연결
def get_redis_connection():
    return redis.StrictRedis(
        host=REDIS_HOST, 
        port=REDIS_PORT, 
        decode_responses=True, 
        ssl=True, 
        ssl_cert_reqs=None
    )

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }
    
    # 0. Preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {"statusCode": 200, "headers": headers, "body": "OK"}

    try:
        r = get_redis_connection()
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'update_score') 

        # ==========================================
        # [기능 1] 내 랭킹 조회 (MyPage용)
        # ==========================================
        if action == 'get_my_rank':
            user_id = body.get('user_id') 
            if not user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Missing user_id"})}

            # Redis 조회
            rank_idx = r.zrevrank(RANKING_KEY, user_id)
            score = r.zscore(RANKING_KEY, user_id)
            
            my_rank = (rank_idx + 1) if rank_idx is not None else 0
            my_score = int(score) if score else 0
            
            return {
                "statusCode": 200, 
                "headers": headers,
                "body": json.dumps({
                    "rank": my_rank,
                    "score": my_score
                })
            }

        # ==========================================
        # [기능 2] 랭킹 리스트 조회 (Global Ranking용)
        # ==========================================
        elif action == 'get_ranking':
            top_list = r.zrevrange(RANKING_KEY, 0, 99, withscores=True)
            rankings = []
            for idx, (uid, sc) in enumerate(top_list):
                rankings.append({
                    "rank": idx + 1,
                    "user_id": uid,
                    "score": int(sc)
                })
            
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"rankings": rankings})
            }

        # ==========================================
        # [기능 3] 점수 업데이트 (게임 끝난 후)
        # ==========================================
        else:
            user_id = body.get('user_id')
            score = int(body.get('score', 0))
            email = body.get('email', '')

            if not user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"msg": "user_id 없음"})}

            # A. DynamoDB 저장
            table.update_item(
                Key={'user_id': user_id},
                UpdateExpression="SET high_score = :s, email = :e, updated_at = :t",
                ExpressionAttributeValues={
                    ':s': score,
                    ':e': email,
                    ':t': datetime.now().isoformat()
                }
            )

            # B. Redis 저장
            r.zadd(RANKING_KEY, {user_id: score})
            
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"message": "Score updated", "user_id": user_id, "score": score})
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }
