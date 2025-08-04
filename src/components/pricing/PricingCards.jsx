import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { FiCheck, FiZap } = FiIcons;

const PricingCards = ({ className = '' }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const pricingPlan = {
    name: "Digit Fun Unlimited",
    amount: 2.99,
    priceId: "price_1RrpWZIa1WstuQNegxLurhIY", 
    currency: "usd",
    interval: "month"
  };

  const features = [
    "Unlimited access to all game modes",
    "No daily play limits",
    "Priority customer support",
    "Early access to new features",
    "Advanced progress tracking"
  ];

  const handleUpgrade = async () => {
    setIsLoading(true);
    if (!user) {
      alert("You must be logged in to subscribe.");
      setIsLoading(false);
      return;
    }

    try {
      // NEW: Dynamically load Stripe and initialize it inside the handler
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      // Call the Supabase function to create a session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId: user.id,
          userEmail: user.email,
          priceId: pricingPlan.priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: window.location.href,
        }
      });

      if (error) throw error;

      // Redirect to the Stripe checkout page
      await stripe.redirectToCheckout({ sessionId: data.sessionId });

    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Error: Could not initiate payment. ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
          {isLoading ? 'Processing...' : 'Upgrade Now'}
        </motion.button>
        <div className="text-center mt-4">
          <p className="text-white text-opacity-70 text-sm">
            Secure payment powered by Stripe
          </p>
          <p className="text-white text-opacity-60 text-xs mt-1">
            Cancel anytime • No hidden fees
          </p>
        </div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
      </motion.div>
    </div>
  );
};

export default PricingCards;
