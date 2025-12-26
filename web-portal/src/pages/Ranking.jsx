import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import { Trophy, Medal, User } from 'lucide-react';
import '../styles/index.css';

const Ranking = () => {
  const [data, setData] = useState({ top3: [], others: [] });
  const [loading, setLoading] = useState(true);

  
useEffect(() => {
    // 1. 페이지 접속 로그 (PAGE_VIEW)
    api.sendLog("PAGE_VIEW", "guest", { page: "Ranking" });

    const fetchRank = async () => {
      try {
        const res = await api.getGlobalRanking();
        console.log("Ranking Data Fetched:", res);
        setData(res);
      } catch (e) {
        console.error(e);
        
        // 2. 에러 발생 로그 (ERROR)
        api.sendLog("ERROR", "guest", { 
            location: "RankingPage", 
            message: e.message 
        });
        
      } finally {
        setLoading(false);
      }
    };

    fetchRank();
  }, []);

  const getMedalColor = (rank) => {
    if (rank === 1) return 'var(--color-accent-gold)';
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'var(--color-text-primary)';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Trophy size={40} color="var(--color-accent-gold)" />
          Global Ranking
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Top Heroes of K-Guard</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Last Updated: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '-'}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading Rankings...</div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
            alignItems: 'end'
          }}>
            {/* Swap order visually for podium effect usually 2, 1, 3 but grid is linear. 
                Let's just iterate naturally but style 1st differently */}
            {data.top3.map((user) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: user.rank * 0.2 }}
              >
                <Card style={{
                  textAlign: 'center',
                  border: user.rank === 1 ? `2px solid ${getMedalColor(1)}` : '1px solid var(--glass-border)',
                  background: user.rank === 1 ? 'rgba(255, 215, 0, 0.1)' : 'var(--glass-bg)',
                  transform: user.rank === 1 ? 'scale(1.05)' : 'scale(1)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                    {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                  </div>
                  <h2 style={{ color: getMedalColor(user.rank), margin: '0.5rem 0' }}>{user.username}</h2>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{user.score.toLocaleString()} pts</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    {user.role}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* 4-100 List */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
          >
            {data.others.map((user) => (
              <motion.div key={user.rank} variants={itemVariants}>
                <Card style={{
                  padding: '1rem 2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <span style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      width: '40px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {user.rank}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <User size={16} />
                      </div>
                      <span style={{ fontSize: '1.1rem' }}>{user.username}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{user.role}</span>
                    <span style={{ fontWeight: 'bold', width: '100px', textAlign: 'right' }}>
                      {user.score.toLocaleString()}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Ranking;
