import React, { useState, useEffect } from 'react'
import { Hash, Volume2, Megaphone, Users, Search, Settings, X, Bell } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ThreadPanel } from './ThreadPanel'
import { SearchModal } from '@/components/messaging/SearchModal'
import { VoiceChannel } from '@/components/voice/VoiceChannel'
import type { Message, Channel } from '@/types'

const CHANNEL_ICON = {
  text: <Hash className="w-4 h-4" />,
  voice: <Volume2 className="w-4 h-4" />,
  announcement: <Megaphone className="w-4 h-4" />,
}

export const ChannelView: React.FC = () => {
  const {
    activeChannelId, activeCommunityId,
    channels, members, toggleRightSidebar, rightSidebarOpen,
    activeThreadId, setActiveThread,
  } = useAppStore()
  const { user } = useAuthStore()
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const communityChannels = activeCommunityId ? (channels[activeCommunityId] || []) : []
  const channel = communityChannels.find(c => c.id === activeChannelId)

  const communityMembers = activeCommunityId ? (members[activeCommunityId] || []) : []
  const onlineCount = communityMembers.filter(m => m.profile?.status !== 'offline').length

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-tertiary">
        <div className="text-center">
          <div className="text-5xl mb-4">📌</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">No channel selected</h2>
          <p className="text-text-muted">Pick a channel from the sidebar to get started</p>
        </div>
      </div>
    )
  }

  if (channel.type === 'voice') {
    return <VoiceChannel channel={channel} />
  }

  return (
    <div className="flex flex-col flex-1 bg-bg-tertiary min-w-0">
      {/* Channel header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-text-muted flex-shrink-0">
            {CHANNEL_ICON[channel.type]}
          </span>
          <h2 className="font-semibold text-text-primary">{channel.name}</h2>
          {channel.topic && (
            <>
              <div className="w-px h-4 bg-bg-border flex-shrink-0" />
              <p className="text-sm text-text-muted truncate">{channel.topic}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-sm font-medium ${
              rightSidebarOpen
                ? 'bg-bg-active text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-xs">{onlineCount}</span>
          </button>
        </div>
      </div>

      {/* Main content with optional thread panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <MessageList
            targetId={channel.id}
            type="channel"
            onReply={setReplyTo}
            emptyState={
              <div className="px-6 py-8 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center mb-4">
                  <Hash className="w-7 h-7 text-brand-400" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-1">
                  Welcome to #{channel.name}!
                </h3>
                {channel.topic && (
                  <p className="text-text-secondary mb-2">{channel.topic}</p>
                )}
                <p className="text-text-muted text-sm">
                  This is the beginning of the #{channel.name} channel.
                </p>
              </div>
            }
          />

          <MessageComposer
            channelId={channel.id}
            placeholder={`Message #${channel.name}`}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>

        {/* Thread panel */}
        {activeThreadId && (
          <ThreadPanel
            threadId={activeThreadId}
            onClose={() => setActiveThread(null)}
          />
        )}
      </div>

      {showSearch && (
        <SearchModal
          channelId={channel.id}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}

export default ChannelView
