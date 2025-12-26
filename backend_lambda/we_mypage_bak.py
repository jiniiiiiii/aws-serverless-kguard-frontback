import json
import boto3
import redis
import requests
import os
import base64
from datetime import datetime

# --- 설정 (AWS Lambda 환경 변수에서 가져옴) ---
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "KG-db-ddb-ap-ne-2-userdata")
REDIS_HOST = os.environ.get("REDIS_HOST", "kg-db-elc-rank-ap-ne-2-1nphvk.serverless.apn2.cache.amazonaws.com")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

# AWS 연결
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DYNAMODB_TABLE)
r = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, ssl=True, ssl_cert_reqs=None)

def decode_jwt_payload_unsafe(token):
    """라이브러리 없이 JWT 페이로드 디코딩 (서명 검증 생략)"""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1]
        # Base64 패딩 보정
        payload_b64 += '=' * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        return json.loads(payload_json)
    except Exception as e:
        print(f"[JWT Decode Error] {e}")
        return None

def lambda_handler(event, context):
    # --- [CORS 헤더 정의] ---
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    try:
        # 0. Preflight(OPTIONS) 요청 처리 (인증 건너뛰기)
        if event.get('httpMethod') == 'OPTIONS':
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"message": "CORS preflight successful"})
            }

        # 1. 헤더에서 토큰 추출
        req_headers = event.get('headers', {})
        auth_header = req_headers.get('Authorization', '') or req_headers.get('authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Missing or invalid token"})}
        
        token = auth_header.split(' ')[1]
        
        # 2. 토큰 디코딩 (수동)
        payload = decode_jwt_payload_unsafe(token)
        if not payload or 'sub' not in payload:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Invalid token"})}
            
        user_id = payload['sub']

        # 3. DynamoDB에서 유저 정보(예: 재화 gold) 조회
        try:
            response = table.get_item(Key={'user_id': user_id})
            item = response.get('Item')
            
            # [자동 생성 로직] 만약 DB에 유저가 없으면 초기값 생성
            if not item:
                print(f"Creating new user profile for {user_id}")
                new_user = {
                   'user_id': user_id,
                   'gold': 0,
                   'level': 1,
                   'created_at': datetime.now().isoformat()
                }
                table.put_item(Item=new_user)
                item = new_user
                
            gold = int(item.get('gold', 0))
        except Exception as e:
            print(f"[DynamoDB Error] {e}")
            gold = 0 # 에러나면 그냥 0으로 처리

        # 4. Redis에서 실시간 랭킹 및 점수 조회
        current_month_key = datetime.now().strftime("rank:%Y:%m")
        try:
            score_val = r.zscore(current_month_key, user_id)
            high_score = int(score_val) if score_val else 0
        except Exception as e:
            print(f"[Redis Error] {e}")
            high_score = 0
            
        # 내 등수 확인
        try:
            my_rank_index = r.zrevrank(current_month_key, user_id)
            if my_rank_index is None:
                my_rank = 0
                top_percent = 0
            else:
                my_rank = my_rank_index + 1
                total_players = r.zcard(current_month_key)
                top_percent = round((my_rank / total_players) * 100, 1)
        except:
             my_rank = 0
             top_percent = 0

        # 5. 응답 생성
        result = {
            "highScore": high_score,
            "rank": my_rank,
            "totalPlayers": 0, # Redis 연결 에러 대비 안전값
            "topPercent": top_percent,
            "gold": gold
        }
        
        # totalPlayers 보정
        try:
             result["totalPlayers"] = r.zcard(current_month_key) or 0
        except:
             pass

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(result)
        }

    except Exception as e:
        print(f"CRITICAL Error: {str(e)}")
        # 에러 발생 시에도 반드시 CORS 헤더 포함!
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Internal Server Error: {str(e)}"})
        }
