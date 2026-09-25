import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Message, Reaction, Attachment } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface MessageState {
  messages: Record<string, Message[]>      // channelId or dmId -> messages
  loading: Record<string, boolean>
  hasMore: Record<string, boolean>
  subscriptions: Record<string, RealtimeChannel>

  loadMessages: (targetId: string, type: 'channel' | 'dm', before?: string) => Promise<void>
  sendMessage: (params: {
    channelId?: string
    dmConversationId?: string
    content: string
    authorId: string
    replyToId?: string
    threadId?: string
    attachments?: File[]
  }) => Promise<{ error: string | null }>

  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string, targetId: string) => Promise<void>
  addReaction: (messageId: string, userId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, userId: string, emoji: string) => Promise<void>

  subscribeToChannel: (channelId: string) => void
  unsubscribeFromChannel: (channelId: string) => void
  subscribeToThread: (threadId: string) => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  loading: {},
  hasMore: {},
  subscriptions: {},

  loadMessages: async (targetId, type, before) => {
    if (get().loading[targetId]) return

    set(state => ({ loading: { ...state.loading, [targetId]: true } }))

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          author:profiles(*),
          reply_to:messages!reply_to_id(*, author:profiles(*)),
          reactions(*,user:profiles(id,username,avatar_url)),
          attachments(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (type === 'channel') {
        query = query.eq('channel_id', targetId).is('thread_id', null)
      } else {
        query = query.eq('dm_conversation_id', targetId)
      }

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query
      if (error) throw error

      const newMessages = (data || []).reverse()

      set(state => {
        const existing = before ? (state.messages[targetId] || []) : []
        return {
          messages: {
            ...state.messages,
            [targetId]: before ? [...newMessages, ...existing] : newMessages,
          },
          hasMore: {
            ...state.hasMore,
            [targetId]: (data || []).length === 50,
          },
        }
      })
    } finally {
      set(state => ({ loading: { ...state.loading, [targetId]: false } }))
    }
  },

  sendMessage: async ({ channelId, dmConversationId, content, authorId, replyToId, threadId, attachments }) => {
    const payload: Record<string, unknown> = {
      author_id: authorId,
      content,
      ...(channelId && { channel_id: channelId }),
      ...(dmConversationId && { dm_conversation_id: dmConversationId }),
      ...(replyToId && { reply_to_id: replyToId }),
      ...(threadId && { thread_id: threadId }),
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(payload)
      .select(`*, author:profiles(*), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)`)
      .single()

    if (error) return { error: error.message }

    // Upload attachments
    if (attachments?.length) {
      for (const file of attachments) {
        const path = `${authorId}/${Date.now()}-${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file)

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          await supabase.from('attachments').insert({
            message_id: message.id,
            url: urlData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
          })
        }
      }

      // Re-fetch with attachments
      const { data: fullMessage } = await supabase
        .from('messages')
        .select(`*, author:profiles(*), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)`)
        .eq('id', message.id)
        .single()

      if (fullMessage) {
        const targetId = channelId || dmConversationId!
        set(state => ({
          messages: {
            ...state.messages,
            [targetId]: [
              ...(state.messages[targetId] || []).filter(m => m.id !== fullMessage.id),
              fullMessage,
            ]
          }
        }))
      }
    }

    return { error: null }
  },

  editMessage: async (messageId, content) => {
    const { error } = await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', messageId)

    if (!error) {
      set(state => {
        const newMessages = { ...state.messages }
        for (const key in newMessages) {
          newMessages[key] = newMessages[key].map(m =>
            m.id === messageId
              ? { ...m, content, edited_at: new Date().toISOString() }
              : m
          )
        }
        return { messages: newMessages }
      })
    }
  },

  deleteMessage: async (messageId, targetId) => {
    await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)

    set(state => ({
      messages: {
        ...state.messages,
        [targetId]: (state.messages[targetId] || []).filter(m => m.id !== messageId)
      }
    }))
  },

  addReaction: async (messageId, userId, emoji) => {
    const { error } = await supabase
      .from('reactions')
      .upsert({ message_id: messageId, user_id: userId, emoji })

    if (!error) {
      set(state => {
        const newMessages = { ...state.messages }
        for (const key in newMessages) {
          newMessages[key] = newMessages[key].map(m => {
            if (m.id !== messageId) return m
            const reactions = m.reactions || []
            const existing = reactions.find(r => r.emoji === emoji && r.user_id === userId)
            if (existing) return m
            return {
              ...m,
              reactions: [...reactions, { id: crypto.randomUUID(), message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString() }]
            }
          })
        }
        return { messages: newMessages }
      })
    }
  },

  removeReaction: async (messageId, userId, emoji) => {
    await supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)

    set(state => {
      const newMessages = { ...state.messages }
      for (const key in newMessages) {
        newMessages[key] = newMessages[key].map(m => {
          if (m.id !== messageId) return m
          return {
            ...m,
            reactions: (m.reactions || []).filter(r => !(r.emoji === emoji && r.user_id === userId))
          }
        })
      }
      return { messages: newMessages }
    })
  },

  subscribeToChannel: (channelId) => {
    const { subscriptions } = get()
    if (subscriptions[channelId]) return

    const channel = supabase
      .channel(`channel:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        // Fetch full message with joins
        const { data } = await supabase
          .from('messages')
          .select(`*, author:profiles(*), reply_to:messages!reply_to_id(*, author:profiles(*)), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)`)
          .eq('id', payload.new.id)
          .single()

        if (data && !data.thread_id) {
          set(state => ({
            messages: {
              ...state.messages,
              [channelId]: [...(state.messages[channelId] || []).filter(m => m.id !== data.id), data]
            }
          }))
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        if (payload.new.is_deleted) {
          set(state => ({
            messages: {
              ...state.messages,
              [channelId]: (state.messages[channelId] || []).filter(m => m.id !== payload.new.id)
            }
          }))
        } else {
          set(state => ({
            messages: {
              ...state.messages,
              [channelId]: (state.messages[channelId] || []).map(m =>
                m.id === payload.new.id ? { ...m, ...payload.new } : m
              )
            }
          }))
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reactions',
      }, async (payload) => {
        const { data } = await supabase
          .from('reactions')
          .select('*, user:profiles(id,username,avatar_url)')
          .eq('id', payload.new.id)
          .single()

        if (data) {
          set(state => {
            const newMessages = { ...state.messages }
            for (const key in newMessages) {
              newMessages[key] = newMessages[key].map(m => {
                if (m.id !== data.message_id) return m
                const reactions = m.reactions || []
                if (reactions.find(r => r.id === data.id)) return m
                return { ...m, reactions: [...reactions, data] }
              })
            }
            return { messages: newMessages }
          })
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'reactions',
      }, (payload) => {
        set(state => {
          const newMessages = { ...state.messages }
          for (const key in newMessages) {
            newMessages[key] = newMessages[key].map(m => ({
              ...m,
              reactions: (m.reactions || []).filter(r => r.id !== payload.old.id)
            }))
          }
          return { messages: newMessages }
        })
      })
      .subscribe()

    set(state => ({
      subscriptions: { ...state.subscriptions, [channelId]: channel }
    }))
  },

  unsubscribeFromChannel: (channelId) => {
    const { subscriptions } = get()
    const sub = subscriptions[channelId]
    if (sub) {
      supabase.removeChannel(sub)
      set(state => {
        const newSubs = { ...state.subscriptions }
        delete newSubs[channelId]
        return { subscriptions: newSubs }
      })
    }
  },

  subscribeToThread: (threadId) => {
    const { subscriptions } = get()
    if (subscriptions[`thread:${threadId}`]) return

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select(`*, author:profiles(*), reactions(*,user:profiles(id,username,avatar_url)), attachments(*)`)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          set(state => ({
            messages: {
              ...state.messages,
              [threadId]: [...(state.messages[threadId] || []).filter(m => m.id !== data.id), data]
            }
          }))
        }
      })
      .subscribe()

    set(state => ({
      subscriptions: { ...state.subscriptions, [`thread:${threadId}`]: channel }
    }))
  },
}))
