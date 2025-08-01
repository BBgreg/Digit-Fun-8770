import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import Stripe from 'https://esm.sh/stripe@12.9.0';

// This is the self-contained CORS headers object.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') as string;

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      signingSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;
        const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
        const supabaseUserId = customer.metadata.supabase_user_id;

        if (!supabaseUserId) throw new Error('Supabase user ID not found.');

        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: 'active',
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
          })
          .eq('user_id', supabaseUserId);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
