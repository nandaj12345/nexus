import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Community, Channel, CommunityMember } from '@/types'
import { supabase } from '@/lib/supabase'

interface AppState {
  // Active selections
  activeCommunityId: string | null
  activeChannelId: string | null
  activeDMConversationId: string | null
  activeThreadId: string | null
  view: 'channel' | 'dm' | 'home'

  // Loaded data
  communities: Community[]
  channels: Record<string, Channel[]>      // communityId -> channels
  members: Record<string, CommunityMember[]> // communityId -> members

  // UI state
  rightSidebarOpen: boolean
  threadPanelOpen: boolean
  searchOpen: boolean
  notificationCount: number

  // Actions
  setActiveCommunity: (id: string | null) => void
  setActiveChannel: (id: string | null) => void
  setActiveDM: (id: string | null) => void
  setActiveThread: (id: string | null) => void
  setView: (view: AppState['view']) => void

  loadCommunities: (userId: string) => Promise<void>
  loadChannels: (communityId: string) => Promise<void>
  loadMembers: (communityId: string) => Promise<void>

  addCommunity: (community: Community) => void
  removeCommunity: (id: string) => void
  updateCommunity: (id: string, updates: Partial<Community>) => void

  addChannel: (channel: Channel) => void
  removeChannel: (id: string, communityId: string) => void
  updateChannel: (id: string, updates: Partial<Channel>) => void

  toggleRightSidebar: () => void
  toggleSearch: () => void
  setNotificationCount: (count: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeCommunityId: null,
      activeChannelId: null,
      activeDMConversationId: null,
      activeThreadId: null,
      view: 'home',

      communities: [],
      channels: {},
      members: {},

      rightSidebarOpen: true,
      threadPanelOpen: false,
      searchOpen: false,
      notificationCount: 0,

      setActiveCommunity: (id) => {
        set({ activeCommunityId: id, activeChannelId: null, view: 'channel' })
        if (id) {
          get().loadChannels(id)
          get().loadMembers(id)
        }
      },

      setActiveChannel: (id) => set({ activeChannelId: id, activeDMConversationId: null, view: 'channel' }),
      setActiveDM: (id) => set({ activeDMConversationId: id, activeChannelId: null, activeCommunityId: null, view: 'dm' }),
      setActiveThread: (id) => set({ activeThreadId: id, threadPanelOpen: !!id }),
      setView: (view) => set({ view }),

      loadCommunities: async (userId) => {
        const { data, error } = await supabase
          .from('community_members')
          .select('community_id, communities(*)')
          .eq('user_id', userId)
          .eq('is_banned', false)
          .order('joined_at', { ascending: true })

        if (error) { console.error('loadCommunities:', error); return }

        const communities = (data || [])
          .map((m: { community_id: string; communities: unknown }) => m.communities as Community)
          .filter(Boolean)

        set({ communities })
      },

      loadChannels: async (communityId) => {
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('community_id', communityId)
          .order('position', { ascending: true })

        if (error) { console.error('loadChannels:', error); return }

        set(state => ({
          channels: { ...state.channels, [communityId]: data || [] }
        }))

        // Auto-select first text channel if none selected
        const { activeChannelId } = get()
        if (!activeChannelId && data?.length) {
          const firstText = data.find(c => c.type === 'text')
          if (firstText) set({ activeChannelId: firstText.id })
        }
      },

      loadMembers: async (communityId) => {
        const { data, error } = await supabase
          .from('community_members')
          .select('*, profile:profiles(*)')
          .eq('community_id', communityId)
          .eq('is_banned', false)
          .order('role', { ascending: true })

        if (error) { console.error('loadMembers:', error); return }

        set(state => ({
          members: { ...state.members, [communityId]: data || [] }
        }))
      },

      addCommunity: (community) => {
        set(state => ({ communities: [...state.communities, community] }))
      },

      removeCommunity: (id) => {
        set(state => ({
          communities: state.communities.filter(c => c.id !== id),
          activeCommunityId: state.activeCommunityId === id ? null : state.activeCommunityId,
        }))
      },

      updateCommunity: (id, updates) => {
        set(state => ({
          communities: state.communities.map(c => c.id === id ? { ...c, ...updates } : c)
        }))
      },

      addChannel: (channel) => {
        set(state => ({
          channels: {
            ...state.channels,
            [channel.community_id]: [
              ...(state.channels[channel.community_id] || []),
              channel,
            ]
          }
        }))
      },

      removeChannel: (id, communityId) => {
        set(state => ({
          channels: {
            ...state.channels,
            [communityId]: (state.channels[communityId] || []).filter(c => c.id !== id)
          },
          activeChannelId: state.activeChannelId === id ? null : state.activeChannelId,
        }))
      },

      updateChannel: (id, updates) => {
        set(state => {
          const newChannels = { ...state.channels }
          for (const commId in newChannels) {
            newChannels[commId] = newChannels[commId].map(c => c.id === id ? { ...c, ...updates } : c)
          }
          return { channels: newChannels }
        })
      },

      toggleRightSidebar: () => set(state => ({ rightSidebarOpen: !state.rightSidebarOpen })),
      toggleSearch: () => set(state => ({ searchOpen: !state.searchOpen })),
      setNotificationCount: (count) => set({ notificationCount: count }),
    }),
    {
      name: 'nexus-app',
      partialize: (state) => ({
        activeCommunityId: state.activeCommunityId,
        rightSidebarOpen: state.rightSidebarOpen,
      }),
    }
  )
)
