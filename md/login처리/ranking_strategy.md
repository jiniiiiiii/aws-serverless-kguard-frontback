# 랭킹 데이터 통합 전략 (MyPage Ranking Strategy)

사용자님이 질문하신 **"ranking.py를 이용해서 마이페이지 랭킹을 불러올 수 없을까?"**에 대한 분석과 추천 전략입니다.

---

## 1. 현재 상황 분석
*   **`web_mypage.py` (마이페이지)**: 현재 DynamoDB에서 유저 정보를 매우 빠르게 가져옵니다. 하지만 Redis 연결 코드가 포함되면서 VPC 설정 문제로 타임아웃(속도 저하)을 겪었습니다.
*   **`ranking.py` (랭킹)**: Redis(ElastiCache)에 특화된 람다로, VPC 내부에 있어야만 작동합니다.

이 두 기능을 합칠지, 나눌지에 따라 3가지 전략이 가능합니다.

---

## 2. 가능한 전략 비교

### 전략 A: 람다 통합 (기존 방식)
`web_mypage.py` 안에서 Redis까지 모두 조회해서 한 번에 내려주는 방식입니다.
*   **장점**: 프론트엔드에서 API를 한 번만 호출하면 됩니다.
*   **단점**: 
    *   **속도 문제**: 마이페이지 람다가 VPC 안에 들어가야 하므로, 단순히 내 이름/레벨만 보고 싶을 때도 Redis 연결을 위해 "느린 부팅(Cold Start)"을 겪을 수 있습니다.
    *   **장애 전파**: Redis가 죽으면 마이페이지 전체가 500 에러로 터질 수 있습니다.

### 전략 B: 람다 간 호출 (Lambda to Lambda)
`web_mypage.py`가 실행 도중에 `ranking.py` 람다를 호출(Invoke)하는 방식입니다.
*   **장점**: 코드를 `ranking.py` 한 곳에서만 관리하면 됩니다.
*   **단점**: 
    *   **비용/속도 2배**: 람다 A가 람다 B를 기다리는 동안 요금이 이중으로 나갑니다. 속도도 가장 느립니다. **비추천**입니다.

### 전략 C: 프론트엔드 분리 호출 (추천 ⭐)
프론트엔드(`MyPage.jsx`)에서 **두 번 요청**을 보내는 방식입니다.
1.  `api.getUserStats()` -> `web_mypage.py` (DynamoDB): 0.1초 만에 이름, 레벨, 골드 표시.
2.  `api.getMyRank()` -> `ranking.py` (Redis): 1~2초 뒤에 "내 순위" 표시.

*   **장점**:
    1.  **체감 속도 최상**: 사용자는 들어오자마자 마이페이지 화면을 볼 수 있습니다. (랭킹만 `Loading...` 뜨다가 나중에 뜸)
    2.  **안정성**: 랭킹 서버(Redis)가 터져도, 내 정보(DynamoDB)는 멀쩡하게 뜹니다.
    3.  **VPC 분리**: `web_mypage.py`는 VPC 밖에 둬서 가볍게 유지하고, `ranking.py`만 VPC에 가둬두면 됩니다.

---

## 3. 추천 결론: 전략 C (프론트엔드 분리)

**"굳이 `web_mypage.py`에 무거운 Redis 짐을 지우지 마세요."**

1.  **`web_mypage.py`**는 지금처럼 DynamoDB(이름, 골드, 가입일)만 담당하게 해서 **아주 가볍고 빠르게** 유지하세요. (주석 처리한 Redis 코드는 다 지워도 됩니다)
2.  **`ranking.py`**에 `action: "get_my_rank"` 같은 기능을 추가해서, 프론트엔드에서 내 순위가 필요할 때 이쪽으로 따로 요청하게 하세요.


---

## 4. 전략 C 상세 구현 가이드 (Implementation Guide)

전략 C(프론트엔드 분리 호출)를 실현하기 위해 수정해야 할 3가지 단계입니다.

### Step 1: 백엔드 수정 (`backend_lambda/ranking.py`)
기존 랭킹 람다에 **"특정 유저의 순위 조회"** 기능을 추가해야 합니다.
`client`로부터 `action: "get_my_rank"`와 `user_id`를 받으면, Redis의 `zrevrank` 명령어를 사용해 순위를 찾습니다.

```python
# ranking.py (예시 코드)

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    
    if action == 'get_my_rank':
        user_id = body.get('user_id')
        # Redis에서 내 순위 조회 (0부터 시작하므로 +1)
        rank = r.zrevrank("game_scores", user_id)
        score = r.zscore("game_scores", user_id)
        
        if rank is None:
            return { ... "rank": None, "score": 0 ... }
            
        return {
            "statusCode": 200,
            "body": json.dumps({
                "rank": rank + 1,
                "score": int(score)
            })
        }
    
    # ... 기존 전체 랭킹 조회 로직 ...
```

### Step 2: 프론트엔드 API 수정 (`src/services/api.js`)
새로 만든 백엔드 기능을 호출할 함수(`getMyRank`)를 추가합니다.

```javascript
// api.js

export const api = {
    // ... 기존 함수들 ...

    // [New] 내 랭킹만 따로 가져오기 (Redis)
    getMyRank: async (userId) => {
        try {
            const response = await fetch(`${API_RANKING_URL}/ranking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_my_rank',
                    user_id: userId 
                })
            });
            if (!response.ok) return null;
            return await response.json(); // { rank: 5, score: 1250 }
        } catch (e) {
            console.error("Rank fetch failed:", e);
            return null;
        }
    }
};
```

### Step 3: 마이페이지 화면 수정 (`src/pages/MyPage.jsx`)
`UseEffect`에서 두 개의 요청을 **동시에** 보내되, 결과는 따로따로 처리합니다.

```javascript
// MyPage.jsx

useEffect(() => {
    const fetchData = async () => {
        // [1] 기본 정보 (DynamoDB) - 아주 빠름
        // api.getUserStats 호출 -> 이름, 골드, 가입일 등 즉시 표시
        
        // [2] 랭킹 정보 (Redis) - 느릴 수 있음
        // api.getMyRank 호출 -> 도착하면 "High Score"와 "Rank" 카드만 쓱 업데이트
    };
    fetchData();
}, []);
```

이렇게 구성하면, **랭킹 서버가 조금 느려도 사용자는 "내 페이지가 떴다"고 느끼게 되며**, 쾌적한 UX를 제공할 수 있습니다.

