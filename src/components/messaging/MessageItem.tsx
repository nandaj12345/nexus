import React, { useState } from 'react'
import {
  Reply, SmilePlus, Edit2, Trash2, Copy, MoreHorizontal,
  MessageSquare, Check, ExternalLink, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useMessageStore } from '@/store/messageStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatMessageTime, formatFullDate, isImageFile, formatFileSize, getFileIcon } from '@/lib/utils'
import type { Message } from '@/types'
import toast from 'react-hot-toast'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '😮']

interface MessageItemProps {
  message: Message
  isGrouped?: boolean
  targetId: string
  onReply: (message: Message) => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isGrouped = false,
  targetId,
  onReply,
}) => {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [copied, setCopied] = useState(false)

  const { user } = useAuthStore()
  const { editMessage, deleteMessage, addReaction, removeReaction } = useMessageStore()
  const { setActiveThread } = useAppStore()

  const isOwn = message.author_id === user?.id
  const author = message.author

  const groupedReactions = (message.reactions || []).reduce<Record<string, { emoji: string; count: number; hasReacted: boolean; users: string[] }>>(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, hasReacted: false, users: [] }
      acc[r.emoji].count++
      if (r.user_id === user?.id) acc[r.emoji].hasReacted = true
      if (r.user) acc[r.emoji].users.push(r.user.username)
      return acc
    },
    {}
  )

  const handleReact = async (emoji: string) => {
    if (!user) return
    const existing = groupedReactions[emoji]
    if (existing?.hasReacted) {
      await removeReaction(message.id, user.id, emoji)
    } else {
      await addReaction(message.id, user.id, emoji)
    }
    setShowEmojiPicker(false)
  }

  const handleEdit = async () => {
    if (editContent.trim() === message.content) { setIsEditing(false); return }
    await editMessage(message.id, editContent.trim())
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this message?')) {
      await deleteMessage(message.id, targetId)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }

  const handleStartThread = async () => {
    const { data: existing } = await supabase
      .from('threads')
      .select('id')
      .eq('parent_message_id', message.id)
      .single()

    if (existing) {
      setActiveThread(existing.id)
    } else {
      const { data: thread } = await supabase
        .from('threads')
        .insert({
          channel_id: message.channel_id,
          parent_message_id: message.id,
          name: message.content.slice(0, 50),
          created_by: user!.id,
        })
        .select()
        .single()
      if (thread) setActiveThread(thread.id)
    }
  }

  return (
    <div
      className={`
        group relative flex gap-3 px-4 py-1 hover:bg-bg-hover/50 transition-colors
        ${isGrouped ? 'mt-0.5' : 'mt-2'}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false) }}
    >
      {/* Avatar or spacer */}
      <div className="w-10 flex-shrink-0 mt-0.5">
        {!isGrouped ? (
          <Avatar
            src={author?.avatar_url}
            name={author?.display_name || author?.username || '?'}
            userId={author?.id}
            size="md"
          />
        ) : (
          <span className="opacity-0 group-hover:opacity-100 text-xs text-text-muted pt-1.5 block text-right leading-none select-none">
            {formatMessageTime(message.created_at)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-text-primary hover:underline cursor-pointer">
              {author?.display_name || author?.username || 'Unknown'}
            </span>
            <Tooltip content={formatFullDate(message.created_at)}>
              <span className="text-xs text-text-muted cursor-default">
                {formatMessageTime(message.created_at)}
              </span>
            </Tooltip>
            {message.edited_at && (
              <span className="text-xs text-text-muted">(edited)</span>
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div className="flex items-center gap-2 mb-1 ml-0 cursor-pointer group/reply">
            <div className="w-4 h-4 flex-shrink-0 relative">
              <div className="absolute right-0 top-1/2 w-3 h-3 border-l-2 border-t-2 border-text-muted rounded-tl-lg" />
            </div>
            <Avatar
              src={message.reply_to.author?.avatar_url}
              name={message.reply_to.author?.username || '?'}
              size="xs"
            />
            <span className="text-xs font-medium text-text-muted group-hover/reply:text-text-secondary">
              {message.reply_to.author?.display_name || message.reply_to.author?.username}
            </span>
            <span className="text-xs text-text-muted truncate group-hover/reply:text-text-secondary">
              {message.reply_to.content}
            </span>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit() }
                if (e.key === 'Escape') setIsEditing(false)
              }}
              className="w-full bg-bg-tertiary border border-brand-500 rounded-xl px-3 py-2 text-sm text-text-primary outline-none resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleEdit}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Save
              </button>
              <span className="text-xs text-text-muted">·</span>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
              <span className="text-xs text-text-muted">· escape to cancel</span>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-text-primary leading-relaxed break-words"
            dangerouslySetInnerHTML={{
              __html: message.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(
                  /@(\w+)/g,
                  '<span class="mention-tag bg-brand-600/20 text-brand-300 rounded px-1 cursor-pointer hover:bg-brand-600/30 transition-colors">@$1</span>'
                )
                .replace(/\n/g, '<br />')
            }}
          />
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map(att => (
              <div key={att.id}>
                {isImageFile(att.content_type) ? (
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.file_name}
                      className="max-w-xs max-h-64 rounded-xl object-cover hover:opacity-90 transition-opacity cursor-pointer border border-bg-border"
                    />
                  </a>
                ) : (
                  <a
                    href={att.url}
                    download={att.file_name}
                    className="flex items-center gap-3 bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 hover:bg-bg-hover transition-colors max-w-xs"
                  >
                    <span className="text-2xl">{getFileIcon(att.content_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{att.file_name}</p>
                      <p className="text-xs text-text-muted">{formatFileSize(att.file_size)}</p>
                    </div>
                    <Download className="w-4 h-4 text-text-muted flex-shrink-0" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.values(groupedReactions).map(({ emoji, count, hasReacted, users }) => (
              <Tooltip key={emoji} content={users.slice(0, 5).join(', ')}>
                <button
                  onClick={() => handleReact(emoji)}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                    border transition-all
                    ${hasReacted
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:border-brand-500/30'
                    }
                  `}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              </Tooltip>
            ))}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-bg-border text-text-muted hover:border-brand-500/30 hover:text-brand-400 bg-bg-elevated transition-all"
            >
              <SmilePlus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Floating action bar */}
      {showActions && !isEditing && (
        <div className="absolute right-4 -top-4 flex items-center gap-0.5 bg-bg-primary border border-bg-border rounded-xl px-1 py-0.5 shadow-popup animate-scale-in z-10">
          {/* Quick reactions */}
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="w-8 h-8 flex items-center justify-center text-base rounded-lg hover:bg-bg-elevated transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}

          <div className="w-px h-5 bg-bg-border mx-0.5" />

          {/* Reply */}
          <Tooltip content="Reply">
            <button
              onClick={() => onReply(message)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-elevated transition-colors"
            >
              <Reply className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Thread */}
          {message.channel_id && (
            <Tooltip content="Start Thread">
              <button
                onClick={handleStartThread}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-elevated transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Copy */}
          <Tooltip content={copied ? 'Copied!' : 'Copy'}>
            <button
              onClick={handleCopy}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-online" /> : <Copy className="w-4 h-4" />}
            </button>
          </Tooltip>

          {/* Edit / Delete (own messages) */}
          {isOwn && (
            <>
              <Tooltip content="Edit">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete">
                <button
                  onClick={handleDelete}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-dnd hover:bg-bg-elevated transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      )}

      {/* Inline emoji picker */}
      {showEmojiPicker && (
        <div className="absolute right-4 top-8 z-20 bg-bg-primary border border-bg-border rounded-xl p-3 shadow-popup animate-scale-in">
          <div className="grid grid-cols-6 gap-1">
            {['👍','👎','❤️','🔥','😂','🎉','😮','😢','🤔','✅','❌','🚀','⭐','💯','🙏','💪'].map(e => (
              <button
                key={e}
                onClick={() => handleReact(e)}
                className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-bg-elevated transition-colors ${
                  groupedReactions[e]?.hasReacted ? 'bg-brand-600/20' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageItem
