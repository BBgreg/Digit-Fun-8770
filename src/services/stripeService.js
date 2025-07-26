import { loadStripe } from '@stripe/stripe-js';
import supabase from '../lib/supabase';

// Initialize Stripe (you'll need to add your publishable key)
let stripePromise;

const getStripe = () => {
  if (!stripePromise) {
    // Replace with your actual Stripe publishable key
    const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Create Stripe checkout session
export const createCheckoutSession = async (userId, userEmail) => {
  try {
    console.log('Creating checkout session for user:', userId);

    // Call your backend endpoint to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        userId,
        userEmail,
        priceId: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_your_price_id_here',
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancel`
      }
    });

    if (error) throw error;

    // Redirect to Stripe Checkout
    const stripe = await getStripe();
    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (stripeError) {
      console.error('Stripe checkout error:', stripeError);
      throw stripeError;
    }

  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Handle successful subscription
export const handleSubscriptionSuccess = async (sessionId) => {
  try {
    console.log('Handling subscription success for session:', sessionId);

    // Verify the session and update user subscription
    const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
      body: { sessionId }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error handling subscription success:', error);
    throw error;
  }
};

// Create customer portal session for subscription management
export const createPortalSession = async (customerId) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        customerId,
        returnUrl: window.location.origin
      }
    });

    if (error) throw error;

    // Redirect to customer portal
    window.location.href = data.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};