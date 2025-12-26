# Real Cognito 로그인 구현 계획

## Goal Description
사용자가 실제 AWS Cognito를 통해 인증하고, 발급받은 JWT 토큰을 프론트엔드에서 저장·전송하며, 백엔드(Lambda)에서 토큰을 검증해 MyPage 데이터를 안전하게 제공하도록 시스템을 구축합니다.

## User Review Required
- **Cognito User Pool 설정**: User Pool 이름, 도메인, App Client 설정 등은 고객 환경에 맞게 지정해야 합니다. (예: `kg-user-pool`, `kg-app-client`).
- **프론트엔드 의존성**: `amazon-cognito-identity-js`와 `jwt-decode`를 추가할 예정이며, 프로젝트에 이미 다른 인증 라이브러리가 있으면 충돌 여부를 확인해 주세요.
- **환경 변수**: Lambda와 프론트엔드에 필요한 환경 변수(`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`)를 추가해야 합니다. 이름과 값이 정확한지 확인 바랍니다.

## Proposed Changes
---
### Frontend (React)
#### [MODIFY] src/contexts/AuthContext.jsx
- `amazon-cognito-identity-js`를 사용해 Cognito User Pool에 로그인 요청 구현.
- 로그인 성공 시 `AuthenticationResult.AccessToken`을 `localStorage.setItem('auth_token', token)`에 저장.
- 로그아웃 시 토큰 삭제.
- 에러 처리 및 UI 피드백 추가.

#### [NEW] src/services/cognito.js
```javascript
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: process.env.VITE_COGNITO_CLIENT_ID,
};
const userPool = new CognitoUserPool(poolData);

export const cognitoLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: (result) => resolve(result.getAccessToken().getJwtToken()),
      onFailure: (err) => reject(err),
    });
  });
};
```

#### [MODIFY] src/contexts/AuthContext.jsx (login 함수)
```javascript
import { cognitoLogin } from '../services/cognito';

const login = async (username, password) => {
  setIsLoading(true);
  try {
    const token = await cognitoLogin(username, password);
    localStorage.setItem('auth_token', token);
    const userData = await api.getUserProfile();
    setUser(userData);
  } catch (e) {
    console.error('Cognito login error:', e);
    // UI에 에러 표시 로직 추가 가능
  }
  setIsLoading(false);
};
```

### Backend (Lambda)
#### [MODIFY] backend_lambda/web_mypage.py
- `COGNITO_REGION`, `COGNITO_USER_POOL_ID`를 환경 변수에서 읽음 (이미 적용).
- `verify_token` 함수에서 실제 서명 검증을 수행하도록 `jwt.decode(..., key=public_key, algorithms=['RS256'])` 로 교체.
- JWK를 캐시하고, `kid` 매칭 로직 추가.

#### [NEW] helper function (inside lambda)
```python
import json, base64
from jwt import PyJWKClient

def get_public_key(kid):
    jwks = get_cognito_keys()
    for key in jwks:
        if key['kid'] == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    return None
```
- `verify_token` 구현 예시:
```python
header = jwt.get_unverified_header(token)
public_key = get_public_key(header['kid'])
payload = jwt.decode(token, public_key, algorithms=['RS256'], audience=COGNITO_CLIENT_ID)
return payload['sub']
```

### Deployment & Configuration
1. **Cognito**
   - User Pool 생성 → 도메인 설정 (예: `kg-auth.auth.ap-northeast-2.amazoncognito.com`).
   - App Client 생성 (비밀키 없이, Authorization code grant 비활성화).
   - 필요한 속성(이메일 등) 활성화.
2. **환경 변수**
   - Lambda: `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `COGNITO_CLIENT_ID`.
   - 프론트엔드 `.env` (Vite): `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REGION`.
3. **프론트엔드 빌드**
   - `npm install amazon-cognito-identity-js jwt-decode`.
   - `npm run build` 후 배포.
4. **테스트**
   - 사용자 생성 → 로그인 → `localStorage`에 JWT 저장 확인.
   - MyPage 호출 → 200 응답 및 올바른 `highScore`, `rank` 등 확인.

## Verification Plan
- **자동 테스트**: `jest`로 `cognitoLogin` 성공/실패 케이스 모킹.
- **수동 테스트**: 브라우저 콘솔에서 `localStorage.getItem('auth_token')` 확인, API 호출 시 401/200 응답 확인.
- **보안 검증**: Lambda에서 `jwt.decode`에 `verify_signature=True`와 `audience` 검증이 정상 동작하는지 확인.
---
