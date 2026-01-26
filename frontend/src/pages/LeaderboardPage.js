import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Trophy, Award } from 'lucide-react';
import { leaderboard } from '../utils/api';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await leaderboard.get();
      setLeaders(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="leaderboard-page">
        <button onClick={() => navigate('/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Trophy className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('leaderboard')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <div className="glass p-8 rounded-2xl">
            <div className="space-y-4">
              {leaders.map((leader) => (
                <div
                  key={leader.user_id}
                  className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10">
                        {leader.rank <= 3 ? (
                          <Trophy className={`w-6 h-6 ${getMedalColor(leader.rank)}`} />
                        ) : (
                          <span className="text-xl font-bold text-muted-foreground">#{leader.rank}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{leader.email}</p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span>{leader.badges_count} badges</span>
                          <span>{leader.co2_saved.toFixed(1)}g CO2 saved</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">{leader.eco_points}</p>
                      <p className="text-xs text-muted-foreground">eco points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaderboardPage;