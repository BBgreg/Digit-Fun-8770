-- Reset usage counts for existing free trial users to 0 for all game modes
-- This ensures a clean slate for the new per-game-mode system

UPDATE user_subscriptions 
SET 
  sequence_riddle_uses = 0,
  speed_5_uses = 0,
  word_search_uses = 0,
  odd_one_out_uses = 0,
  free_games_played = 0,
  updated_at = NOW()
WHERE subscription_status = 'free_trial';

-- Update the webhook handler to reset all game mode usage when subscription becomes active
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

-- Create trigger to reset usage when subscription becomes active
DROP TRIGGER IF EXISTS reset_usage_on_active ON user_subscriptions;
CREATE TRIGGER reset_usage_on_active
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION reset_game_usage_on_active();