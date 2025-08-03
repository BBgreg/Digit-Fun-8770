// Follow Deno's module system for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "whsec_x8tvlDk9Eex5ff9mQPEBvJZdNu7fp2EL";

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import Stripe SDK for Deno
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2022-11-15",
});

// Serve HTTP requests
serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
        },
      });
    }

    // CRITICAL: Get the raw request body for signature verification
    const body = await req.text();
    
    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing Stripe signature");
      return new Response(JSON.stringify({ error: "Missing stripe signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the webhook signature
    let event;
    try {
      // This verifies that the request came from Stripe using the webhook secret
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      console.log(`✅ Signature verification passed for event: ${event.type}`);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`✅ Stripe webhook received: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log(`💰 Payment successful for session: ${session.id}`);

      // Extract user ID from the metadata
      const userId = session.metadata?.supabase_user_id;
      if (!userId) {
        console.error("No user ID found in session metadata");
        return new Response(JSON.stringify({ error: "Missing user ID in session metadata" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get the subscription information
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Update user subscription status in Supabase
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .update({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer,
          subscription_status: "active",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          // Reset usage counters when becoming a paid subscriber
          sequence_riddle_uses: 0,
          speed_5_uses: 0,
          word_search_uses: 0,
          odd_one_out_uses: 0,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (subscriptionError) {
        console.error(`❌ Error updating subscription: ${subscriptionError.message}`);
        return new Response(JSON.stringify({ error: subscriptionError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Also update the user profile to mark them as a paid user
      const { error: profileError } = await supabase
        .from("app_users_profile")
        .update({
          has_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error(`⚠️ Error updating user profile: ${profileError.message}`);
        // We don't return an error here as the subscription update was successful
      }

      console.log(`✅ User ${userId} subscription updated to 'active'`);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Handle subscription updated events
    else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      console.log(`📝 Subscription updated: ${subscription.id}`);
      
      // Map Stripe status to our internal status
      let status = "active";
      if (subscription.status === "canceled") status = "canceled";
      else if (subscription.status === "past_due") status = "past_due";
      else if (subscription.status === "unpaid") status = "unpaid";
      
      // Determine if user has paid status based on subscription status
      const hasPaid = status === "active";
      
      // Update subscription in database
      const { data: userData, error: userError } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();
      
      if (userError) {
        console.error(`❌ Error finding user for subscription: ${userError.message}`);
        return new Response(JSON.stringify({ error: userError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Update subscription status
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          subscription_status: status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
      
      if (updateError) {
        console.error(`❌ Error updating subscription: ${updateError.message}`);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Update user profile
      const { error: profileError } = await supabase
        .from("app_users_profile")
        .update({
          has_paid: hasPaid,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.user_id);
      
      if (profileError) {
        console.error(`⚠️ Error updating user profile: ${profileError.message}`);
        // We don't return an error here as the subscription update was successful
      }
      
      console.log(`✅ Subscription ${subscription.id} updated to ${status}`);
    }
    
    // Handle subscription deleted events
    else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      console.log(`❌ Subscription deleted: ${subscription.id}`);
      
      // Find user for this subscription
      const { data: userData, error: userError } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();
      
      if (userError) {
        console.error(`❌ Error finding user for subscription: ${userError.message}`);
        return new Response(JSON.stringify({ error: userError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Update subscription status
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          subscription_status: "canceled",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
      
      if (updateError) {
        console.error(`❌ Error updating subscription: ${updateError.message}`);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Update user profile
      const { error: profileError } = await supabase
        .from("app_users_profile")
        .update({
          has_paid: false,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.user_id);
      
      if (profileError) {
        console.error(`⚠️ Error updating user profile: ${profileError.message}`);
        // We don't return an error here as the subscription update was successful
      }
      
      console.log(`✅ Subscription ${subscription.id} marked as canceled for user ${userData.user_id}`);
    }
    
    // Return success for any other event types
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error(`💥 Webhook error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});