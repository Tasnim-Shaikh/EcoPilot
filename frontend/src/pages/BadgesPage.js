import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Award, Leaf, Trophy, GraduationCap, Lock } from 'lucide-react';
import { badges, courses } from '../utils/api';

const BadgesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [badgesList, setBadgesList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoPoints, setEcoPoints] = useState(0);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
  try {
    const [badgesRes, coursesRes] = await Promise.all([
      badges.get(),
      courses.get(),
    ]);

    setBadgesList(badgesRes.data.badges || []);
    setEcoPoints(badgesRes.data.co2_saved || 0); // ✅ ADD THIS
    setCoursesList(coursesRes.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setLoading(false);
  }
};


  const getIcon = (iconName) => {
    const icons = {
      'leaf': Leaf,
      'tree': Leaf,
      'award': Award,
      'trophy': Trophy,
      'graduation-cap': GraduationCap,
    };
    return icons[iconName] || Award;
  };
  const rewards = [
  {
    id: 'spotify',
    title: 'Spotify Premium',
    subtitle: '1 Month Subscription',
    pointsRequired: 100,
    icon: '🎵',
  },
  {
    id: 'amazon',
    title: 'Amazon Voucher',
    subtitle: '₹1000 Gift Voucher',
    pointsRequired: 500,
    icon: '🎁',
  },
  {
    id: 'netflix',
    title: 'Netflix',
    subtitle: '1 Month Subscription',
    pointsRequired: 750,
    icon: '🎬',
  },
];


  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10" data-testid="badges-page">
        <button onClick={() => navigate('/dashboard')} className="mr-4" data-testid="back-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Award className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">{t('badges')}</h1>
      </header>

      <main className="relative z-10 p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <>
            {/* Badges Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-6">🏅Your Badges</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {badgesList.map((badge) => {
                  const IconComponent = getIcon(badge.icon);
                  return (
                    <div
                        key={badge.id}
                        className={`p-6 rounded-xl text-center transition-all border ${
                          badge.unlocked
                            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-400/40 shadow-lg'
                            : 'bg-white/5 border-white/10 opacity-70'
                        }`}
                      >

                      <div className="flex justify-center mb-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            badge.unlocked
                              ? 'bg-green-500/30 text-green-400'
                              : 'bg-white/10 text-muted-foreground'
                          }`}>

                          <IconComponent className="w-8 h-8" />
                        </div>
                      </div>
                      <h3 className="font-heading font-semibold mb-2">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      {!badge.unlocked && (
                        <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
                          <Lock className="w-3 h-3 mr-1" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Rewards Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-heading font-bold mb-2">
                🎁 Eco Rewards
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Save EcoPoints by using Green Mode and unlock exclusive rewards
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rewards.map((reward) => {
                  const progress = Math.min(
                    (ecoPoints / reward.pointsRequired) * 100,
                    100
                  );

                  const unlocked = ecoPoints >= reward.pointsRequired;

                  return (
                    <div
                        key={reward.id}
                        className={`p-6 rounded-xl border transition-all ${
                          unlocked
                            ? 'bg-gradient-to-br from-yellow-400/20 to-orange-400/10 border-yellow-400/40 shadow-xl hover:scale-[1.03]'
                            : 'bg-white/5 border-white/10 opacity-80'
                        }`}
                      >


                      <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{reward.icon}</span>
                        <span className="text-xs text-muted-foreground">
                          {reward.pointsRequired} EcoPoints
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {reward.subtitle}
                      </p>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="w-full h-2 bg-white/10 rounded-full">
                          <div className={`h-2 rounded-full transition-all ${
                              unlocked ? 'bg-yellow-400' : 'bg-primary'
                            }`}

                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.min(ecoPoints, reward.pointsRequired)} /{' '}
                          {reward.pointsRequired} EcoPoints
                        </p>
                      </div>

                      {/* Button */}
                      <button
                        disabled={!unlocked}
                        className={`w-full py-2 rounded-lg font-medium transition ${
                          unlocked
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'bg-white/10 text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {unlocked ? 'Redeem Now 🎉' : 'Keep Saving 🌱'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courses Section */}
            <div>
              <h2 className="text-2xl font-heading font-bold mb-6">{t('courses')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {coursesList.map((course) => (
                  <div
                    key={course.id}
                    className={`p-6 rounded-xl border transition-all ${
                      course.status === 'completed'
                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-400/40'
                        : course.status === 'ongoing'
                        ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >

                    <div className="flex items-center justify-between mb-4">
                      <GraduationCap className="w-8 h-8 text-primary" />
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        course.status === 'completed' ? 'bg-primary/20 text-primary' :
                        course.status === 'ongoing' ? 'bg-secondary/20 text-secondary' :
                        'bg-white/10 text-muted-foreground'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary">+{course.eco_points_reward} points</span>
                      {course.badge_reward && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Award className="w-3 h-3 mr-1" />
                          <span>Badge</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BadgesPage;