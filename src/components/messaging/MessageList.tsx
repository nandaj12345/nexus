import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowDown, Loader2 } from 'lucide-react'
import { useMessageStore } from '@/store/messageStore'
import { MessageItem } from './MessageItem'
import { formatMessageDate } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageListProps {
  targetId: string
  type: 'channel' | 'dm'
  onReply: (message: Message) => void
  emptyState?: React.ReactNode
}

export const MessageList: React.FC<MessageListProps> = ({
  targetId,
  type,
  onReply,
  emptyState,
}) => {
  const { messages, loading, hasMore, loadMessages, subscribeToChannel, unsubscribeFromChannel } = useMessageStore()
  const listMessages = messages[targetId] || []
  const isLoading = loading[targetId]

  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Load messages and subscribe on mount
  useEffect(() => {
    loadMessages(targetId, type)
    if (type === 'channel') {
      subscribeToChannel(targetId)
    }
    return () => {
      if (type === 'channel') {
        unsubscribeFromChannel(targetId)
      }
    }
  }, [targetId, type])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [listMessages.length, isAtBottom])

  // Scroll to bottom initially
  useEffect(() => {
    if (bottomRef.current && listMessages.length > 0) {
      bottomRef.current.scrollIntoView()
    }
  }, [targetId])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const atBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsAtBottom(atBottom)
    setShowScrollBtn(!atBottom)

    // Load more when scrolled to top
    if (scrollTop < 100 && hasMore[targetId] && !isLoading) {
      const oldest = listMessages[0]
      if (oldest) {
        const prevHeight = container.scrollHeight
        loadMessages(targetId, type, oldest.created_at).then(() => {
          // Maintain scroll position
          container.scrollTop = container.scrollHeight - prevHeight
        })
      }
    }
  }, [targetId, type, hasMore, isLoading, listMessages])

  // Group messages by author + time proximity
  const groupedMessages = listMessages.reduce<{
    message: Message
    isGrouped: boolean
    showDateDivider: boolean
    date: string
  }[]>((acc, message, i) => {
    const prev = listMessages[i - 1]
    const isGrouped = !!(
      prev &&
      prev.author_id === message.author_id &&
      new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
    )

    const date = formatMessageDate(message.created_at)
    const prevDate = prev ? formatMessageDate(prev.created_at) : null
    const showDateDivider = date !== prevDate

    acc.push({ message, isGrouped: isGrouped && !showDateDivider, showDateDivider, date })
    return acc
  }, [])

  if (isLoading && listMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!isLoading && listMessages.length === 0) {
    return (
      <div className="flex-1 flex items-end">
        {emptyState || (
          <div className="w-full px-6 py-8">
            <div className="w-12 h-12 rounded-full bg-brand-600/20 flex items-center justify-center mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-1">The beginning of something great</h3>
            <p className="text-text-muted text-sm">Send the first message to get things started.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin py-2"
      >
        {/* Load more indicator */}
        {isLoading && listMessages.length > 0 && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map(({ message, isGrouped, showDateDivider, date }) => (
          <React.Fragment key={message.id}>
            {showDateDivider && (
              <div className="flex items-center gap-3 px-4 my-4">
                <div className="flex-1 h-px bg-bg-border" />
                <span className="text-xs font-semibold text-text-muted bg-bg-secondary px-3 py-1 rounded-full border border-bg-border">
                  {date}
                </span>
                <div className="flex-1 h-px bg-bg-border" />
              </div>
            )}
            <MessageItem
              message={message}
              isGrouped={isGrouped}
              targetId={targetId}
              onReply={onReply}
            />
          </React.Fragment>
        ))}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            setShowScrollBtn(false)
          }}
          className="absolute bottom-4 right-4 w-9 h-9 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-glow flex items-center justify-center transition-all animate-bounce-sm"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default MessageList
