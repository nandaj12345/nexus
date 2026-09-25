import React, { useState } from 'react'
import { Plus, MessageSquare, Settings, Bell, Hash } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { CreateCommunityModal } from '@/components/community/CreateCommunityModal'
import { JoinCommunityModal } from '@/components/community/JoinCommunityModal'
import { UserSettingsModal } from '@/components/profile/UserSettingsModal'
import type { Community } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  gaming:      '#f04747',
  friends:     '#3bce6f',
  study:       '#5ba4ef',
  programming: '#7c6cf2',
  creator:     '#f0a733',
  other:       '#9999b5',
}

const CATEGORY_EMOJI: Record<string, string> = {
  gaming: '🎮', friends: '👥', study: '📚',
  programming: '💻', creator: '🎨', other: '🌐',
}

interface CommunityIconProps {
  community: Community
  isActive: boolean
  onClick: () => void
}

const CommunityIcon: React.FC<CommunityIconProps> = ({ community, isActive, onClick }) => {
  return (
    <Tooltip content={community.name} side="right">
      <div className="relative group" onClick={onClick}>
        {/* Active indicator */}
        <div className={`
          absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white
          transition-all duration-200
          ${isActive ? 'h-8 opacity-100' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-4'}
        `} />

        <div className={`
          ml-3 w-12 h-12 rounded-2xl cursor-pointer overflow-hidden
          transition-all duration-200 flex items-center justify-center
          font-bold text-white text-lg
          ${isActive
            ? 'rounded-xl shadow-glow ring-2 ring-brand-500'
            : 'hover:rounded-xl hover:shadow-glow/30'
          }
        `}
          style={{
            backgroundColor: community.icon_url ? undefined : CATEGORY_COLORS[community.category] || '#7c6cf2'
          }}
        >
          {community.icon_url ? (
            <img src={community.icon_url} alt={community.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{CATEGORY_EMOJI[community.category] || '🌐'}</span>
          )}
        </div>
      </div>
    </Tooltip>
  )
}

export const CommunitySidebar: React.FC = () => {
  const { user } = useAuthStore()
  const { communities, activeCommunityId, setActiveCommunity, setActiveDM, view } = useAppStore()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!user) return null

  return (
    <>
      <aside className="w-[72px] flex-shrink-0 bg-bg-primary flex flex-col items-center py-3 gap-2 border-r border-bg-border overflow-y-auto scrollbar-hide">
        {/* Direct Messages button */}
        <Tooltip content="Direct Messages" side="right">
          <button
            onClick={() => setActiveDM(null)}
            className={`
              w-12 h-12 rounded-2xl transition-all duration-200 flex items-center justify-center
              ${view === 'dm'
                ? 'bg-brand-600 rounded-xl shadow-glow text-white'
                : 'bg-bg-secondary hover:bg-brand-600 text-text-secondary hover:text-white hover:rounded-xl'
              }
            `}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Separator */}
        <div className="w-8 h-px bg-bg-border my-1" />

        {/* Communities */}
        {communities.map(community => (
          <CommunityIcon
            key={community.id}
            community={community}
            isActive={activeCommunityId === community.id}
            onClick={() => setActiveCommunity(community.id)}
          />
        ))}

        {/* Add community buttons */}
        <div className="w-8 h-px bg-bg-border my-1" />

        <Tooltip content="Create Community" side="right">
          <button
            onClick={() => setShowCreate(true)}
            className="w-12 h-12 rounded-2xl bg-bg-secondary hover:bg-online text-online hover:text-white hover:rounded-xl transition-all duration-200 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </Tooltip>

        <Tooltip content="Join Community" side="right">
          <button
            onClick={() => setShowJoin(true)}
            className="w-12 h-12 rounded-2xl bg-bg-secondary hover:bg-brand-600 text-brand-400 hover:text-white hover:rounded-xl transition-all duration-200 flex items-center justify-center"
          >
            <Hash className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <Tooltip content="Notifications" side="right">
          <button className="w-12 h-12 rounded-2xl bg-bg-secondary hover:bg-bg-elevated text-text-muted hover:text-text-primary hover:rounded-xl transition-all duration-200 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* User avatar */}
        <div onClick={() => setShowSettings(true)}>
          <Avatar
            src={user.avatar_url}
            name={user.display_name || user.username}
            userId={user.id}
            size="sm"
            status={user.status}
            className="cursor-pointer hover:ring-2 hover:ring-brand-500 rounded-full transition-all"
          />
        </div>
      </aside>

      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
      {showSettings && <UserSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

export default CommunitySidebar
