import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { auth } from '../utils/api';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    const savedUser = Cookies.get('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await auth.login(email, password);
    const { access_token, user: userData } = response.data;
    
    // Set cookies with proper settings for cross-domain
    Cookies.set('token', access_token, { 
      expires: 7,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    Cookies.set('user', JSON.stringify(userData), { 
      expires: 7,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    setUser(userData);
    
    console.log('Login successful, token saved:', access_token.substring(0, 20) + '...');
    
    return userData;
  };

  const signup = async (email, password) => {
    await auth.signup(email, password);
    return login(email, password);
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    setUser(null);
  };
  const refreshUser = async () => {
  try {
    const res = await api.get('/auth/me');

    setUser(res.data);

    // ✅ keep cookies in sync
    Cookies.set('user', JSON.stringify(res.data), {
      expires: 7,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:',
    });

  } catch (err) {
    console.error('Failed to refresh user', err);
  }
};


  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;