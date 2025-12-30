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
                        // [Modified] S3 프로필 조회 제거 (더 이상 사용 안함)
                        // 기본 아바타 등 설정
                        const defaultProfile = {
                            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + username,
                            role: "Guardian"
                        };
                        userState = { ...defaultProfile, ...userState };
                    } catch (profileError) {
                        console.warn("Profile setup failed:", profileError);
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

            // [Modified] S3 프로필 조회 제거 -> 토큰/기본값 사용
            const defaultProfile = {
                avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + username,
                role: "Guardian",
                email: username,
                name: username.split('@')[0],
                username: username
            };
            const realUser = defaultProfile;

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
