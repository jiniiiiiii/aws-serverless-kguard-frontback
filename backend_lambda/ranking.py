import redis
import json
from datetime import datetime

# Redis 설정
REDIS_HOST = "kg-db-elc-rank-ap-ne-2-1nphvk.serverless.apn2.cache.amazonaws.com"
REDIS_PORT = 6379

def lambda_handler(event, context):
    # --- [CORS 설정을 위한 공통 헤더] ---
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    try:
        # 1. Redis 연결
        r = redis.StrictRedis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            decode_responses=True, 
            ssl=True, 
            ssl_cert_reqs=None
        )
        
        # 2. 현재 월 키 생성
        current_month_key = datetime.now().strftime("rank:%Y:%m")
        
        # 3. Request Body 파싱 (400 에러 방지 핵심)
        # API Gateway의 Proxy Integration은 body를 문자열로 줄 때도 있고, 아닐 때도 있음.
        body = event.get('body')
        if body is not None:
            if isinstance(body, str):
                try:
                    payload = json.loads(body)
                except json.JSONDecodeError:
                    print("JSON Decode Error: Body is not valid JSON")
                    payload = {} 
            else:
                payload = body
        else:
            payload = event
            
        action = payload.get('action', 'save') 

        # --- [조회 모드: 랭킹 리스트 가져오기] --- (이게 꼭 있어야 함!)
        if action == 'get_ranking' or action == 'settlement':
            top_rankers_raw = r.zrevrange(current_month_key, 0, 9, withscores=True)
            
            ranking_list = []
            for i, (user, score) in enumerate(top_rankers_raw):
                ranking_list.append({
                    "rank": i + 1,
                    "user_id": user,
                    "score": int(score)
                })
            
            result = {
                "status": "Success",
                "mode": "Ranking_View",
                "rankings": ranking_list
            }

        # --- [저장 모드: 점수 기록] ---
        else:
            user_id = payload.get('user_id', 'unknown_player')
            score = payload.get('score', 0)
            
            # Redis에 점수 저장
            r.zadd(current_month_key, {user_id: score})
            r.expire(current_month_key, 5184000) # 60일 유지
            
            # 내 등수 확인
            my_rank_idx = r.zrevrank(current_month_key, user_id)
            my_rank = my_rank_idx + 1 if my_rank_idx is not None else 0
            
            result = {
                "status": "Success",
                "mode": "Score_Save",
                "player": user_id,
                "current_rank": my_rank,
                "score": score
            }

        # 4. 결과 반환
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(result, ensure_ascii=False)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }