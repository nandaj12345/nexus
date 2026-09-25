import React, { useState } from 'react'
import {
  Hash, Volume2, ChevronDown, Plus, Settings,
  Lock, Megaphone, Crown, Shield, MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { CreateChannelModal } from '@/components/channel/CreateChannelModal'
import { CommunitySettingsModal } from '@/components/community/CommunitySettingsModal'
import type { Channel, CommunityMember } from '@/types'

const CHANNEL_ICON = {
  text:         <Hash className="w-4 h-4" />,
  voice:        <Volume2 className="w-4 h-4" />,
  announcement: <Megaphone className="w-4 h-4" />,
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner:     <Crown className="w-3 h-3 text-idle" />,
  admin:     <Shield className="w-3 h-3 text-brand-400" />,
  moderator: <Shield className="w-3 h-3 text-text-muted" />,
}

interface ChannelItemProps {
  channel: Channel
  isActive: boolean
  canManage: boolean
  onClick: () => void
  onDelete: (id: string) => void
  onRename: (channel: Channel) => void
}

const ChannelItem: React.FC<ChannelItemProps> = ({
  channel, isActive, canManage, onClick, onDelete, onRename,
}) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-2 py-1.5 mx-2 rounded-lg cursor-pointer
        transition-all duration-100
        ${isActive
          ? 'bg-bg-active text-text-primary'
          : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
        }
      `}
      onClick={onClick}
    >
      <span className="flex-shrink-0 opacity-70">
        {channel.is_private && <Lock className="w-3.5 h-3.5" />}
        {!channel.is_private && CHANNEL_ICON[channel.type]}
      </span>
      <span className="flex-1 text-sm font-medium truncate">{channel.name}</span>

      {canManage && (
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(channel) }}
            className="p-1 rounded hover:bg-bg-border transition-colors"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            className="p-1 rounded hover:bg-bg-border transition-colors"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
      )}

      {showMenu && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-bg-primary border border-bg-border rounded-xl shadow-popup py-1 animate-scale-in">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(channel.id); setShowMenu(false) }}
            className="w-full px-3 py-2 text-sm text-dnd hover:bg-dnd/10 text-left transition-colors"
          >
            Delete channel
          </button>
        </div>
      )}
    </div>
  )
}

export const ChannelSidebar: React.FC = () => {
  const { user } = useAuthStore()
  const {
    activeCommunityId, activeChannelId, communities, channels, members,
    setActiveChannel, removeChannel, loadChannels,
  } = useAppStore()

  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCommunitySettings, setShowCommunitySettings] = useState(false)
  const [renamingChannel, setRenamingChannel] = useState<Channel | null>(null)
  const [textCollapsed, setTextCollapsed] = useState(false)
  const [voiceCollapsed, setVoiceCollapsed] = useState(false)

  const community = communities.find(c => c.id === activeCommunityId)
  const communityChannels = activeCommunityId ? (channels[activeCommunityId] || []) : []
  const communityMembers = activeCommunityId ? (members[activeCommunityId] || []) : []

  const myMember = communityMembers.find(m => m.user_id === user?.id)
  const canManage = myMember?.role === 'owner' || myMember?.role === 'admin' || myMember?.role === 'moderator'
  const isOwner = myMember?.role === 'owner'

  const textChannels = communityChannels.filter(c => c.type === 'text' || c.type === 'announcement')
  const voiceChannels = communityChannels.filter(c => c.type === 'voice')

  const handleDeleteChannel = async (channelId: string) => {
    await supabase.from('channels').delete().eq('id', channelId)
    if (activeCommunityId) removeChannel(channelId, activeCommunityId)
  }

  if (!community) {
    return (
      <div className="w-60 flex-shrink-0 bg-bg-secondary flex flex-col items-center justify-center border-r border-bg-border">
        <div className="text-text-muted text-sm text-center px-4">
          <p className="text-3xl mb-2">👈</p>
          <p>Select a community to get started</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className="w-60 flex-shrink-0 bg-bg-secondary flex flex-col border-r border-bg-border">
        {/* Community header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 border-b border-bg-border cursor-pointer hover:bg-bg-elevated transition-colors"
          onClick={() => isOwner && setShowCommunitySettings(true)}
        >
          <h2 className="font-semibold text-text-primary text-sm truncate flex-1">{community.name}</h2>
          {isOwner ? (
            <Settings className="w-4 h-4 text-text-muted flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
          )}
        </div>

        {/* Channel list */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
          {/* Text channels */}
          <div className="mb-2">
            <div
              className="flex items-center justify-between px-3 py-1 cursor-pointer group"
              onClick={() => setTextCollapsed(!textCollapsed)}
            >
              <div className="flex items-center gap-1">
                <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${textCollapsed ? '-rotate-90' : ''}`} />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Text Channels
                </span>
              </div>
              {canManage && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!textCollapsed && (
              <div className="mt-1 space-y-0.5">
                {textChannels.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannelId === channel.id}
                    canManage={canManage}
                    onClick={() => setActiveChannel(channel.id)}
                    onDelete={handleDeleteChannel}
                    onRename={setRenamingChannel}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Voice channels */}
          {voiceChannels.length > 0 && (
            <div className="mb-2">
              <div
                className="flex items-center justify-between px-3 py-1 cursor-pointer group"
                onClick={() => setVoiceCollapsed(!voiceCollapsed)}
              >
                <div className="flex items-center gap-1">
                  <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${voiceCollapsed ? '-rotate-90' : ''}`} />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Voice Channels
                  </span>
                </div>
                {canManage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!voiceCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {voiceChannels.map(channel => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isActive={activeChannelId === channel.id}
                      canManage={canManage}
                      onClick={() => setActiveChannel(channel.id)}
                      onDelete={handleDeleteChannel}
                      onRename={setRenamingChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User bar */}
        <div className="px-2 py-2 border-t border-bg-border bg-bg-primary">
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-bg-elevated transition-colors cursor-pointer">
            <Avatar
              src={user?.avatar_url}
              name={user?.display_name || user?.username || '?'}
              userId={user?.id}
              size="sm"
              status={user?.status}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user?.display_name || user?.username}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.custom_status || `@${user?.username}`}
              </p>
            </div>
            {myMember && ROLE_ICON[myMember.role] && (
              <span>{ROLE_ICON[myMember.role]}</span>
            )}
          </div>
        </div>
      </aside>

      {showCreateChannel && activeCommunityId && (
        <CreateChannelModal
          communityId={activeCommunityId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
      {showCommunitySettings && community && (
        <CommunitySettingsModal
          community={community}
          onClose={() => setShowCommunitySettings(false)}
        />
      )}
    </>
  )
}

export default ChannelSidebar
