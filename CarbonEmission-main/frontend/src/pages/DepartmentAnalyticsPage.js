import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { admin } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
const DepartmentAnalyticsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await admin.getDepartmentAnalytics();
      setAnalytics(res.data);
    } catch (error) {
      toast.error('Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#00FF94', '#7000FF', '#00B8D9', '#FFAB00'];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="dept-analytics-page">
        <button onClick={() => navigate('/admin/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <BarChart3 className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('department_analytics')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass p-6 rounded-xl">
                <h3 className="text-sm text-muted-foreground mb-2">Total Token Usage</h3>
                <p className="text-3xl font-bold text-primary">
                  {analytics.reduce((sum, dept) => sum + dept.token_usage, 0).toLocaleString()}
                </p>
              </div>
              <div className="glass p-6 rounded-xl">
                <h3 className="text-sm text-muted-foreground mb-2">Total CO2 Emissions</h3>
                <p className="text-3xl font-bold">
                  {analytics.reduce((sum, dept) => sum + dept.co2_emissions, 0).toFixed(1)}g
                </p>
              </div>
              <div className="glass p-6 rounded-xl">
                <h3 className="text-sm text-muted-foreground mb-2">Total CO2 Saved</h3>
                <p className="text-3xl font-bold text-primary">
                  {analytics.reduce((sum, dept) => sum + dept.co2_saved, 0).toFixed(1)}g
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Token Usage Chart */}
              <div className="glass p-6 rounded-2xl">
                <h3 className="text-lg font-heading font-semibold mb-6">Token Usage by Department</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics}>
                    <XAxis dataKey="department" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ background: '#150E25', border: '1px solid #2D2445', borderRadius: '8px' }}
                    />
                    <Bar dataKey="token_usage" fill="#00FF94" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CO2 Emissions Chart */}
              <div className="glass p-6 rounded-2xl">
                <h3 className="text-lg font-heading font-semibold mb-6">CO2 Emissions Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics}
                      dataKey="co2_emissions"
                      nameKey="department"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#150E25', border: '1px solid #2D2445', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Details Table */}
            <div className="glass p-6 rounded-2xl mt-6">
              <h3 className="text-lg font-heading font-semibold mb-6">Department Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-right py-3 px-4">Token Usage</th>
                      <th className="text-right py-3 px-4">CO2 Emissions</th>
                      <th className="text-right py-3 px-4">CO2 Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((dept, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 font-semibold">{dept.department}</td>
                        <td className="text-right py-3 px-4">{dept.token_usage.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{dept.co2_emissions.toFixed(1)}g</td>
                        <td className="text-right py-3 px-4 text-primary font-semibold">{dept.co2_saved.toFixed(1)}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DepartmentAnalyticsPage;