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
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    # 0. Preflight (API Gateway)
    if event.get('httpMethod') == 'OPTIONS':
        return {"statusCode": 200, "headers": headers, "body": "OK"}

    # Body Parsing (for API requests)
    body = {}
    try:
        raw_body = event.get('body')
        if raw_body:
            body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except:
        pass

    action = body.get('action')

    # ====================================================
    # [Mode A] API Handler (from monthly_ranking.py)
    # Action이 존재하면 프론트엔드 API 요청으로 간주
    # ====================================================
    if action:
        try:
            r = get_redis_connection()

            # 1. 내 랭킹 조회
            if action == 'get_my_rank':
                user_id = body.get('user_id')
                target_month = body.get('target_month') # Not strictly used with rank:global but kept for interface compatibility
                
                if not user_id:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Missing user_id"})}

                rank_idx = r.zrevrank(RANKING_KEY, user_id)
                score = r.zscore(RANKING_KEY, user_id)
                
                my_rank = (rank_idx + 1) if rank_idx is not None else 0
                my_score = int(score) if score else 0
                
                return {
                    "statusCode": 200, "headers": headers,
                    "body": json.dumps({
                        "rank": my_rank, "score": my_score,
                        "month": target_month, "source": "Redis(rank:global)"
                    }, ensure_ascii=False)
                }

            # 2. 랭킹 리스트 조회
            elif action == 'get_ranking':
                target_month = body.get('target_month')
                
                top_list = r.zrevrange(RANKING_KEY, 0, 99, withscores=True)
                rankings = []
                for idx, (uid, sc) in enumerate(top_list):
                    rankings.append({
                        "rank": idx + 1, "user_id": uid, "score": int(sc)
                    })
                
                return {
                    "statusCode": 200, "headers": headers,
                    "body": json.dumps({
                        "rankings": rankings, "month": target_month,
                        "info": "Data from Redis rank:global (Settled)"
                    }, ensure_ascii=False)
                }

            # 3. 점수 업데이트 (Live Update)
            elif action == 'update_score':
                user_id = body.get('user_id')
                score = int(body.get('score', 0))
                
                if not user_id:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"msg": "user_id 없음"})}

                # 기존 점수와 비교 로직 (Optional) or 단순 덮어쓰기
                # 여기서는 GT(Greater Than) 옵션을 쓰는게 좋지만, 호환성을 위해 읽고 쓰기 or ZADD
                r.zadd(RANKING_KEY, {user_id: score})
                
                # TTL: 60 days
                r.expire(RANKING_KEY, 60 * 24 * 60 * 60) 

                return {
                    "statusCode": 200, "headers": headers,
                    "body": json.dumps({
                        "message": "Score updated", "user_id": user_id, "score": score
                    }, ensure_ascii=False)
                }

        except Exception as e:
            print(f"API Error: {str(e)}")
            return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}

    # ====================================================
    # [Mode B] System / Check Mode
    # Action이 없으면 기존 시스템 관리 로직으로 동작
    # ====================================================
    
    # 1. Check Mode
    if event.get('check_mode') == True:
        print("Check Mode Activated! Looking into Redis...")
        try:
            r = get_redis_connection()
            data = r.zrevrange(RANKING_KEY, 0, 9, withscores=True)
            result = [{"email": e, "score": s} for e, s in data]
            return {"status": "check_completed", "data": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # 2. Settlement Mode (Default)
    print("Normal Settlement Mode Start!")
    try:
        r = get_redis_connection()
        r.delete(RANKING_KEY) # 데이터 초기화

        today = datetime.now()
        # 지난 달 구하기 (1일 전의 달)
        target_month = (today.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')
        
        table = boto3.resource('dynamodb').Table(DYNAMODB_TABLE)
        # DynamoDB Scan (지난달 데이터)
        response = table.scan(FilterExpression=boto3.dynamodb.conditions.Attr('record_month').eq(target_month))
        items = response.get('Items', [])

        count = 0
        for item in items:
            if item.get('email'):
                r.zadd(RANKING_KEY, {item['email']: int(item.get('high_score', 0))})
                count += 1

        print(f"Settlement Completed. Processed {count} items.")
        return {"status": "success", "processed": count, "target_month": target_month}

    except Exception as e:
        print(f"Settlement Error: {str(e)}")
        return {"status": "error", "message": str(e)}
