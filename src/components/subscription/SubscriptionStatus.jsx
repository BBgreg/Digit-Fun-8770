import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiStar, FiClock, FiCheck } = FiIcons;

const SubscriptionStatus = ({ subscription, className = '' }) => {
  if (!subscription) return null;

  const isActive = subscription.subscription_status === 'active';
  const isTrial = subscription.subscription_status === 'free_trial';
  const remainingGames = Math.max(0, 6 - subscription.free_games_played);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-2xl p-4 shadow-md ${className}`}
    >
      {isActive ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiCheck} size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Premium Member</h3>
            <p className="text-sm text-gray-600">Unlimited access to all games</p>
          </div>
        </div>
      ) : isTrial && remainingGames > 0 ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiClock} size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Free Trial</h3>
            <p className="text-sm text-gray-600">
              {remainingGames} game{remainingGames !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiStar} size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Trial Ended</h3>
            <p className="text-sm text-gray-600">Subscribe for unlimited access</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionStatus;