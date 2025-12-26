import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Shield, Lock, User } from 'lucide-react';
import '../styles/index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/mypage";

  // 프론트 로그인 함수
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        alert("Login Failed. Check your email/password.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '80vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        <Card style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                filter: ['drop-shadow(0 0 10px rgba(0,243,255,0.3))', 'drop-shadow(0 0 20px rgba(0,243,255,0.6))', 'drop-shadow(0 0 10px rgba(0,243,255,0.3))']
              }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ display: 'inline-block', marginBottom: '1rem' }}
            >
              <Shield size={64} className="text-glow-blue" style={{ color: 'var(--color-accent-blue)' }} />
            </motion.div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Access Portal</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>K-GUARD LOGIN</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Email Input */}
            <div style={{ position: 'relative' }}>
              <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Agent ID / Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                className="hover-scale"
              />
            </div>

            {/* Password Input */}
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              <input
                type="password"
                placeholder="Security Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                className="hover-scale"
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Connect to System'}
            </Button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Restricted Access. Authorized Personnel Only.
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
