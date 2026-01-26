import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Shield } from 'lucide-react';
import { admin } from '../utils/api';
import { toast } from 'sonner';

const ManageAccessPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const MODEL_MAP = {
    openai: ['gpt-5.2', 'gpt-4o'],
    anthropic: ['claude-sonnet-4-5-20250929'],
    gemini: ['gemini-3-flash-preview']
  };
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
  try {
    const res = await admin.getDepartments();

    // backend already returns list
    const formatted = res.data.map((dept) => ({
      ...dept,
      allowed_providers: dept.allowed_providers || {
        openai: [],
        anthropic: [],
        gemini: []
      },
      allowed_regions: dept.allowed_regions || [],
      token_limit: dept.token_limit || 10000,
      green_mode_enforced: dept.green_mode_enforced || false
    }));

    setDepartments(formatted);
    setSelectedDept(formatted[0]);
  } catch (error) {
      console.error("Fetch departments error:", error.response || error);
      toast.error('Error fetching departments');
    }finally {
    setLoading(false);
  }
};

  const handleSave = async () => {
    try {
      await admin.updateDepartment(selectedDept.id, selectedDept);
      toast.success('Department access updated successfully');
    } catch (error) {
      toast.error('Error updating department');
    }
  };


  

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="manage-access-page">
        <button onClick={() => navigate('/admin/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Shield className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('manage_access')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department List */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="text-lg font-heading font-semibold mb-4">Departments</h2>
              <div className="space-y-2">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedDept?.id === dept.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {dept.department}
                  </button>
                ))}
              </div>
            </div>

            {/* Access Configuration */}
            {selectedDept && (
              <div className="lg:col-span-2 glass p-8 rounded-2xl">
                <h2 className="text-xl font-heading font-semibold mb-6">{selectedDept.department}</h2>

                <div className="space-y-6">
                  {/* Allow Access Section */}
                    <div>
                      <h3 className="text-lg font-heading font-semibold mb-4">{t('allow_access')}</h3>
                      <div className="space-y-3">

                        {Object.entries(MODEL_MAP).map(([provider, models]) => (
                          <div key={provider} className="mb-4">
                            <p className="font-semibold capitalize mb-2">{provider}</p>

                            {models.map((model) => (
                              <label
                                key={model}
                                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDept.allowed_providers?.[provider]?.includes(model)}
                                  onChange={(e) => {
                                    const updated = { ...(selectedDept.allowed_providers || {}) };

                                    if (!updated[provider]) updated[provider] = [];

                                    updated[provider] = e.target.checked
                                      ? [...updated[provider], model]
                                      : updated[provider].filter(m => m !== model);

                                    setSelectedDept({
                                      ...selectedDept,
                                      allowed_providers: updated
                                    });
                                  }}
                                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">{model}</span>
                              </label>
                            ))}
                          </div>
                        ))}

                      </div>
                    </div>


                  {/* Token Limit */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('token_limit')}</label>
                    <input
                      type="number"
                      value={selectedDept.token_limit}
                      onChange={(e) => setSelectedDept({ ...selectedDept, token_limit: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Green Mode Enforcement */}
                  <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div>
                      <p className="font-semibold">{t('enforce_green_mode')}</p>
                      <p className="text-xs text-muted-foreground">Require all queries to use Green Mode</p>
                    </div>
                    <label className="relative inline-block w-14 h-8">
                      <input
                        type="checkbox"
                        checked={selectedDept.green_mode_enforced}
                        onChange={(e) => setSelectedDept({ ...selectedDept, green_mode_enforced: e.target.checked })}
                        className="sr-only peer"
                      />
                      <span className="absolute inset-0 bg-white/10 peer-checked:bg-primary rounded-full transition-all cursor-pointer" />
                      <span className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-6" />
                    </label>
                  </div>

                  {/* Allowed Regions */}
                  <div>
                    <h3 className="text-lg font-heading font-semibold mb-4">Allowed Regions</h3>
                    <div className="space-y-2">
                      {['US-CA', 'US-EAST', 'FR', 'SE', 'DE'].map((region) => (
                        <label key={region} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                          <input
                            type="checkbox"
                            checked={selectedDept.allowed_regions.includes(region)}
                            onChange={(e) => {
                              const regions = e.target.checked
                                ? [...selectedDept.allowed_regions, region]
                                : selectedDept.allowed_regions.filter(r => r !== region);
                              setSelectedDept({ ...selectedDept, allowed_regions: regions });
                            }}
                            className="w-5 h-5 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{region}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full shadow-neon-primary hover:scale-[1.02] transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageAccessPage;