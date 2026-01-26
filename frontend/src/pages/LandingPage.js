import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Leaf, Zap, Shield, Globe, Moon, Sun } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, language, changeLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      
      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Leaf className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-heading font-bold gradient-text">EcoPilot</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-white/5 border border-white/10 text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="language-selector"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-secondary" />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full glass flex items-center justify-center neon-glow">
              <Leaf className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6">
            <span className="gradient-text">{t('landing_title')}</span>
          </h1>
          
          <p className="text-2xl md:text-3xl text-foreground/90 font-heading mb-4">
            {t('landing_subtitle')}
          </p>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing_desc')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-neon-primary hover:scale-105 transition-all"
              data-testid="get-started-btn"
            >
              {t('get_started')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 border-2 border-primary text-primary rounded-full hover:bg-primary/10 transition-all"
              data-testid="login-btn"
            >
              {t('login')}
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="glass p-6 rounded-xl hover:border-primary/30 transition-all" data-testid="feature-card-1">
              <Zap className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-heading font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-muted-foreground text-sm">Monitor AI carbon emissions in real-time with precise calculations</p>
            </div>
            
            <div className="glass p-6 rounded-xl hover:border-primary/30 transition-all" data-testid="feature-card-2">
              <Shield className="w-12 h-12 text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-heading font-semibold mb-2">AI Governance</h3>
              <p className="text-muted-foreground text-sm">Strong controls for department-wise AI usage management</p>
            </div>
            
            <div className="glass p-6 rounded-xl hover:border-primary/30 transition-all" data-testid="feature-card-3">
              <Globe className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-heading font-semibold mb-2">ESG Compliance</h3>
              <p className="text-muted-foreground text-sm">Generate ESG reports for sustainability compliance</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-muted-foreground text-sm">
        <p>© 2025 EcoPilot. Built for responsible AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;