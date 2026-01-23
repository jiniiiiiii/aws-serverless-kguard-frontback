# ECS Attendance Service Stress Test Report

## 1. 개요
*   **목적**: 출석체크 서비스(Attendance Check)의 단일 태스크 성능 및 오토스케일링 동작 검증
*   **대상 서비스**: `attendance-check` (ECS)
*   **테스트 시나리오**:
    1.  **Test 1 (Basic)**: 단일 태스크 기준 성능 측정 (Capacity 산정)
    2.  **Test 2 (Scaling)**: 오토스케일링 동작 검증 (Long Warm-up)
    3.  **Test 3 (Final)**: 최적화된 정책 적용 후 최종 검증

---

# 테스트 1 (Basic: 단일 태스크 성능 측정)
## 1. 계획 (Plan)
*   **목표**: 단일 컨테이너가 버틸 수 있는 최대 동시 접속자 수(Capacity) 확인
*   **설정**:
    *   Target: `/attendance/stress-cpu`
    *   Load: CPU 0.8 (simulated)
    *   Phases: Ramp up (10 -> 50 users/sec)
*   **YAML 설정**: `test_ecs_attendance.yaml`
```yaml
config:
  target: "http://kg-dev-lb-esc-ap-ne-2-604922001.ap-northeast-2.elb.amazonaws.com"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 300
      arrivalRate: 10
      rampTo: 50
      name: "Ramp up (Attendance Only)"
    - duration: 120
      arrivalRate: 50
      name: "Sustained High Load"
  
  plugins:
    publish-metrics:
      - type: cloudwatch
        region: "ap-northeast-2"
        namespace: "Artillery/Stress-Tests"
        dimensions:
          - name: "Target"
            value: "ECS-Attendance-Only"

scenarios:
  - flow:
      - get:
          url: "/attendance/stress-cpu?duration=5000&load=0.8"
```

## 2. 결과 (Results)
## 2. 결과 (Results)
*   **실행 요약**: 테스트 중반부터 심각한 성능 저하 및 헬스 체크 실패 발생
*   **특이사항**: **"Task 개수가 2개가 됨"** (오토스케일링 아님, 교체 작업임)

### A. 상세 데이터 분석
*   **초반 (Warm-up)**: 평균 응답시간 5.8초 (이미 느림). 5초 타이머 로직이므로 여유가 거의 없음.
*   **중반 (Ramp-up)**:
    *   동시 접속자 50명 부근에서 응답시간이 **9초 이상**으로 급증.
    *   `ETIMEDOUT` 에러가 70% 이상 발생하기 시작함.
*   **헬스 체크 실패 (Health Check Failed)**:
    *   부하가 심해지자 ECS가 해당 태스크를 **"Unhealthy"**로 판단함.
    *   서비스 유지를 위해 **새로운 태스크를 1개 더 실행**함. (이 과정에서 잠시 2개로 보임)
    *   하지만 기존 태스크는 죽고, 새 태스크도 부하를 견디지 못해 **"Task failed ELB health checks"** 에러가 반복됨.

### B. 결론 (Capacity)
*   **단일 태스크 한계**: 동시 접속자 **약 25~30명** (Pihagi와 유사함)
*   **원인**: Node.js 싱글 스레드가 CPU 0.8 부하(블로킹 연산)를 처리하느라 헬스 체크 요청(`/`)에도 응답하지 못해 죽은 것으로 판명됨.

### C. 해결책
*   오토스케일링 적용 필수 (Test 2 진행)
*   헬스 체크 경로(`/`)는 가벼운 로직이어야 함 (현재는 `index.js`가 블로킹되면 헬스 체크도 블로킹되는 구조)

### D. 증거 데이터 (Evidence)
**1. 성능 저하 및 타임아웃 급증**
테스트 시작 후 접속자가 50명에 도달하자마자(Ramp-up 구간), 응답 시간이 8초대로 치솟고 타임아웃 에러가 성공 건수를 압도하기 시작했습니다.
```json
// ecs부하테스트_출석체크_기본.json (Line 164~215)
"counters": {
  "vusers.active": 50,
  "http.codes.200": 25,         // 성공 25건
  "errors.ETIMEDOUT": 24,       // 실패 24건 (성공률 50% 수준으로 급락)
  "vusers.failed": 24
},
"summaries": {
  "http.response_time": {
    "mean": 8555.3,             // 평균 응답시간 8.5초 (이미 처리 불능)
    "p95": 9607.1,              // 95% 사용자가 9.6초 대기 -> 타임아웃 직전
    "max": 9655
  }
}
```

**2. 서비스 불능 상태 지속**
이후 트래픽이 계속 유지되자, 실패(36건)가 성공(17건)보다 많아지는 **"전면 장애"** 상태에 빠졌습니다. 이때가 헬스 체크 실패로 태스크 교체(2 Task)가 일어난 시점으로 추정됩니다.
```json
// ecs부하테스트_출석체크_기본.json (Line 245~281)
"counters": {
  "vusers.active": 47,
  "http.codes.200": 17,         // 성공 17건
  "errors.ETIMEDOUT": 36,       // 실패 36건 (실패가 2배 더 많음)
},
"http.response_time": {
    "mean": 8586.1,
    "p99": 9801.2               // 99% 사용자가 사실상 응답 못 받음
}
```

---

# 테스트 3 (Final: 2대 최소 태스크 + 스케일링)
## 1. 계획 (Plan)
* **Minimum Tasks**: 2 (기본 2대 실행)
* **Auto‑Scaling 정책**: CPU 50 % / Memory 70 %
* **YAML**: `test_ecs_attendance_scaling.yaml` (Test 2와 동일)

## 2. 결과 (Results)
* **전체 실행 시간**: 약 10 분 (3 분 Warm‑up + 7 분 부하)
* **동시 사용자**: 최대 **≈ 50 명** (vusers.active 39~32 사이 변동)
* **성공 요청**:  **≈ 400 건** (http.codes.200)
* **실패 요청**:  **ETIMEDOUT 0건**, 502/5xx 오류는 **총 5~7건** 수준 (극히 낮음)
* **평균 응답시간**:  **6 ~ 7 초** (p95 ≈ 7.3 초, p99 ≈ 8.3 초) – 기존 단일 태스크 대비 30 %~40 % 개선
* **헬스 체크**: `/health` 가 정상 응답(200) 유지, **Unhealthy** 전환 없음 → **스케일‑아웃 트리거** 성공 (CPU 평균 52 % 초과 시 3대 → 4대 로 증가)

### A. 주요 지표 요약
| 구간 | vusers.active | http.codes.200 | http.codes.502 | 평균 응답시간(ms) | 비고 |
|------|---------------|----------------|----------------|-------------------|------|
| 초기 15 명 (Warm‑up) | 15 | 15 | 0 | 5.2 s | 정상 |
| 50 명 부하 (첫 번째) | 39 | 26 | 0 | 6.0 s | 일부 대기(Queue) 존재하지만 Healthy 유지 |
| 58 명 부하 | 31 | 58 | 0 | 6.4 s | 502 오류 1건 (네트워크 타임아웃) |
| 52 명 부하 | 29 | 52 | 1 | 6.3 s | 502 오류 1건 |
| 48 명 부하 | 30 | 48 | 1 | 6.3 s | 5xx 오류 1건 |
| … (후속 구간) | 30‑32 | 48‑53 | 0‑2 | 6.2‑6.5 s | 전반적으로 안정 |

## 3. 결론 및 권고
1. **2대 최소 태스크** 로 운영하면 **단일 컨테이너 한계(≈ 25 명)** 를 충분히 넘어 **≈ 50 명** 동시 부하를 견딜 수 있습니다.
2. **오토스케일링이 정상 작동** 하여 CPU 50 % 초과 시 추가 인스턴스가 자동으로 배포됩니다 (예: 3대 → 4대). 
3. **헬스 체크 경로**는 여전히 가벼운 `/health` 로 유지하고, **CPU 부하 로직을 워커 스레드**(worker_threads) 로 옮기면 더 큰 규모에서도 안정적입니다.
4. **운영 시 권장 설정**:
   * Minimum Tasks = **2** (안전 버퍼)
   * Scale‑out CPU = **50 %**, Memory = **70 %** (현재 테스트에서 충분히 트리거됨)
   * 필요 시 **Scheduled Scaling** 으로 피크 시간에 미리 3~4대 배치

> **핵심**: 이제 서비스는 **단일 컨테이너가 아닌 2대** 로 실행되며, 실제 스케일‑아웃이 정상 동작합니다. 추후 트래픽이 더 늘어나면 자동으로 추가 인스턴스가 배포되어 **Death Spiral** 을 방지할 수 있습니다.
