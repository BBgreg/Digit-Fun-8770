import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import Stripe from 'https://esm.sh/stripe@12.9.0';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

// Get the webhook signing secret from environment variables
const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') as string;

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  try {
    // 1. Verify the webhook signature to ensure the request is from Stripe
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      signingSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    console.log(`🔔 Stripe webhook event received: ${event.type}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Handle the specific webhook event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        // Get the Supabase user ID from the customer's metadata
        const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
        const supabaseUserId = customer.metadata.supabase_user_id;

        if (!supabaseUserId) {
          throw new Error('Supabase user ID not found in customer metadata.');
        }

        // 3. Update the user's subscription status in your database
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: 'active',
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
          })
          .eq('user_id', supabaseUserId);

        if (error) {
          console.error('Error updating subscription status:', error);
          throw error;
        }

        console.log(`✅ Subscription activated for user: ${supabaseUserId}`);
        break;
      }

      // Optional: Handle other events like subscription cancellations
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        // Find the user and update their status back to 'free_trial' or 'cancelled'
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', stripeSubscriptionId);
        
        if (error) {
          console.error('Error handling subscription deletion:', error);
          throw error;
        }

        console.log(`❌ Subscription cancelled for stripe_subscription_id: ${stripeSubscriptionId}`);
        break;
      }
        
      default:
        console.log(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // 4. Return a success response to Stripe
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
