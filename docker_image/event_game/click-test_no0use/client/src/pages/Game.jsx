import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Timer, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/index.css';

const Game = () => {
    const { user } = useAuth();
    const [gameState, setGameState] = useState('idle'); // idle, waiting, ready, result, error
    const [message, setMessage] = useState("Click 'Start' to begin test");
    const [score, setScore] = useState(0);
    const [rewardStatus, setRewardStatus] = useState(null); // null, claiming, success, fail

    const timeoutRef = useRef(null);
    const startTimeRef = useRef(0);

    const handleStart = () => {
        setGameState('waiting');
        setMessage("Wait for Green...");
        setScore(0);
        setRewardStatus(null);

        const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3 sec
        timeoutRef.current = setTimeout(() => {
            setGameState('ready');
            setMessage("CLICK NOW!");
            startTimeRef.current = Date.now();
        }, randomDelay);
    };

    const handleClick = async () => {
        if (gameState === 'waiting') {
            clearTimeout(timeoutRef.current);
            setGameState('idle');
            setMessage("Too early! Try again.");
            return;
        }

        if (gameState === 'ready') {
            const reactionTime = Date.now() - startTimeRef.current;
            const calculatedScore = Math.max(0, 1000 - reactionTime);
            // Simplified scoring: If reaction < 300ms -> Score 100+
            // Actually, let's make it simpler.
            // Requirement: Score 100 to get Gold.
            // Let's say: Reaction < 400ms = 100 Points. 

            const points = reactionTime < 400 ? 100 : Math.floor(100 - (reactionTime - 400) / 10);

            setScore(points);
            setGameState('result');

            if (points >= 100) {
                setMessage(`Amazing! ${reactionTime}ms`);
                claimReward(points);
            } else {
                setMessage(`Too slow! ${reactionTime}ms. Need 100 pts.`);
            }
        }
    };

    const claimReward = async (points) => {
        if (!user) return;
        setRewardStatus('claiming');
        try {
            const res = await fetch('/api/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.sub || user.username, score: points })
            });
            const data = await res.json();
            if (data.success) {
                setRewardStatus('success');
            } else {
                setRewardStatus('fail');
                setMessage(data.error || "Failed to claim.");
            }
        } catch (e) {
            setRewardStatus('fail');
            console.error(e);
        }
    };

    return (
        <div className="container flex-center" style={{ minHeight: '80vh', flexDirection: 'column', gap: '2rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel"
                style={{
                    padding: '3rem',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '500px',
                    border: gameState === 'ready' ? '2px solid #22c55e' : '1px solid var(--glass-border)'
                }}
            >
                <div style={{ marginBottom: '2rem' }}>
                    <Zap size={64} color={gameState === 'ready' ? '#22c55e' : 'var(--color-accent-blue)'} />
                </div>

                <h1 className="text-glow-blue" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    Speed Reaction
                </h1>

                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '3rem' }}>
                    Get 100 Points (under 400ms) to earn Gold!
                </p>

                {/* Game Area */}
                <div
                    onClick={handleClick}
                    style={{
                        height: '200px',
                        background: gameState === 'ready' ? '#22c55e' : gameState === 'waiting' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.1s'
                    }}
                >
                    {message}
                </div>

                {/* Result Area */}
                {gameState === 'result' && (
                    <div style={{ marginTop: '2rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                            Score: <span style={{ color: score >= 100 ? 'var(--color-accent-gold)' : 'white' }}>{score}</span>
                        </div>

                        {rewardStatus === 'success' && (
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                style={{ color: 'var(--color-accent-gold)', fontWeight: 'bold' }}
                            >
                                <Trophy size={20} style={{ verticalAlign: 'middle' }} /> Reward Claimed!
                            </motion.div>
                        )}

                        <button
                            onClick={handleStart}
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.8rem 2rem',
                                background: 'var(--color-accent-blue)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {gameState === 'idle' && (
                    <button
                        onClick={handleStart}
                        style={{
                            marginTop: '2rem',
                            padding: '1rem 3rem',
                            fontSize: '1.2rem',
                            background: 'var(--color-accent-blue)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        START GAME
                    </button>
                )}

            </motion.div>

            {!user && (
                <div style={{ color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    You must be logged in to claim rewards.
                </div>
            )}
        </div>
    );
};

export default Game;
