import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const REWARD_TARGET_SCORE = 20; // 20점 이상 시
const REWARD_DISPLAY_AMOUNT = 3; // "3 Cash" 지급 (서버 설정과 일치)
const EVENT_KEY = "event_reward_202601_claimed";

const EventGame = () => {
    const { user } = useAuth(); // AuthContext에서 유저 정보 가져오기
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('ready'); // ready, playing, gameOver
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState('');
    const [rewardStatus, setRewardStatus] = useState(null); // null, claiming, success, already, error

    // Game variables
    const gameRef = useRef({
        player: { x: 185, y: 185, width: 30, height: 30, vx: 0, vy: 0, accel: 0.8, friction: 0.85, maxSpeed: 4.5 },
        bullets: [],
        keys: {},
        lastBulletSpawn: 0,
        rewardRequested: false,
        scoreVal: 0,
        animationId: null,
        isPlaying: false
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                gameRef.current.keys[e.key] = true;
            }
            if (e.key === ' ' && gameState !== 'playing') {
                e.preventDefault(); // Prevent scroll
                startGame();
            } else if (e.key === ' ' && gameState === 'playing' && gameRef.current.isPlaying) {
                // Game logic for space if needed (e.g. shoot?)
                e.preventDefault(); // Prevent scroll during game too
            }
        };
        const handleKeyUp = (e) => {
            if (gameRef.current.keys[e.key]) gameRef.current.keys[e.key] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        if (gameState === 'ready') drawReadyScreen();
        else if (gameState === 'playing') {
            if (!gameRef.current.isPlaying) {
                gameRef.current.isPlaying = true;
                gameLoop(0);
            }
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(gameRef.current.animationId);
            gameRef.current.isPlaying = false;
        };
    }, [gameState]);

    const startGame = () => {
        gameRef.current = {
            ...gameRef.current,
            player: { x: 185, y: 185, width: 30, height: 30, vx: 0, vy: 0, accel: 0.8, friction: 0.85, maxSpeed: 4.5 },
            bullets: [],
            lastBulletSpawn: 0,
            scoreVal: 0,
            rewardRequested: false,
        };
        setScore(0);
        setRewardStatus(null);
        setGameState('playing');
    };

    const requestReward = async (finalScore) => {
        console.log("🎁 requestReward Called! Score:", finalScore);

        if (!user) {
            console.warn("❌ No user logged in");
            setMessage("로그인이 필요합니다.");
            setRewardStatus('error');
            return;
        }

        // [Optional] 클라이언트 중복 체크 (UI 리액션용)
        // const isClaimed = localStorage.getItem(EVENT_KEY) === "true";
        // if (isClaimed) {
        //    setRewardStatus('already');
        //    return;
        // }
        // 사용자가 "무제한"을 원했으므로 클라이언트 체크 제거

        setRewardStatus('claiming');

        const token = localStorage.getItem('auth_token');
        console.log("📤 Sending API Request to claimEventReward...");
        const result = await api.claimEventReward(user.sub, finalScore, token);
        console.log("📥 API Response:", result);

        if (result.success) {
            localStorage.setItem(EVENT_KEY, "true");
            setRewardStatus('success');
        } else if (result.result === 'ALREADY_CLAIMED') {
            setRewardStatus('already');
        } else {
            console.error("❌ Reward Error:", result.message || result.error);
            setMessage(result.message || result.error || "보상 지급 실패");
            setRewardStatus('error');
        }
    };

    const drawReadyScreen = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 400, 400);
        drawPlayer(ctx, 185, 185);
        ctx.fillStyle = '#84cc16'; ctx.font = 'bold 24px "Netmarble", monospace'; ctx.textAlign = 'center';
        ctx.fillText('⭐K-GUARD EVENT GAME⭐', 200, 150);
        ctx.fillStyle = '#9ca3af'; ctx.font = '16px "Netmarble", monospace';
        ctx.fillText('Space를 눌러 시작', 200, 260);
    };

    const drawPlayer = (ctx, x, y) => {
        const s = 2; // scale
        // Simple Pixel Art Player
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 6 * s, y, 4 * s, 2 * s);
        ctx.fillStyle = '#a3e635'; ctx.fillRect(x + 2 * s, y + 2 * s, 10 * s, 11 * s);
        ctx.fillStyle = '#facc15'; ctx.fillRect(x, y + 2 * s, 2 * s, 3 * s); ctx.fillRect(x + 10 * s, y + 2 * s, 2 * s, 3 * s);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(x + 3 * s, y + 5 * s, 3 * s, 2 * s); ctx.fillRect(x + 8 * s, y + 5 * s, 3 * s, 2 * s);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 5 * s, y + 5 * s, 1 * s, 1 * s); ctx.fillRect(x + 10 * s, y + 5 * s, 1 * s, 1 * s);
    };

    const updateGame = (t) => {
        const p = gameRef.current.player;
        const keys = gameRef.current.keys;

        if (keys['ArrowLeft']) p.vx -= p.accel; if (keys['ArrowRight']) p.vx += p.accel;
        if (keys['ArrowUp']) p.vy -= p.accel; if (keys['ArrowDown']) p.vy += p.accel;
        p.vx *= p.friction; p.vy *= p.friction; p.x += p.vx; p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx = 0; } if (p.x > 370) { p.x = 370; p.vx = 0; }
        if (p.y < 0) { p.y = 0; p.vy = 0; } if (p.y > 370) { p.y = 370; p.vy = 0; }

        spawnBullets(t);

        gameRef.current.bullets = gameRef.current.bullets.filter(b => {
            b.x += b.vx; b.y += b.vy;
            // Collision
            if (b.x > p.x + 4 && b.x < p.x + 26 && b.y > p.y + 4 && b.y < p.y + 26) {
                setGameState('gameOver');
                gameRef.current.isPlaying = false;
                return false;
            }
            return b.x > -50 && b.x < 450 && b.y > -50 && b.y < 450;
        });

        gameRef.current.scoreVal++;
        setScore(Math.floor(gameRef.current.scoreVal / 10));
    };

    const spawnBullets = (t) => {
        const diff = Math.min(gameRef.current.scoreVal / 7000, 1);
        if (t - gameRef.current.lastBulletSpawn > 420 - (diff * 260)) {
            const pCx = gameRef.current.player.x + 15, pCy = gameRef.current.player.y + 15;
            const count = 2 + Math.floor(diff * 3);
            const speedBonus = Math.floor((gameRef.current.scoreVal / 10) / 50) * 0.35;

            for (let i = 0; i < count; i++) {
                const side = Math.floor(Math.random() * 4);
                let sx, sy;
                if (side === 0) { sx = Math.random() * 400; sy = -10; }
                else if (side === 1) { sx = Math.random() * 400; sy = 410; }
                else if (side === 2) { sx = -10; sy = Math.random() * 400; }
                else { sx = 410; sy = Math.random() * 400; }

                const dx = pCx - sx, dy = pCy - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = 1.6 + speedBonus + (Math.random() * 1.6);
                gameRef.current.bullets.push({ x: sx, y: sy, vx: (dx / dist) * speed, vy: (dy / dist) * speed });
            }
            gameRef.current.lastBulletSpawn = t;
        }
    };

    const gameLoop = (t) => {
        if (!gameRef.current.isPlaying) {
            if (gameState === 'gameOver') drawGameOver();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 400, 400);

        updateGame(t);
        drawPlayer(ctx, gameRef.current.player.x, gameRef.current.player.y);

        ctx.fillStyle = '#ffff00';
        gameRef.current.bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill(); });

        gameRef.current.animationId = requestAnimationFrame(gameLoop);
    };

    const drawGameOver = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 400, 400);
        drawPlayer(ctx, gameRef.current.player.x, gameRef.current.player.y);

        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 40px "Netmarble", monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', 200, 180);
        const final = Math.floor(gameRef.current.scoreVal / 10);
        ctx.fillStyle = '#fff'; ctx.font = '20px "Netmarble", monospace'; ctx.fillText(`최종 점수: ${final}`, 200, 220);

        if (final >= REWARD_TARGET_SCORE) {
            ctx.fillStyle = '#facc15'; ctx.font = 'bold 24px "Netmarble", monospace'; ctx.fillText('상품 획득 성공!', 200, 260);
            if (!gameRef.current.rewardRequested) {
                gameRef.current.rewardRequested = true;
                requestReward(final);
            }
        } else {
            ctx.fillStyle = '#9ca3af'; ctx.font = '16px "Netmarble", monospace'; ctx.fillText(`보상까지 ${REWARD_TARGET_SCORE - final}점 남음!`, 200, 260);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem', color: 'white' }}>
            <h1 style={{ marginBottom: '1rem', fontFamily: 'Netmarble' }}>이벤트 게임</h1>
            <div className="game-container" style={{ position: 'relative', border: '4px solid #4ade80', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', zIndex: 10, fontFamily: 'monospace' }}>
                    {gameState === 'ready' ? "PRESS SPACE" : `SCORE: ${score}`}
                </div>
                <canvas ref={canvasRef} width="400" height="400" style={{ display: 'block', backgroundColor: '#020617' }}></canvas>

                {/* Info Text */}
                <div style={{ position: 'absolute', bottom: 10, width: '100%', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    {gameState === 'playing' ? `목표: ${REWARD_TARGET_SCORE}점을 넘기세요!` :
                        gameState === 'gameOver' ? 'GAME OVER' :
                            `${REWARD_TARGET_SCORE}점 달성 시 ${REWARD_DISPLAY_AMOUNT} Cash 지급! 🎁`}
                </div>

                {/* Full Screen Game Over Overlay */}
                {gameState === 'gameOver' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
                        <h2 style={{ color: '#ef4444', fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'Netmarble' }}>GAME OVER</h2>
                        <p style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '2rem' }}>최종 점수: {Math.floor(gameRef.current.scoreVal / 10)}</p>

                        {/* Reward Status Messages inside Game Over Screen */}
                        {rewardStatus === 'claiming' && <p style={{ color: '#fbbf24' }}>🎁 보상 지급 처리 중...</p>}
                        {rewardStatus === 'success' && <p style={{ color: '#4ade80', fontWeight: 'bold' }}>🎉 {REWARD_DISPLAY_AMOUNT} Cash 지급 완료!</p>}
                        {rewardStatus === 'already' && <p style={{ color: '#fbbf24' }}>⚠️ 이미 보상을 받으셨습니다.</p>}
                        {rewardStatus === 'error' && <p style={{ color: '#ef4444' }}>❌ {message}</p>}

                        <p style={{ color: '#9ca3af', marginTop: '2rem' }}>스페이스바를 눌러 재시작</p>
                    </div>
                )}

                {/* Reward Success Popup (Separate if needed, but integrated above for simplicity) */}
                {/* 만약 게임 중 바로 뜨길 원하면 여기에 별도 모달 추가 가능 */}

            </div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>
                방향키: 이동 | 스페이스바: 시작
            </p>
        </div>
    );
};

export default EventGame;
