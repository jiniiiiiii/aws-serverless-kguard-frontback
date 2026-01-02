import { MOCK_STATS, MOCK_CHARACTERS, MOCK_USER } from './mockData';

const SIMULATE_DELAY = 500; // ms

// [ENV] 환경 변수 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_RANKING_URL = import.meta.env.VITE_API_RANKING_URL || '';
const API_HIGHSCORE_URL = import.meta.env.VITE_API_HIGHSCORE_RANKING_URL || '';

// [Remote] 로그 수집용 람다 API 주소
const LOG_API_URL = "https://0v71llt3ta.execute-api.ap-northeast-2.amazonaws.com/default/KG-log-lambda-ap-ne-2";

// Helper to simulate network request
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API Service for S3-based Data Architecture
 */
export const api = {

    // [Remote] 만능 로그 전송 함수 (sendLog)
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
    getNotices: async (page = 1) => {
        try {
            const response = await fetch(`/notices/list/page_${page}.json`);
            if (!response.ok) throw new Error('Failed to fetch notice list');
            const data = await response.json();
            await delay(300);
            return data;
        } catch (error) {
            console.error("API Error:", error);
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

    // [Local Key Change] getUserProfile is deprecated/commented out to avoid errors
    // getUserProfile: async () => {
    //     try {
    //         const response = await fetch('/s3-my-page/profile.json');
    //         if (!response.ok) throw new Error('Failed to fetch user profile');
    //         const data = await response.json();
    //         await delay(SIMULATE_DELAY);
    //         return data;
    //     } catch (error) {
    //         console.error("API Error:", error);
    //         return MOCK_USER; // Fallback
    //     }
    // },

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
    getGlobalRanking: async (region = null) => {
        try {
            // [Local Strict HighScore URL]
            const targetUrl = API_HIGHSCORE_URL;

            if (!targetUrl) {
                console.error("API_HIGHSCORE_URL is not defined in .env");
                return { top3: [], others: [] };
            }

            const payload = { action: 'get_ranking' };
            if (region) {
                payload.region = region;
            }

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Ranking fetch failed');

            const result = await response.json();
            const list = result.rankings || [];

            const formattedList = list.map(item => ({
                rank: item.rank,
                username: item.user_id,
                email: item.user_id,
                region: item.region || 'Unknown',
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

    // [New] 내 랭킹만 따로 가져오기 (Redis)
    getMyRank: async (userId) => {
        try {
            const targetUrl = API_HIGHSCORE_URL;
            if (!targetUrl) return null;

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_my_rank',
                    user_id: userId
                })
            });
            if (!response.ok) return null;
            return await response.json(); // { rank: 5, score: 1250 }
        } catch (e) {
            console.error("Rank fetch failed:", e);
            return null;
        }
    }
};
