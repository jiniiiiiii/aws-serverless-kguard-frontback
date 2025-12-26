import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Button = ({ children, onClick, variant = 'primary', className, fullWidth = false }) => {
    const baseStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: '600',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        width: fullWidth ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontSize: '1rem',
    };

    const variants = {
        primary: {
            background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #3b82f6 100%)',
            color: '#000',
            boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
        },
        secondary: {
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--glass-border)',
        },
        outline: {
            background: 'transparent',
            color: 'var(--color-accent-blue)',
            border: '1px solid var(--color-accent-blue)',
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={clsx(className)}
            style={{ ...baseStyle, ...variants[variant] }}
            onClick={onClick}
        >
            {children}
        </motion.button>
    );
};

export default Button;
