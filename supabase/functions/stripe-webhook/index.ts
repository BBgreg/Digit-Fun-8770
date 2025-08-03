// Import Deno and Supabase modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

// Get environment variables. Ensure these are set in your Supabase project's Edge Function secrets.
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe client with the CORRECT API version
const stripe = new Stripe(stripeSecretKey, {
  // CHANGED: This now matches the version set in your Stripe webhook endpoint.
  apiVersion: '2025-07-30.basil', 
});

serve(async (req) => {
  // Handle CORS preflight requests for robustness
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      if (!stripeWebhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables.');
      }
      event = stripe.webhooks.constructEvent(body, signature!, stripeWebhookSecret);
    } catch (err) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`✅ Stripe webhook received: ${event.type}`);
    const session = event.data.object as any; // Use 'as any' for easier access to properties across event types

    // Handle different event types with a switch statement
    switch (event.type) {
      case 'checkout.session.completed': {
        // IMPROVED: Using metadata to reliably link the session to your Supabase user.
        // This is a CRITICAL step. Your 'create-checkout-session' function MUST provide this metadata.
        const userId = session.metadata?.supabase_user_id;
        if (!userId) {
          throw new Error('Webhook Error: No supabase_user_id found in checkout session metadata.');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        // Update the user's subscription details
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            subscription_status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            free_games_played: 0, // Resetting the counter as requested
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (subError) throw subError;

        // Update the user's profile to reflect paid status
        const { error: profileError } = await supabase
          .from('app_users_profile')
          .update({
            has_paid: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (profileError) {
          // Log the error but don't fail the request, as the main subscription update succeeded.
          console.error(`⚠️ Could not update app_users_profile for user ${userId}:`, profileError);
        }

        console.log(`✅ Successfully activated subscription for user: ${userId}`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = session;
        const status = subscription.status === 'canceled' || subscription.status === 'unpaid' ? 'canceled' : subscription.status;
        const hasPaid = status === 'active' || status === 'trialing';

        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) throw subError;

        // To find the user_id, we need to look it up from the user_subscriptions table
        const { data: userData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        if (userData?.user_id) {
          const { error: profileError } = await supabase
            .from('app_users_profile')
            .update({ has_paid: hasPaid, updated_at: new Date().toISOString() })
            .eq('user_id', userData.user_id);

          if (profileError) {
            console.error(`⚠️ Could not update app_users_profile for subscription ${subscription.id}:`, profileError);
          }
        }

        console.log(`✅ Successfully updated subscription ${subscription.id} to status: ${status}`);
        break;
      }

      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error(`❌ Unhandled Webhook Error: ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
