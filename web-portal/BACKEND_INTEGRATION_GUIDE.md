# 추후 백엔드 연결 가이드 (Frontend Integration Guide)

이 문서는 추후 AWS 백엔드(API Gateway, Lambda, DynamoDB, Cognito, Redis)가 구축된 후, 프론트엔드 코드를 어떻게 수정해야 하는지 설명합니다.

프론트엔드 UI(`Home`, `MyPage` 등)는 수정할 필요가 없으며, 데이터 통신을 담당하는 **아래 두 파일만 수정**하면 됩니다.

---

## 1. API 서비스 (`src/services/api.js`)

현재는 S3의 정적 JSON 파일(`/s3-my-page/...`)을 읽고 있습니다. 이를 API Gateway 엔드포인트 호출로 변경해야 합니다.

### 환경 변수 설정
`src/services/api.js` 상단에 API 주소를 설정합니다. (보통 `.env` 파일 사용)
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // 예: https://api.game.com/v1
```

### 코드 수정 예시 (Before vs After)

#### [Before] S3 정적 파일 읽기 (현재)
```javascript
getUserStats: async () => {
    // S3에 있는 정적 JSON 조회
    const response = await fetch('/s3-my-page/stats.json');
    return await response.json();
},
```

#### [After] 실제 백엔드 API 호출 (수정 목표)
```javascript
getUserStats: async (token) => {
    // API Gateway 호출 (DynamoDB 실시간 조회)
    const response = await fetch(`${API_BASE_URL}/users/me/stats`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // 로그인 토큰 필요
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) throw new Error('API Error');
    return await response.json();
},
```

> **수정 대상 함수 목록:**
> *   `getUserProfile` -> `GET /users/me`
> *   `getUserStats` -> `GET /users/me/stats`
> *   `getUserCharacters` -> `GET /users/me/characters`
> *   `getNotices` -> `GET /notices` (선택 사항, S3 방식 유지 가능)

---

## 2. 인증 관리 (`src/contexts/AuthContext.jsx`)

(내용 유지: Cognito 연동 부분)

---

## 3. 랭킹 시스템 (Redis 실시간 랭킹 연동)
현재 랭킹 페이지는 `public/rank/top100.json` (정적 파일)을 읽고 있습니다. 이를 **Redis 실시간 랭킹**으로 전환하기 위한 상세 가이드입니다.

### 3.1 아키텍처 (Backend Architecture)
1.  **Redis (ElastiCache)**: `Sorted Set` 자료구조를 사용하여 유저의 점수와 순위를 실시간으로 관리합니다.
2.  **Lambda**: API Gateway 요청을 받아 Redis에 접속하여 랭킹 데이터를 조회합니다.
3.  **DynamoDB**: Redis에는 `userId`만 저장하므로, 닉네임과 아바타 등 상세 정보는 DynamoDB에서 조회하여 병합합니다.

### 3.2 Redis 데이터 구조 및 명령어
*   **Key**: `leaderboard` (Sorted Set)
*   **점수 등록 (Upsert)**: `ZADD leaderboard {score} {userId}`
    *   예: `ZADD leaderboard 9850 user_123`
*   **Top 100 조회**: `ZREVRANGE leaderboard 0 99 WITHSCORES`
*   **내 순위 조회**: `ZREVRANK leaderboard {userId}`

### 3.3 백엔드 구현 로직 (Lambda)

#### Option A: 실시간 API 방식 (기본)
위 Node.js 예시처럼, 요청이 올 때마다 Redis를 조회하여 반환합니다. 가장 표준적인 방식입니다.

#### Option B: 하이브리드 방식 (Redis + S3 스냅샷) [추천]
사용자가 질문하신 것처럼 **"Lambda에서 S3로 파일을 보내주는"** 방식입니다.
랭킹은 1초마다 변할 필요가 없으므로, Lambda가 주기적으로(예: 1시간마다 or 정산 시) Redis 랭킹을 `top100.json` 파일로 만들어 S3에 업로드합니다.
*   **장점**: 프론트엔드는 지금처럼 S3만 바라보면 되므로 속도가 매우 빠르고 비용이 저렴합니다.
*   **구현**: `User Action(점수획득)`과 `Ranking Upload(S3업로드)` 로직을 분리하는 것이 좋습니다.

**[Python Lambda 수정 예시]**
사용자분의 Python 코드를 기반으로, `action='upload_ranking'` 이벤트가 오면 S3에 업로드하도록 수정했습니다.

```python
import redis
import json
import boto3
from datetime import datetime

# ... (Redis 설정 유지) ...
s3 = boto3.client('s3')
BUCKET_NAME = "my-game-web-portal-bucket" # 프론트엔드 버킷명

def lambda_handler(event, context):
    try:
        # ... (Redis 연결 유지) ...

        action = event.get('action', 'save') 

        # [NEW] 랭킹 S3 업로드 모드 (EventBridge 등으로 주기적 호출)
        if action == 'upload_ranking':
            # 1. Redis에서 Top 100 조회
            top_rankers_raw = r.zrevrange(current_month_key, 0, 99, withscores=True)
            
            # 2. JSON 구조 생성
            ranking_list = []
            for i, (user, score) in enumerate(top_rankers_raw):
                ranking_list.append({
                    "rank": i + 1,
                    "username": user, # 실제론 DB에서 닉네임 조회 필요
                    "score": int(score),
                    "role": "Warrior" # DB 정보 병합 필요
                })
            
            final_json = {
                "updatedAt": datetime.now().isoformat(),
                "top3": ranking_list[:3],
                "others": ranking_list[3:]
            }

            # 3. S3에 top100.json 저장 (덮어쓰기)
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key='rank/top100.json', # 프론트엔드가 읽는 경로
                Body=json.dumps(final_json, ensure_ascii=False),
                ContentType='application/json',
                CacheControl='max-age=60' # 1분 캐시
            )
            
            return {"status": "Ranking Uploaded to S3"}

        # ... (기존 save 로직 유지) ...
```

### 3.4 프론트엔드 코드 수정 (`src/services/api.js`)

#### [Before] S3 정적 파일 읽기 (현재)
```javascript
getGlobalRanking: async () => {
    // S3에 미리 만들어진 파일 읽기
    const response = await fetch('/rank/top100.json');
    return await response.json();
},
```

#### [After] Redis API 호출 (미래)
```javascript
getGlobalRanking: async () => {
    // API Gateway -> Lambda -> Redis (실시간)
    // 랭킹은 공개 데이터이므로 보통 인증 토큰 없이 호출합니다.
    const response = await fetch(`${API_BASE_URL}/ranking/top100`);
    
    if (!response.ok) return { top3: [], others: [] };
    return await response.json();
},
```

---

## 4. 요약 프로세스

1.  AWS 백엔드 구축 완료 (API Gateway, Redis 연결됨).
2.  `api.js`의 `getGlobalRanking` 함수 내부 주소를 실제 API URL로 변경.
3.  끝. (Ranking.jsx 화면 코드는 수정할 필요 없음)
