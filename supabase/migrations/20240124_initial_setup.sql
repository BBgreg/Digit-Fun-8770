-- Create Tables
CREATE TABLE IF NOT EXISTS user_phone_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_name TEXT NOT NULL,
    phone_number_digits TEXT NOT NULL,
    last_practiced_at TIMESTAMPTZ DEFAULT now(),
    mastery_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_phone_per_user UNIQUE(user_id, phone_number_digits)
);

CREATE TABLE IF NOT EXISTS game_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone_number_id UUID REFERENCES user_phone_numbers(id) ON DELETE CASCADE NOT NULL,
    game_mode TEXT NOT NULL,
    stars_earned INTEGER NOT NULL CHECK (stars_earned BETWEEN 0 AND 5),
    score_details JSONB DEFAULT '{}',
    played_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- NEW TABLES FOR USER PROFILE AND SUBSCRIPTION
CREATE TABLE IF NOT EXISTS app_users_profile (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    has_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'free_trial',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    sequence_riddle_uses INTEGER DEFAULT 0,
    speed_5_uses INTEGER DEFAULT 0,
    word_search_uses INTEGER DEFAULT 0,
    odd_one_out_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- Enable RLS
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own phone numbers" ON user_phone_numbers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own game results" ON game_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own profiles" ON app_users_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions FOR ALL USING (auth.uid() = user_id);


-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user_phone_id ON game_results(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id);

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply Updated At Trigger to tables
CREATE TRIGGER update_user_phone_numbers_updated_at BEFORE UPDATE ON user_phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_users_profile_updated_at BEFORE UPDATE ON app_users_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- FINAL FIX: This function runs automatically when a new user signs up.
-- It creates the necessary profile and subscription records for the app to work.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.app_users_profile (user_id, email)
  VALUES (new.id, new.email);

  -- Create a subscription record for the new user
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger calls the function whenever a new user is added to the auth.users table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

