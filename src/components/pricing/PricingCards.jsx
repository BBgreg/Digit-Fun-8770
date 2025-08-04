import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase'; // We still need this for user session

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
      // Get the user's access token for authorization
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('User session not found.');
      }
      const accessToken = session.data.session.access_token;
      
      // Get the URL for the Supabase Edge Function from the environment variable
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;

      // Use native fetch to call the function, bypassing the Supabase client library for the invocation
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // Use your anon key
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          priceId: pricingPlan.priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session.');
      }

      // Dynamically load Stripe.js to redirect to checkout
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
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
        {/* ... All your JSX for the card ... */}
        <motion.button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 0, scale: 0.98 }}
        >
          {isLoading ? 'Processing...' : 'Upgrade Now'}
        </motion.button>
        {/* ... Rest of JSX ... */}
      </motion.div>
    </div>
  );
};

export default PricingCards;
