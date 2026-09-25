import React, { useEffect, useState } from 'react'
import { Crown, Shield, MessageSquare, UserX, VolumeX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import type { CommunityMember } from '@/types'

const ROLE_BADGE: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  owner:     { icon: <Crown className="w-3 h-3" />,  label: 'Owner',     color: 'text-idle' },
  admin:     { icon: <Shield className="w-3 h-3" />, label: 'Admin',     color: 'text-brand-400' },
  moderator: { icon: <Shield className="w-3 h-3" />, label: 'Moderator', color: 'text-text-muted' },
  member:    { icon: null,                            label: 'Member',    color: 'text-text-muted' },
}

interface MemberItemProps {
  member: CommunityMember
  canModerate: boolean
  isCurrentUser: boolean
  onDM: () => void
  onKick: () => void
  onBan: () => void
  onMute: () => void
}

const MemberItem: React.FC<MemberItemProps> = ({
  member, canModerate, isCurrentUser, onDM, onKick, onBan, onMute,
}) => {
  const [showActions, setShowActions] = useState(false)
  const profile = member.profile
  if (!profile) return null

  const badge = ROLE_BADGE[member.role]
  const isOnline = profile.status !== 'offline'

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-bg-elevated transition-all cursor-pointer mx-1"
      onClick={() => setShowActions(!showActions)}
    >
      <Avatar
        src={profile.avatar_url}
        name={profile.display_name || profile.username}
        userId={profile.id}
        size="sm"
        status={profile.status}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-medium truncate ${isOnline ? 'text-text-primary' : 'text-text-muted'}`}>
            {profile.display_name || profile.username}
          </span>
          {badge.icon && (
            <span className={badge.color} title={badge.label}>{badge.icon}</span>
          )}
        </div>
        {profile.custom_status && (
          <p className="text-xs text-text-muted truncate">{profile.custom_status}</p>
        )}
      </div>

      {/* Hover actions */}
      {!isCurrentUser && (
        <div className="hidden group-hover:flex items-center gap-0.5">
          <Tooltip content="Message" side="left">
            <button
              onClick={(e) => { e.stopPropagation(); onDM() }}
              className="p-1 rounded-lg hover:bg-bg-border text-text-muted hover:text-brand-400 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          {canModerate && member.role === 'member' && (
            <>
              <Tooltip content={member.is_muted ? 'Unmute' : 'Mute'} side="left">
                <button
                  onClick={(e) => { e.stopPropagation(); onMute() }}
                  className="p-1 rounded-lg hover:bg-bg-border text-text-muted hover:text-idle transition-colors"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Kick" side="left">
                <button
                  onClick={(e) => { e.stopPropagation(); onKick() }}
                  className="p-1 rounded-lg hover:bg-bg-border text-text-muted hover:text-dnd transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      )}
      {member.is_muted && (
        <VolumeX className="w-3 h-3 text-dnd opacity-60 flex-shrink-0" />
      )}
    </div>
  )
}

export const MembersSidebar: React.FC = () => {
  const { user } = useAuthStore()
  const { activeCommunityId, members, setActiveDM, loadMembers } = useAppStore()

  const communityMembers = activeCommunityId ? (members[activeCommunityId] || []) : []
  const myMember = communityMembers.find(m => m.user_id === user?.id)
  const canModerate = myMember?.role === 'owner' || myMember?.role === 'admin' || myMember?.role === 'moderator'

  const online = communityMembers.filter(m => m.profile?.status !== 'offline' && !m.is_banned)
  const offline = communityMembers.filter(m => m.profile?.status === 'offline' && !m.is_banned)

  const handleDM = async (targetUserId: string) => {
    // Find or create DM conversation
    const { data: existing } = await supabase
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', user!.id)

    for (const row of existing || []) {
      const { data: parts } = await supabase
        .from('dm_participants')
        .select('user_id')
        .eq('conversation_id', row.conversation_id)
      const userIds = (parts || []).map(p => p.user_id)
      if (userIds.includes(targetUserId) && userIds.length === 2) {
        setActiveDM(row.conversation_id)
        return
      }
    }

    // Create new conversation
    const { data: conv } = await supabase
      .from('dm_conversations')
      .insert({})
      .select()
      .single()

    if (conv) {
      await supabase.from('dm_participants').insert([
        { conversation_id: conv.id, user_id: user!.id },
        { conversation_id: conv.id, user_id: targetUserId },
      ])
      setActiveDM(conv.id)
    }
  }

  const handleModerate = async (
    member: CommunityMember,
    action: 'kick' | 'ban' | 'mute'
  ) => {
    if (action === 'kick') {
      await supabase
        .from('community_members')
        .delete()
        .eq('id', member.id)
      await supabase.from('moderation_actions').insert({
        community_id: activeCommunityId,
        moderator_id: user!.id,
        target_user_id: member.user_id,
        action: 'kick',
      })
    } else if (action === 'ban') {
      await supabase
        .from('community_members')
        .update({ is_banned: true })
        .eq('id', member.id)
      await supabase.from('moderation_actions').insert({
        community_id: activeCommunityId,
        moderator_id: user!.id,
        target_user_id: member.user_id,
        action: 'ban',
      })
    } else if (action === 'mute') {
      await supabase
        .from('community_members')
        .update({ is_muted: !member.is_muted })
        .eq('id', member.id)
    }

    if (activeCommunityId) loadMembers(activeCommunityId)
  }

  if (!activeCommunityId) return null

  return (
    <aside className="w-56 flex-shrink-0 bg-bg-secondary flex flex-col border-l border-bg-border overflow-y-auto scrollbar-thin">
      <div className="px-3 py-3 border-b border-bg-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Members — {communityMembers.length}
        </h3>
      </div>

      <div className="flex-1 py-2">
        {/* Online */}
        {online.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Online — {online.length}
            </p>
            {online.map(member => (
              <MemberItem
                key={member.id}
                member={member}
                canModerate={canModerate}
                isCurrentUser={member.user_id === user?.id}
                onDM={() => handleDM(member.user_id)}
                onKick={() => handleModerate(member, 'kick')}
                onBan={() => handleModerate(member, 'ban')}
                onMute={() => handleModerate(member, 'mute')}
              />
            ))}
          </div>
        )}

        {/* Offline */}
        {offline.length > 0 && (
          <div className="mt-2">
            <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Offline — {offline.length}
            </p>
            {offline.map(member => (
              <MemberItem
                key={member.id}
                member={member}
                canModerate={canModerate}
                isCurrentUser={member.user_id === user?.id}
                onDM={() => handleDM(member.user_id)}
                onKick={() => handleModerate(member, 'kick')}
                onBan={() => handleModerate(member, 'ban')}
                onMute={() => handleModerate(member, 'mute')}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default MembersSidebar
