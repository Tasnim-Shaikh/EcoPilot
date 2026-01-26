import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Lightbulb, Cpu, Globe } from 'lucide-react';
import { recommender } from '../utils/api';

const AIRecommenderPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [models, setModels] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsRes, regionsRes] = await Promise.all([
        recommender.getModels(),
        recommender.getRegions(),
      ]);
      setModels(modelsRes.data.recommendations);
      setRegions(regionsRes.data.regions);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="recommender-page">
        <button onClick={() => navigate('/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Lightbulb className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('ai_recommender')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <>
            {/* Model Recommendations */}
            <div className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6">Model Efficiency Comparison</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {models.map((model, idx) => (
                  <div key={idx} className="glass p-6 rounded-xl hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Cpu className="w-8 h-8 text-primary" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{(model.efficiency_score).toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Efficiency</div>
                      </div>
                    </div>
                    <h3 className="font-heading font-semibold mb-1">{model.model}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{model.provider}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Tokens:</span>
                        <span className="font-semibold">{model.avg_tokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg CO2:</span>
                        <span className="font-semibold">{model.avg_co2}g</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-primary">{model.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Region Sustainability Ranking */}
            <div>
              <h2 className="text-2xl font-heading font-bold mb-6">Region Sustainability Ranking</h2>
              <div className="glass p-6 rounded-2xl">
                <div className="space-y-4">
                  {regions.map((region, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                          <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{region.name}</p>
                          <p className="text-sm text-muted-foreground">{region.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Carbon Intensity</p>
                            <p className="font-semibold">{region.avg_carbon_intensity} gCO2/kWh</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Score</p>
                            <p className="text-2xl font-bold text-primary">{region.sustainability_score.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AIRecommenderPage;