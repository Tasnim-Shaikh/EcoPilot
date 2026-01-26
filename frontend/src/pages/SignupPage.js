import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Leaf, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const res = await axios.get(`${API_URL}/api/auth/departments`);
      setDepartments(res.data.departments);
      if (res.data.departments.length > 0) {
        setDepartment(res.data.departments[0]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      
      // First create the user account with department
      const signupRes = await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        password,
        department
      });
      
      console.log('Signup successful:', signupRes.data);
      
      // Then login to get token
      const user = await login(email, password);
      toast.success('Account created successfully!');
      
      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Signup failed';
      console.error('Signup error:', error);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('back')}
        </button>

        {/* Signup Card */}
        <div className="glass p-8 rounded-2xl space-y-6" data-testid="signup-form">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center neon-glow">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-heading font-bold gradient-text mb-2">{t('signup')}</h1>
            <p className="text-muted-foreground">Create your EcoPilot account</p>
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
                minLength={6}
                data-testid="password-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="••••••••"
                required
                minLength={6}
                data-testid="confirm-password-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
                style={{color: 'inherit'}}
                required
                data-testid="department-select"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept} className="bg-card text-foreground">{dept}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full shadow-neon-primary hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-btn"
            >
              {loading ? 'Creating Account...' : t('signup')}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                {t('login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;