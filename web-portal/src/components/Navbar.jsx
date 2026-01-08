import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Trophy, CalendarCheck, Gamepad2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/index.css';

const Navbar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const [isMyHomeOpen, setIsMyHomeOpen] = useState(false);

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

                {/* 3. Right: User Status (Placeholder for now, or existing login logic if I had access to auth context here) */}
                <div style={{ width: '120px', textAlign: 'right' }}>
                    {/* Placeholder to balance layout or User Profile Icon */}
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
                            background: 'rgba(15, 23, 42, 0.95)', // Slightly darker for contrast
                            borderBottomLeftRadius: 'var(--radius-lg)',
                            borderBottomRightRadius: 'var(--radius-lg)'
                        }}
                    >
                        <div className="container" style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center', gap: '4rem' }}>

                            {/* Menu Item 1: MY PAGE */}
                            <MegaMenuItem
                                to="/mypage"
                                title="MY PAGE"
                                desc="Check your stats and profile"
                                icon={<User size={24} color="var(--color-accent-blue)" />}
                            />

                            {/* Menu Item 2: EVENT GAME */}
                            <MegaMenuItem
                                to="/game/event"
                                title="EVENT GAME"
                                desc="Temporary mini-games"
                                icon={<Gamepad2 size={24} color="var(--color-accent-purple)" />}
                            />

                            {/* Menu Item 3: ATTENDANCE */}
                            <MegaMenuItem
                                to="/attendance"
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
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            transition: 'background 0.2s',
            width: '200px',
            textAlign: 'center'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
        <div style={{
            background: 'var(--glass-border)',
            padding: '0.8rem',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {icon}
        </div>
        <div>
            <div style={{
                color: 'var(--color-text-primary)',
                fontWeight: 'bold',
                marginBottom: '0.2rem',
                fontSize: '1rem'
            }}>
                {title}
            </div>
            <div style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.8rem'
            }}>
                {desc}
            </div>
        </div>
    </Link>
);

export default Navbar;
