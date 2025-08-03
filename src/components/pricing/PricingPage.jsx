import React from 'react';
import { motion } from 'framer-motion';
import PricingCards from './PricingCards';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft } = FiIcons;

const PricingPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen app-container">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">Choose Your Plan</h1>
            <p className="text-indigo-600 mt-1">Unlock unlimited memory training</p>
          </div>
        </motion.div>

        {/* App Branding Section */}
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
              fontFamily: "'Fredoka', sans-serif"
            }}
          >
            Digit Fun
          </h1>

          <p
            className="gradient-text app-tagline text-xl font-bold mb-8"
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

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PricingCards />
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold text-indigo-800 mb-8">Why Upgrade?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-70 p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiIcons.FiZap} size={24} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-indigo-800 mb-2">Unlimited Practice</h3>
              <p className="text-indigo-600 text-sm">Play all games without daily limits and master your memory skills</p>
            </div>

            <div className="bg-white bg-opacity-70 p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiIcons.FiTrendingUp} size={24} className="text-green-600" />
              </div>
              <h3 className="font-bold text-indigo-800 mb-2">Track Progress</h3>
              <p className="text-indigo-600 text-sm">Advanced analytics to monitor your improvement over time</p>
            </div>

            <div className="bg-white bg-opacity-70 p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiIcons.FiStar} size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-indigo-800 mb-2">Premium Features</h3>
              <p className="text-indigo-600 text-sm">Access to new games and features as they're released</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;