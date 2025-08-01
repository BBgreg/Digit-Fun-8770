// supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import Stripe from 'https://esm.sh/stripe@10.12.0?target=deno'

console.log("Function starting up...");

// --- Check for Secrets ---
// This is the most likely point of failure. We log to see if the secrets are loaded.
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SITE_URL = Deno.env.get('SITE_URL');
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID');

console.log(`SITE_URL loaded: ${!!SITE_URL}`);
console.log(`STRIPE_PRICE_ID loaded: ${!!STRIPE_PRICE_ID}`);
console.log(`STRIPE_SECRET_KEY loaded: ${!!STRIPE_SECRET_KEY}`); // This is the most critical one

if (!STRIPE_SECRET_KEY || !SITE_URL || !STRIPE_PRICE_ID) {
  console.error("CRITICAL ERROR: One or more environment variables are missing.");
  // We don't serve the function if secrets are missing.
  // This will cause a 500 error, but the log above will tell us why.
}

// --- Initialize Stripe ---
// This will fail if the secret key is invalid.
let stripe;
try {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
  });
  console.log("Stripe client initialized successfully.");
} catch (e) {
  console.error("CRITICAL ERROR: Failed to initialize Stripe client.", e.message);
}


serve(async (req) => {
  console.log("Request received. Method:", req.method);

  // --- Handle CORS Preflight ---
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request.");
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // --- Authenticate User ---
    console.log("Attempting to authenticate user...");
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError) {
      console.error("User authentication error:", userError);
      throw userError;
    }
    if (!user) {
        console.error("No user found for the provided token.");
        throw new Error("User not found.");
    }
    console.log("User authenticated successfully:", user.email);


    // --- Create Stripe Checkout Session ---
    console.log("Creating Stripe checkout session...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/dashboard`,
      customer_email: user.email,
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    })
    console.log("Stripe session created successfully. ID:", session.id);

    // --- Return Session URL ---
    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  } catch (error) {
    console.error("--- ERROR IN REQUEST HANDLER ---");
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }
})
