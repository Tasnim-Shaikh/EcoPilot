import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Leaf, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Login successful!');
      
      if (user.role === 'admin' || activeTab === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: forgotEmail });
      toast.success('Password reset instructions sent to your email');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error) {
      toast.error('Failed to send reset instructions');
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
        
        <div className="w-full max-w-md relative z-10">
          <button
            onClick={() => setShowForgotPassword(false)}
            className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            data-testid="back-to-login-btn"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Login
          </button>

          <div className="glass p-8 rounded-2xl space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center neon-glow">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-heading font-bold gradient-text mb-2">Forgot Password</h1>
              <p className="text-muted-foreground">Enter your email to reset password</p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('email')}</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full shadow-neon-primary hover:scale-[1.02] transition-all"
              >
                Send Reset Link
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      
      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('back')}
        </button>

        <div className="glass p-8 rounded-2xl space-y-6" data-testid="login-form">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center neon-glow">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-heading font-bold gradient-text mb-2">{t('login')}</h1>
            <p className="text-muted-foreground">Welcome back to EcoPilot</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="user-tab"
            >
              Login as User
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="admin-tab"
            >
              Login as Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="you@example.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="••••••••"
                required
                data-testid="password-input"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
                data-testid="forgot-password-btn"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full shadow-neon-primary hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-btn"
            >
              {loading ? 'Logging in...' : t('login')}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline" data-testid="signup-link">
                {t('signup')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
