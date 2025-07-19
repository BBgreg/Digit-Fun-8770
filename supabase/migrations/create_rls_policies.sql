-- Create RLS policies for user_phone_numbers table
ALTER TABLE IF EXISTS user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own phone numbers" ON user_phone_numbers;
DROP POLICY IF EXISTS "Users can insert their own phone numbers" ON user_phone_numbers;
DROP POLICY IF EXISTS "Users can update their own phone numbers" ON user_phone_numbers;
DROP POLICY IF EXISTS "Users can delete their own phone numbers" ON user_phone_numbers;

-- Create policies
CREATE POLICY "Users can view their own phone numbers" 
ON user_phone_numbers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone numbers" 
ON user_phone_numbers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers" 
ON user_phone_numbers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers" 
ON user_phone_numbers FOR DELETE 
USING (auth.uid() = user_id);

-- Create game_results RLS policies
ALTER TABLE IF EXISTS game_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own game results" ON game_results;
DROP POLICY IF EXISTS "Users can insert their own game results" ON game_results;

-- Create policies
CREATE POLICY "Users can view their own game results" 
ON game_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game results" 
ON game_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);