// 프론트 로그인에 대한 인증 컨텍스트
import React, { createContext, useState, useEffect, useContext } from 'react';
import { cognitoLogin } from '../services/cognito'; // cognito.js 로부터 토큰 받아옴
import { api } from '../services/api'; // api.js 로부터 사용자 프로필 받아옴
import { jwtDecode } from "jwt-decode";


const AuthContext = createContext(null); // 인증 컨텍스트 생성

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 사용자 상태 관리
    const [isLoading, setIsLoading] = useState(true); // 로딩 상태 관리

    // Simulate "Check Session" on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    // [Fix 1] 토큰 우선 디코딩 (로그인의 척도)
                    const payload = jwtDecode(token);
                    const username = payload['cognito:username'] || payload['sub'];
                    const email = payload['email'] || username;

                    // 기본 유저 정보 (토큰 기반)
                    let userState = {
                        email: email,
                        name: email.split('@')[0],
                        username: username
                    };

                    try {
                        // [Fix 2] 프로필 Fetch는 실패해도 로그아웃 시키지 않음 (S3/CloudFront 문제 방어)
                        const userData = await api.getUserProfile();
                        userState = { ...userData, ...userState }; // 토큰 정보가 우선 (email 등)
                    } catch (profileError) {
                        console.warn("Profile fetch failed, using basic info from token:", profileError);
                        // 실패해도 토큰이 유효하므로 진행
                    }

                    setUser(userState);
                } catch (error) {
                    console.error("Critical Auth check failed (Invalid Token):", error);
                    localStorage.removeItem('auth_token'); // 진짜 토큰이 이상한 경우에만 로그아웃
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const token = await cognitoLogin(username, password);
            localStorage.setItem('auth_token', token);

            // [Fix] mock profile만 가져오면 이메일이 틀리므로, 로그인한 이메일로 덮어쓰기
            const mockProfile = await api.getUserProfile();
            const realUser = { ...mockProfile, email: username, name: username.split('@')[0] };

            setUser(realUser); // 사용자 상태 관리
            setIsLoading(false);
            return true; // Success
        } catch (e) {
            console.error('Cognito login error:', e);
            setIsLoading(false);
            return false; // Failure
        }
    };

    const logout = () => {
        // TODO: INTEGRATION_POINT -> Clear Tokens
        localStorage.removeItem('auth_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
