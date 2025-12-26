import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Bell, Trophy } from 'lucide-react';
import '../styles/index.css';

// Helper to check if we should use absolute URL
// In single domain mode, we always use internal routing
const Navbar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <nav className="glass-panel" style={{
            position: 'sticky',
            top: '1rem',
            zIndex: 50,
            margin: '0 1rem',
            borderRadius: 'var(--radius-lg)'
        }}>
            <div className="container flex-center" style={{ justifyContent: 'space-between', height: '4rem' }}>
                {/* Logo */}
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield color="var(--color-accent-blue)" size={28} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        K-GUARD
                    </span>
                </Link>

                {/* Menu */}
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <NavLink to="/" label="NOTICE" active={isActive('/')} />
                    <NavLink to="/ranking" label="RANKING" icon={<Trophy size={18} />} active={isActive('/ranking')} />
                    <NavLink to="/mypage" label="MY PAGE" icon={<User size={18} />} active={isActive('/mypage') || isActive('/login')} />
                </div>
            </div>
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
            position: 'relative'
        }}
    >
        {icon}
        {label}
        {active && (
            <span style={{
                position: 'absolute',
                bottom: '-4px',
                left: 0,
                width: '100%',
                height: '2px',
                background: 'var(--color-accent-blue)',
                boxShadow: '0 0 8px var(--color-accent-blue)'
            }} />
        )}
    </Link>
);

export default Navbar;
