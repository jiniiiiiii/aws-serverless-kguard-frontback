import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Trophy, CalendarCheck, Gamepad2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/index.css';

const Navbar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const [isMyHomeOpen, setIsMyHomeOpen] = useState(false);
    const { user } = useAuth();

    return (
        <nav
            className="glass-panel"
            style={{
                position: 'sticky',
                top: '1rem',
                zIndex: 50,
                margin: '0 1rem',
                borderRadius: 'var(--radius-lg)'
            }}
            onMouseLeave={() => setIsMyHomeOpen(false)}
        >
            <div className="container" style={{ height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>

                {/* Logo - Redirects to Main Portal */}
                <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 60 }}>
                    <Shield color="var(--color-accent-blue)" size={28} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        K-GUARD
                    </span>
                </a>

                {/* Center Links */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '3rem',
                    height: '100%'
                }}>
                    <a href="/" style={navLinkStyle}>NOTICE</a>
                    <a href="/ranking" style={navLinkStyle}>RANKING</a>

                    {/* MY HOME Toggle */}
                    <div
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer' }}
                        onMouseEnter={() => setIsMyHomeOpen(true)}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            color: isMyHomeOpen ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                            fontWeight: isMyHomeOpen ? '600' : '400',
                            transition: 'color 0.2s'
                        }}>
                            <User size={18} />
                            MY HOME
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                {/* Right: Profile */}
                <div style={{ width: '120px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }} />
                            {user.name}
                        </div>
                    ) : (
                        <a href="/login" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                            Login
                        </a>
                    )}
                </div>
            </div>

            {/* Mega Menu */}
            <AnimatePresence>
                {isMyHomeOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        style={{
                            overflow: 'hidden',
                            borderTop: '1px solid var(--glass-border)',
                            background: 'rgba(15, 23, 42, 0.95)',
                            borderBottomLeftRadius: 'var(--radius-lg)',
                            borderBottomRightRadius: 'var(--radius-lg)'
                        }}
                    >
                        <div className="container" style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                            <MegaMenuItem href="/mypage" title="MY PAGE" desc="Profile & Stats" icon={<User size={24} color="var(--color-accent-blue)" />} />
                            <MegaMenuItem href="/game/event" title="EVENT GAME" desc="Play & Earn" icon={<Gamepad2 size={24} color="var(--color-accent-purple)" />} />
                            <MegaMenuItem href="/attendance" title="ATTENDANCE" desc="Daily Rewards" icon={<CalendarCheck size={24} color="var(--color-accent-gold)" />} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const navLinkStyle = {
    textDecoration: 'none',
    color: 'var(--color-text-secondary)',
    display: 'flex', alignItems: 'center', height: '100%'
};

const MegaMenuItem = ({ href, title, desc, icon }) => (
    <a href={href} style={{ textDecoration: 'none', display: 'flex', gap: '1rem', padding: '0.8rem', borderRadius: '0.5rem', alignItems: 'center' }} className="mega-menu-item">
        <div style={{ background: 'var(--glass-border)', padding: '0.8rem', borderRadius: '50%' }}>{icon}</div>
        <div>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{title}</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{desc}</div>
        </div>
    </a>
);

export default Navbar;
