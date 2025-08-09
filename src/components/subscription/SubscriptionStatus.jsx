import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCheck } = FiIcons;

const SubscriptionStatus = ({ className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 shadow-md border border-white border-opacity-50 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
          <SafeIcon icon={FiCheck} size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">Unlimited Access</h3>
          <p className="text-sm text-gray-600">All games and features unlocked</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionStatus;