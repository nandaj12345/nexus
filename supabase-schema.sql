-- ═══════════════════════════════════════════════════════════════════════════
-- NEXUS — Complete Database Schema
-- Run this in your Supabase SQL editor to set up the database
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for full-text search

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 2 AND 32),
  display_name  TEXT CHECK (length(display_name) <= 64),
  avatar_url    TEXT,
  bio           TEXT CHECK (length(bio) <= 500),
  status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','idle','dnd','offline')),
  custom_status TEXT CHECK (length(custom_status) <= 128),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── COMMUNITIES ─────────────────────────────────────────────────────────────
CREATE TABLE communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 64),
  description TEXT CHECK (length(description) <= 1024),
  icon_url    TEXT,
  banner_url  TEXT,
  category    TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('gaming','friends','study','programming','creator','other')),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) FROM 1 FOR 8),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COMMUNITY MEMBERS ───────────────────────────────────────────────────────
CREATE TABLE community_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  nickname     TEXT CHECK (length(nickname) <= 32),
  is_muted     BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned    BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

-- ─── ROLES ───────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 32),
  color        TEXT NOT NULL DEFAULT '#7c6cf2',
  permissions  JSONB NOT NULL DEFAULT '{
    "can_manage_channels": false,
    "can_manage_roles": false,
    "can_kick_members": false,
    "can_ban_members": false,
    "can_mute_members": false,
    "can_send_messages": true,
    "can_read_messages": true,
    "can_upload_files": true,
    "can_mention_everyone": false
  }',
  position     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CHANNELS ────────────────────────────────────────────────────────────────
CREATE TABLE channels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
  type         TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice','announcement')),
  topic        TEXT CHECK (length(topic) <= 1024),
  position     INT NOT NULL DEFAULT 0,
  is_private   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DM CONVERSATIONS ────────────────────────────────────────────────────────
CREATE TABLE dm_conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dm_participants (
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id          UUID REFERENCES channels(id) ON DELETE CASCADE,
  dm_conversation_id  UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  author_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content             TEXT NOT NULL CHECK (length(content) <= 4000),
  edited_at           TIMESTAMPTZ,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to_id         UUID REFERENCES messages(id) ON DELETE SET NULL,
  thread_id           UUID,                -- populated when part of a thread
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_target CHECK (
    (channel_id IS NOT NULL) != (dm_conversation_id IS NOT NULL)
  )
);
CREATE INDEX idx_messages_channel    ON messages(channel_id, created_at DESC) WHERE NOT is_deleted;
CREATE INDEX idx_messages_dm         ON messages(dm_conversation_id, created_at DESC) WHERE NOT is_deleted;
CREATE INDEX idx_messages_thread     ON messages(thread_id, created_at ASC) WHERE NOT is_deleted;
CREATE INDEX idx_messages_content    ON messages USING gin(to_tsvector('english', content));

-- ─── THREADS ─────────────────────────────────────────────────────────────────
CREATE TABLE threads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id        UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  parent_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Thread',
  created_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count     INT NOT NULL DEFAULT 0
);

-- Add FK back to messages for thread_id
ALTER TABLE messages ADD CONSTRAINT fk_message_thread
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE SET NULL;

-- ─── REACTIONS ───────────────────────────────────────────────────────────────
CREATE TABLE reactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (length(emoji) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- ─── ATTACHMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('mention','reply','dm','invite')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE NOT is_read;

-- ─── MODERATION ACTIONS ──────────────────────────────────────────────────────
CREATE TABLE moderation_actions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id   UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  moderator_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN ('kick','ban','unban','mute','unmute','warn')),
  reason         TEXT CHECK (length(reason) <= 500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VOICE SESSIONS ──────────────────────────────────────────────────────────
CREATE TABLE voice_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted    BOOLEAN NOT NULL DEFAULT FALSE,
  is_deafened BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions     ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by all auth users, writable by owner
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Communities: readable if member, creatable by auth users
CREATE POLICY "communities_select" ON communities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = id AND user_id = auth.uid())
);
CREATE POLICY "communities_insert" ON communities FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "communities_update" ON communities FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "communities_delete" ON communities FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Community members
CREATE POLICY "members_select" ON community_members FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM community_members cm2 WHERE cm2.community_id = community_id AND cm2.user_id = auth.uid())
);
CREATE POLICY "members_insert" ON community_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON community_members FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin','moderator'))
);
CREATE POLICY "members_delete" ON community_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin'))
);

-- Channels: readable by community members
CREATE POLICY "channels_select" ON channels FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = channels.community_id AND user_id = auth.uid())
);
CREATE POLICY "channels_insert" ON channels FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = channels.community_id AND user_id = auth.uid() AND role IN ('owner','admin','moderator'))
);
CREATE POLICY "channels_update" ON channels FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = channels.community_id AND user_id = auth.uid() AND role IN ('owner','admin','moderator'))
);
CREATE POLICY "channels_delete" ON channels FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = channels.community_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);

-- Messages: readable in channels user has access to
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM channels c
    JOIN community_members cm ON cm.community_id = c.community_id
    WHERE c.id = channel_id AND cm.user_id = auth.uid()
  ))
  OR
  (dm_conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM dm_participants WHERE conversation_id = dm_conversation_id AND user_id = auth.uid()
  ))
);
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Reactions
CREATE POLICY "reactions_select" ON reactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "reactions_insert" ON reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_delete" ON reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Attachments
CREATE POLICY "attachments_select" ON attachments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "attachments_insert" ON attachments FOR INSERT TO authenticated WITH CHECK (TRUE);

-- DM Conversations
CREATE POLICY "dm_conv_select" ON dm_conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "dm_conv_insert" ON dm_conversations FOR INSERT TO authenticated WITH CHECK (TRUE);

-- DM Participants
CREATE POLICY "dm_part_select" ON dm_participants FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM dm_participants dp2 WHERE dp2.conversation_id = conversation_id AND dp2.user_id = auth.uid())
);
CREATE POLICY "dm_part_insert" ON dm_participants FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Threads
CREATE POLICY "threads_select" ON threads FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM channels c
    JOIN community_members cm ON cm.community_id = c.community_id
    WHERE c.id = channel_id AND cm.user_id = auth.uid()
  )
);
CREATE POLICY "threads_insert" ON threads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "threads_update" ON threads FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Moderation actions
CREATE POLICY "mod_actions_select" ON moderation_actions FOR SELECT TO authenticated USING (
  moderator_id = auth.uid() OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = moderation_actions.community_id AND user_id = auth.uid() AND role IN ('owner','admin','moderator'))
);
CREATE POLICY "mod_actions_insert" ON moderation_actions FOR INSERT TO authenticated WITH CHECK (moderator_id = auth.uid());

-- Roles
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = roles.community_id AND user_id = auth.uid())
);
CREATE POLICY "roles_insert" ON roles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = roles.community_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY "roles_update" ON roles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = roles.community_id AND user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "roles_delete" ON roles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = roles.community_id AND user_id = auth.uid() AND role = 'owner')
);

-- Voice sessions
CREATE POLICY "voice_select" ON voice_sessions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM channels c
    JOIN community_members cm ON cm.community_id = c.community_id
    WHERE c.id = channel_id AND cm.user_id = auth.uid()
  )
);
CREATE POLICY "voice_insert" ON voice_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "voice_update" ON voice_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "voice_delete" ON voice_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════════
-- Enable realtime for relevant tables (run in Supabase dashboard or here)
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
  ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE voice_sessions;
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (run separately in Supabase dashboard)
-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('community-icons', 'community-icons', true);
