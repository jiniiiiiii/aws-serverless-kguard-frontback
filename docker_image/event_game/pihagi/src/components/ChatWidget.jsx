import React, { useState, useRef, useEffect } from 'react';
import '../styles/EventGame.css'; // Re-use styles or add new ones

const API_URL = "https://hwuhh3d5d45nbsyu7beqld7twi0dfpsk.lambda-url.ap-northeast-2.on.aws/";

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { type: 'bot', text: '환영합니다 용사님!\n무엇을 도와드릴까요? 🛡️' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const logsRef = useRef(null);

    useEffect(() => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
    }, [messages, isLoading, isOpen]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const msg = inputText;
        setMessages(prev => [...prev, { type: 'user', text: msg }]);
        setInputText('');
        setIsLoading(true);

        const storedUser = localStorage.getItem('kguard_user_id') || "guest-survivor";
        // Simple guest check logic
        if (storedUser === "guest-survivor") {
            const forbiddenWords = ['내 랭킹', '내 순위', '내 점수', '제 점수', '몇등', '내 기록'];
            if (forbiddenWords.some(word => msg.includes(word))) {
                setTimeout(() => {
                    setIsLoading(false);
                    setMessages(prev => [...prev, { type: 'warning', text: '⚠️ [접근 거부]\n내 정보는 로그인 시에만 확인할 수 있습니다.' }]);
                }, 600);
                return;
            }
        }

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    user_id: storedUser,
                    session_id: localStorage.getItem('kguard_session_key') || "guest-" + Date.now()
                })
            });
            const data = await res.json();
            setIsLoading(false);
            setMessages(prev => [...prev, { type: 'bot', text: data.reply }]);
        } catch (e) {
            console.error(e);
            setIsLoading(false);
            setMessages(prev => [...prev, { type: 'warning', text: '통신 실패' }]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    // Inline styles for chat specific things not in EventGame.css
    // We'll rely on the ported CSS or add inline for specific widget structure
    return (
        <div id="chat-widget" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
            <button onClick={() => setIsOpen(!isOpen)} style={{ width: '70px', height: '70px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <img src="/chat-icon.PNG" alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0, 180, 255, 0.8))' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', bottom: '80px', right: 0, width: '350px', height: '500px',
                    background: 'rgba(0, 10, 30, 0.95)', border: '2px solid #00ccff', borderRadius: '15px',
                    display: 'flex', flexDirection: 'column', boxShadow: '0 0 30px rgba(0, 200, 255, 0.3)', overflow: 'hidden'
                }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #00ccff', background: '#001122', color: '#00ccff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🔵 K-Guard 가이드</span>
                        <span onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>×</span>
                    </div>

                    <div ref={logsRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map((m, i) => (
                            <div key={i} className={`msg-row ${m.type === 'user' ? 'user' : 'bot'}`} style={{ display: 'flex', justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div className={`msg-bubble ${m.type}-bubble`}
                                    style={{
                                        maxWidth: '80%', padding: '10px 14px', borderRadius: '15px', fontSize: '14px',
                                        background: m.type === 'user' ? '#006600' : (m.type === 'warning' ? '#660000' : '#003366'),
                                        color: '#fff', border: m.type === 'user' ? '1px solid #00ff00' : (m.type === 'warning' ? '1px solid #ff3333' : '1px solid #00ccff')
                                    }}>
                                    {m.text.split('\n').map((line, idx) => <React.Fragment key={idx}>{line}<br /></React.Fragment>)}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="msg-row bot">
                                <div className="msg-bubble bot-bubble" style={{ background: '#003366', color: '#aaa' }}>👀 데이터 분석 중...</div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '10px', borderTop: '1px solid #00ccff', display: 'flex', background: '#000810' }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="명령어 입력..."
                            style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', padding: '10px', outline: 'none', borderRadius: '5px' }}
                        />
                        <button onClick={handleSendMessage} style={{ marginLeft: '8px', background: '#003366', color: '#00ccff', border: '1px solid #00ccff', cursor: 'pointer', padding: '0 15px', fontWeight: 'bold', borderRadius: '5px' }}>전송</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
