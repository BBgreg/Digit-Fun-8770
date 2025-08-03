import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiStar, FiCheck, FiX, FiCreditCard, FiShield, FiZap } = FiIcons;

const PricingModal = ({ isOpen, onClose, onSubscribe, subscription }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pricingPlan = {
    name: "Digit Fun Unlimited",
    amount: 2.99,
    priceId: "price_1RrpWZIa1WstuQNegxLurhIY",
    paymentLink: "https://buy.stripe.com/cNi6oHgZkbBKfv05Kk1RC04",
    currency: "usd",
    interval: "month"
  };

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Opening Stripe payment link...');
      
      // Open Stripe payment link in new tab
      window.open(pricingPlan.paymentLink, '_blank');
      
      // Close modal after opening payment link
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to open payment page. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: FiZap, title: 'Unlimited Games', description: 'Play all game modes without restrictions' },
    { icon: FiStar, title: 'All Features', description: 'Access to current and future features' },
    { icon: FiShield, title: 'Secure & Private', description: 'Your data is always safe and private' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-filter backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 p-8 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
            >
              <SafeIcon icon={FiX} size={20} className="text-white" />
            </button>

            <motion.div
              className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <SafeIcon icon={FiStar} size={32} className="text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold mb-2">Unlock Unlimited Fun!</h2>
            <p className="text-white text-opacity-90">
              Get unlimited access to all games
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Pricing */}
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="text-4xl font-bold text-indigo-800 mb-1">
                  ${pricingPlan.amount}
                  <span className="text-lg font-normal text-indigo-600">/{pricingPlan.interval}</span>
                </div>
                <p className="text-indigo-600 text-sm">Recurring monthly subscription</p>
              </div>

              <p className="text-gray-600 mb-6">
                Continue your phone number memorization journey with unlimited access to all games!
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <SafeIcon icon={feature.icon} size={16} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">{feature.title}</h4>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-2 text-red-600">
                  <SafeIcon icon={FiX} size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Subscribe Button */}
            <motion.button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              whileHover={!isLoading ? { y: -2 } : {}}
              whileTap={!isLoading ? { y: 0 } : {}}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Opening Payment...</span>
                </>
              ) : (
                <>
                  <SafeIcon icon={FiCreditCard} size={20} />
                  <span>Subscribe Now - ${pricingPlan.amount}/{pricingPlan.interval}</span>
                </>
              )}
            </motion.button>

            {/* Security Note */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <SafeIcon icon={FiShield} size={14} />
                <span>Secure payment powered by Stripe</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Cancel anytime • No hidden fees • Instant access
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PricingModal;