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

    console.log('🎣 Received webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('✅ Checkout session completed:', session.id)

        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        // PART 5: Update BOTH user_subscriptions AND app_users_profile
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            free_games_played: 0, // Reset free games counter
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', session.customer)

        if (subError) {
          console.error('❌ Error updating subscription:', subError)
          throw subError
        }

        // Update app_users_profile has_paid status
        const { error: profileError } = await supabase
          .from('app_users_profile')
          .update({
            has_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', session.customer)
            .single()
          ).data?.user_id)

        if (profileError) {
          console.error('❌ Error updating profile:', profileError)
          // Don't throw here - subscription update succeeded
        }

        console.log('✅ Successfully activated subscription for customer:', session.customer)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        console.log('🔄 Subscription updated:', subscription.id)

        // Map Stripe status to our internal status
        let status = 'active'
        let hasPaid = true

        if (subscription.status === 'canceled') {
          status = 'canceled'
          hasPaid = false
        } else if (subscription.status === 'past_due') {
          status = 'past_due'
          hasPaid = false
        } else if (subscription.status === 'unpaid') {
          status = 'unpaid'
          hasPaid = false
        }

        // Update user_subscriptions
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (subError) {
          console.error('❌ Error updating subscription status:', subError)
          throw subError
        }

        // Update app_users_profile has_paid status
        const { error: profileError } = await supabase
          .from('app_users_profile')
          .update({
            has_paid: hasPaid,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()
          ).data?.user_id)

        if (profileError) {
          console.error('❌ Error updating profile paid status:', profileError)
          // Don't throw here - subscription update succeeded
        }

        console.log('✅ Successfully updated subscription status:', status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('❌ Subscription deleted:', subscription.id)

        // Update user_subscriptions
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: 'canceled',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (subError) {
          console.error('❌ Error canceling subscription:', subError)
          throw subError
        }

        // Update app_users_profile has_paid status
        const { error: profileError } = await supabase
          .from('app_users_profile')
          .update({
            has_paid: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()
          ).data?.user_id)

        if (profileError) {
          console.error('❌ Error updating profile paid status:', profileError)
          // Don't throw here - subscription update succeeded
        }

        console.log('✅ Successfully canceled subscription')
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }
})