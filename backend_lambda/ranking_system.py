import boto3
import redis
import json
import os
from datetime import datetime, timedelta

# --- 설정 정보 ---
REDIS_HOST = os.environ.get("REDIS_HOST", "kg-db-elc-rank-ap-ne-2-1nphvk.serverless.apn2.cache.amazonaws.com")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
RANKING_KEY = "rank:global"
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "KG-db-ddb-ap-ne-2-highscore")

def get_redis_connection():
    return redis.StrictRedis(
        host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, 
        ssl=True, ssl_cert_reqs=None
    )

def lambda_handler(event, context):
    # 1. 만약 테스트 이벤트에서 'check_mode'를 보냈다면?
    if event.get('check_mode') == True:
        print("Check Mode Activated! Looking into Redis...")
        try:
            r = get_redis_connection()
            data = r.zrevrange(RANKING_KEY, 0, 9, withscores=True) # 상위 10명만 확인
            result = [{"email": e, "score": s} for e, s in data]
            return {"status": "check_completed", "data": result}
        except Exception as e:
            return {"status": "check_error", "message": str(e)}

    # 2. 그게 아니면 평소처럼 정산 로직 실행
    print("Normal Settlement Mode Start!")
    try:
        r = get_redis_connection()
        r.delete(RANKING_KEY) # 초기화

        today = datetime.now()
        target_month = (today.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')
        
        table = boto3.resource('dynamodb').Table(DYNAMODB_TABLE)
        # DynamoDB Scan
        items = table.scan(FilterExpression=boto3.dynamodb.conditions.Attr('record_month').eq(target_month)).get('Items', [])

        count = 0
        for item in items:
            if item.get('email'):
                r.zadd(RANKING_KEY, {item['email']: int(item.get('high_score', 0))})
                count += 1

        print(f"Settlement Done. Added {count} users to Redis.")
        return {"status": "success", "processed": count, "target_month": target_month}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"status": "error", "message": str(e)}
