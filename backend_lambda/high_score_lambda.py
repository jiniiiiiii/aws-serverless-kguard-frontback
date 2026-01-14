import boto3
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    target_table = dynamodb.Table('KG-db-ddb-ap-ne-2-highscore')

    # API Gateway 응답을 위한 공통 헤더
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
    
    # Preflight (OPTIONS) 요청 처리
    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": headers,
            "body": "OK"
        }

    # 한국 표준시(KST) 설정
    kst = timezone(timedelta(hours=9))
    now = datetime.now(kst)
    
    timestamp_val = now.strftime('%Y-%m-%d %H:%M:%S')
    record_month = now.strftime('%Y-%m')

    # TTL 계산 (현재 시간 + 60일)
    expire_at_datetime = now + timedelta(days=60)
    ttl_value = int(expire_at_datetime.timestamp())

    try:
        # 1. DynamoDB Stream을 통해 호출된 경우 (기존 로직)
        if 'Records' in event:
            for record in event.get('Records', []):
                if record['eventName'] in ['INSERT', 'MODIFY']:
                    new_image = record['dynamodb'].get('NewImage', {})
                    email = new_image.get('email', {}).get('S')
                    score = new_image.get('high_score', {}).get('N')
                    region = new_image.get('created_at', {}).get('S')

                    if email:
                        target_table.put_item(
                            Item={
                                'email': email,
                                'timestamp': timestamp_val,
                                'record_month': record_month,
                                'high_score': score,
                                'region': region,
                                'expire_at': ttl_value
                            }
                        )
            # 스트림 처리 성공 시 문자열 반환
            return "Success"

        # 2. API Gateway를 통해 직접 호출된 경우 (추가된 대응 로직)
        else:
            # API Gateway로부터 들어온 body 파싱
            try:
                if event.get('body'):
                    body = json.loads(event.get('body'))
                    if isinstance(body, str):
                        body = json.loads(body)
                else:
                    body = {}
            except Exception:
                body = {}

            action = body.get('action', 'save_score')
            
            # ==========================================
            # [기능 1] 전체 랭킹 조회 (1~100위)
            # ==========================================
            if action == 'get_ranking':
                target_region = body.get('region') # Optional
                print(f"[DEBUG] get_ranking called. target_region: {target_region}, body: {body}")

                # DynamoDB Scan
                response = target_table.scan()
                items = response.get('Items', [])
                print(f"[DEBUG] Total items scanned: {len(items)}")
                
                # [Filter] 리전 파라미터가 있으면 해당 리전만 필터링
                if target_region:
                    items = [i for i in items if i.get('region') == target_region]
                    print(f"[DEBUG] Items after filter ({target_region}): {len(items)}")

                # 점수 기준 내림차순 정렬
                def get_score(item):
                    try:
                        return int(item.get('high_score', 0))
                    except:
                        return 0

                sorted_items = sorted(items, key=get_score, reverse=True)
                top_100 = sorted_items[:100]

                rankings = []
                for idx, item in enumerate(top_100):
                    rankings.append({
                        "rank": idx + 1,
                        "user_id": item.get('email', 'Unknown'),
                        "score": get_score(item),
                        "region": item.get('region', 'Unknown')
                    })
                
                return {
                    "statusCode": 200,
                    "headers": headers,
                    "body": json.dumps({"rankings": rankings}, cls=DecimalEncoder, ensure_ascii=False)
                }

            # ==========================================
            # [기능 2] 내 랭킹 조회
            # ==========================================
            elif action == 'get_my_rank':
                email_to_find = body.get('email') or body.get('user_id')
                
                if not email_to_find:
                    return {
                        "statusCode": 400, "headers": headers, "body": json.dumps({"error": "email 누락"})
                    }

                # 전체 랭킹 계산
                response = target_table.scan()
                items = response.get('Items', [])

                def get_score(item):
                    try:
                        return int(item.get('high_score', 0))
                    except:
                        return 0

                sorted_items = sorted(items, key=get_score, reverse=True)
                
                my_rank = 0
                my_score = 0
                found = False

                for idx, item in enumerate(sorted_items):
                    if item.get('email') == email_to_find:
                        my_rank = idx + 1
                        my_score = get_score(item)
                        found = True
                        break
                
                if not found:
                    return {
                         "statusCode": 200, "headers": headers, "body": json.dumps({"rank": 0, "score": 0, "message": "Record not found"})
                    }

                return {
                    "statusCode": 200,
                    "headers": headers,
                    "body": json.dumps({
                        "rank": my_rank,
                        "score": my_score,
                        "user_id": email_to_find
                    }, cls=DecimalEncoder, ensure_ascii=False)
                }

            # ==========================================
            # [기능 3] 점수 저장 (기본 동작)
            # ==========================================
            else:
                email = body.get('email')
                score = body.get('high_score')
                region = body.get('region', 'ap-northeast-2')
    
                if not email:
                    return {
                        "statusCode": 400,
                        "headers": headers,
                        "body": json.dumps({"error": "email 누락"})
                    }
    
                # 데이터 저장
                target_table.put_item(
                    Item={
                        'email': email,
                        'timestamp': timestamp_val,
                        'record_month': record_month,
                        'high_score': score,
                        'region': region,
                        'expire_at': ttl_value
                    }
                )
    
                return {
                    "statusCode": 200,
                    "headers": headers,
                    "body": json.dumps({
                        "status": "Success",
                        "message": "데이터가 highscore 테이블에 성공적으로 기록되었습니다.",
                        "expire_at": ttl_value
                    }, cls=DecimalEncoder, ensure_ascii=False)
                }

    except Exception as e:
        print(f"Error: {str(e)}")
        # 에러 발생 시에도 API Gateway 형식에 맞춰 반환
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }