import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,  // 환경 변수로 설정된 User Pool ID
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID, // 환경 변수로 설정된 Client ID
};

const userPool = new CognitoUserPool(poolData); // Cognito User Pool 인스턴스 생성

export const cognitoLogin = (username, password) => {
    console.log("Attempting Cognito Login..."); // 로그인 시도 로그를 생성
    console.log("Pool Data:", poolData); // Pool Data 로그
    console.log("Username:", username); // Username 로그

    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: username, Pool: userPool });
        const authDetails = new AuthenticationDetails({ Username: username, Password: password });
        user.authenticateUser(authDetails, {
            onSuccess: (result) => {
                console.log("Cognito Login Success!"); // Cognito Login Success 로그 -> 로그인 성공했다는 건 토큰을 발급했다는 것
                resolve(result.getAccessToken().getJwtToken()); // 토큰 반환
            },
            onFailure: (err) => {
                console.error("Cognito Login Failed:", err); // Cognito Login Failed 로그
                reject(err);
            },
        });
    });
};
