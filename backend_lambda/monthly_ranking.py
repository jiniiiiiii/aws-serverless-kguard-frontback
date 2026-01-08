import boto3
import json
import redis
import os
from datetime import datetime, timedelta

# --- 설정 ---
# 환경 변수에서 가져오거나 기본값 사용
REDIS_HOST = os.environ.get("REDIS_HOST", "kg-db-elc-rank-ap-ne-2-1nphvk.serverless.apn2.cache.amazonaws.com")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

# Redis Key (Matched with ranking_system.py)
RANKING_KEY = "rank:global"

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
        # Body Parsing
        try:
            body = json.loads(event.get('body', '{}'))
            if isinstance(body, str):
                body = json.loads(body)
        except:
            body = {}
            
        action = body.get('action', 'update_score') 

        # ==========================================
        # [기능 1] 내 랭킹 조회 (월간)
        # ==========================================
        if action == 'get_my_rank':
            user_id = body.get('user_id') 
            target_month = body.get('target_month') # "YYYY-MM" (Optional)

            # 타겟 월이 없으면 -> 지난 달을 기본값으로 할지, 이번 달을 할지?
            # 요청에 따라 다르겠지만, 보통 "내 성적"은 이번달 걸 궁금해할 수 있음.
            # 하지만 랭킹 페이지 정책이 "지난 달"이므로, UI에서 target_month를 보내줄 것임.
            # 여기서는 "값이 없으면 이번 달"로 처리하고 UI 제어를 따름.
            if not target_month:
                target_month = datetime.now().strftime('%Y-%m')

            # ranking_system.py uses "rank:global" for the settled monthly ranking.
            redis_key = RANKING_KEY

            if not user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Missing user_id"})}

            # Redis 조회
            rank_idx = r.zrevrank(redis_key, user_id)
            score = r.zscore(redis_key, user_id)
            
            my_rank = (rank_idx + 1) if rank_idx is not None else 0
            my_score = int(score) if score else 0
            
            return {
                "statusCode": 200, 
                "headers": headers,
                "body": json.dumps({
                    "rank": my_rank,
                    "score": my_score,
                    "month": target_month,
                    "source": "Redis(rank:global)"
                }, ensure_ascii=False)
            }

        # ==========================================
        # [기능 2] 랭킹 리스트 조회 (월간 Top 100)
        # ==========================================
        elif action == 'get_ranking':
            target_month = body.get('target_month') # "YYYY-MM"
            if not target_month:
                # Default: Last Month (요청사항 반영)
                # 오늘이 2026-01-07이면 -> 2025-12
                # 날짜 계산
                today = datetime.now()
                first = today.replace(day=1) 
                last_month_obj = first - timedelta(days=1)
                target_month = last_month_obj.strftime("%Y-%m")

            # ranking_system.py populates "rank:global" with Last Month's certified data.
            # We read from that key regardless of target_month param, 
            # because that is where the monthly data lives.
            redis_key = RANKING_KEY

            # Range 조회
            top_list = r.zrevrange(redis_key, 0, 99, withscores=True)
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
                "body": json.dumps({
                    "rankings": rankings, 
                    "month": target_month,
                    "info": "Data from Redis rank:global (Settled)"
                }, ensure_ascii=False)
            }

        # ==========================================
        # [기능 3] 점수 업데이트
        # ==========================================
        else:
            # 게임이 끝난 직후 호출됨 -> 항상 "이번 달"에 기록해야 함.
            user_id = body.get('user_id')
            score = int(body.get('score', 0))
            
            if not user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"msg": "user_id 없음"})}

            # 현재 월 구하기
            current_month = datetime.now().strftime('%Y-%m')
            redis_key = f"rank:monthly:{current_month}"

            # Redis 저장 (ZADD)
            # 기존 점수보다 높을 때만 업데이트하는 로직이 필요하면 GT 옵션 사용하지만,
            # 보통 Redis Sorted Set은 덮어쓰기임.
            # 최고 점수 유지 정책이라면:
            current_score = r.zscore(redis_key, user_id)
            if current_score and int(current_score) >= score:
                # 이미 더 높은 점수가 있으면 무시
                pass
            else:
                r.zadd(redis_key, {user_id: score})
                # TTL 연장 (2달 = 60일) -> 월 지나고도 랭킹 확인 가능해야 하므로 넉넉히.
                r.expire(redis_key, 60 * 24 * 60 * 60) 

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "message": "Monthly Score updated", 
                    "user_id": user_id, 
                    "month": current_month,
                    "score": score
                }, ensure_ascii=False)
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }
