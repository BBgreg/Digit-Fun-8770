-- PART 1: Ensure user_subscriptions table exists with correct schema
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'free_trial' CHECK (
        subscription_status IN ('free_trial', 'active', 'canceled', 'past_due', 'unpaid')
    ),
    free_games_played INTEGER NOT NULL DEFAULT 0,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure each user has only one subscription record
    UNIQUE(user_id)
);

-- PART 2: Create NEW app_users_profile table for user tracking
CREATE TABLE IF NOT EXISTS app_users_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    has_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_app_users_profile_email ON app_users_profile(email);
CREATE INDEX IF NOT EXISTS idx_app_users_profile_has_paid ON app_users_profile(has_paid);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users_profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON user_subscriptions;

DROP POLICY IF EXISTS "Users can view their own profile" ON app_users_profile;
DROP POLICY IF EXISTS "Users can insert their own profile" ON app_users_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON app_users_profile;
DROP POLICY IF EXISTS "Users can delete their own profile" ON app_users_profile;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription" ON user_subscriptions 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for app_users_profile
CREATE POLICY "Users can view their own profile" ON app_users_profile 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON app_users_profile 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON app_users_profile 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON app_users_profile 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create updated_at trigger functions
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_app_users_profile_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_user_subscriptions_updated_at();

DROP TRIGGER IF EXISTS update_app_users_profile_updated_at ON app_users_profile;
CREATE TRIGGER update_app_users_profile_updated_at 
    BEFORE UPDATE ON app_users_profile 
    FOR EACH ROW EXECUTE FUNCTION update_app_users_profile_updated_at();

-- PART 3: Function to initialize user records on signup/login
CREATE OR REPLACE FUNCTION initialize_user_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert subscription record for new user
    INSERT INTO user_subscriptions (user_id, subscription_status, free_games_played)
    VALUES (NEW.id, 'free_trial', 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert profile record for new user
    INSERT INTO app_users_profile (user_id, email, has_paid)
    VALUES (NEW.id, NEW.email, FALSE)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-initialize records for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_records();

-- PART 4: Function to sync subscription status with profile has_paid status
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update app_users_profile.has_paid based on subscription_status
    UPDATE app_users_profile 
    SET has_paid = (NEW.subscription_status = 'active')
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to sync subscription changes to profile
DROP TRIGGER IF EXISTS sync_subscription_status ON user_subscriptions;
CREATE TRIGGER sync_subscription_status
    AFTER UPDATE OF subscription_status ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_profile();