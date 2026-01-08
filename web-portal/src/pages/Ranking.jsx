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

  // Ranking Mode State
  const [rankingMode, setRankingMode] = useState('global'); // 'global' | 'monthly' | 'region'
  const [selectedRegion, setSelectedRegion] = useState('ap-northeast-2'); // Default to Seoul
  const [displayMonth, setDisplayMonth] = useState(''); // For Monthly Title


  useEffect(() => {
    // 1. 페이지 접속 로그 (PAGE_VIEW)
    api.sendLog("PAGE_VIEW", "guest", { page: "Ranking" });

    const fetchRank = async () => {
      setLoading(true); // Show loading on mode switch
      try {
        if (rankingMode === 'monthly') {
          // [Monthly] Default to Last Month
          const today = new Date();
          const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastMonthObj = new Date(firstOfThisMonth - 1); // Last day of prev month
          const targetMonthStr = lastMonthObj.toISOString().slice(0, 7); // "YYYY-MM"

          setDisplayMonth(targetMonthStr);

          // Parallel fetch (Global/Monthly separate)
          const promises = [api.getMonthlyRanking(targetMonthStr)];

          // Note: getMyRank (Redis) also needs to support monthly if we want "My Rank" in monthly tab.
          // Current api.getMyRank is for Global Highscore (DynamoDB).
          // Monthly specific "My Rank" is not yet hooked up to a separate UI logic, 
          // but let's try to fetch it if user exists.
          // For now, let's just fetch the list. 
          // If you need "My Monthly Rank", api.getMyRank needs updates or a new api call.
          // Based on api.js update, we created getMonthlyRanking which returns list.
          // Let's assume for now we only show the list.

          const results = await Promise.all(promises);
          const monthlyData = results[0];

          console.log(`Ranking Data Fetched (Monthly):`, monthlyData);
          setData(monthlyData);
          setMyRank(null); // Reset My Rank for monthly for now (unless we implement monthly my rank)

        } else {
          // [Global / Region]
          const targetRegion = rankingMode === 'region' ? selectedRegion : null;

          // Parallel fetch for better performance
          const promises = [api.getGlobalRanking(targetRegion)];
          if (user && user.email) {
            promises.push(api.getMyRank(user.email));
          }

          const results = await Promise.all(promises);
          const globalData = results[0];
          const myRankData = results[1] || null;

          console.log(`Ranking Data Fetched (${rankingMode}):`, globalData);
          setData(globalData);
          if (myRankData) {
            setMyRank(myRankData);
          }
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
  }, [user, rankingMode, selectedRegion]); // Re-fetch on mode/region change

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
          {rankingMode === 'global' && 'Global Ranking'}
          {rankingMode === 'monthly' && 'Monthly Hall of Fame'}
          {rankingMode === 'region' && 'Regional Ranking'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {rankingMode === 'global' && 'Top Heroes of K-Guard'}
          {rankingMode === 'monthly' && `Results for ${displayMonth} (Last Month)`}
          {rankingMode === 'region' && `Heroes of ${REGION_MAP[selectedRegion] || selectedRegion}`}
        </p>

        {/* Toggle & Dropdown Controls */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Mode Tabs */}
          <div style={{ background: 'var(--glass-bg)', padding: '0.4rem', borderRadius: '50px', display: 'inline-flex', gap: '0.5rem', border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setRankingMode('global')}
              style={{
                background: rankingMode === 'global' ? 'var(--color-primary)' : 'transparent',
                color: rankingMode === 'global' ? '#fff' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              Global
            </button>
            <button
              onClick={() => setRankingMode('monthly')}
              style={{
                background: rankingMode === 'monthly' ? 'var(--color-primary)' : 'transparent',
                color: rankingMode === 'monthly' ? '#fff' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setRankingMode('region')}
              style={{
                background: rankingMode === 'region' ? 'var(--color-primary)' : 'transparent',
                color: rankingMode === 'region' ? '#fff' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              Region
            </button>
          </div>

          {/* Region Dropdown (Visible only in Region Mode) */}
          {rankingMode === 'region' && (
            <motion.select
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{
                background: 'var(--glass-bg)',
                color: '#fff',
                border: '1px solid var(--color-primary)',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                cursor: 'pointer',
                outline: 'none',
                fontSize: '1rem'
              }}
            >
              {Object.entries(REGION_MAP).map(([code, name]) => (
                <option key={code} value={code} style={{ background: '#222' }}>
                  {name}
                </option>
              ))}
            </motion.select>
          )}
        </div>

        {rankingMode !== 'monthly' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
            Last Updated: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '-'}
          </p>
        )}
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
          * 최초 불러오기시 시간이 걸릴 수 있습니다.
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
