// --- TEMPORARY DIAGNOSTIC VERSION 2 ---
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase'; // Re-introducing the Supabase client

const { FiCheck, FiZap } = FiIcons;

const PricingCards = ({ className = '' }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // This function now ONLY tests the Supabase function call
  const handleUpgrade = async () => {
    setIsLoading(true);
    if (!user) {
      alert("Please log in to continue.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting to invoke Supabase function...");
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId: user.id,
          userEmail: user.email,
          priceId: 'price_1RrpWZIa1WstuQNegxLurhIY', // Using your real test price ID
          successUrl: window.location.origin,
          cancelUrl: window.location.href,
        }
      });

      if (error) throw error;

      // This is just a test, so we'll show an alert instead of redirecting
      alert("SUCCESS: Supabase function was called successfully. The next step will be to add the Stripe redirect.");
      console.log("Supabase function response:", data);

    } catch (error) {
      console.error('Error invoking Supabase function:', error);
      alert(`ERROR: Could not call the Supabase function. Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const pricingPlan = {
    name: "Digit Fun Unlimited",
    amount: 2.99,
    interval: "month"
  };

  const features = [
    "Unlimited access to all game modes",
    "No daily play limits",
    "Priority customer support",
    "Early access to new features",
    "Advanced progress tracking"
  ];

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden"
      >
        <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full transform rotate-12 text-sm font-bold">
          Most Popular
        </div>
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <SafeIcon icon={FiZap} size={32} className="text-white" />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2">{pricingPlan.name}</h3>
          <div className="text-4xl font-black mb-1">
            ${pricingPlan.amount}
            <span className="text-lg font-normal opacity-80">/{pricingPlan.interval}</span>
          </div>
          <p className="text-white text-opacity-90">Unlimited memory training</p>
        </div>
        <div className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                <SafeIcon icon={FiCheck} size={14} className="text-white" />
              </div>
              <span className="text-white text-opacity-90">{feature}</span>
            </motion.div>
          ))}
        </div>
        <motion.button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 0, scale: 0.98 }}
        >
          {isLoading ? 'Testing...' : 'Test Supabase Call'}
        </motion.button>
        {/* ... Rest of the JSX ... */}
      </motion.div>
    </div>
  );
};

export default PricingCards;
