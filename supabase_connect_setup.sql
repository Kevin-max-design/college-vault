-- 1. Add columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goals text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'college';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dm_privacy text DEFAULT 'everyone';

-- 2. Create direct_conversations table
CREATE TABLE IF NOT EXISTS direct_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_one uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_two uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT check_user_order CHECK (user_one < user_two),
  CONSTRAINT unique_user_pair UNIQUE (user_one, user_two)
);

-- 3. Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES direct_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  read_at timestamp with time zone
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- direct_conversations Policies:
-- Users can see conversations they are part of
DROP POLICY IF EXISTS select_direct_conversations ON direct_conversations;
CREATE POLICY select_direct_conversations ON direct_conversations
  FOR SELECT USING (auth.uid() = user_one OR auth.uid() = user_two);

-- Users can start conversations they are part of
DROP POLICY IF EXISTS insert_direct_conversations ON direct_conversations;
CREATE POLICY insert_direct_conversations ON direct_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_one OR auth.uid() = user_two);

-- direct_messages Policies:
-- Users can see messages in conversations they are part of
DROP POLICY IF EXISTS select_direct_messages ON direct_messages;
CREATE POLICY select_direct_messages ON direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages where they are the sender
DROP POLICY IF EXISTS insert_direct_messages ON direct_messages;
CREATE POLICY insert_direct_messages ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update direct_messages to set read_at (only receiver can do this)
DROP POLICY IF EXISTS update_direct_messages ON direct_messages;
CREATE POLICY update_direct_messages ON direct_messages
  FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- 6. Setup replica identity full for realtime replication
ALTER TABLE direct_conversations REPLICA IDENTITY FULL;
ALTER TABLE direct_messages REPLICA IDENTITY FULL;

-- 7. Add tables to supabase_realtime publication
-- Check if tables are already in the publication or safely add them
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'direct_conversations'
  ) then
    alter publication supabase_realtime add table direct_conversations;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;
exception
  when others then
    raise notice 'Could not automatically add to publication: %', sqlerrm;
end;
$$;
