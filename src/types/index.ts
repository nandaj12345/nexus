// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: 'online' | 'idle' | 'dnd' | 'offline'
  custom_status: string | null
  created_at: string
  updated_at: string
}

export type CommunityCategory =
  | 'gaming'
  | 'friends'
  | 'study'
  | 'programming'
  | 'creator'
  | 'other'

export interface Community {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  banner_url: string | null
  category: CommunityCategory
  owner_id: string
  invite_code: string
  created_at: string
  updated_at: string
}

export type ChannelType = 'text' | 'voice' | 'announcement'

export interface Channel {
  id: string
  community_id: string
  name: string
  type: ChannelType
  topic: string | null
  position: number
  is_private: boolean
  created_at: string
}

export interface Message {
  id: string
  channel_id: string | null
  dm_conversation_id: string | null
  author_id: string
  content: string
  edited_at: string | null
  is_deleted: boolean
  reply_to_id: string | null
  thread_id: string | null
  created_at: string
  // Joined
  author?: Profile
  reply_to?: Message
  reactions?: Reaction[]
  attachments?: Attachment[]
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  // Joined
  user?: Profile
}

export interface Attachment {
  id: string
  message_id: string
  url: string
  file_name: string
  file_size: number
  content_type: string
  created_at: string
}

export interface Thread {
  id: string
  channel_id: string
  parent_message_id: string
  name: string
  created_by: string
  created_at: string
  message_count: number
}

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member'

export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: MemberRole
  nickname: string | null
  is_muted: boolean
  is_banned: boolean
  joined_at: string
  // Joined
  profile?: Profile
}

export interface Role {
  id: string
  community_id: string
  name: string
  color: string
  permissions: RolePermissions
  position: number
  created_at: string
}

export interface RolePermissions {
  can_manage_channels: boolean
  can_manage_roles: boolean
  can_kick_members: boolean
  can_ban_members: boolean
  can_mute_members: boolean
  can_send_messages: boolean
  can_read_messages: boolean
  can_upload_files: boolean
  can_mention_everyone: boolean
}

export interface DMConversation {
  id: string
  created_at: string
  // Joined
  participants?: Profile[]
  last_message?: Message
  unread_count?: number
}

export interface DMParticipant {
  conversation_id: string
  user_id: string
  joined_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'mention' | 'reply' | 'dm' | 'invite'
  title: string
  body: string
  is_read: boolean
  link: string | null
  created_at: string
}

export interface ModerationAction {
  id: string
  community_id: string
  moderator_id: string
  target_user_id: string
  action: 'kick' | 'ban' | 'unban' | 'mute' | 'unmute' | 'warn'
  reason: string | null
  created_at: string
  // Joined
  moderator?: Profile
  target_user?: Profile
}

export interface VoiceParticipant {
  user_id: string
  channel_id: string
  is_muted: boolean
  is_deafened: boolean
  is_speaking: boolean
  profile?: Profile
}

// ─── UI / App State Types ─────────────────────────────────────────────────────

export interface AppState {
  activeCommunityId: string | null
  activeChannelId: string | null
  activeDMConversationId: string | null
  activeThreadId: string | null
  view: 'channel' | 'dm' | 'settings'
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface UploadProgress {
  file: File
  progress: number
  url?: string
  error?: string
}

export interface MessageGroup {
  authorId: string
  author: Profile
  messages: Message[]
  date: string
}
