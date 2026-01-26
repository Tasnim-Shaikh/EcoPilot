import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Send, Leaf, Zap, Droplet, CheckCircle, Loader, Hash } from 'lucide-react';
import { ecochat } from '../utils/api';
import { toast } from 'sonner';
import api from '../utils/api';
import { useAuth } from "../context/AuthContext";

// Simple debounce
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
const EcoChatPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o');
  const [region, setRegion] = useState('US-CA');
  const [hardware, setHardware] = useState('GPU');
  const [greenMode, setGreenMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countingTokens, setCountingTokens] = useState(false);
  const [tokenCount, setTokenCount] = useState(null);
  const [response, setResponse] = useState(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const { refreshUser } = useAuth();
  const [deptConfig, setDeptConfig] = useState(null);
  const [lastSuggestion, setLastSuggestion] = useState(null);
  useEffect(() => {
    fetchDepartmentAccess();
  }, []);


  const fetchDepartmentAccess = async () => {
  try {
    const res = await api.get('/user/department-access');

        // ✅ Remove providers that have zero models
        const filteredProviders = Object.fromEntries(
          Object.entries(res.data.allowed_providers || {})
            .filter(([_, models]) => models.length > 0)
        );

        setDeptConfig({
          ...res.data,
          allowed_providers: filteredProviders
        });

        const providers = Object.keys(filteredProviders);
        if (providers.length > 0) {
          setLlmProvider(providers[0]);
          setLlmModel(filteredProviders[providers[0]][0]);
        }

        setRegion(res.data.allowed_regions[0]);

        // 🔒 Force Green Mode if enforced
        if (res.data.green_mode_enforced) {
          setGreenMode(true);
        }

      } catch (err) {
        toast.error("Failed to load department access");
      }
    };



  // Real-time estimation while typing
  const estimateImpact = useCallback(
    debounce(async (promptText, model, region) => {
      if (!promptText.trim()) {
        setRealTimeMetrics(null);
        return;
      }
      
      setEstimating(true);
      try {
        const res = await ecochat.estimate(promptText, model, region);
        setRealTimeMetrics(res.data);
      } catch (error) {
        console.error('Estimation error:', error);
      } finally {
        setEstimating(false);
      }
    }, 800),
    []
  );

  useEffect(() => {
    estimateImpact(prompt, llmModel, region);
  }, [prompt, llmModel, region, estimateImpact]);
  useEffect(() => {
    if (!lastSuggestion) return;

    const matchesSuggestion =
      llmModel === lastSuggestion.recommended_model &&
      region === lastSuggestion.recommended_region;

    if (matchesSuggestion) {
      setGreenMode(true);
      toast.success("🌱 You adopted the green recommendation!");
    }
  }, [llmModel, region, lastSuggestion]);

  const handleCountTokens = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setCountingTokens(true);
    try {
      const res = await ecochat.countTokens(prompt, llmModel, llmProvider);
      setTokenCount(res.data.token_count);
      toast.success(`Token count: ${res.data.token_count}`);
    } catch (error) {
      toast.error('Failed to count tokens');
    } finally {
      setCountingTokens(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setResponse(null);
    setTokenCount(null);

    try {
      const res = await ecochat.send({
        prompt,
        llm_model: llmModel,
        llm_provider: llmProvider,
        region,
        hardware,
        green_mode: deptConfig?.green_mode_enforced ? true : greenMode,
      });

      setResponse(res.data);
      if (res.data.suggestion) {
        setLastSuggestion(res.data.suggestion);
      }
      await refreshUser(); // ✅ THIS FIXES DASHBOARD
      setRealTimeMetrics(null);
      toast.success(
        deptConfig?.green_mode_enforced
          ? '🌱 Green Mode enforced by admin'
          : greenMode
            ? '🌱 Green Mode activated!'
            : '✅ Response generated!'
      );
    } catch (error) {
          const errorMsg =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Access denied by department policy";

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
   if (!deptConfig) {
      return <div className="p-10 text-center">Loading access policy...</div>;
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="ecochat-page">
        <button onClick={() => navigate('/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('eco_chat')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt Input */}
            <div className="glass p-6 rounded-2xl">
              <label className="block text-sm font-medium mb-3">{t('enter_prompt')}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Enter your prompt here..."
                data-testid="prompt-input"
              />
              
              {/* Real-Time Estimation Display */}
              {realTimeMetrics && (
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-primary flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Real-Time Estimation
                    </h4>
                    {estimating && <Loader className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tokens</p>
                      <p className="font-semibold">~{realTimeMetrics.estimated_tokens}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CO2</p>
                      <p className="font-semibold">~{realTimeMetrics.co2_grams}g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Energy</p>
                      <p className="font-semibold">~{realTimeMetrics.energy_kwh} kWh</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Water</p>
                      <p className="font-semibold">~{realTimeMetrics.water_liters}L</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    📍 {realTimeMetrics.region} • Carbon: {realTimeMetrics.carbon_intensity} gCO2/kWh
                  </p>
                </div>
              )}

              {/* Token Count Result */}
              {tokenCount !== null && (
                <div className="mt-4 p-3 bg-secondary/10 border border-secondary/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-semibold">Estimated Tokens: {tokenCount}</span>
                  </div>
                  <button
                    onClick={() => setTokenCount(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="glass p-6 rounded-2xl space-y-4">
              {/* Model Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Provider</label>
                  <select
                    value={llmProvider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setLlmProvider(provider);
                      setLlmModel(deptConfig.allowed_providers[provider][0]);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    style={{color: 'inherit'}}
                    data-testid="provider-select"
                  >
                   

                    {Object.keys(deptConfig?.allowed_providers || {}).map(provider => (
                      <option key={provider} value={provider} className="bg-card text-foreground">
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('select_model')}</label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    style={{color: 'inherit'}}
                    data-testid="model-select"
                  >
                    {deptConfig?.allowed_providers[llmProvider]?.map(model => (
                      <option key={model} value={model} className="bg-card text-foreground">{model}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Region & Hardware */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('select_region')}</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    style={{color: 'inherit'}}
                    data-testid="region-select"
                  >
                   {deptConfig?.allowed_regions?.map(region => (
                    <option key={region} value={region} className="bg-card text-foreground">
                      {region}
                    </option>
                  ))}


                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('select_hardware')}</label>
                  <select
                    value={hardware}
                    onChange={(e) => setHardware(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    style={{color: 'inherit'}}
                    data-testid="hardware-select"
                  >
                    <option value="GPU" className="bg-card text-foreground">GPU</option>
                    <option value="CPU" className="bg-card text-foreground">CPU</option>
                    <option value="TPU" className="bg-card text-foreground">TPU</option>
                  </select>
                </div>
              </div>

              {/* Green Mode */}
              {!deptConfig?.green_mode_enforced && (
                <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Leaf className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-semibold">{t('green_mode')}</p>
                      <p className="text-xs text-muted-foreground">Optimize for sustainability</p>
                    </div>
                  </div>
                  <label className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={greenMode}
                      onChange={(e) => setGreenMode(e.target.checked)}
                      className="sr-only peer"
                      data-testid="green-mode-toggle"
                    />
                    <span className="absolute inset-0 bg-white/10 peer-checked:bg-primary rounded-full transition-all cursor-pointer" />
                    <span className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-6" />
                  </label>
                </div>
              )}


              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleCountTokens}
                  disabled={countingTokens || !prompt.trim()}
                  className="bg-secondary/20 border border-secondary/30 text-secondary-foreground font-semibold py-3 rounded-full hover:bg-secondary/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  data-testid="count-tokens-btn"
                >
                  {countingTokens ? (
                    <><Loader className="w-5 h-5 animate-spin" /> <span>Counting...</span></>
                  ) : (
                    <><Hash className="w-5 h-5" /> <span>Count Tokens</span></>
                  )}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !prompt.trim()}
                  className="bg-primary text-primary-foreground font-semibold py-3 rounded-full shadow-neon-primary hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  data-testid="send-prompt-btn"
                >
                  {loading ? (
                    <><Loader className="w-5 h-5 animate-spin" /> <span>Generating...</span></>
                  ) : (
                    <><Send className="w-5 h-5" /> <span>{t('Calculate Impact')}</span></>
                  )}
                </button>
              </div>
            </div>

            {/* Response */}
            {response && (
              <div className="glass p-6 rounded-2xl" data-testid="response-section">
                <h3 className="text-lg font-heading font-semibold mb-4">Response</h3>
                <div className="bg-white/5 p-4 rounded-lg mb-4 max-h-60 overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{response.response_text}</p>
                </div>
              </div>
            )}
            {response && response.auto_switched && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                🌱 Green Mode auto-selected the most sustainable configuration
              </div>
            )}
            {response && response.suggestion && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                💡 Sustainability Suggestion:
                <br />
                Switch to <b>{response.suggestion.recommended_model}</b> in{" "}
                <b>{response.suggestion.recommended_region}</b> to reduce CO₂ emissions.
              </div>
            )}

          </div>

          {/* Right Panel - Metrics */}
          <div className="space-y-6">
            {response && (
              <>
                <div className="glass p-6 rounded-2xl" data-testid="metrics-panel">
                  <h3 className="text-lg font-heading font-semibold mb-4">{t('real_time_impact')}</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <Leaf className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">CO2 Emissions</span>
                      </div>
                      <p className="text-2xl font-bold">{response.co2_grams.toFixed(2)}g</p>
                    </div>

                    <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <Zap className="w-5 h-5 text-secondary" />
                        <span className="text-sm font-medium">Energy Consumed</span>
                      </div>
                      <p className="text-2xl font-bold">{response.energy_kwh.toFixed(6)} kWh</p>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <Droplet className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium">Water Consumed</span>
                      </div>
                      <p className="text-2xl font-bold">{response.water_liters.toFixed(8)} L</p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Tokens Used</div>
                      <p className="text-xl font-bold">{response.tokens_used}</p>
                    </div>
                  </div>
                </div>

                {response.green_mode_used && response.savings && (
                <div className="glass p-6 rounded-2xl border-2 border-primary/30">
                  <h3 className="text-lg font-heading font-semibold mb-4 text-primary">
                    🌱 Green Mode Savings
                  </h3>
                  <p>
                    CO₂ saved:{" "}
                    <span className="font-semibold text-primary">
                      {response.savings.co2.toFixed(2)} g
                    </span>
                  </p>
                  <p className="text-primary font-semibold mt-3">
                    Eco Points: +{response.eco_points}
                  </p>
                </div>
              )}

              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EcoChatPage;
