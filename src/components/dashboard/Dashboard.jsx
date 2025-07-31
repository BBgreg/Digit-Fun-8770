import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '/src/contexts/AuthContext.jsx';
import { useSubscription } from '/src/hooks/useSubscription.jsx';
import SafeIcon from '/src/common/SafeIcon.jsx';
import SubscriptionStatus from '/src/components/subscription/SubscriptionStatus.jsx';
import PricingModal from '/src/components/subscription/PricingModal.jsx';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiList, FiLogOut, FiShield, FiTarget, FiPuzzle, FiCircle, FiFilter, FiExternalLink, FiStar, FiLock } = FiIcons;

const Dashboard = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { subscription, userProfile, canPlayGameMode, getRemainingUsesForGameMode, loading } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);

  const pricingPlan = {
    name: "Unlimited",
    amount: 2.99,
    priceId: "price_1Rp0nHIa1WstuQNe3aRfnIj1",
    paymentLink: "https://buy.stripe.com/4gMcN5cJ46hqdmS0q01RC01",
    currency: "usd",
    interval: "month"
  };

  /**
   * CRITICAL FIX: This effect now marks the dashboard as ready as soon as the
   * subscription data has finished loading, regardless of whether a subscription exists.
   */
  useEffect(() => {
    if (!loading) {
      console.log('✅ Dashboard: Subscription data loaded, marking dashboard as ready');
      setDashboardReady(true);
    }
  }, [loading]); // The dependency is now just `loading`.

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSubscribe = async () => {
    try {
      console.log('💳 Dashboard: Opening Stripe payment link for user:', user.id);
      window.open(pricingPlan.paymentLink, '_blank');
    } catch (error) {
      console.error('❌ Dashboard: Subscription error:', error);
      throw error;
    }
  };

  const gameModesWithUsage = [
    {
      id: 'sequence-riddle',
      name: 'Sequence Riddle',
      icon: FiTarget,
      description: 'Guess the number like a puzzle with color-coded hints',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      navTarget: 'number-selection'
    },
    {
      id: 'speed-5',
      name: 'Speed 5',
      icon: FiPuzzle,
      description: 'Type 5 numbers as fast as you can to test your memory',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      navTarget: 'number-selection'
    },
    {
      id: 'word-search',
      name: 'Word Search',
      icon: FiCircle,
      description: 'Find hidden phone numbers in a grid of digits',
      color: 'bg-gradient-to-br from-green-500 to-emerald-500',
      navTarget: 'game-play'
    },
    {
      id: 'odd-one-out',
      name: 'Odd One Out',
      icon: FiFilter,
      description: 'Find the fake numbers that don\'t belong in your contacts',
      color: 'bg-gradient-to-br from-orange-500 to-red-500',
      navTarget: 'game-play'
    }
  ];

  // Show a loading indicator while the dashboard is waiting for data.
  if (!dashboardReady) {
    return (
      <div className="min-h-screen app-container flex items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <motion.div
            className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-indigo-600 text-xl font-semibold">Loading your dashboard...</p>
          <p className="text-indigo-500 text-sm mt-2">Setting up your personalized experience</p>
        </div>
      </div>
    );
  }

  // Render the main dashboard content once it's ready.
  return (
    <div className="min-h-screen app-container">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header with User Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end items-center mb-8"
        >
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-full shadow-sm">
                <SafeIcon icon={FiShield} size={16} className="text-indigo-500" />
                <span className="text-sm text-indigo-800">{user.email}</span>
              </div>
            )}
            <motion.button
              onClick={handleSignOut}
              className="p-3 bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-all text-indigo-600 hover:text-indigo-800"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <SafeIcon icon={FiLogOut} size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* Subscription Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <SubscriptionStatus subscription={subscription} userProfile={userProfile} />
        </motion.div>

        {/* App Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-3xl mb-6 shadow-lg"
            whileHover={{
              rotate: 10,
              scale: 1.05,
              boxShadow: "0 0 30px rgba(147,51,234,0.6), 0 0 60px rgba(59,130,246,0.4)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <span className="text-4xl animate-bounce-slow">📱</span>
          </motion.div>
          <h1 
            className="gradient-text app-title text-5xl font-black mb-4"
            style={{
              background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 20px rgba(147,51,234,0.5)",
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Digit Fun
          </h1>
          <p 
            className="gradient-text app-tagline text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 10px rgba(147,51,234,0.3)",
              fontFamily: "'Nunito', sans-serif"
            }}
          >
            Memorize phone numbers with a little fun
          </p>
        </motion.div>

        {/* Core Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12"
        >
          {/* Add Number */}
          <motion.div
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-10 rounded-3xl shadow-2xl cursor-pointer transform transition-all duration-300"
            whileHover={{
              y: -8,
              scale: 1.02,
              boxShadow: "0 25px 50px rgba(147,51,234,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('add-number')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <SafeIcon icon={FiPlus} size={40} className="text-white" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
                Add Number
              </h3>
              <p className="text-white text-lg opacity-90 font-medium leading-relaxed">
                Save a new phone number and start your memorization journey
              </p>
              <motion.div
                className="mt-6 w-16 h-1 bg-white rounded-full opacity-60"
                initial={{ width: 0 }}
                animate={{ width: 64 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </div>
          </motion.div>

          {/* My Numbers */}
          <motion.div
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-10 rounded-3xl shadow-2xl cursor-pointer transform transition-all duration-300"
            whileHover={{
              y: -8,
              scale: 1.02,
              boxShadow: "0 25px 50px rgba(20,184,166,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('number-list')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                whileHover={{ rotate: -360 }}
                transition={{ duration: 0.6 }}
              >
                <SafeIcon icon={FiList} size={40} className="text-white" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
                My Numbers
              </h3>
              <p className="text-white text-lg opacity-90 font-medium leading-relaxed">
                View, manage, and practice with your saved phone numbers
              </p>
              <motion.div
                className="mt-6 w-16 h-1 bg-white rounded-full opacity-60"
                initial={{ width: 0 }}
                animate={{ width: 64 }}
                transition={{ delay: 0.7, duration: 0.8 }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Game Modes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 inline-block text-transparent bg-clip-text">
            Play & Practice
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-2 rounded-full"></div>
        </motion.div>
        
        {/* Game Modes Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {gameModesWithUsage.map((game) => {
            const canPlay = canPlayGameMode(game.id);
            const remainingUses = getRemainingUsesForGameMode(game.id);
            const isActive = subscription?.subscription_status === 'active';
            const usedUses = 2 - remainingUses;

            return (
              <motion.div
                key={game.id}
                className={`group relative overflow-hidden rounded-3xl shadow-lg cursor-pointer transform transition-all duration-300 ${
                  !canPlay && !isActive ? 'opacity-60' : ''
                }`}
                style={{
                  background: "linear-gradient(to right, rgba(139,92,246,0.15), rgba(236,72,153,0.15))",
                  padding: "3px"
                }}
                whileHover={{
                  y: canPlay || isActive ? -5 : 0,
                  scale: canPlay || isActive ? 1.02 : 1,
                  boxShadow: canPlay || isActive ? "0 15px 30px rgba(139,92,246,0.3)" : "none"
                }}
                whileTap={{
                  scale: canPlay || isActive ? 0.98 : 1
                }}
                onClick={() => {
                  if (canPlay || isActive) {
                    onNavigate(game.navTarget, { gameMode: game.id });
                  }
                }}
              >
                <div className={`${game.color} h-full w-full rounded-3xl p-6 relative`}>
                  {!canPlay && !isActive && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-3xl flex items-center justify-center">
                      <div className="text-center">
                        <SafeIcon icon={FiLock} size={32} className="text-white mb-2 mx-auto" />
                        <p className="text-white text-sm font-semibold">Upgrade to Play</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-3">
                    <motion.div
                      className="w-12 h-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.5 }}
                    >
                      <SafeIcon icon={game.icon} size={24} className="text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{game.name}</h3>
                      {subscription?.subscription_status === 'free_trial' && (
                        <div className="text-white text-opacity-80 text-sm">
                          {isActive ? 'Unlimited' : `${usedUses}/2 plays used`}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-opacity-90">
                    {game.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Subscription CTA */}
        {subscription?.subscription_status === 'free_trial' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center mb-10"
          >
            <motion.button
              onClick={() => setShowPricingModal(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
              whileHover={{
                scale: 1.05,
                y: -5,
                boxShadow: "0 15px 30px rgba(124,58,237,0.3), 0 0 0 1px rgba(255,255,255,0.1)"
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 text-white font-semibold">
                <SafeIcon icon={FiStar} size={20} className="text-white" />
                <span className="text-lg">Upgrade to Unlimited - $2.99/month</span>
              </div>
              <div className="absolute inset-0 -z-10 rounded-2xl bg-white/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"></div>
            </motion.button>
          </motion.div>
        )}

        {/* External Apps Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center mb-10"
        >
          <motion.a
            href="https://ask4appco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            whileHover={{
              scale: 1.05,
              y: -5,
              boxShadow: "0 15px 30px rgba(124,58,237,0.3), 0 0 0 1px rgba(255,255,255,0.1)"
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-3 text-white font-semibold">
              <SafeIcon icon={FiExternalLink} size={20} className="text-white" />
              <span className="text-lg">Check out all my other apps on ask4appco.com</span>
            </div>
            <div className="absolute inset-0 -z-10 rounded-2xl bg-white/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"></div>
          </motion.a>
        </motion.div>
      </div>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSubscribe={handleSubscribe}
        subscription={subscription}
      />
    </div>
  );
};

export default Dashboard;
