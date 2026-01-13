import json
import boto3
import os
from datetime import datetime
from boto3.dynamodb.conditions import Attr
# 현재 문제점 : 로그인 세션이 유지가 안됨. -> 이게 백단인지, 프론트단 문제인지 모르겠음. 


# --- 설정 (AWS Lambda 환경 변수) ---
USERS_DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "KG-db-ddb-ap-ne-2-userdata")
HIGHSCORE_DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "KG-db-ddb-ap-ne-2-highscore")
COGNITO_REGION = os.environ.get("COGNITO_REGION", "ap-northeast-2")

# 랭킹 람다(이름: 하이스코어 -> 하이스코어 ddb에서 정보 가져올거임. )
# users_ddb에서는 계정명, 재화정보, 가입 날짜 가져옴. 
HIGHSCORE_LAMBDA_NAME = os.environ.get("LAMBDA_NAME", "KG-db-pri-Lambda-ap-ne-2-highscore")

# AWS 리소스
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(USERS_DYNAMODB_TABLE)
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    try:
        # 0. Preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {"statusCode": 200, "headers": headers, "body": "OK"}
        
        import jwt
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not auth_header.startswith('Bearer '):
             return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Missing token"})}
        
        token = auth_header.split(' ')[1]
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub') or decoded.get('username')
        if not user_id:
             return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Invalid token payload"})}

        # 2. DynamoDB 조회 (기본 정보)
        response = table.get_item(Key={'user_id': user_id})
        item = response.get('Item')
        
        if not item:
            new_user = {
                'user_id': user_id,
                'gold': 0, 
                'high_score': 0,
                'level': 1,
                'email': decoded.get('email', ''),
                'account_created_at': datetime.now().isoformat()
            }
            table.put_item(Item=new_user)
            item = new_user

        # 2-2. HighScore 테이블에서 직접 최고 점수 조회 (Source of Truth)
        # 사용자별 점수가 계속 쌓이는 구조이므로 직접 쿼리해서 max값을 가져옴
        highscore_table = dynamodb.Table(HIGHSCORE_DYNAMODB_TABLE)
        # [FIX] 토큰에는 email이 없을 수 있음(AccessToken 등). 대신 DB에 저장된 확실한 이메일 사용.
        target_email = item.get('email') or decoded.get('email') #or user_id

        # [DEBUG] 디버그 정보 수집
        debug_log = {
            "target_email": target_email,
            "highscore_table": HIGHSCORE_DYNAMODB_TABLE,
            "lambda_name": HIGHSCORE_LAMBDA_NAME,
            "scan_count": 0,
            "error": None,
            "invoke_error": None
        }

        real_high_score = 0
        try:
            # Email이 파티션 키라고 가정하고 쿼리 (가장 효율적)
            # 만약 스키마가 다르면 Scan을 해야할 수도 있음. 일단은 Scan으로 안전하게 구현 (데이터가 적다는 가정 하에)
            # 추후 데이터가 많아지면 Query로 변경 권장 (GSI 등 활용)
            
            # 방법: 전체 스캔 후 내 이메일 필터링 (확실한 방법)
            # 주의: 데이터가 매우 많으면 비효율적이나, 현재 단계에서는 가장 정확함
            scan_params = {
                'FilterExpression': boto3.dynamodb.conditions.Attr('email').eq(target_email),
                'ProjectionExpression': 'high_score'
            }
            hs_response = highscore_table.scan(**scan_params)
            hs_items = hs_response.get('Items', [])
            
            debug_log['scan_count'] = len(hs_items)
            
            # 페이지네이션 처리 (혹시 데이터가 많을 경우)
            while 'LastEvaluatedKey' in hs_response:
                hs_response = highscore_table.scan(
                    **scan_params,
                    ExclusiveStartKey=hs_response['LastEvaluatedKey']
                )
                items = hs_response.get('Items', [])
                hs_items.extend(items)
                debug_log['scan_count'] += len(items)
                
            # Max 값 계산
            if hs_items:
                max_score = 0
                for hi in hs_items:
                    s = hi.get('high_score', 0)
                    # Decimal 타입 변환 처리
                    try:
                        s = int(s)
                    except:
                        s = 0
                    if s > max_score:
                        max_score = s
                real_high_score = max_score
                
        except Exception as e:
            print(f"Direct HighScore Query Failed: {e}")
            debug_log['error'] = str(e)
            # 실패하면 userdata(기존) 점수 유지
            real_high_score = int(item.get('high_score', 0))

        # 3. 랭킹 람다 호출 (Lambda Invoke)
        my_rank = 0
        my_score = real_high_score # 직접 조회한 최고 점수 우선 적용

        try:
            invoke_payload = {
                "body": json.dumps({
                    "action": "get_my_rank", 
                    "user_id": user_id,
                    "email": decoded.get('email', '') # 이메일 정보도 전달 (high_score_lambda가 email로 찾을 수도 있음)
                })
            }
            
            # [FIX] RANKING_LAMBDA_NAME -> HIGHSCORE_LAMBDA_NAME (오타 수정)
            invoke_response = lambda_client.invoke(
                FunctionName=HIGHSCORE_LAMBDA_NAME,
                InvocationType='RequestResponse',
                Payload=json.dumps(invoke_payload)
            )
            
            resp_payload = json.loads(invoke_response['Payload'].read())
            
            # 응답 구조 확인 (API Gateway 형식인 경우 body를 한 번 더 파싱해야 함)
            if resp_payload.get("statusCode") == 200:
                rank_body = resp_payload.get("body")
                if isinstance(rank_body, str):
                    rank_body = json.loads(rank_body)
                
                my_rank = rank_body.get("rank", 0)
                # 랭킹 람다에서 score도 최신값으로 줄 수 있으므로 업데이트 (하지만 직접 조회가 우선이므로 로직 확인)
                # 직접 조회가 성공했으면(real_high_score > 0) 그걸 쓰고, 아니면 람다 값 사용
                if real_high_score == 0 and rank_body.get("score"):
                    my_score = rank_body.get("score")
                    
        except Exception as e:
            msg = f"HighScore Lambda Invoke Failed: {e}"
            print(msg)
            debug_log['invoke_error'] = str(e)
            pass

        # 4. 결과 병합 및 반환
        # 4. 결과 병합 및 반환
        result = {
            "highScore": my_score,
            "rank": my_rank,
            "gold": int(item.get('gold', 0)),
            "cash": int(item.get('cash', 0)),  # [NEW] Cash 필드 추가
            "accountCreatedAt": item.get('account_created_at', datetime.now().isoformat()),
            "region": COGNITO_REGION,
            "email": item.get('email', ''),
            "debug": debug_log, # 디버깅용 필드 추가
            "unlocked_characters": [] # 기본값
        }

        # [Character Unlock Logic]
        # DynamoDB에서 가져온 unlocked_characters 처리
        raw_chars = item.get('unlocked_characters', [])
        
        # boto3 resource는 보통 타입을 자동 변환해주지만, 
        # 만약 [{'S': 'Char0'}] 형태로 저장되어 있거나 호환성 문제가 있을 경우를 대비해 안전하게 처리
        clean_chars = []
        if isinstance(raw_chars, list):
            for c in raw_chars:
                if isinstance(c, str):
                    clean_chars.append(c)
                elif isinstance(c, dict) and 'S' in c:
                    clean_chars.append(c['S'])
                elif isinstance(c, dict):
                     # 그 외 딕셔너리 형태면 값만 추출 시도 or 무시
                     pass
        
        # Char0 (기본 캐릭터)는 무조건 해금 처리 (Safety Net)
        if "Char0" not in clean_chars:
             clean_chars.append("Char0")
             
        result["unlocked_characters"] = clean_chars
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(result)
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }
