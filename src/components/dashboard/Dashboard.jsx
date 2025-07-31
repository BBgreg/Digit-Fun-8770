import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import SafeIcon from '../../common/SafeIcon';
import SubscriptionStatus from '../subscription/SubscriptionStatus';
import PricingModal from '../subscription/PricingModal';
import * as FiIcons from 'react-icons/fi';
import supabase from '../../lib/supabase'; // 1. Import the Supabase client

const { FiPlus, FiList, FiLogOut, FiShield, FiTarget, FiPuzzle, FiCircle, FiFilter, FiExternalLink, FiStar, FiLock } = FiIcons;

const Dashboard = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { subscription, userProfile, loading } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);

  // 2. This function is now updated to call your Supabase Edge Function
  const handleSubscribe = async () => {
    try {
      console.log('💳 Calling create-checkout-session function for user:', user.id);
      
      // Get the user's session token to make an authenticated call
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      // Redirect the user to the secure Stripe Checkout page
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      console.error('❌ Dashboard: Subscription error:', error);
      // You can add a user-facing error message here if you like
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // The rest of your component remains the same...
  if (loading) {
    return (
      <div className="min-h-screen app-container flex items-center justify-center">
        <div className="text-center relative z-10">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-4"></div>
          <p className="text-indigo-600 text-xl font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-container">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <SubscriptionStatus subscription={subscription} userProfile={userProfile} />
        </motion.div>

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

        {/* ... The rest of your dashboard JSX ... */}
        
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
              <div className="relative flex items-center justify-center gap-3 text-white font-semibold">
                <SafeIcon icon={FiStar} size={20} className="text-white" />
                <span className="text-lg">Upgrade to Unlimited - $2.99/month</span>
              </div>
            </motion.button>
          </motion.div>
        )}
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
