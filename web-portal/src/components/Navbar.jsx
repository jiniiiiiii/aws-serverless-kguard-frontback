```javascript
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
    const { user } = useAuth(); // Get auth state

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
                
                {/* 1. Left: Logo */}
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 60 }}>
                    <Shield color="var(--color-accent-blue)" size={28} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        K-GUARD
                    </span>
                </Link>

                {/* 2. Center: Navigation Links */}
                <div style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    display: 'flex', 
                    gap: '3rem',
                    height: '100%'
                }}>
                    <NavLink to="/" label="NOTICE" active={isActive('/')} />
                    <NavLink to="/ranking" label="RANKING" icon={<Trophy size={18} />} active={isActive('/ranking')} />
                    
                    {/* MY HOME Mega Menu Trigger */}
                    <div 
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer' }}
                        onMouseEnter={() => setIsMyHomeOpen(true)}
                    >
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            color: (isActive('/mypage') || isMyHomeOpen) ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                            fontWeight: (isActive('/mypage') || isMyHomeOpen) ? '600' : '400',
                            transition: 'color 0.2s'
                        }}>
                            <User size={18} />
                            MY HOME
                            <motion.div
                                animate={{ rotate: isMyHomeOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={14} />
                            </motion.div>
                        </div>
                        
                        {/* Active Indicator for My Home Parent */}
                        {(isActive('/mypage') || isMyHomeOpen) && (
                            <motion.span
                                layoutId="navline"
                                style={{
                                    position: 'absolute',
                                    bottom: '18px',
                                    left: 0,
                                    width: '100%',
                                    height: '2px',
                                    background: 'var(--color-accent-blue)',
                                    boxShadow: '0 0 8px var(--color-accent-blue)'
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* 3. Right: User Profile / Login Link */}
                <div style={{ width: '120px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }} />
                            {user.name || user.email.split('@')[0]}
                        </div>
                    ) : (
                        <Link to="/login" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                            Login
                        </Link>
                    )}
                </div>
            </div>

            {/* Mega Menu Dropdown */}
            <AnimatePresence>
                {isMyHomeOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            overflow: 'hidden',
                            borderTop: '1px solid var(--glass-border)',
                            background: 'rgba(15, 23, 42, 0.95)', 
                            borderBottomLeftRadius: 'var(--radius-lg)',
                            borderBottomRightRadius: 'var(--radius-lg)'
                        }}
                    >
                        <div className="container" style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                           
                            {/* Menu Item 1: MY PAGE */}
                            <MegaMenuItem 
                                to={user ? "/mypage" : "/login"}
                                title="MY PAGE" 
                                desc="Check your stats and profile" 
                                icon={<User size={24} color="var(--color-accent-blue)" />} 
                            />

                            {/* Menu Item 2: EVENT GAME */}
                            <MegaMenuItem 
                                to={user ? "/game/event" : "/login"}
                                title="EVENT GAME" 
                                desc="Temporary mini-games" 
                                icon={<Gamepad2 size={24} color="var(--color-accent-purple)" />} 
                            />

                            {/* Menu Item 3: ATTENDANCE */}
                            <MegaMenuItem 
                                to={user ? "/attendance" : "/login"}
                                title="ATTENDANCE CHECK" 
                                desc="Get daily rewards" 
                                icon={<CalendarCheck size={24} color="var(--color-accent-gold)" />} 
                            />

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const NavLink = ({ to, label, icon, active }) => (
    <Link
        to={to}
        style={{
            textDecoration: 'none',
            color: active ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
            fontWeight: active ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'color 0.2s',
            position: 'relative',
            height: '100%'
        }}
    >
        {icon}
        {label}
        {active && (
            <motion.span
                layoutId="navline"
                style={{
                    position: 'absolute',
                    bottom: '18px',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: 'var(--color-accent-blue)',
                    boxShadow: '0 0 8px var(--color-accent-blue)'
                }}
            />
        )}
    </Link>
);

const MegaMenuItem = ({ to, title, desc, icon }) => (
    <Link 
        to={to} 
        className="mega-menu-item"
        style={{
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'row', // Horizontal
            alignItems: 'center',
            gap: '1rem',
            padding: '0.8rem 1.2rem',
            borderRadius: 'var(--radius-md)',
            transition: 'background 0.2s',
            width: '260px', // Detailed width
            textAlign: 'left' // Left align
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
        <div style={{ 
            background: 'var(--glass-border)', 
            padding: '0.8rem', 
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
        }}>
            {icon}
        </div>
        <div>
            <div style={{ 
                color: 'var(--color-text-primary)', 
                fontWeight: 'bold', 
                marginBottom: '0.2rem',
                fontSize: '1rem' // Standard size
            }}>
                {title}
            </div>
            <div style={{ 
                color: 'var(--color-text-secondary)', 
                fontSize: '0.8rem' // Smaller desc
            }}>
                {desc}
            </div>
        </div>
    </Link>
);

export default Navbar;
