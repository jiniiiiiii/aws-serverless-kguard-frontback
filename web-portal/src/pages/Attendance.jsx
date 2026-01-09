import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import '../styles/index.css';

const Attendance = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // null | 'success' | 'error'
    const [message, setMessage] = useState('');
    const [reward, setReward] = useState(0);

    const handleCheckAttendance = async () => {
        if (!user) return;

        setIsLoading(true);
        setStatus(null);
        setMessage('');

        try {
            // Call the ECS API
            // Note: user.username is the user_id in DynamoDB
            const userId = user.username || user.email;
            const result = await api.checkAttendance(userId);

            // Success
            setStatus('success');
            setReward(result.data?.reward || 10); // Default 10
            setMessage("Attendance Checked! Reward Claimed.");

        } catch (error) {
            console.error("Attendance Error:", error);
            setStatus('error');
            // Show friendly message
            if (error.message.includes("already attended")) {
                setMessage("You have already checked in today. Come back tomorrow!");
            } else {
                setMessage(error.message || "Failed to check attendance. System might be busy.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container flex-center" style={{ minHeight: '80vh' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', maxWidth: '450px' }}
            >
                <Card style={{ padding: '3rem', textAlign: 'center' }}>

                    {/* Header Icon */}
                    <div style={{ marginBottom: '2rem' }}>
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            style={{
                                display: 'inline-flex',
                                padding: '1.5rem',
                                background: 'rgba(255, 215, 0, 0.1)',
                                borderRadius: '50%',
                                border: '1px solid rgba(255, 215, 0, 0.3)'
                            }}
                        >
                            <CalendarCheck size={64} style={{ color: '#FFD700' }} />
                        </motion.div>
                    </div>

                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Daily Check-in</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                        Log in daily to earn Gold rewards!
                    </p>

                    {/* Status Message Area */}
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                background: status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                border: `1px solid ${status === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {status === 'success' ? <CheckCircle size={20} color="var(--color-success)" /> : <AlertCircle size={20} color="var(--color-error)" />}
                            <span style={{ color: status === 'success' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 'bold' }}>
                                {message}
                            </span>
                        </motion.div>
                    )}

                    {/* Reward Display (Success Only) */}
                    {status === 'success' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ marginBottom: '2rem' }}
                        >
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#FFD700', textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}>
                                +{reward} <Coins size={32} style={{ verticalAlign: 'middle' }} />
                            </div>
                        </motion.div>
                    )}

                    {/* Action Button */}
                    <Button
                        variant="primary"
                        onClick={handleCheckAttendance}
                        disabled={isLoading || status === 'success'} // Disable if loading or already succeeded
                        style={{
                            width: '100%',
                            padding: '1.2rem',
                            fontSize: '1.2rem',
                            background: status === 'success' ? 'var(--color-glass)' : 'var(--color-accent-blue)',
                            opacity: status === 'success' ? 0.5 : 1
                        }}
                    >
                        {isLoading ? 'Checking...' : status === 'success' ? 'Checked In' : 'Claim Reward'}
                    </Button>

                </Card>
            </motion.div>
        </div>
    );
};

export default Attendance;
