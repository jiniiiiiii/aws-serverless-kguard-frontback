# CI/CD 파이프라인 빌드 알림 (Slack) 통합 가이드

AWS CodePipeline 및 CodeBuild의 상태(성공, 실패)를 Slack으로 전송하는 로직과 설정 방법을 정리한 문서입니다.

## 1. 아키텍처 개요

빌드 상태 변화를 감지하고 슬랙으로 알림을 보내는 방법은 크게 두 가지가 있습니다.

1.  **AWS Chatbot 사용 (추천)**: 별도의 코드 작성 없이 AWS 리소스/설정만으로 연동 가능. 가장 쉽고 빠릅니다.
2.  **AWS Lambda + Slack Webhook 사용**: 메시지 포맷을 커스텀하고 싶거나 복잡한 로직이 필요할 때 사용합니다.

---

## 2. 상세 구현 로직 (AWS Chatbot 방식)

이 방식은 코딩 없이 [EventBridge -> SNS -> AWS Chatbot -> Slack] 흐름으로 동작합니다.

### 1단계: SNS 토픽 생성
1.  **SNS** 콘솔 이동 -> **주제(Topic)** 생성 (예: `build-notification-topic`).
2.  유형은 **Standard** 선택.

### 2단계: AWS Chatbot 설정
1.  **AWS Chatbot** 콘솔 이동 -> **새 클라이언트 구성** (Slack 선택).
2.  Slack 워크스페이스 권한 승인.
3.  **새 채널 구성**:
    - 슬랙 채널 선택.
    - 권한: 기존 IAM 역할 사용 또는 새 역할 생성 (Notification 읽기 권한 필요).
    - **가드레일 정책**: `ReadOnlyAccess` 등 적절한 정책 연결.
    - **SNS 주제**: 위에서 만든 `build-notification-topic` 연결.

### 3단계: 알림 규칙 생성 (Notification Rule)
CodeBuild 프로젝트나 CodePipeline에서 직접 알림을 설정합니다.

**CodeBuild의 경우:**
1.  **CodeBuild** 프로젝트 선택 -> **설정(Settings)** -> **알림(Notifications)** -> **알림 규칙 생성**.
2.  **이름**: `build-status-rule`.
3.  **트리거 이벤트**:
    - `Failed` (실패)
    - `Succeeded` (성공)
    - `In Progress` (필요시)
4.  **대상**: 위에서 만든 SNS 토픽(`build-notification-topic`) 선택.

**CodePipeline의 경우:**
1.  **CodePipeline** 파이프라인 선택 -> **알림(Notify)** -> **알림 규칙 생성**.
2.  설정 과정은 위와 동일 (Started, Succeeded, Failed 이벤트 선택).

---

## 3. 상세 구현 로직 (Lambda Custom Webhook 방식)

원하는 메시지 포맷이 있거나 ("🚨 빌드 실패! 맹구를 호출하세요") 특정 조건에만 보내고 싶을 때 사용합니다.

### 1단계: Slack Incoming Webhook URL 발급
1.  Slack 앱 관리 -> **Incoming Webhooks** 활성화.
2.  Webhook URL 복사 (예: `https://hooks.slack.com/services/T000/B000/XXXX`).

### 2단계: SNS 및 Lambda 구성
1.  **SNS 토픽** 생성.
2.  **Lambda 함수** 생성 (Runtime: Node.js 또는 Python).
3.  SNS 토픽을 Lambda의 **트리거**로 연결.

### 3단계: Lambda 코드 (Node.js 예시)

```javascript
const https = require('https');

exports.handler = async (event) => {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    // CodeBuild 등의 이벤트 상태 파싱
    const state = snsMessage.detail['build-status']; // SUCCEEDED, FAILED
    const project = snsMessage.detail['project-name'];
    
    let color = state === 'SUCCEEDED' ? '#36a64f' : '#ff0000';
    let text = \`Build Project: \${project}\\nStatus: \${state}\`;

    const payload = JSON.stringify({
        attachments: [{
            color: color,
            text: text
        }]
    });

    // Slack으로 전송하는 로직 (https.request 사용) ...
    // ...
};
```

### 4단계: EventBridge 연결
1.  **EventBridge** -> **규칙 생성**.
2.  **패턴**: AWS Service -> CodeBuild -> CodeBuild Build State Change.
3.  **대상**: 위에서 만든 SNS 토픽.

---

## 결론 및 추천

- **운영 효율성**: `AWS Chatbot` (구현 시간 5분 내외, 유지보수 불필요)
- **커스터마이징**: `Lambda` (코드 관리가 필요하지만 메시지를 예쁘게 꾸밀 수 있음)

우선 **AWS Chatbot**으로 빠르게 적용해보고, 메시지 형태가 마음에 들지 않으면 Lambda 방식으로 고도화하는 것을 추천합니다.
