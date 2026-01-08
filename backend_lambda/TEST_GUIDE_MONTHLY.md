# Monthly Ranking Lambda Test Guide

AWS Lambda 콘솔의 **"Test"** 탭에서 아래 JSON 이벤트를 사용하여 테스트할 수 있습니다.

## 1. 내 월간 랭킹 조회 (`get_my_rank`)
특정 유저의 이번 달(또는 지난 달) 랭킹과 점수를 조회합니다.

**Test Event JSON:**
```json
{
  "body": "{\"action\": \"get_my_rank\", \"user_id\": \"test_user_01\", \"target_month\": \"2024-12\"}"
}
```
*   `target_month`: 조회하려는 월 (생략 시 로직에 따라 처리됨, 보통 UI에서 전달됨).
*   `user_id`: 조회할 유저 ID.

## 2. 월간 랭킹 리스트 조회 (`get_ranking`)
상위 100명의 랭킹 리스트를 조회합니다.

**Test Event JSON:**
```json
{
  "body": "{\"action\": \"get_ranking\", \"target_month\": \"2024-12\"}"
}
```
*   `target_month`: 조회하려는 월 (YYYY-MM). `monthly_ranking.py`는 기본적으로 이 값을 무시하고 `rank:global` (정산된 데이터)을 바라보도록 설정되어 있을 수 있으니 결과 확인이 필요합니다.

## 3. 점수 업데이트 (`update_score`)
게임 종료 후 점수를 기록할 때 사용합니다. (실시간 반영 테스트용)

**Test Event JSON:**
```json
{
  "body": "{\"action\": \"update_score\", \"user_id\": \"test_user_01\", \"score\": 5000}"
}
```

---
**팁:**
- `body` 필드는 API Gateway를 통해 문자열(String)로 전달되므로, 내부 JSON도 문자열 이스케이프(`\"`)가 필요할 수 있습니다. 위 예시는 Lambda Proxy Integration을 가정한 형태입니다.
- 만약 `monthly_ranking.py`가 `body` 파싱 로직을 유연하게 작성했다면(딕셔너리 직접 허용 등), `body` 안에 바로 객체를 넣어도 될 수 있지만, 코드 상 `json.loads(event.get('body'))` 파트가 있으므로 위 형식을 권장합니다.
