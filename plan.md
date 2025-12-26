# Project: K-Guard Game Portal (Web Interface)
## 0. 기본 사항 
- 아키텍쳐main_12-19 (1).png는 프로젝트의 아키텍쳐 전체다. 
- 배너와 아이콘이 필요하면 k-가드_icon.png와 k-가드_배너.png를 참고한다.


## 1. 프로젝트 개요
이 프로젝트는 'K-Guard' 모바일 게임을 위한 웹 포털 사이트입니다. AWS S3를 통해 정적 웹 호스팅(Static Web Hosting) 되며, API Gateway를 통해 백엔드(Lambda, DynamoDB, Redis)와 통신하여 데이터를 가져옵니다.

### 기술 스택 (권장)
- **Framework:** React (Vite)
- **Language:** node.js
- **Build/Deploy:** `npm run build` 후 산출물을 S3 버킷에 업로드

---

## 2. 시스템 아키텍처 및 데이터 흐름
프론트엔드는 오직 **API 호출**을 통해서만 데이터를 표시합니다. (직접 DB 접근 금지)

1.  **Auth:** AWS Cognito User Pool 연동 (로그인/사용자 토큰 관리)
2.  **Data Source:**
    - **공지사항:** Lambda -> S3(정적 포스팅) 또는 DynamoDB
    - **랭킹/최고점수:** Lambda -> ElastiCache (Redis)
    - **사용자 정보/캐릭터:** Lambda -> DynamoDB
3.  **Network:** 모든 요청은 CloudFront -> API Gateway를 경유함.

---

## 3. 페이지별 상세 요구사항 (UI/UX)

### A. 공통 레이아웃 (Layout)
- **Header/Nav:** 로고(K-Guard Icon), 메인 메뉴(공지사항, 마이페이지)
- **Footer:** 저작권 및 기본 정보
- **반응형:** 모바일(웹뷰 환경)과 데스크탑 모두 대응 가능한 반응형 디자인

### B. 메인/공지사항 페이지 (Notice Board)
**참조: 기획안 Page 2**
1.  **상단 배너:** 'K-Guard' 타이틀 및 이미지 배너 영역.
2.  **최근 공지사항 (Recent):** 최신 글 1개에 대한 전체 내용을 표시
3.  **전체 공지사항 (All List):**
    - 리스트 형태 (제목, 날짜).
    - '목록으로', '더보기' 페이지네이션 또는 무한 스크롤.
4.  **상세 보기 (Detail):** 리스트 클릭 시 모달 또는 별도 페이지로 공지 전문 표시.

### C. 마이페이지 (My Page)
**참조: 기획안 Page 3**
데이터는 로그인된 사용자의 Token을 기반으로 API를 호출하여 바인딩합니다.

1.  **상단 배너:** 마이페이지 전용 배너 이미지.
2.  **계정 정보 (Profile):**
    - Cognito에서 받아온 사용자 ID/Email 표시.
    - (디자인 요소) 프로필 아이콘.
3.  **플레이어 스탯 (Stats) - Redis 연동 데이터:**
    - **최고 점수 (High Score):** 숫자를 강조하는 디자인.
    - **플레이어 랭킹 (Global Ranking):** 현재 나의 순위 표시 (예: "Top 10%" or "154위").
4.  **캐릭터 해금 정보 (Unlock Status):**
    - 총 4개의 캐릭터 슬롯.
    - **해금된 캐릭터:** 컬러 이미지 + 이름 표시.
    - **미해금 캐릭터:** 실루엣(Lock 아이콘) 처리 + "해금 조건" 텍스트(Optional).
    - Grid(2x2) 레이아웃 권장.

---

## 4. API 인터페이스 정의 (Mocking용)
개발 초기 단계이므로, 백엔드 연결 전 아래와 같은 JSON 구조로 **Mock Data**를 만들어 UI를 먼저 구현해주세요.

### 1) `GET /api/notices` (공지사항)
```json
[
  { "id": 1, "title": "서버 점검 안내", "date": "2024-12-20", "content": "내용...", "isNew": true },
  { "id": 2, "title": "신규 캐릭터 업데이트", "date": "2024-12-18", "content": "내용...", "isNew": false }
]