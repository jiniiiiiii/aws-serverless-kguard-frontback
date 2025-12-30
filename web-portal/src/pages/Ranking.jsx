import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import { Trophy, Medal, User } from 'lucide-react';
import '../styles/index.css';
import REGION_MAP from '../data/regions.json';

const Ranking = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ top3: [], others: [] });
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  
useEffect(() => {
    // 1. 페이지 접속 로그 (PAGE_VIEW)
    api.sendLog("PAGE_VIEW", "guest", { page: "Ranking" });

    const fetchRank = async () => {
      try {
        // Parallel fetch for better performance
        const promises = [api.getGlobalRanking()];
        if (user && user.email) {
          promises.push(api.getMyRank(user.email));
        }

        const results = await Promise.all(promises);
        const globalData = results[0];
        const myRankData = results[1] || null;

        console.log("Ranking Data Fetched:", globalData);
        setData(globalData);
        if (myRankData) {
          setMyRank(myRankData);
        }
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
  }, [user]);

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
          {/* My Rank Section */}
          {myRank && (user) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: '3rem' }}
            >
              <Card style={{
                border: '2px solid var(--color-primary)',
                background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(0,0,0,0.3))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>MY RANK</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {myRank.rank > 0 ? `#${myRank.rank}` : '-'}
                    </div>
                  </div>
                  <div>
                    <h2 style={{ margin: 0 }}>{user.name || user.email.split('@')[0]}</h2>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{user.email}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>HIGHSCORE</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {myRank.score ? myRank.score.toLocaleString() : 0} pts
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

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
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                    {/* Rank */}
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: 'var(--color-text-secondary)',
                      width: '40px',
                      textAlign: 'center'
                    }}>
                      {user.rank}
                    </div>

                    {/* User Info & Region */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {user.email || user.username}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{REGION_MAP[user.region] || user.region || 'Unknown Region'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {user.score.toLocaleString()}
                    </div>
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
