-- Database schema for PathPilot application
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    messages JSONB NOT NULL,
    assistant_id VARCHAR(100) NOT NULL,
    thread_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Calendar tokens table
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_id ON user_calendar_tokens(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for chats table
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own chats" ON chats
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own chats" ON chats
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own chats" ON chats
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for user_calendar_tokens table
CREATE POLICY "Users can view their own calendar tokens" ON user_calendar_tokens
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own calendar tokens" ON user_calendar_tokens
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own calendar tokens" ON user_calendar_tokens
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own calendar tokens" ON user_calendar_tokens
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_tokens_updated_at BEFORE UPDATE ON user_calendar_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 