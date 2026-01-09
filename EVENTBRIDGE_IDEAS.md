# EventBridge 활용 아이디어 (Gaming Portal)

EventBridge는 **"정해진 시간에 뭔가 하기(Scheduler)"** 또는 **"어떤 일이 터지면 반응하기(Event Bus)"**에 아주 좋습니다.
현재 구축 중인 **출석체크/랭킹/게임** 시스템에 딱 맞는 아이디어 3가지를 제안합니다.

## 1. 📅 주간 출석왕 보상 (Scheduler)
**"매주 월요일 새벽, 지난주 개근한 유저에게 보너스 지급!"**

*   **Why?**: 단순 매일 출석 외에 지속적인 접속 동기를 부여합니다.
*   **How**:
    1.  **EventBridge Scheduler**: 매주 월요일 00:00 KST 트리거.
    2.  **Lambda (WeeklyBatch)**: 실행.
    3.  **Logic**: `LastWeekAttendance` 테이블(혹은 로그)을 뒤져서 7일 모두 출석한 유저에게 `Gold + 500`.

## 2. 🔥 불타는 금요일 (Burning Time) 이벤트
**"매주 금요일 저녁 8시 ~ 12시, 게임 점수 2배!"**

*   **Why?**: 동시 접속자를 늘리는 가장 클래식한 게임 이벤트입니다.
*   **How**:
    1.  **EventBridge**:
        *   Rule A: 금요일 20:00 -> Lambda -> Redis 키 `BURNING_TIME = True` 설정.
        *   Rule B: 토요일 00:00 -> Lambda -> Redis 키 `BURNING_TIME = False` 설정.
    2.  **Game Logic**: 점수 저장 시 Redis의 `BURNING_TIME` 키를 확인하고 점수 2배 적용.

## 3. 🏆 실시간 업적 시스템 (Event Bus)
**"점수 1000점 돌파 시, 전체 알림 발송!"**

*   **Why?**: 서비스 간 "결합도(Coupling)"를 낮추고 시스템을 멋지게 확장합니다.
*   **How**:
    1.  **Game Service (ECS)**: 유저가 1000점을 넘기면 -> EventBridge로 `{"type": "SCORE_MILESTONE", "user": "..."}` 이벤트 전송.
    2.  **Rule Match**: `SCORE_MILESTONE` 패턴을 감지.
    3.  **Targets (Fan-out)**:
        *   Target A (Chatbot): "축하합니다!" 메시지 발송.
        *   Target B (Notification): 웹사이트 상단에 공지 띄우기.
        *   Target C (Log): 별도 분석용 DB에 기록.

---

### 💡 추천: 가장 쉬운 시작
**"2. 버닝 타임 (Burning Time)"**이 구현이 가장 쉽고, 유저들이 바로 체감할 수 있어 재미있습니다.
EventBridge Scheduler 하나만 걸어두면 되니까요!
