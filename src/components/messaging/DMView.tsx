import React, { useEffect, useState } from 'react'
import { MessageSquare, Phone, Video, MoreHorizontal, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useMessageStore } from '@/store/messageStore'
import { Avatar } from '@/components/ui/Avatar'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import type { Profile, Message } from '@/types'

export const DMView: React.FC = () => {
  const { activeDMConversationId } = useAppStore()
  const { user } = useAuthStore()
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeDMConversationId || !user) return

    const fetchOtherUser = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('dm_participants')
        .select('user_id, profile:profiles(*)')
        .eq('conversation_id', activeDMConversationId)
        .neq('user_id', user.id)
        .single()

      if (data) setOtherUser(data.profile as unknown as Profile)
      setLoading(false)
    }

    fetchOtherUser()
  }, [activeDMConversationId, user?.id])

  // Subscribe to DM conversation
  useEffect(() => {
    if (!activeDMConversationId) return
    const { subscriptions } = useMessageStore.getState()
    if (subscriptions[activeDMConversationId]) return

    const channel = supabase
      .channel(`dm:${activeDMConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `dm_conversation_id=eq.${activeDMConversationId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, author:profiles(*), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)')
          .eq('id', payload.new.id)
          .single()

        if (data) {
          useMessageStore.setState(state => ({
            messages: {
              ...state.messages,
              [activeDMConversationId]: [
                ...(state.messages[activeDMConversationId] || []).filter(m => m.id !== data.id),
                data,
              ],
            }
          }))
        }
      })
      .subscribe()

    useMessageStore.setState(state => ({
      subscriptions: { ...state.subscriptions, [activeDMConversationId]: channel }
    }))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeDMConversationId])

  if (!activeDMConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-tertiary">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Direct Messages</h2>
          <p className="text-text-muted text-sm">
            Select a conversation or start a new one by clicking on a member.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-tertiary">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-bg-tertiary min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border bg-bg-secondary flex-shrink-0">
        {otherUser && (
          <Avatar
            src={otherUser.avatar_url}
            name={otherUser.display_name || otherUser.username}
            userId={otherUser.id}
            size="sm"
            status={otherUser.status}
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-text-primary text-sm">
            {otherUser?.display_name || otherUser?.username || '...'}
          </h2>
          {otherUser?.custom_status && (
            <p className="text-xs text-text-muted truncate">{otherUser.custom_status}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all" title="Voice call (coming soon)">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all" title="Video call (coming soon)">
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        targetId={activeDMConversationId}
        type="dm"
        onReply={setReplyTo}
        emptyState={
          <div className="px-6 py-8 animate-fade-in">
            {otherUser && (
              <>
                <Avatar
                  src={otherUser.avatar_url}
                  name={otherUser.display_name || otherUser.username}
                  userId={otherUser.id}
                  size="xl"
                  className="mb-4"
                />
                <h3 className="text-2xl font-bold text-text-primary mb-1">
                  {otherUser.display_name || otherUser.username}
                </h3>
                <p className="text-text-muted text-sm">
                  This is the beginning of your conversation with{' '}
                  <strong className="text-text-secondary">@{otherUser.username}</strong>.
                </p>
              </>
            )}
          </div>
        }
      />

      {/* Composer */}
      <MessageComposer
        dmConversationId={activeDMConversationId}
        placeholder={`Message ${otherUser?.display_name || otherUser?.username || '...'}`}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  )
}

export default DMView
