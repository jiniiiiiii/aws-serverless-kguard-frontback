import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Trophy, Users, Lock, Unlock, Zap, Coins, Calendar, MapPin, LogOut } from 'lucide-react';


const MyPage = () => {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const [statsData, charsData] = await Promise.all([
                    api.getUserStats(token),
                    api.getUserCharacters(token)
                ]);
                setStats(statsData);
                setCharacters(charsData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !user) {
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
                        src={user.avatarUrl}
                        alt="Avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-accent-blue)' }}
                    />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{user.username}</h2>
                        <p style={{ margin: '0.25rem 0 0.5rem', color: 'var(--color-text-secondary)' }}>{user.email}</p>

                        {/* Info Badges */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {stats.accountCreatedAt && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                    <Calendar size={14} /> Joined: {new Date(stats.accountCreatedAt).toLocaleDateString()}
                                </span>
                            )}
                            {stats.region && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                    <MapPin size={14} /> {stats.region}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline">Edit Profile</Button>
                        <Button variant="ghost" onClick={logout} style={{ color: 'var(--color-danger)' }}>
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

                {/* High Score Card */}
                <Card delay={0.1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 140, 0, 0.1)', borderRadius: '50%' }}>
                            <Trophy size={32} color="var(--color-accent-gold)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>High Score</p>
                            <h3 className="text-glow-gold" style={{ margin: 0, fontSize: '2rem' }}>
                                {stats.highScore.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </Card>

                {/* Rank Card */}
                <Card delay={0.2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '50%' }}>
                            <Users size={32} color="var(--color-accent-blue)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Global Rank</p>
                            <h3 className="text-glow-blue" style={{ margin: 0, fontSize: '2rem' }}>
                                #{stats.rank}
                                <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                                    (Top {stats.topPercent}%)
                                </span>
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Characters */}
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
                            {!char.isUnlocked && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', margin: 0 }}>
                                    Unlock: {char.unlockCondition}
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
