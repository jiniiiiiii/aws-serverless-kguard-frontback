# 월간 랭킹 구현 계획

## 목표
랭킹 페이지에 '월간 랭킹' 탭을 추가하고, 별도의 Lambda 함수(`monthly_ranking.py`)와 Redis를 활용하여 월간 최고 점수를 관리합니다.

## 사용자 검토 필요 사항
> [!IMPORTANT]
> **`monthly_ranking.py` Lambda 분리**:
> 사용자 요청에 따라 월간 랭킹 로직을 `monthly_ranking.py`로 완전히 분리합니다.
> 이 Lambda는 별도의 API Gateway 엔드포인트(예: `VITE_API_MONTHLY_RANKING_URL`)에 연결되어야 합니다.
> 점수 기록 시, 기존 로직과 별도로 이 Lambda도 호출해주어야 데이터가 쌓입니다 (또는 기존 Lambda에서 비동기 호출).
> **이번 구현에서는 클라이언트(또는 테스트 스크립트)가 점수 저장 시 이 Lambda도 호출한다고 가정하고 구현합니다.**

## 변경 제안

### 백엔드 (`backend_lambda`)

#### [NEW] [monthly_ranking.py](file:///d:/ai/aws_project/backend_lambda/monthly_ranking.py)
-   `ranking.py`를 기반으로 작성하되, 월간 랭킹 전용으로 수정.
-   **Key 전략**: `rank:monthly:YYYY-MM` 사용.
-   **기능**:
    -   `update_score`: 해당 월의 Redis Key에 점수 저장 (TTL 60일).
    -   `get_ranking`: 해당 월의 랭킹 조회.
    -   `get_my_rank`: 해당 월의 내 랭킹 조회.

### 프론트엔드 (`web-portal`)

#### [MODIFY] [env](file:///d:/ai/aws_project/web-portal/.env)
-   `VITE_API_MONTHLY_RANKING_URL` 변수 추가 필요 (배포 후 설정).

#### [MODIFY] [api.js](file:///d:/ai/aws_project/web-portal/src/services/api.js)
-   `getMonthlyRanking(year, month)` 추가.
-   `updateMonthlyScore(userId, score)` 추가 (게임 종료 시 호출 필요).
-   `VITE_API_MONTHLY_RANKING_URL` 환경변수 사용.

#### [MODIFY] [Ranking.jsx](file:///d:/ai/aws_project/web-portal/src/pages/Ranking.jsx)
-   월간 탭 추가.
-   **월 선택 정책 변경**: "월간 랭킹"은 **지난달(Last Month)** 데이터를 기본으로 보여줍니다. (예: 현재 1월이면 12월 랭킹 표시)
-   UI 상단에 "202X년 X월 랭킹" 타이틀 표시.

## 검증 계획

### 자동화 테스트
-   Lint 검사.

### 수동 검증
1.  **배포**: `monthly_ranking.py`를 AWS Lambda에 배포하고 API URL 확보.
2.  **데이터 쌓기**: 테스트 스크립트로 `monthly_ranking.py`에 점수 전송.
3.  **조회 확인**: 웹 포털에서 월간 탭 클릭 시 데이터 표시 확인.
