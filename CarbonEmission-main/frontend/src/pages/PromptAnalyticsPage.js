import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Leaf, Zap, Droplet, Star } from 'lucide-react';
import { analytics } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PromptAnalyticsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promptsRes, statsRes] = await Promise.all([
        analytics.getPrompts(),
        analytics.getStats(),
      ]);
      setPrompts(promptsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="analytics-page">
        <button onClick={() => navigate('/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('prompt_analytics')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('co2_emissions')}</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.total_co2.toFixed(1)}g</p>
                </div>

                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('co2_saved')}</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">{stats.total_co2_saved.toFixed(1)}g</p>
                </div>

                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Zap className="w-5 h-5 text-secondary" />
                    <span className="text-sm text-muted-foreground">{t('energy_consumption')}</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.total_energy.toFixed(4)} kWh</p>
                </div>

                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-muted-foreground">{t('eco_points')}</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.eco_points}</p>
                </div>
              </div>
            )}

            {/* Prompts List */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="text-xl font-heading font-semibold mb-6">Query History</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="bg-white/5 p-4 rounded-lg border border-white/10 hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{prompt.prompt}</p>
                        <p className="text-xs text-muted-foreground">{prompt.model} • {new Date(prompt.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tokens</p>
                        <p className="font-semibold">{prompt.tokens_used}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CO2</p>
                        <p className="font-semibold">{prompt.co2_grams.toFixed(2)}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saved</p>
                        <p className="font-semibold text-primary">{prompt.co2_saved.toFixed(2)}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Points</p>
                        <p className="font-semibold text-primary">+{prompt.eco_points}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PromptAnalyticsPage;