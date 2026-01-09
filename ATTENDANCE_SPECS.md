# Attendance Check Service Specification

## 1. 개요
ECS 상에서 구동될 첫 번째 마이크로서비스입니다.
사용자의 매일 출석 내역을 저장하고 조회하는 기능을 담당합니다.

## 2. 핵심 로직
1.  **1일 1회 제한**: 사용자는 하루에 한 번만 출석할 수 있습니다.
2.  **기준 시간**: KST (한국 시간) 00:00:00 ~ 23:59:59.
3.  **보상 지급**: (옵션) 출석 성공 시 포인트/재화 지급 로직과 연동 가능.

## 3. 데이터베이스 설계 (옵션 선택)

### 옵션 A: 기존 User DB 재사용 (추천! ⭐️)
**기존 `KG-db-ddb-ap-ne-2-userdata` 테이블을 그대로 사용합니다.**
- **방법**: User 아이템에 `last_attendance_date` 필드만 추가합니다.
- **로직**: 
    1.  User 조회 -> `last_attendance_date`가 오늘과 같은지 확인.
    2.  다르면 -> `gold += 10`, `last_attendance_date = 오늘` 업데이트.
- **장점**: **새 테이블 만들 필요 없음.** 관리가 매우 편함.
- **단점**: "00월 00일 출석했나요?" 같은 과거 히스토리는 알 수 없음 (오늘 했는지만 앎).

### 옵션 B: 별도 출석부 테이블 (`KG_Attendance`)
-   **구성**: `user_id`, `date`를 키로 하는 새 테이블 생성.
-   **장점**: 1년 전 출석 기록도 보관 가능. (달력 채우기 이벤트 가능)
-   **단점**: 테이블을 하나 더 관리해야 하고, 로직이 'User테이블 업데이트 + 출석테이블 Insert'로 쪼개짐.

**결론**: 단순히 "출석하면 골드 주기"가 목적이라면 **옵션 A**가 압도적으로 편합니다.

## 4. API 설계 (Python FastAPI 예시)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/attendance/status` | 오늘 출석 했는지 확인 (UI 버튼 활성/비활성용) |
| **POST** | `/attendance` | 출석 체크 실행 (DB 기록) |
| **GET** | `/attendance/history` | 이번 달 출석 현황 조회 (달력 표시용) |

## 5. 구현 시나리오 (ECS)

1.  **Backend**: `Python FastAPI` 또는 `Node.js Express`.
2.  **Docker**: 심플한 컨테이너 이미지 빌드.
3.  **Deploy**: ECS Fargate에 배포 후 ALB(Load Balancer)를 통해 노출.
    - 예: `https://api.kguard.click/attendance/...`

---

## ❓ 결정해야 할 사항
1.  **언어**: Python (기존 람다와 동일) vs Node.js (웹과 동일)?
2.  **DB**: DynamoDB vs RDS?
