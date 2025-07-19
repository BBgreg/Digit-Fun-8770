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

-- Enable RLS
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_phone_numbers
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

-- RLS Policies for game_results
CREATE POLICY "Users can view their own game results" 
    ON game_results FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game results" 
    ON game_results FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id 
    ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user_phone_id 
    ON game_results(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user_id 
    ON game_results(user_id);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_phone_numbers_updated_at
    BEFORE UPDATE ON user_phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();