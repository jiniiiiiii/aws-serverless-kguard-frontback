import React, { useRef, useEffect, useState } from 'react';

const REWARD_SCORE = 20;
//const REWARD_SCORE = 50; //지급할 점수 기준
const EVENT_KEY = "event_reward_202601_claimed";

const Game = () => {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('ready'); // ready, playing, gameOver
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState('');
    const [rewardStatus, setRewardStatus] = useState(null); // null, claiming, success, error

    // Game variables (refs to avoid re-renders)
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
                startGame();
            }
        };
        const handleKeyUp = (e) => {
            if (gameRef.current.keys[e.key]) gameRef.current.keys[e.key] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // State Handling
        if (gameState === 'ready') {
            drawReadyScreen();
        } else if (gameState === 'playing') {
            if (!gameRef.current.isPlaying) {
                gameRef.current.isPlaying = true;
                // Reset game data if needed, but startGame handles data reset
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
        // Reset Logic
        gameRef.current = {
            ...gameRef.current,
            player: { x: 185, y: 185, width: 30, height: 30, vx: 0, vy: 0, accel: 0.8, friction: 0.85, maxSpeed: 4.5 },
            bullets: [],
            lastBulletSpawn: 0,
            scoreVal: 0,
            rewardRequested: false,
            // isPlaying is set by Effect
        };
        setScore(0);
        setRewardStatus(null);
        setGameState('playing'); // This triggers Effect
    };

    const requestReward = async (finalScore) => {
        const token = localStorage.getItem('auth_token');
        let userId = null;

        if (token) {
            try {
                // Manually decode JWT to get 'sub' (User ID)
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.sub;
            } catch (e) {
                console.error("Failed to decode token", e);
            }
        } else if (window.location.hostname === 'localhost') {
            // Local Test Mode
            console.log("Localhost detected. Using test user ID.");
            userId = "test-user-id-local";
        }

        if (!userId) {
            setMessage("로그인이 필요합니다. 메인 포털에서 로그인해주세요.");
            setRewardStatus('error');
            return;
        }

        const isClaimed = localStorage.getItem(EVENT_KEY) === "true";
        if (isClaimed && window.location.hostname !== 'localhost') {
            setRewardStatus('already');
            return;
        }

        setRewardStatus('claiming');
        try {
            // Local API call to Express Server
            const res = await fetch('/api/claim-reward', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}` // Removed for Attendance-Style
                },
                body: JSON.stringify({ userId: userId, score: finalScore })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem(EVENT_KEY, "true");
                setRewardStatus('success');
            } else if (data.result === 'ALREADY_CLAIMED') {
                localStorage.setItem(EVENT_KEY, "true");
                setRewardStatus('already');
            } else {
                setMessage(data.message || data.error || "보상 지급 실패");
                setRewardStatus('error');
            }
        } catch (e) {
            console.error(e);
            setMessage("서버 통신 오류");
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

    // ... (drawPlayer, updateGame, spawnBullets, gameLoop stay same) ...


    const drawPlayer = (ctx, x, y) => {
        const s = 2;
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 6 * s, y, 4 * s, 2 * s); ctx.fillRect(x + 11 * s, y + 2 * s, 2 * s, 4 * s);
        ctx.fillStyle = '#a3e635'; ctx.fillRect(x + 2 * s, y + 2 * s, 10 * s, 11 * s);
        ctx.fillStyle = '#facc15'; ctx.fillRect(x, y + 2 * s, 2 * s, 3 * s); ctx.fillRect(x + 10 * s, y + 2 * s, 2 * s, 3 * s);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(x + 3 * s, y + 5 * s, 3 * s, 2 * s); ctx.fillRect(x + 8 * s, y + 5 * s, 3 * s, 2 * s);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 5 * s, y + 5 * s, 1 * s, 1 * s); ctx.fillRect(x + 10 * s, y + 5 * s, 1 * s, 1 * s);
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x + 3 * s, y + 9 * s, 8 * s, 3 * s);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4 * s, y + 9 * s, 1 * s, 1 * s); ctx.fillRect(x + 9 * s, y + 9 * s, 1 * s, 1 * s); ctx.fillRect(x + 6 * s, y + 11 * s, 2 * s, 1 * s);
        ctx.fillStyle = '#4d7c0f'; ctx.fillRect(x + 3 * s, y + 13 * s, 2 * s, 2 * s); ctx.fillRect(x + 9 * s, y + 13 * s, 2 * s, 2 * s);
    };

    const updateGame = (t) => {
        const p = gameRef.current.player;
        const keys = gameRef.current.keys;

        if (keys['ArrowLeft']) p.vx -= p.accel; if (keys['ArrowRight']) p.vx += p.accel;
        if (keys['ArrowUp']) p.vy -= p.accel; if (keys['ArrowDown']) p.vy += p.accel;
        p.vx *= p.friction; p.vy *= p.friction; p.x += p.vx; p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx = 0; } if (p.x > 370) { p.x = 370; p.vx = 0; }
        if (p.y < 0) { p.y = 0; p.vy = 0; } if (p.y > 370) { p.y = 370; p.vy = 0; }

        // Bullets
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
            if (gameState === 'gameOver') drawGameOver(); // This might still be stale if we don't watch out, but render cycle usually handles gameOver screen.
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
        // Draw one last frame with overlay
        // We might just want to keep the last frame rendered and draw over it?
        // Simpler: Just clear and draw text for now, or redraw player.

        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 400, 400);
        drawPlayer(ctx, gameRef.current.player.x, gameRef.current.player.y); // Show where died

        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 40px "Netmarble", monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', 200, 180);
        const final = Math.floor(gameRef.current.scoreVal / 10);
        ctx.fillStyle = '#fff'; ctx.font = '20px "Netmarble", monospace'; ctx.fillText(`최종 점수: ${final}`, 200, 220);

        if (final >= REWARD_SCORE) {
            ctx.fillStyle = '#facc15'; ctx.font = 'bold 24px "Netmarble", monospace'; ctx.fillText('상품 획득 성공!', 200, 260);
            if (!gameRef.current.rewardRequested) {
                gameRef.current.rewardRequested = true;
                requestReward(final);
            }
        } else {
            ctx.fillStyle = '#9ca3af'; ctx.font = '16px "Netmarble", monospace'; ctx.fillText(`상품까지 ${REWARD_SCORE - final}점 남음!`, 200, 260);
        }
    };

    return (
        <div className="game-container">
            <div className="ui-text">{gameState === 'ready' ? "PRESS SPACE TO START" : `SCORE: ${score}`}</div>
            <canvas ref={canvasRef} width="400" height="400"></canvas>
            <div className="desc-text">
                {gameState === 'playing' ? `목표: ${REWARD_SCORE}점을 넘기세요!` :
                    gameState === 'gameOver' ? 'GAME OVER - 스페이스바를 눌러 재시작' :
                        `${REWARD_SCORE}점 달성 시 선물 지급! 🎁`}
            </div>



            {/* Reward Modal */}
            {rewardStatus && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-content">
                        {rewardStatus === 'claiming' && <h3>🎁 보상 지급 처리 중...</h3>}
                        {rewardStatus === 'success' && (
                            <>
                                <h3 style={{ color: '#84cc16' }}>🎉 축하합니다!</h3>
                                <p>{REWARD_AMOUNT} Cash가 지급되었습니다.</p>
                                <button className="modal-btn" onClick={() => setRewardStatus(null)}>확인</button>
                            </>
                        )}
                        {rewardStatus === 'already' && (
                            <>
                                <h3 style={{ color: '#fbbf24' }}>⚠️ 알림</h3>
                                <p>이미 보상을 수령하셨습니다.</p>
                                <button className="modal-btn" onClick={() => setRewardStatus(null)}>확인</button>
                            </>
                        )}
                        {rewardStatus === 'error' && (
                            <>
                                <h3 style={{ color: '#ef4444' }}>❌ 오류</h3>
                                <p>{message}</p>
                                <p style={{ fontSize: '0.8em', color: '#6b7280' }}>로그인이 되어있는지 확인해주세요.</p>
                                <button className="modal-btn" onClick={() => setRewardStatus(null)}>닫기</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;
