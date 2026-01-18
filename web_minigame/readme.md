# 개요
- 미니게임에 대한 순위 제공

# 사용 스펙
- AWS: DynamoDB (저장소), Lambda (서버 로직), API Gateway
- React: 프론트엔드 UI 및 게임 로직
- Node.js: 백엔드 로직
- Context7: 코드 품질 및 모범 사례 준수
- Sequence Thinking: 디테일한 순차적 사고 적용

# 원하는 로직 (Detailed Logic)
1. **사용자 플레이**
    - **로그인 유저**: 기존 `user_id` 또는 `email` 사용.
    - **비로그인 유저**: 게임 시작 시 자동 생성된 **랜덤 닉네임** 부여 (예: `날쎈다람쥐#1234`).
    - 게임 오버 시 점수와 닉네임 정보를 가지고 있음.

2. **닉네임 생성 로직 (비로그인)**
    - 형용사(Adjectives) + 동물(Animals) + 4자리 숫자 조합.
    - **운영 방식 비교 (Frontend vs. ECS Fargate)**:
        - **Frontend**:
            - 장점: 서버 비용 전무, 네트워크 지연 없음, 구현 단순.
            - 단점: 클라이언트 코드 노출, 중복 검증을 위해 추가 API 호출 필요 가능성.
        - **ECS Fargate (선택지)**:
            - 장점: 비즈니스 로직 은닉, DB 연동을 통한 유니크 닉네임 보장, 컨테이너 기반의 일관된 환경 제공.
            - 단점: Lambda 대비 상대적으로 높은 최소 유지 비용(ALB + Task 실행 비용).
        - **결론**: **ECS Fargate 사용 결정**. 
            - 이유: 단순 닉네임 생성뿐만 아니라, 향후 **결과 전송 및 검증 로직**을 하나의 튼튼한 백엔드 서비스로 묶어서 관리하기 위함. 또한 학습 목적으로 컨테이너 인프라 구축 경험을 우선시함.

3. **데이터 저장 (AWS)**
    - **저장소**: Amazon DynamoDB
    - **테이블 명**: `KGuard_GameScores` (예정)
    - **스키마 설계**:
        - **Partition Key (PK)**: `GAME#MINI_01` (단일 파티션으로 글로벌 랭킹 처리)
        - **Sort Key (SK)**: `SCORE#{ZeroPadded_InverseScore}` (점수 기반 정렬을 위함)
        - **Attributes**:
            - `Nickname`: 표시용 이름
            - `UserId`: 유저 식별자 (Guest인 경우 UUID 또는 null)
            - `PlayDate`: ISO 8601 형식
            - `ExpirationTime` (TTL): 현재 시간 + 2개월 (자동 삭제 기능)

4. **순위 제공 (Ranking)**
    - API (GET `/ranking`): DynamoDB에서 상위 N개의 기록을 조회하여 반환.
    - UI: 게임 화면 내 '랭킹 보기' 버튼 또는 게임 오버 화면에 1~10위 표시.
    - **보상 로직**: 로그인 유저가 특정 점수 달성 시 기존 로직(Cash 지급) 유지.

# 구현 계획 (Step-by-Step)
1. **프론트엔드 (React)**
    - API 호출부 수정: `src/services/api.js`에서 ECS 엔드포인트를 바라보도록 설정.
    - `EventGame.jsx`: 게임 데이터 연동.

2. **백엔드 (ECS Fargate)**
    - **Docker 이미지 빌드**: Node.js Express 앱 생성.
    - **API 엔드포인트**:
        - `GET /nickname`: 랜덤 닉네임 반환 (DB 중복 체크 포함).
        - `POST /score`: 점수 저장 (보안 검증).
    - **Infra (Terraform/CDK or Console)**: ECR 리포지토리 생성 -> Task Definition -> Service 배포.
