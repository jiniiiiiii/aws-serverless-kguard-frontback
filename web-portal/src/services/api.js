import { MOCK_STATS, MOCK_CHARACTERS, MOCK_USER } from './mockData';

const SIMULATE_DELAY = 500; // ms
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; 

// ★ [추가됨] 로그 수집용 람다 API 주소 (확인된 주소 적용)
const LOG_API_URL = "https://0v71llt3ta.execute-api.ap-northeast-2.amazonaws.com/default/KG-log-lambda-ap-ne-2";

// Helper to simulate network request
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API Service for S3-based Data Architecture
 */
export const api = {
    
    // ★ [추가됨] 만능 로그 전송 함수 (sendLog)
    sendLog: async (type, userId, detailData) => {
        try {
            const payload = {
                type: type,                 // 예: "GAMEPLAY", "ERROR", "PAYMENT"
                user_id: userId || "guest", 
                timestamp: new Date().toISOString(),
                data: detailData || {}
            };

            await fetch(LOG_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error("로그 전송 실패 (앱 동작엔 영향 없음):", error);
        }
    },

    // @ 공지사항
    // Fetch List Summary (Page 1)
    getNotices: async (page = 1) => {
        try {
            const response = await fetch(`/notices/list/page_${page}.json`);
            if (!response.ok) throw new Error('Failed to fetch notice list');
            const data = await response.json();
            await delay(300); 
            return data;
        } catch (error) {
            console.error("API Error:", error);
            
            // ★ [추가됨] 에러 발생 시 자동으로 로그 전송
            // (여기서 this.sendLog가 안 될 수 있어서 api.sendLog 대신 위에서 정의한 함수를 호출하거나 안전하게 처리)
            // 객체 내부에서 자기 자신을 호출하기 위해 api.sendLog 사용 (export된 객체 참조)
            api.sendLog("ERROR", "guest", { 
                location: "getNotices", 
                message: error.message 
            });

            return [];
        }
    },

    // Fetch Full Detail
    getNoticeDetail: async (id) => {
        try {
            const response = await fetch(`/notices/detail/${id}.json`);
            if (!response.ok) throw new Error('Failed to fetch notice detail');
            const data = await response.json();
            await delay(SIMULATE_DELAY); 
            return data;
        } catch (error) {
            console.error("API Detail Error:", error);
            api.sendLog("ERROR", "guest", { location: "getNoticeDetail", id: id, message: error.message });
            return null;
        }
    },

    // ==== User Data (Separated to s3-my-page) ===

    // Fetch User Profile
    getUserProfile: async () => {
        try {
            const response = await fetch('/s3-my-page/profile.json');
            if (!response.ok) throw new Error('Failed to fetch user profile');
            const data = await response.json();
            await delay(SIMULATE_DELAY);
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return MOCK_USER; // Fallback
        }
    },

    // DynamoDB로 조회
    getUserStats: async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            // 여기도 에러 로그 추가 가능
            console.error("Stats API Error:", error);
            api.sendLog("ERROR", "user_token", { location: "getUserStats", message: error.message });
            throw error;
        }
    },

    // Fetch Characters
    getUserCharacters: async () => {
        try {
            const response = await fetch('/s3-my-page/characters.json');
            if (!response.ok) throw new Error('Failed to fetch user characters');
            const data = await response.json();
            await delay(SIMULATE_DELAY);
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return MOCK_CHARACTERS;
        }
    },

    // @@@ Global Ranking @@@
    getGlobalRanking: async () => {
        try {
            // 주의: API_RANKING_URL이 정의되지 않았다면 API_BASE_URL로 대체하거나 확인 필요
            const targetUrl = (typeof API_RANKING_URL !== 'undefined' ? API_RANKING_URL : API_BASE_URL);
            
            const response = await fetch(`${targetUrl}/ranking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'get_ranking' })
            });

            if (!response.ok) throw new Error('Ranking fetch failed');

            const result = await response.json();
            const list = result.rankings || [];

            const formattedList = list.map(item => ({
                rank: item.rank,
                username: item.user_id, 
                role: 'Guardian',       
                score: item.score
            }));

            return {
                updatedAt: new Date().toISOString(),
                top3: formattedList.slice(0, 3),
                others: formattedList.slice(3)
            };

        } catch (error) {
            console.error("API Ranking Error:", error);
            api.sendLog("ERROR", "guest", { location: "getGlobalRanking", message: error.message });
            return { top3: [], others: [] };
        }
    },
};
