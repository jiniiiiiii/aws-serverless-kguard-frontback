import { MOCK_STATS, MOCK_CHARACTERS, MOCK_USER } from './mockData';

const SIMULATE_DELAY = 500; // ms
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // .env 파일에서 API_BASE_URL을 가져옴

// Helper to simulate network request
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API Service for S3-based Data Architecture
 * 
 * Fetches data from static JSON files in the public directory, matching the S3 structure.
 */
export const api = {
    // @ 공지사항

    // Fetch List Summary (Page 1)
    // Path: /notices/list/page_{page}.json
    getNotices: async (page = 1) => {
        try {
            const response = await fetch(`/notices/list/page_${page}.json`);    // 해당 숫자에 해당하는 페이지 불러옴. ex) page_1.json
            if (!response.ok) throw new Error('Failed to fetch notice list');
            const data = await response.json();
            await delay(300); // Simulate network latency
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return [];
        }
    },

    // Fetch Full Detail -> 각각의 자세한 공지사항 보여주기
    getNoticeDetail: async (id) => {
        // Path: /notices/detail/{id}.json
        try {
            const response = await fetch(`/notices/detail/${id}.json`);    // 해당 id에 해당하는 공지사항 불러옴. ex) 1.json
            if (!response.ok) throw new Error('Failed to fetch notice detail');
            const data = await response.json();
            await delay(SIMULATE_DELAY); // Simulate heavier load
            return data;
        } catch (error) {
            console.error("API Detail Error:", error);
            return null;
        }
    },

    // ==== User Data (Separated to s3-my-page) ===

    // Fetch User Profile -> 사용자 프로필 조회
    // Path: /s3-my-page/profile.json (Simulates user data bucket)
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

    // Fetch User Stats
    // Path: /s3-my-page/stats.json -> s3에 저장되어있는 임시 데이터로 정적 조회
    // getUserStats: async () => {
    //     try {
    //         const response = await fetch('/s3-my-page/stats.json');
    //         if (!response.ok) throw new Error('Failed to fetch user stats');
    //         const data = await response.json();
    //         await delay(SIMULATE_DELAY);
    //         return data;
    //     } catch (error) {
    //         console.error("API Error:", error);
    //         return MOCK_STATS;
    //     }
    // },

    // DynamoDB로 조회  -> 로그인 성공하면 해당 사용자의 정보를 실시간으로 조회
    getUserStats: async (token) => {
        // API Gateway 호출 (DynamoDB 실시간 조회)
        const response = await fetch(`${API_BASE_URL}/users/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // 로그인 토큰 필요
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('API Error');
        return await response.json();
    },




    // Fetch Characters
    // Path: /s3-my-page/characters.json
    // 추후에 dynamodb에 캐릭터 해금 칼럼을 만들어야 할 듯? true/false로 해금 여부를 확인할 예정
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
    // Path: /rank/top100.json (더미데이터)
    // 실제 랭킹 url에서 가져옴  
    getGlobalRanking: async () => {
        try {
            // Real Backend API (Redis via Lambda)
            const response = await fetch(`${API_RANKING_URL}/ranking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'get_ranking' })
            });

            if (!response.ok) throw new Error('Ranking fetch failed');

            const result = await response.json();
            // result = { rankings: [{rank, user_id, score}, ...] }

            // Transform for Frontend (Ranking.jsx expects top3, others, username, role)
            const list = result.rankings || [];

            // Map backend fields to frontend fields
            const formattedList = list.map(item => ({
                rank: item.rank,
                username: item.user_id, // Redis only has ID, using as username
                role: 'Guardian',       // Default role
                score: item.score
            }));

            return {
                updatedAt: new Date().toISOString(),
                top3: formattedList.slice(0, 3),
                others: formattedList.slice(3)
            };

        } catch (error) {
            console.error("API Ranking Error:", error);
            // Return empty structure on error so UI doesn't crash
            return { top3: [], others: [] };
        }
    },
};

