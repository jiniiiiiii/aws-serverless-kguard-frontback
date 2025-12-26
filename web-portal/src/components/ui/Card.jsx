import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import '../../styles/index.css';

const Card = ({ children, className, delay = 0, onClick }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
            className={clsx('glass-panel', 'p-4', className)}
            style={{ padding: '1.5rem' }} // Inline style for guaranteed padding override
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
};

export default Card;
