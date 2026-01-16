import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Trophy, Zap, Coins, Calendar, MapPin, LogOut, Lock, Unlock } from 'lucide-react';
import REGION_MAP from '../data/regions.json';

const MyPage = () => {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const token = localStorage.getItem('auth_token');
                const userId = user.email || user.id || localStorage.getItem('kguard_user_id');
                const API_URL = "https://wtra2zvnbxxms4vry7zjtchzeu0ztlup.lambda-url.ap-northeast-2.on.aws/";

                // 1. [병렬 요청] 기본 캐릭터 정보(로컬) + 내 해금 정보(람다) 동시에 요청
                const [charsData, lambdaRes] = await Promise.all([
                    api.getUserCharacters(token), // 로컬 JSON 데이터
                    fetch(API_URL, {              // 람다 DB 데이터
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "get_info", user_id: userId })
                    }).then(res => res.json()).catch(() => ({})) // 실패해도 빈 객체 반환 (에러 방지)
                ]);

                console.log("Lambda Data:", lambdaRes); // 디버깅용: 콘솔에 찍어보기

                // 2. 람다 데이터가 비어있으면 기존 API로 백업 시도
                const myStats = Object.keys(lambdaRes).length > 0 ? lambdaRes : await api.getUserStats(token);

                // 3. 해금 목록 추출 (없으면 영훈(Char0)만 기본 해금)
                // ★ 주의: DB에서 리스트가 아니라 문자열로 올 수도 있으니 배열인지 확인
                let unlockedList = myStats.unlocked_characters || ["Char0"];
                if (typeof unlockedList === 'string') {
                    // 혹시 DB에 "['Char0', 'Char1']" 처럼 문자열로 저장되어 있다면 파싱
                    try { unlockedList = JSON.parse(unlockedList.replace(/'/g, '"')); } catch {}
                }
                if (!Array.isArray(unlockedList)) unlockedList = ["Char0"];

                // 4. 데이터 병합 (Merge)
                const mergedCharacters = charsData.map(char => ({
                    ...char,
                    // 내 ID가 해금 목록에 있거나, Char0(영훈)이면 해금
                    isUnlocked: unlockedList.includes(char.id) || char.id === "Char0"
                }));

                // 5. 상태 업데이트
                setStats({
                    ...myStats,
                    accountCreatedAt: myStats.accountCreatedAt || new Date().toISOString(),
                    gold: myStats.gold || 0,
                    cash: myStats.cash || 0,
                    highScore: myStats.high_score || myStats.highScore || 0,
                    region: myStats.region || "KR"
                });
                setCharacters(mergedCharacters);

            } catch (error) {
                console.error("데이터 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

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
            {/* Header */}
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '2rem' }}>
                <Card style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <img src={user.avatarUrl || "/default-avatar.png"} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-accent-blue)' }} />
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
                <Card delay={0.05}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 223, 0, 0.1)', borderRadius: '50%' }}><Coins size={32} color="#FFD700" /></div>
                        <div><p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Gold</p><h3 style={{ margin: 0, fontSize: '2rem', color: '#FFD700' }}>{stats.gold.toLocaleString()}</h3></div>
                    </div>
                </Card>
                <Card delay={0.1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 140, 0, 0.1)', borderRadius: '50%' }}><Zap size={32} color="var(--color-accent-gold)" /></div>
                        <div><p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Cash</p><h3 className="text-glow-gold" style={{ margin: 0, fontSize: '2rem' }}>{stats.cash.toLocaleString()}</h3></div>
                    </div>
                </Card>
                <Card delay={0.2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '50%' }}><Trophy size={32} color="var(--color-accent-blue)" /></div>
                        <div><p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>High Score</p><h3 className="text-glow-blue" style={{ margin: 0, fontSize: '2rem' }}>{stats.highScore.toLocaleString()}</h3></div>
                    </div>
                </Card>
            </div>

            {/* Characters */}
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap color="var(--color-accent-purple)" /> Character Collection
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {characters.map((char, idx) => (
                    <Card key={char.id} delay={0.3 + (idx * 0.1)} className="hover-scale" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '150px', background: '#000', position: 'relative' }}>
                            <img src={char.img} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: char.isUnlocked ? 1 : 0.4, filter: char.isUnlocked ? 'none' : 'grayscale(100%)' }} />
                            {!char.isUnlocked && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff' }}><Lock size={32} /></div>}
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {char.name} {char.isUnlocked ? <Unlock size={16} color="var(--color-success)" /> : <Lock size={16} color="var(--color-text-secondary)" />}
                            </h4>
                            {char.isUnlocked && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                    <img src="/chat-icon1.png" alt="Chat" onClick={() => window.openCharacterChat(char.name)} style={{ width: '70px', height: '70px', cursor: 'pointer', transition: 'transform 0.2s', filter: 'drop-shadow(0 0 8px rgba(0, 150, 255, 0.4))' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                                </div>
                            )}
                            {!char.isUnlocked && <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', margin: 0 }}>Unlock: {char.unlockCondition || "호감도 20 달성"}</p>}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default MyPage;