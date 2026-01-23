import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Game from './pages/Game';
import './styles/index.css';

const App = () => {
  return (
    <Router basename="/game/event">
      <AuthProvider>
        <div className="app-min-h-screen">
          <Navbar />
          <main style={{ padding: '2rem 0' }}>
            <Routes>
              <Route path="/" element={<Game />} />
              <Route path="/index.html" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
