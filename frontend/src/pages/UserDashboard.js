import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Leaf, MessageSquare, BarChart3, Trophy, Award, Lightbulb, LogOut, Menu, X, Moon, Sun, Globe } from 'lucide-react';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { icon: MessageSquare, label: t('eco_chat'), path: '/ecochat', testId: 'ecochat-btn' },
    { icon: BarChart3, label: t('prompt_analytics'), path: '/analytics', testId: 'analytics-btn' },
    { icon: Trophy, label: t('leaderboard'), path: '/leaderboard', testId: 'leaderboard-btn' },
    { icon: Award, label: t('badges'), path: '/badges', testId: 'badges-btn' },
    { icon: Lightbulb, label: t('ai_recommender'), path: '/recommender', testId: 'recommender-btn' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      
      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10" data-testid="user-dashboard">
        <div className="flex items-center space-x-2">
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Leaf className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-heading font-bold gradient-text">{t('user_dashboard')}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-white/5 border border-white/10 text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
            data-testid="language-selector"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
            <option value="mr">MR</option>
          </select>
          
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" data-testid="theme-toggle">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button onClick={handleLogout} className="p-2 rounded-lg bg-white/5 hover:bg-destructive/20 text-destructive" data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6 md:p-8 max-w-6xl mx-auto">
        {/* User Info Card */}
        <div className="glass p-6 rounded-2xl mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full glass flex items-center justify-center neon-glow">
            <Leaf className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-1">{user?.email}</h2>
          <p className="text-sm text-muted-foreground">
            Department: {user?.department || 'N/A'}
          </p>

          <div className="flex justify-center space-x-8 mt-4">
            <div>
              <p className="text-3xl font-bold text-primary">{user?.eco_points || 0}</p>
              <p className="text-sm text-muted-foreground">{t('eco_points')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{(user?.co2_saved || 0).toFixed(1)}g</p>
              <p className="text-sm text-muted-foreground">{t('co2_saved')}</p>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="glass p-8 rounded-2xl hover:border-primary/30 hover:shadow-neon transition-all group"
              data-testid={item.testId}
            >
              <item.icon className="w-16 h-16 mx-auto mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-heading font-semibold">{item.label}</h3>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
