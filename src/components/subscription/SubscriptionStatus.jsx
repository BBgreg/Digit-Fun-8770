import React from 'react';
import { motion } from 'framer-motion';
import { useSubscription } from '../../hooks/useSubscription';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiStar, FiClock, FiCheck, FiAlertCircle } = FiIcons;

const SubscriptionStatus = ({ subscription, userProfile, className = '' }) => {
  const { getUsageSummary, getTotalRemainingUses } = useSubscription();

  if (!subscription) return null;

  const isActive = subscription.subscription_status === 'active';
  const isTrial = subscription.subscription_status === 'free_trial';
  const totalRemaining = getTotalRemainingUses();
  const isPastDue = subscription.subscription_status === 'past_due';
  const isUnpaid = subscription.subscription_status === 'unpaid';

  // Show different status based on subscription state
  const getStatusDisplay = () => {
    if (isActive) {
      return {
        icon: FiCheck,
        iconColor: 'from-green-400 to-emerald-500',
        title: 'Premium Member',
        subtitle: 'Unlimited access to all games',
        bgColor: 'from-green-50 to-emerald-50'
      };
    }

    if (isPastDue || isUnpaid) {
      return {
        icon: FiAlertCircle,
        iconColor: 'from-red-400 to-red-500',
        title: 'Payment Issue',
        subtitle: 'Please update your payment method',
        bgColor: 'from-red-50 to-red-50'
      };
    }

    if (isTrial && totalRemaining > 0) {
      return {
        icon: FiClock,
        iconColor: 'from-indigo-400 to-purple-500',
        title: 'Free Trial',
        subtitle: '2 uses per game mode',
        bgColor: 'from-indigo-50 to-purple-50'
      };
    }

    // Trial ended
    return {
      icon: FiStar,
      iconColor: 'from-orange-400 to-red-500',
      title: 'Trial Ended',
      subtitle: 'Subscribe for unlimited access',
      bgColor: 'from-orange-50 to-red-50'
    };
  };

  const status = getStatusDisplay();
  const usageSummary = getUsageSummary();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${status.bgColor} rounded-2xl p-4 shadow-md border border-white border-opacity-50 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${status.iconColor} rounded-full flex items-center justify-center shadow-sm`}>
          <SafeIcon icon={status.icon} size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{status.title}</h3>
          <p className="text-sm text-gray-600">{status.subtitle}</p>
          
          {/* FIXED: Show detailed usage for free trial users with correct format */}
          {isTrial && (
            <div className="mt-2 text-xs text-gray-500">
              <div className="grid grid-cols-2 gap-1">
                <div>Sequence: {(2 - usageSummary['sequence-riddle'].remaining)}/2</div>
                <div>Speed 5: {(2 - usageSummary['speed-5'].remaining)}/2</div>
                <div>Word Search: {(2 - usageSummary['word-search'].remaining)}/2</div>
                <div>Odd One Out: {(2 - usageSummary['odd-one-out'].remaining)}/2</div>
              </div>
            </div>
          )}

          {/* Show additional debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mt-1">
              Status: {subscription.subscription_status} | Total remaining: {totalRemaining}
              {userProfile && ` | Paid: ${userProfile.has_paid ? 'Yes' : 'No'}`}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionStatus;