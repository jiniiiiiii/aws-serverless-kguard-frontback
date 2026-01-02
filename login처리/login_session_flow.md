# 로그인 세션 처리 아키텍처 및 상세 설명

본 문서는 현재 프로젝트(K-Guard Portal)에서 사용자의 로그인 상태를 어떻게 관리하고, 유지하며, 복구하는지에 대한 기술적 상세 내용을 담고 있습니다.

---

## 1. 핵심 요약 (Architecture Overview)

*   **인증 수단**: AWS Cognito (Access Token - JWT)
*   **저장소**: 브라우저 `localStorage` (새로고침 시 유지 목적)
*   **상태 관리**: React Context API (`AuthContext.jsx`)
*   **복구 전략**: 앱 시작 시 `localStorage`의 토큰을 읽어 `jwt-decode`로 사용자 정보를 복원 (백엔드 요청 없이 즉시 로그인 처리).

---

## 2. 관여 파일 및 역할 (Key Files)

로그인 처리에 직접적으로 관여하는 핵심 파일들은 다음과 같습니다.

### (1) `src/contexts/AuthContext.jsx` (핵심 컨트롤 타워)
*   **역할**: 앱 전역의 로그인 상태(`user`, `isLoading`)를 관리합니다.
*   **주요 기능**:
    *   `login()`: Cognito 로그인 성공 시 토큰을 저장하고 상태를 업데이트합니다.
    *   `logout()`: 토큰을 삭제하고 상태를 초기화합니다.
    *   **`initAuth` (중요)**: 새로고침 시 이 함수가 실행되어 **자동으로 로그인을 복구**합니다.
    *   **방어 로직**: API/인프라(S3/CloudFront) 장애로 인해 프로필 사진 등을 못 가져오더라도, 토큰이 유효하면 **로그인을 유지**하도록 설계되어 있습니다.

### (2) `src/services/cognito.js` (인증 대행)
*   **역할**: AWS Cognito SDK를 사용하여 실제 ID/PW 검증을 수행합니다.
*   **리턴**: 로그인 성공 시 암호화된 `Access Token` (JWT 문자열)을 반환합니다.

### (3) `src/services/api.js` (데이터 조회)
*   **역할**: 로그인 후 사용자 프로필(사진, 레벨 등)이나 게임 통계(골드, 랭킹)를 가져옵니다.
*   `getUserProfile()`: S3에 있는 정적 파일(`profile.json`)을 가져옵니다. (인프라 이슈 가능성이 있는 부분)

### (4) `src/pages/Login.jsx` (화면)
*   **역할**: 사용자 입력을 받아 `AuthContext.login()`을 호출합니다.

---

## 3. 상세 프로세스 (Step-by-Step)

### A. 최초 로그인 (Login Flow)
1.  사용자가 `Login.jsx`에서 ID/PW 입력 및 로그인 버튼 클릭.
2.  `AuthContext.login(username, password)` 호출.
3.  `cognitoLogin`(AWS) 호출 -> 성공 시 **JWT 토큰** 획득.
4.  **`localStorage.setItem('auth_token', token)`**: 토큰을 브라우저에 영구 저장 (새로고침 대비).
5.  `api.getUserProfile()` 호출하여 닉네임, 아바타 등 부가 정보 획득.
6.  `setUser(user_info)`: 리액트 상태 업데이트 -> 화면이 '로그인 완료' 상태로 전환.

### B. 새로고침 시 세션 복구 (Restore Session Flow)
사용자가 F5를 누르거나 브라우저를 껐다 켰을 때 발생하는 과정입니다.

1.  앱 실행 시 `AuthContext` 내부의 `useEffect` -> `initAuth()` 실행.
2.  `localStorage.getItem('auth_token')`으로 토큰 유무 확인.
3.  **토큰 디코딩 (Safe Decoding)**:
    *   `jwt-decode` 라이브러리를 사용해 토큰에서 즉시 `username`(이메일)을 추출합니다.
    *   **서버 통신 없이** 즉각적으로 로그인 상태(이메일 정보)를 복구합니다.
4.  **프로필 데이터 조회 시도 (Resilient Fetch)**:
    *   기존에는 `api.getUserProfile()` 실패 시(파일 없음, 404 등) 로그아웃 처리했으나,
    *   **현재 수정된 로직**: 프로필 가져오기에 실패해도 `console.warn`만 찍고, **토큰 정보만으로 로그인을 유지**합니다. (강력한 로그인 유지)
5.  최종적으로 `setUser()` 호출 -> 사용자는 끊김 없이 로그인된 화면을 보게 됩니다.

### C. 로그아웃 (Logout Flow)
1.  사용자가 [Logout] 버튼 클릭.
2.  `AuthContext.logout()` 호출.
3.  `localStorage.removeItem('auth_token')`: 저장된 토큰 삭제.
4.  `setUser(null)`: 상태 초기화 -> 로그인 페이지로 이동.

---

## 4. 보안 및 유지보수 참고사항
*   **토큰 만료 (Token Expiry)**: 현재 로직은 Cognito 토큰 자체의 만료 시간(기본 1시간)을 따릅니다. 토큰이 만료되면 API 호출 시 401 에러가 발생하며, 이때는 로그아웃 처리가 됩니다.
*   **인프라 독립성**: S3/CloudFront에서 정적 파일(`profile.json`)이 유실되더라도, 로그인 기능 자체는 마비되지 않도록 결합도를 낮추었습니다.
