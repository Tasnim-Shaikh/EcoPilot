import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Leaf, Shield, BarChart3, FileText, LogOut, ArrowLeft } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { icon: Shield, label: t('manage_access'), path: '/admin/manage-access', testId: 'manage-access-btn', color: 'primary' },
    { icon: BarChart3, label: t('department_analytics'), path: '/admin/analytics', testId: 'dept-analytics-btn', color: 'secondary' },
    { icon: FileText, label: t('generate_esg_report'), path: '/admin/esg-report', testId: 'esg-report-btn', color: 'primary' },
    { icon: FileText, label: "Manage Users", path: '/admin/manage-users', testId: 'manage-users-btn', color: 'secondary' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />
      
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10" data-testid="admin-dashboard">
        <div className="flex items-center space-x-2">
          <Leaf className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-heading font-bold gradient-text">{t('admin_dashboard')}</h1>
        </div>
        
        <button onClick={handleLogout} className="p-2 rounded-lg bg-white/5 hover:bg-destructive/20 text-destructive" data-testid="logout-btn">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="relative z-10 p-6 md:p-8 max-w-6xl mx-auto">
        <div className="glass p-8 rounded-2xl mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full glass flex items-center justify-center neon-glow">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-2">Administrator Panel</h2>
          <p className="text-muted-foreground">Manage AI governance and sustainability compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="glass p-8 rounded-2xl hover:border-primary/30 hover:shadow-neon transition-all group"
              data-testid={item.testId}
            >
              <item.icon className={`w-16 h-16 mx-auto mb-4 text-${item.color} group-hover:scale-110 transition-transform`} />
              <h3 className="text-xl font-heading font-semibold">{item.label}</h3>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;