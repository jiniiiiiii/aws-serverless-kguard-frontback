# Event Game Service (kguard-event-game)

이 프로젝트는 K-Guard 사용자를 위한 이벤트 게임 서비스입니다.
사용자는 간단한 반응 속도 테스트 게임을 통해 점수를 획득하고, 100점 이상 달성 시 골드 보상을 받을 수 있습니다.

## 🛠 구현 요약

### 1. Frontend (Client)
- **Tech Stack**: React + Vite
- **주요 기능**:
    - `Navbar`: 메인 웹 포털과 동일한 디자인 및 메뉴 구조 (MyPage, Ranking 등 연동).
    - `Game`: 반응 속도 테스트 로직 (Start -> Green Light -> Click).
    - `AuthContext`: JWT 토큰 기반 사용자 인증 상태 관리.
- **위치**: `./client`

### 2. Backend (Server)
- **Tech Stack**: Node.js + Express
- **주요 기능**:
    - **Static Serving**: React 빌드 파일(`client/dist`) 호스팅.
    - **API**: `POST /api/claim` - 점수 검증 및 DynamoDB 골드 지급.
- **위치**: `./server.js`

---

## 🐳 Docker 가이드 (상세)

이 서비스를 Docker 컨테이너로 빌드하고 AWS ECS에 배포하는 전체 과정입니다.

### 1. 사전 준비 (Prerequisites)
- AWS CLI 설치 및 설정 (`aws configure`)
- Docker Desktop 실행 중

### 2. 도커 이미지 빌드 (Build)
프로젝트 루트(`d:\ai\aws_project\docker_image\event_game`)에서 실행합니다.

```bash
# 1. React 앱 빌드 (호스트 머신에서 선행)
cd client
npm install
npm run build
cd ..

# 2. Docker 이미지 빌드
# -t: 이미지 태그 이름 설정
docker build -t event-game-service .
```

### 3. 로컬 테스트 (Local Run)
빌드된 이미지가 정상 동작하는지 로컬에서 확인합니다.
`.env.example` 파일을 참고하여 `.env` 파일을 생성하거나 환경변수를 직접 주입합니다.

```bash
# .env 파일 생성 (필수 환경변수: AWS_REGION, DYNAMODB_TABLE)
# 윈도우(PowerShell)에서 실행 시:
docker run -d -p 3000:3000 `
  --env AWS_REGION=ap-northeast-2 `
  --env DYNAMODB_TABLE=KG-db-ddb-ap-ne-2-userdata `
  --name event-game-local `
  event-game-service

# 로그 확인
docker logs -f event-game-local

# 접속 테스트
# 브라우저: http://localhost:3000
# API 헬스체크: http://localhost:3000/health
```

### 4. AWS ECR 업로드 (Push to ECR)
AWS Elastic Container Registry(ECR)에 이미지를 업로드합니다.

**1) ECR 리포지토리 생성 (없을 경우)**
```bash
aws ecr create-repository --repository-name event-game-service --region ap-northeast-2
```

**2) ECR 로그인**
```bash
# <AWS_ACCOUNT_ID>는 본인의 AWS 계정 ID로 변경 (예: 123456789012)
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com
```

**3) 이미지 태깅**
```bash
# 로컬 이미지에 ECR 주소 태그 붙이기
docker tag event-game-service:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/event-game-service:latest
```

**4) 이미지 푸시**
```bash
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/event-game-service:latest
```

### 5. AWS ECS 배포 (Deployment)
AWS 콘솔에서 진행합니다.

1.  **Task Definition (작업 정의) 생성/업데이트**:
    *   **컨테이너 이름**: `event-game-container`
    *   **이미지**: 위에서 푸시한 ECR 이미지 URI
    *   **포트 매핑**: 3000 (Host) -> 3000 (Container)
    *   **Task Role**: `DynamoDBFullAccess` (또는 해당 테이블 쓰기 권한 Role)
    *   **환경 변수**: `DYNAMODB_TABLE`, `AWS_REGION` 추가

2.  **Service (서비스) 생성/업데이트**:
    *   **Cluster**: 사용 중인 ECS 클러스터 선택
    *   **Load Balancer**: ALB 사용 시 Target Group(대상 그룹)을 Port 3000으로 생성하여 연결.
    *   **Security Group**: ALB(80/443) -> ECS(3000) 트래픽 허용 확인.

3.  **배포 확인**:
    *   ALB DNS 주소로 접속하여 게임 화면이 나오면 성공!
