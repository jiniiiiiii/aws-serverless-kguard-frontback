import React from 'react';

const Navbar = () => {
    // Assuming the main portal is at the root '/' or relative paths work if served under same domain
    // If different ports locally, full URLs might be needed, but relative usually best for same-origin ALB

    // Simplification: Using text instead of Icons to avoid installing lucide-react

    return (
        <nav
            className="glass-panel"
            style={{
                position: 'sticky',
                top: '1rem',
                zIndex: 50,
                marginBottom: '2rem',
                width: '95%',
                maxWidth: '1200px', // Slightly smaller for game view
                borderRadius: 'var(--radius-lg)'
            }}
        >
            <div className="container" style={{ height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>

                {/* Left: Logo */}
                <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 60 }}>
                    {/* Simple Shield SVG Placeholder */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)', fontFamily: "'Netmarble', sans-serif" }}>
                        K-GUARD
                    </span>
                </a>

                {/* Center: Navigation Links */}
                <div style={{
                    display: 'flex',
                    gap: '3rem',
                    height: '100%',
                    alignItems: 'center'
                }}>
                    <a href="/" style={navLinkStyle}>NOTICE</a>
                    <a href="/ranking" style={navLinkStyle}>RANKING</a>
                    <a href="/mypage" style={navLinkStyle}>MY HOME</a>
                </div>

                {/* Right: User Profile (Simple Placeholder) */}
                <div style={{ width: '120px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {/* We can't easy check auth state without shared context/cookies, just show simple link or empty */}
                    <a href="/mypage" style={{ ...navLinkStyle, fontSize: '0.9rem' }}>My Page</a>
                </div>
            </div>
        </nav>
    );
};

const navLinkStyle = {
    textDecoration: 'none',
    color: 'var(--color-text-secondary)', // Default
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'color 0.2s',
    height: '100%',
    fontFamily: "'Netmarble', sans-serif"
};

export default Navbar;
