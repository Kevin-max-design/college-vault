-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Marketplace Messaging Migration
--  Creates the conversations table and links it to messages.
-- ══════════════════════════════════════════════════════════════════

-- 1. Create conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message text,
  unique(listing_id, buyer_id, seller_id)
);

-- 2. Alter messages table to add conversation_id if not exists
alter table messages
add column if not exists conversation_id uuid references conversations(id) on delete cascade;

-- 3. Create required performance indexes
create index if not exists idx_conversations_buyer
on conversations(buyer_id, updated_at desc);

create index if not exists idx_conversations_seller
on conversations(seller_id, updated_at desc);

create index if not exists idx_conversations_listing
on conversations(listing_id);

create index if not exists idx_messages_conversation_created
on messages(conversation_id, created_at asc);

create index if not exists idx_messages_receiver_created
on messages(receiver_id, created_at desc);

create index if not exists idx_messages_sender_created
on messages(sender_id, created_at desc);

-- 4. Enable Row Level Security (RLS)
alter table conversations enable row level security;
alter table messages enable row level security;

-- 5. Conversations RLS Policies
drop policy if exists "Participants can read own conversations" on conversations;
create policy "Participants can read own conversations"
on conversations
for select
to authenticated
using (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

drop policy if exists "Buyer can create own conversations" on conversations;
create policy "Buyer can create own conversations"
on conversations
for insert
to authenticated
with check (
  auth.uid() = buyer_id
);

drop policy if exists "Participants can update own conversations" on conversations;
create policy "Participants can update own conversations"
on conversations
for update
to authenticated
using (
  auth.uid() = buyer_id OR auth.uid() = seller_id
)
with check (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- 6. Messages RLS Policies
drop policy if exists "Users can read own messages" on messages;
create policy "Users can read own messages"
on messages
for select
to authenticated
using (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

drop policy if exists "Users can send own messages" on messages;
create policy "Users can send own messages"
on messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
);

drop policy if exists "Receiver can mark messages read" on messages;
create policy "Receiver can mark messages read"
on messages
for update
to authenticated
using (
  auth.uid() = receiver_id OR auth.uid() = sender_id
)
with check (
  auth.uid() = receiver_id OR auth.uid() = sender_id
);
