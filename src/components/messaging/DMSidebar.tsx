import React, { useEffect, useState } from 'react'
import { MessageSquare, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types'

interface DMConversationItem {
  id: string
  otherUser: Profile
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export const DMSidebar: React.FC = () => {
  const { user } = useAuthStore()
  const { activeDMConversationId, setActiveDM } = useAppStore()
  const [conversations, setConversations] = useState<DMConversationItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user?.id])

  const loadConversations = async () => {
    if (!user) return

    const { data: participantRows } = await supabase
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (!participantRows?.length) return

    const convIds = participantRows.map(p => p.conversation_id)
    const items: DMConversationItem[] = []

    for (const convId of convIds) {
      const { data: parts } = await supabase
        .from('dm_participants')
        .select('user_id, profile:profiles(*)')
        .eq('conversation_id', convId)
        .neq('user_id', user.id)

      const otherUser = parts?.[0]?.profile as unknown as Profile
      if (!otherUser) continue

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('dm_conversation_id', convId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      items.push({
        id: convId,
        otherUser,
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.created_at || null,
        unreadCount: 0,
      })
    }

    items.sort((a, b) => {
      if (!a.lastMessageAt) return 1
      if (!b.lastMessageAt) return -1
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })

    setConversations(items)
  }

  const handleSearch = async (query: string) => {
    setSearch(query)
    if (!query.trim()) { setSearchResults([]); return }

    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .neq('id', user!.id)
      .limit(10)

    setSearchResults(data || [])
    setSearching(false)
  }

  const startDMWith = async (targetUser: Profile) => {
    if (!user) return

    // Check for existing conversation
    for (const conv of conversations) {
      if (conv.otherUser.id === targetUser.id) {
        setActiveDM(conv.id)
        setSearch('')
        setSearchResults([])
        return
      }
    }

    // Create new
    const { data: conv } = await supabase
      .from('dm_conversations')
      .insert({})
      .select()
      .single()

    if (conv) {
      await supabase.from('dm_participants').insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: targetUser.id },
      ])
      setActiveDM(conv.id)
      setSearch('')
      setSearchResults([])
      loadConversations()
    }
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-bg-secondary flex flex-col border-r border-bg-border">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-bg-border">
        <h2 className="font-semibold text-text-primary text-sm mb-2">Direct Messages</h2>
        <Input
          placeholder="Find a conversation..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          icon={<Search className="w-3.5 h-3.5" />}
          className="text-xs py-2"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-3">
            <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Users
            </p>
            {searchResults.map(profile => (
              <button
                key={profile.id}
                onClick={() => startDMWith(profile)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  userId={profile.id}
                  size="sm"
                  status={profile.status}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-xs text-text-muted truncate">@{profile.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversations */}
        {conversations.length === 0 && !search && (
          <div className="px-4 py-6 text-center">
            <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs text-text-muted">No conversations yet</p>
            <p className="text-xs text-text-muted mt-1">Search for users to start chatting</p>
          </div>
        )}

        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => setActiveDM(conv.id)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left
              ${activeDMConversationId === conv.id
                ? 'bg-bg-active'
                : 'hover:bg-bg-hover'
              }
            `}
          >
            <Avatar
              src={conv.otherUser.avatar_url}
              name={conv.otherUser.display_name || conv.otherUser.username}
              userId={conv.otherUser.id}
              size="sm"
              status={conv.otherUser.status}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary truncate">
                  {conv.otherUser.display_name || conv.otherUser.username}
                </p>
                {conv.lastMessageAt && (
                  <span className="text-xs text-text-muted flex-shrink-0 ml-1">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-text-muted truncate">{conv.lastMessage}</p>
              )}
            </div>
            {conv.unreadCount > 0 && (
              <span className="flex-shrink-0 w-5 h-5 bg-dnd rounded-full flex items-center justify-center text-xs font-bold text-white">
                {conv.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  )
}

export default DMSidebar
