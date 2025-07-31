import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import Stripe from 'https://esm.sh/stripe@12.9.0';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Stripe with the secret key from your environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

// This is the specific Price ID from your Stripe Dashboard for the $2.99/month plan
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') as string; 

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client with the user's access token.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Get the user from the access token.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 3. Get the user's Stripe customer ID from your database.
    const { data: profile, error: profileError } = await supabaseClient
      .from('app_users_profile')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no row was found, which is okay.
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    let stripeCustomerId = profile?.stripe_customer_id;

    // 4. If the user doesn't have a Stripe customer ID, create one.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });

      stripeCustomerId = customer.id;

      // 5. Save the new Stripe customer ID to your database.
      const { error: updateError } = await supabaseClient
        .from('app_users_profile')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile with Stripe customer ID:', updateError);
        throw updateError;
      }
    }

    // 6. Create a Stripe Checkout session.
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: PRICE_ID,
        quantity: 1,
      }],
      success_url: `${Deno.env.get('SITE_URL')}/dashboard?success=true`, // Redirect URL after successful payment
      cancel_url: `${Deno.env.get('SITE_URL')}/dashboard?cancel=true`,   // Redirect URL if the user cancels
    });

    // 7. Return the Checkout session URL to the client.
    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
