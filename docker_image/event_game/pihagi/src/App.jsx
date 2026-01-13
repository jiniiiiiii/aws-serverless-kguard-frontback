import React from 'react';
import Game from './components/Game';
import ChatWidget from './components/ChatWidget';
import Navbar from './components/Navbar';

function App() {
    return (
        <div className="game-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Navbar />
            <Game />
            <ChatWidget />
        </div>
    );
}

export default App;
