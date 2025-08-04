// Import Deno and Supabase modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

// --- START: FIX FOR "SubtleCryptoProvider" ERROR ---

// This custom crypto provider is required for the Stripe SDK to work in Deno.
// It tells Stripe how to perform cryptographic functions in a Deno-compatible way.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// --- END: FIX ---

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe client with the correct API version AND the custom crypto provider
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-07-30.basil',
  cryptoProvider, // Add the custom crypto provider here
});

serve(async (req) => {
  // Handle CORS preflight requests
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

    let event: Stripe.Event;
    try {
      if (!stripeWebhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables.');
      }
      event = await stripe.webhooks.constructEventAsync(body, signature!, stripeWebhookSecret, undefined, cryptoProvider);
    } catch (err) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`✅ Stripe webhook received: ${event.type}`);
    const session = event.data.object as any;

    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = session.metadata?.supabase_user_id;
        if (!userId) {
          throw new Error('Webhook Error: No supabase_user_id found in checkout session metadata.');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            subscription_status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            free_games_played: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (subError) throw subError;

        const { error: profileError } = await supabase
          .from('app_users_profile')
          .update({
            has_paid: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (profileError) {
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
