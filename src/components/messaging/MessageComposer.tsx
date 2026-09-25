import React, { useState, useRef, useCallback } from 'react'
import {
  Send, Paperclip, Smile, X, Image as ImageIcon,
  AtSign, Reply
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useMessageStore } from '@/store/messageStore'
import type { Message } from '@/types'
import toast from 'react-hot-toast'

interface MessageComposerProps {
  channelId?: string
  dmConversationId?: string
  threadId?: string
  placeholder?: string
  replyTo?: Message | null
  onCancelReply?: () => void
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '🤔', '✅', '😊', '🚀']

export const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  dmConversationId,
  threadId,
  placeholder = 'Send a message...',
  replyTo,
  onCancelReply,
}) => {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuthStore()
  const { sendMessage } = useMessageStore()

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const handleSend = async () => {
    if ((!content.trim() && !attachments.length) || !user) return
    if (sending) return

    setSending(true)
    const targetId = channelId || dmConversationId
    if (!targetId) { setSending(false); return }

    const { error } = await sendMessage({
      channelId,
      dmConversationId,
      threadId,
      content: content.trim() || (attachments.length ? '[File attachment]' : ''),
      authorId: user.id,
      replyToId: replyTo?.id,
      attachments: attachments.length ? attachments : undefined,
    })

    if (error) {
      toast.error('Failed to send message')
    } else {
      setContent('')
      setAttachments([])
      onCancelReply?.()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size < 10 * 1024 * 1024) // 10MB limit
    if (valid.length < files.length) {
      toast.error('Some files exceeded 10MB and were skipped')
    }
    setAttachments(prev => [...prev, ...valid])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setAttachments(prev => [...prev, ...files])
  }, [])

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newContent = content.slice(0, start) + emoji + content.slice(end)
    setContent(newContent)
    setShowEmoji(false)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const insertMention = () => {
    setContent(prev => prev + '@')
    textareaRef.current?.focus()
  }

  return (
    <div
      className={`px-4 pb-4 ${isDragging ? 'opacity-80' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-bg-elevated rounded-t-xl border-t border-l border-r border-bg-border">
          <Reply className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-brand-400 font-medium">
              Replying to {replyTo.author?.display_name || replyTo.author?.username}
            </span>
            <p className="text-xs text-text-muted truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-0.5 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-3 py-2 bg-bg-elevated rounded-xl border border-bg-border">
          {attachments.map((file, i) => (
            <div key={i} className="relative group">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-bg-tertiary rounded-lg flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">📎</span>
                  <span className="text-xs text-text-muted truncate px-1 w-full text-center">{file.name}</span>
                </div>
              )}
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-dnd rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main composer */}
      <div className={`
        flex items-end gap-2 bg-bg-elevated rounded-xl border border-bg-border px-3 py-2
        focus-within:border-brand-500/50 transition-colors
        ${isDragging ? 'border-brand-500 bg-brand-600/5' : ''}
        ${replyTo ? 'rounded-tl-none rounded-tr-none border-t-0' : ''}
      `}>
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-border transition-all"
          title="Attach files"
        >
          <Paperclip className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => { setContent(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none resize-none py-1.5 leading-relaxed min-h-[36px] max-h-[200px]"
        />

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Mention */}
          <button
            onClick={insertMention}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-border transition-all"
            title="Mention"
          >
            <AtSign className="w-[18px] h-[18px]" />
          </button>

          {/* Emoji picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1.5 rounded-lg text-text-muted hover:text-idle hover:bg-bg-border transition-all"
              title="Emoji"
            >
              <Smile className="w-[18px] h-[18px]" />
            </button>

            {showEmoji && (
              <div className="absolute bottom-10 right-0 bg-bg-primary border border-bg-border rounded-xl p-3 shadow-popup animate-scale-in z-50">
                <div className="grid grid-cols-5 gap-1">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-bg-elevated transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !attachments.length) || sending}
            className={`
              p-1.5 rounded-lg transition-all
              ${content.trim() || attachments.length
                ? 'text-brand-400 hover:text-brand-300 hover:bg-bg-border'
                : 'text-text-muted cursor-not-allowed opacity-50'
              }
            `}
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-x-4 bottom-16 flex items-center justify-center h-16 border-2 border-dashed border-brand-500 rounded-xl bg-brand-600/5 pointer-events-none">
          <p className="text-brand-400 text-sm font-medium">Drop files to attach</p>
        </div>
      )}
    </div>
  )
}

export default MessageComposer
