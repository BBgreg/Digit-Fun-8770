-- Create user_phone_numbers table with proper structure and RLS
CREATE TABLE IF NOT EXISTS user_phone_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    phone_number_digits TEXT NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique phone numbers per user
    UNIQUE(user_id, phone_number_digits)
);

-- Create game_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS game_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number_id UUID NOT NULL REFERENCES user_phone_numbers(id) ON DELETE CASCADE,
    game_mode TEXT NOT NULL,
    stars_earned INTEGER DEFAULT 0,
    score_details JSONB DEFAULT '{}',
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_last_practiced ON user_phone_numbers(user_id, last_practiced_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_phone_number_id ON game_results(phone_number_id);

-- Enable RLS on both tables
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON user_phone_numbers;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_phone_numbers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_phone_numbers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_phone_numbers;

-- Create comprehensive RLS policies for user_phone_numbers
CREATE POLICY "Enable select for users based on user_id" 
ON user_phone_numbers FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users based on user_id" 
ON user_phone_numbers FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" 
ON user_phone_numbers FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
ON user_phone_numbers FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Drop existing policies for game_results if they exist
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON game_results;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON game_results;

-- Create RLS policies for game_results
CREATE POLICY "Enable select for users based on user_id" 
ON game_results FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users based on user_id" 
ON game_results FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_phone_numbers_updated_at ON user_phone_numbers;
CREATE TRIGGER update_user_phone_numbers_updated_at
    BEFORE UPDATE ON user_phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();