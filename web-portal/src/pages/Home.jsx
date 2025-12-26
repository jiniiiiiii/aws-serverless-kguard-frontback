import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import { Bell, ChevronRight, Calendar } from 'lucide-react';
import '../styles/index.css';

const Home = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await api.getNotices();
                setNotices(data);
                if (data.length > 0) {
                    // Instead of using 'recentNotice' from list, fetch the FULL detail of the first item
                    handleNoticeClick(data[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleNoticeClick = async (id) => {
        setDetailLoading(true);
        try {
            const detail = await api.getNoticeDetail(id);
            setSelectedNotice(detail);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                style={{
                    marginBottom: '3rem',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    position: 'relative',
                    height: '300px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                }}
            >
                <img
                    src="/banner.png"
                    alt="K-Guard Banner"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    padding: '2rem',
                    background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.9))'
                }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        margin: 0,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        NOTICE
                    </h1>
                </div>
            </motion.div>

            {/* Content Grid */}
            {loading ? (
                <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Loading notices...</div>
            ) : (
                <div className="grid-cols-2" style={{ alignItems: 'start' }}>

                    {/* Left Column: All Notices List */}
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
                            <Bell size={20} />
                            All Notices
                        </h2>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            {notices.map((notice) => (
                                <motion.div key={notice.id} variants={itemVariants}>
                                    <Card
                                        className="hover-scale"
                                        onClick={() => handleNoticeClick(notice.id)}
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            // Highlight selected item
                                            border: selectedNotice?.id === notice.id ? '1px solid var(--color-accent-blue)' : '1px solid var(--glass-border)',
                                            background: selectedNotice?.id === notice.id ? 'rgba(0, 243, 255, 0.05)' : 'var(--glass-bg)'
                                        }}
                                    >
                                        <div>
                                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{notice.title}</h3>
                                            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                                                {notice.date}
                                            </p>
                                        </div>
                                        {notice.isNew && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '0.1rem 0.4rem',
                                                background: 'var(--color-accent-blue)',
                                                color: '#000',
                                                borderRadius: '4px',
                                                fontWeight: 'bold'
                                            }}>N</span>
                                        )}
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right Column: Detail View (Fetched Async) */}
                    <div style={{ minHeight: '400px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-accent-blue)' }}>
                            <Calendar size={20} />
                            Detail View
                        </h2>

                        {detailLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                loading content...
                            </div>
                        ) : selectedNotice ? (
                            <motion.div
                                key={selectedNotice.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card style={{ minHeight: '400px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                                        background: 'linear-gradient(to bottom, var(--color-accent-blue), transparent)'
                                    }} />

                                    <span style={{
                                        display: 'inline-block',
                                        marginBottom: '1rem',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        border: '1px solid var(--color-accent-blue)',
                                        color: 'var(--color-accent-blue)',
                                        fontSize: '0.85rem'
                                    }}>
                                        {/* For mocked details, we might not have isNew in detail json, but we can assume logic or just show Notice */}
                                        Notice #{selectedNotice.id}
                                    </span>

                                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: '1.2' }}>
                                        {selectedNotice.title}
                                    </h1>

                                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                                        Posted on {selectedNotice.date}
                                    </p>

                                    <div style={{ lineHeight: '1.6', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                                        {selectedNotice.content ? selectedNotice.content.split('\n').map((line, i) => (
                                            <React.Fragment key={i}>
                                                {line}
                                                <br />
                                            </React.Fragment>
                                        )) : 'No content'}
                                    </div>
                                </Card>
                            </motion.div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                Select a notice to view details
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default Home;
