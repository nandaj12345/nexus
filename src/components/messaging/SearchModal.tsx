import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Hash, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { formatMessageDate, formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

interface SearchModalProps {
  channelId: string
  onClose: () => void
}

export const SearchModal: React.FC<SearchModalProps> = ({ channelId, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 2) { setResults([]); return }
      setLoading(true)

      const { data } = await supabase
        .from('messages')
        .select('*, author:profiles(*)')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(25)

      setResults(data || [])
      setLoading(false)
    }

    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [query, channelId])

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? `<mark class="bg-brand-600/30 text-brand-200 rounded px-0.5">${part}</mark>`
        : part
    ).join('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-bg-secondary border border-bg-border rounded-2xl shadow-popup animate-scale-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages in this channel..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-text-muted text-sm">No messages found for "{query}"</p>
            </div>
          )}

          {results.map(message => (
            <div
              key={message.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors cursor-pointer border-b border-bg-border/50 last:border-0"
            >
              <Avatar
                src={message.author?.avatar_url}
                name={message.author?.display_name || message.author?.username || '?'}
                userId={message.author?.id}
                size="sm"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {message.author?.display_name || message.author?.username}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatMessageDate(message.created_at)} at {formatMessageTime(message.created_at)}
                  </span>
                </div>
                <p
                  className="text-sm text-text-secondary leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatch(
                      message.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                      query
                    )
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {query.length < 2 && (
          <div className="px-4 py-6 text-center">
            <p className="text-text-muted text-sm">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchModal
