import React, { useEffect, useState } from 'react'
import { X, Hash, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMessageStore } from '@/store/messageStore'
import { MessageItem } from './MessageItem'
import { MessageComposer } from './MessageComposer'
import { useAuthStore } from '@/store/authStore'
import type { Thread, Message } from '@/types'

interface ThreadPanelProps {
  threadId: string
  onClose: () => void
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ threadId, onClose }) => {
  const [thread, setThread] = useState<Thread | null>(null)
  const [parentMessage, setParentMessage] = useState<Message | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)

  const { messages, loadMessages, subscribeToThread } = useMessageStore()
  const { user } = useAuthStore()
  const threadMessages = messages[threadId] || []

  useEffect(() => {
    const init = async () => {
      setLoading(true)

      const [{ data: threadData }, ] = await Promise.all([
        supabase.from('threads').select('*').eq('id', threadId).single(),
      ])

      if (threadData) {
        setThread(threadData)

        const { data: parent } = await supabase
          .from('messages')
          .select('*, author:profiles(*), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)')
          .eq('id', threadData.parent_message_id)
          .single()

        if (parent) setParentMessage(parent)
      }

      await loadMessages(threadId, 'channel')
      subscribeToThread(threadId)
      setLoading(false)
    }

    init()
  }, [threadId])

  return (
    <div className="w-80 flex-shrink-0 bg-bg-secondary border-l border-bg-border flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-sm text-text-primary">
            {thread?.name || 'Thread'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Parent message */}
          {parentMessage && (
            <div className="border-b border-bg-border pb-2">
              <MessageItem
                message={parentMessage}
                isGrouped={false}
                targetId={parentMessage.channel_id!}
                onReply={() => {}}
              />
            </div>
          )}

          {/* Thread messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
            {threadMessages.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-text-muted text-sm">No replies yet. Start the conversation!</p>
              </div>
            ) : (
              threadMessages.map((message, i) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isGrouped={
                    i > 0 &&
                    threadMessages[i-1].author_id === message.author_id &&
                    new Date(message.created_at).getTime() - new Date(threadMessages[i-1].created_at).getTime() < 5 * 60 * 1000
                  }
                  targetId={threadId}
                  onReply={setReplyTo}
                />
              ))
            )}
          </div>

          {/* Composer */}
          <MessageComposer
            channelId={parentMessage?.channel_id ?? undefined}
            threadId={threadId}
            placeholder="Reply in thread..."
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </>
      )}
    </div>
  )
}

export default ThreadPanel
