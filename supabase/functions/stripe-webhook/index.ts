import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature!, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log('Received webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Checkout session completed:', session.id)

        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        
        // Update user subscription in database
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            free_games_played: 0, // Reset free games counter
          })
          .eq('stripe_customer_id', session.customer)

        if (error) {
          console.error('Error updating subscription:', error)
          throw error
        }

        console.log('Successfully activated subscription for customer:', session.customer)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        console.log('Subscription updated:', subscription.id)

        // Map Stripe status to our internal status
        let status = 'active'
        if (subscription.status === 'canceled') status = 'canceled'
        else if (subscription.status === 'past_due') status = 'past_due'
        else if (subscription.status === 'unpaid') status = 'unpaid'

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
          throw error
        }

        console.log('Successfully updated subscription status:', status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('Subscription deleted:', subscription.id)

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: 'canceled',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error canceling subscription:', error)
          throw error
        }

        console.log('Successfully canceled subscription')
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }
})