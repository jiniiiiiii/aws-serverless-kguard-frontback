import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
    return (
        <div className="container" style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    marginBottom: '2rem'
                }}>
                    <AlertTriangle size={80} color="var(--color-danger)" />
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        filter: 'blur(20px)',
                        zIndex: -1
                    }} />
                </div>

                <h1 className="text-glow-blue" style={{ fontSize: '4rem', margin: 0, lineHeight: 1 }}>404</h1>
                <h2 style={{ margin: '1rem 0 0.5rem' }}>Page Not Found</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
                    The sector you are trying to access does not exist or requires higher clearance level.
                </p>

                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Button>
                        <Home size={18} style={{ marginRight: '0.5rem' }} />
                        Return to Base
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
};

export default NotFound;
