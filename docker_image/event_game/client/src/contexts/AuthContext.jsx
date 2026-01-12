import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const payload = jwtDecode(token);
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        throw new Error('Token expired');
                    }
                    const username = payload['cognito:username'] || payload['username'] || payload['sub'];
                    const email = payload['email'] || username;

                    let userState = {
                        sub: payload['sub'], // Immutable UUID
                        email: email,
                        name: email.includes('@') ? email.split('@')[0] : username,
                        username: username,
                        role: "Guardian"
                    };
                    setUser(userState);
                } catch (error) {
                    console.error("Auth check failed:", error);
                    localStorage.removeItem('auth_token');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    // Game service doesn't handle login directly, redirects to main portal if needed
    const login = () => {
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
