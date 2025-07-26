-- Fix initialize_user_records function to explicitly qualify table names with public schema
-- This resolves the "relation does not exist" error

CREATE OR REPLACE FUNCTION initialize_user_records() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert subscription record for new user with explicit public schema reference
  INSERT INTO public.user_subscriptions (
    user_id,
    subscription_status,
    free_games_played,
    sequence_riddle_uses,
    speed_5_uses,
    word_search_uses,
    odd_one_out_uses
  ) VALUES (
    NEW.id,
    'free_trial',
    0,
    0,
    0,
    0,
    0
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Insert profile record for new user with explicit public schema reference
  INSERT INTO public.app_users_profile (user_id, email, has_paid) 
  VALUES (NEW.id, NEW.email, FALSE) 
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Also fix the sync function to use explicit schema references
CREATE OR REPLACE FUNCTION sync_subscription_to_profile() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update app_users_profile.has_paid based on subscription_status with explicit schema
  UPDATE public.app_users_profile 
  SET has_paid = (NEW.subscription_status = 'active') 
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix the reset game usage function as well
CREATE OR REPLACE FUNCTION reset_game_usage_on_active() 
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active, reset all game usage counters
  IF NEW.subscription_status = 'active' AND OLD.subscription_status != 'active' THEN
    NEW.sequence_riddle_uses = 0;
    NEW.speed_5_uses = 0;
    NEW.word_search_uses = 0;
    NEW.odd_one_out_uses = 0;
    NEW.free_games_played = 0;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION initialize_user_records();