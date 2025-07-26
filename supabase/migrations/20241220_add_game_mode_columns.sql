-- Add the missing game mode usage columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS sequence_riddle_uses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed_5_uses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS word_search_uses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS odd_one_out_uses INTEGER DEFAULT 0;

-- Update existing records to have 0 usage for all game modes
UPDATE user_subscriptions 
SET 
  sequence_riddle_uses = COALESCE(sequence_riddle_uses, 0),
  speed_5_uses = COALESCE(speed_5_uses, 0),
  word_search_uses = COALESCE(word_search_uses, 0),
  odd_one_out_uses = COALESCE(odd_one_out_uses, 0)
WHERE 
  sequence_riddle_uses IS NULL OR
  speed_5_uses IS NULL OR
  word_search_uses IS NULL OR
  odd_one_out_uses IS NULL;

-- Update the initialize_user_records function to include the new columns
CREATE OR REPLACE FUNCTION initialize_user_records() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert subscription record for new user with all game mode columns
  INSERT INTO user_subscriptions (
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

  -- Insert profile record for new user
  INSERT INTO app_users_profile (user_id, email, has_paid) 
  VALUES (NEW.id, NEW.email, FALSE) 
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the reset function to include all game mode columns
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