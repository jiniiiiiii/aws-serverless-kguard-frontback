import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api'; // 기존 api도 유지 (캐릭터 기본 정보용)
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Trophy, Zap, Coins, Calendar, MapPin, LogOut, Lock, Unlock } from 'lucide-react'; // 아이콘 추가

import REGION_MAP from '../data/regions.json';

const MyPage = () => {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);

    // ★★★ [수정됨] 페이지 로드 시 최신 해금 정보 가져오기 ★★★
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. 토큰 및 기본 캐릭터 정보 가져오기 (기존 유지)
                const token = localStorage.getItem('auth_token');
                const charsData = await api.getUserCharacters(token);

                // 2. [핵심] 우리가 만든 Lambda에서 최신 유저 정보(해금 목록) 직접 조회
                // (기존 api.getUserStats 대신 직접 호출하여 확실하게 동기화)
                const API_URL = "https://sbfu5vljtlmkzdunw6e6cyr4bi0qbacc.lambda-url.ap-northeast-2.on.aws/";
                const userId = user.email || user.id || localStorage.getItem('kguard_user_id');

                let myStats = {};
                
                try {
                    const res = await fetch(API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "get_info", // ★ Lambda의 조회 기능 호출
                            user_id: userId
                        })
                    });
                    myStats = await res.json();
                } catch (e) {
                    console.error("Lambda 연결 실패, 기존 API 시도:", e);
                    myStats = await api.getUserStats(token); // 실패 시 기존 방식 백업
                }

                // 3. 해금 목록 적용
                // DB에서 가져온 unlocked_characters가 없으면 기본값 ["Char0"]
                const unlockedList = myStats.unlocked_characters || ["Char0"];

                // 4. 캐릭터 데이터에 'isUnlocked' 상태 병합
                const mergedCharacters = charsData.map(char => ({
                    ...char,
                    // 내 해금 목록에 있거나, 기본 캐릭터(Char0)라면 해금 처리
                    isUnlocked: unlockedList.includes(char.id) || char.id === "Char0"
                }));

                // 5. 상태 업데이트 (골드, 캐시 등도 Lambda 데이터 우선 사용)
                setStats({
                    ...myStats,
                    accountCreatedAt: myStats.accountCreatedAt || new Date().toISOString(), // 없는 필드 방어
                    gold: myStats.gold || 0,
                    cash: myStats.cash || 0,
                    highScore: myStats.high_score || myStats.highScore || 0, // DB 필드명 대응
                    region: myStats.region || "KR"
                });
                setCharacters(mergedCharacters);

            } catch (error) {
                console.error("데이터 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        
        if (user) {
            fetchData();
        }
    }, [user]);

    // 로그아웃 핸들러
    const handleLogout = () => {
        localStorage.removeItem('kguard_user_id');
        localStorage.removeItem('kguard_session_key');
        logout();
    };

    if (loading || !user || !stats) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Loading My Page...</div>;
    }

    return (
        <div className="container">
            {/* Profile Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ marginBottom: '2rem' }}
            >
                <Card style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt="Avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-accent-blue)' }}
                    />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{user.name}</h2>
                        <p style={{ margin: '0.25rem 0 0.5rem', color: 'var(--color-text-secondary)' }}>{user.email}</p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                <Calendar size={14} /> Joined: {stats.accountCreatedAt ? new Date(stats.accountCreatedAt).toLocaleDateString() : '-'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                <MapPin size={14} /> {REGION_MAP[stats.region] || stats.region}
                            </span>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline">Edit Profile</Button>
                        <Button variant="ghost" onClick={handleLogout} style={{ color: 'var(--color-danger)' }}>
                            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
                        </Button>
                    </div>
                </Card>
            </motion.div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {/* Gold Card */}
                <Card delay={0.05}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 223, 0, 0.1)', borderRadius: '50%' }}>
                            <Coins size={32} color="#FFD700" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Gold</p>
                            <h3 style={{ margin: 0, fontSize: '2rem', color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                                {stats.gold.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </Card>

                {/* Cash Card */}
                <Card delay={0.1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 140, 0, 0.1)', borderRadius: '50%' }}>
                            <Zap size={32} color="var(--color-accent-gold)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Cash</p>
                            <h3 className="text-glow-gold" style={{ margin: 0, fontSize: '2rem' }}>
                                {stats.cash.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </Card>

                {/* High Score Card */}
                <Card delay={0.2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '50%' }}>
                            <Trophy size={32} color="var(--color-accent-blue)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>High Score</p>
                            <h3 className="text-glow-blue" style={{ margin: 0, fontSize: '2rem' }}>
                                {stats.highScore.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Character Collection */}
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap color="var(--color-accent-purple)" />
                Character Collection
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
            }}>
                {characters.map((char, idx) => (
                    <Card key={char.id} delay={0.3 + (idx * 0.1)} className="hover-scale" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '150px', background: '#000', position: 'relative' }}>
                            <img
                                src={char.img}
                                alt={char.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: char.isUnlocked ? 1 : 0.4,
                                    filter: char.isUnlocked ? 'none' : 'grayscale(100%)'
                                }}
                            />
                            {!char.isUnlocked && (
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff'
                                }}>
                                    <Lock size={32} />
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {char.name}
                                {char.isUnlocked ? <Unlock size={16} color="var(--color-success)" /> : <Lock size={16} color="var(--color-text-secondary)" />}
                            </h4>

                            {/* 채팅 버튼 */}
                            {char.isUnlocked && (
                                <div style={{ 
                                    marginTop: '0.5rem', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    width: '100%' 
                                }}>
                                    <img 
                                        src="/chat-icon1.png" 
                                        alt="대화하기" 
                                        onClick={() => window.openCharacterChat(char.name)}
                                        style={{ 
                                            width: '70px', height: '70px', cursor: 'pointer',
                                            transition: 'transform 0.2s ease-in-out',
                                            filter: 'drop-shadow(0 0 8px rgba(0, 150, 255, 0.4))'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                </div>
                            )}

                            {!char.isUnlocked && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', margin: 0 }}>
                                    Unlock: {char.unlockCondition || "호감도 20 달성"}
                                </p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default MyPage;