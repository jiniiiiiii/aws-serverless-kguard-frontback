# K-Guard Ranking System Implementation Plan

## 1. 개요 (Overview)
기존 K-Guard 게임 포털에 **글로벌 랭킹 시스템**을 도입하여 유저들의 경쟁 심리를 자극하고 게임 참여를 유도한다.
홈 화면(Main Page)에서 랭킹 페이지로 진입할 수 있는 진입점을 제공하고, 별도의 랭킹 전용 페이지를 구현한다.

## 2. 목표 (Goals)
1.  **진입점 추가:** 홈 화면 네비게이션 및 메인 배너 하단에 'Global Ranking' 버튼 추가.
2.  **랭킹 페이지 구현:** 1위~100위까지의 유저 순위를 보여주는 리스트 UI 구현.
3.  **내 순위 확인:** 로그인한 유저의 현재 순위와 점수를 상단에 고정 노출 (My Rank).
4.  **데이터 구조 설계:** Redis Sorted Set 활용을 가정한 JSON 데이터 구조 설계.

---

## 3. 화면 설계 (UI/UX)

### 3.1 진입점 (Home Page)
*   **네비게이션 바 (Navbar):** `NOTICE`, `RANKING`, `MY PAGE` 순서로 메뉴 추가.
*   **퀵 버튼:** 메인 배너 하단 혹은 우측 상단에 트로피 아이콘 🏆과 함께 "Top 100 Ranking" 버튼 배치.

### 3.2 랭킹 페이지 (Ranking Page)
*   **URL:** `/ranking` (도메인: `ranking.kguard.click/index.html` 또는 `mypage` 쪽 공유 가능)
*   **상단 (My Rank):** 
    *   로그인 시: 내 캐릭터 프로필, 닉네임, 현재 순위(예: 142위), 점수 표시.
    *   비로그인 시: "로그인하여 내 순위를 확인하세요" 메시지 및 로그인 버튼.
*   **메인 리스트 (Top 100):**
    *   **TOP 3:** 금/은/동 메달 아이콘과 함께 강조된 카드 디자인.
    *   **4위 ~ 100위:** 리스트 형태로 컴팩트하게 표시.
    *   각 항목: 순위, 계정정보(cognito와 연동된 정보, user ddb에서 가져올 예정), 점수.

---

## 4. 데이터 설계 (Data Structure)

### 4.1 랭킹 데이터 파일 (S3 Mock)
실시간 Redis 조회를 대신하여 24시간/하루 단위로 갱신되는 정적 JSON 파일을 사용한다.

**경로:** `/public/rank/top100.json`

```json
{
  "updatedAt": "2025-12-22T15:00:00Z",
  "top3": [
    { "rank": 1, "username": "DragonSlayer", "score": 999999, "tier": "Challenger", "avatar": "..." },
    { "rank": 2, "username": "No1_Guardian", "score": 980000, "tier": "GrandMaster", "avatar": "..." },
    { "rank": 3, "username": "FakerGod", "score": 975000, "tier": "GrandMaster", "avatar": "..." }
  ],
  "others": [
    { "rank": 4, "username": "User004", "score": 960000, "tier": "Master", "avatar": "..." },
    // ...
  ]
}
```

---

## 5. 구현 상세 (Implementation Steps)

### Step 1. 라우팅 및 Navbar 수정
*   `src/components/Navbar.jsx`: RANKING 메뉴 추가 (`/ranking`).
*   `src/App.jsx`: `/ranking` 라우트 추가 및 `Ranking` 페이지 컴포넌트 연결.
*   도메인 정책: 랭킹은 공용 정보이므로 `notice` 도메인과 `mypage` 도메인 양쪽에서 모두 접근 가능해야 함.

### Step 2. 데이터 모킹 (Mock Data)
*   `public/rank/top100.json` 생성.
*   `src/services/api.js`: `getGlobalRanking()` 함수 추가.

### Step 3. 랭킹 페이지 개발 (`src/pages/Ranking.jsx`)
*   TOP 3 강조형 UI 구현 (css animation 활용).
*   스크롤 가능한 리스트 뷰 구현.
*   `framer-motion`을 활용한 순차적 등장 애니메이션.

### Step 4. 홈 화면 연동
*   기존 web-portal의 index.html에서 홈 화면에 랭킹 바로가기 버튼(랭킹 페이지로 이동) 추가.

---

## 6. 백엔드 연동 계획 (Backend Integration)

추후 **AWS ElastiCache for Redis**를 도입하여 실시간 랭킹을 구현한다.

1.  **Redis Sorted Set:** `ZADD ranking_score {score} {userId}` 명령어로 점수 관리.
2.  **API Gateway:** `GET /ranking/top100` 요청 시 Lambda가 `ZREVRANGE` 명령어로 상위 100명을 가져와 유저 정보(DynamoDB)와 병합하여 반환.
3.  프론트엔드는 `api.getGlobalRanking()` 내부 구현만 `fetch(API_URL)`로 변경하면 됨.
