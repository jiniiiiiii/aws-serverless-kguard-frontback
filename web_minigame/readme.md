# 개요
- 미니게임에 대한 순위 제공

# 사용 스펙
- AWS: DynamoDB (저장소), Lambda (서버 로직), API Gateway, ECS Fargate(선택사항)
- React: 프론트엔드 UI 및 게임 로직
- Node.js: 백엔드 로직
- Context7: 코드 품질 및 모범 사례 준수
- Sequence Thinking: 디테일한 순차적 사고 적용

# 원하는 로직 (Detailed Logic)
1. **사용자 플레이**
    - **로그인 유저**: 기존 `user_id` 또는 `email` 사용.
    - **비로그인 유저**: 게임 시작 시 자동 생성된 **랜덤 닉네임** 부여.
    - 게임 오버 시 점수와 닉네임 정보를 가지고 있음.

2. **닉네임 생성 로직 (비로그인)**
    - **전략**: **랜덤 자동 부여 (Auto-Assignment)** + **로컬 스토리지 저장(Persistence)**.
    - 형용사(Adjectives) + 동물(Animals) + 4자리 숫자 조합.

3. **데이터 저장 (AWS)**
    - **저장소**: Amazon DynamoDB (테이블명: `KGuard_GameScores`)
    - **중복 방지 전략**: **최고 점수 갱신**
    - **스키마 설계**:
        - PK: `USER#{UserID}`
        - SK: `GAME#MINI_01`
        - Attribute: `BestScore`, `Nickname`, `PlayDate`
        - GSI: `TopScoreIndex` (PK: `GAME#MINI_01`, SK: `BestScore`)

4. **아키텍처 구조 (ECS Fargate)**
    - **단일 서비스 (Single Microservice)**:
    - 사용자 ➡️ **Minigame API (Node.js)** ➡️ DynamoDB
    - 기능: 닉네임, 점수, 랭킹 모두 처리.

# [NEXT STEP] DynamoDB 생성 이후 진행 순서
이 순서대로 차근차근 진행합니다. (사용자 지시 하에 실행)

### **Phase 1. 프론트엔드 준비 (React)**
1.  **닉네임 로직 연결**: `nicknameGenerator`를 `EventGame.jsx`에 연결하여 게임 실행 시 내 이름이 뜨도록 함.
2.  **버그 수정**: 게임 오버 후 키 입력이 먹히는 현상 수정.
3.  **랭킹 UI 작업**: (아직 서버가 없으므로) 가짜 데이터(Mock Data)로 랭킹판이 화면에 예쁘게 나오는지 먼저 구현.

### **Phase 2. 백엔드 개발 (Node.js)**
4.  **로컬 서버 구축**: Express 프로젝트 생성.
5.  **API 개발**:
    - `POST /score` (DynamoDB에 점수 넣기)
    - `GET /ranking` (DynamoDB에서 점수 꺼내기)
6.  **로컬 테스트**: 내 컴퓨터에서 React <-> Node.js <-> DynamoDB(AWS)가 잘 통신하는지 확인.

### **Phase 3. 클라우드 배포 (ECS Fargate)**
7.  **Docker 빌드**: Node.js 서버를 이미지로 만듦.
8.  **ECR 업로드**: AWS 저장소에 이미지 올림.
9.  **ECS 서비스 시작**: Fargate로 서버를 띄우고 URL 생성.
10. **최종 연결**: React가 로컬주소(`localhost`) 대신 ECS 주소를 바라보게 설정.
