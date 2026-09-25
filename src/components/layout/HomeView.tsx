import React, { useState } from 'react'
import { Plus, Hash, Users, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CreateCommunityModal } from '@/components/community/CreateCommunityModal'
import { JoinCommunityModal } from '@/components/community/JoinCommunityModal'

export const HomeView: React.FC = () => {
  const { user } = useAuthStore()
  const { communities, setActiveCommunity } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  return (
    <div className="flex-1 bg-bg-tertiary overflow-y-auto">
      {/* Hero */}
      <div className="px-8 pt-12 pb-8 border-b border-bg-border">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Avatar
              src={user?.avatar_url}
              name={user?.display_name || user?.username || '?'}
              userId={user?.id}
              size="lg"
              status={user?.status}
            />
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Welcome back, {user?.display_name || user?.username}!
              </h1>
              <p className="text-text-muted text-sm">
                {communities.length > 0
                  ? `You're in ${communities.length} ${communities.length === 1 ? 'community' : 'communities'}`
                  : 'Ready to build your community?'
                }
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreate(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Community
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowJoin(true)}
              icon={<Hash className="w-4 h-4" />}
            >
              Join via Invite
            </Button>
          </div>
        </div>
      </div>

      {/* Communities grid */}
      {communities.length > 0 ? (
        <div className="px-8 py-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Your Communities</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map(community => (
              <button
                key={community.id}
                onClick={() => setActiveCommunity(community.id)}
                className="group p-4 bg-bg-secondary border border-bg-border rounded-2xl text-left hover:border-brand-500/50 hover:bg-bg-elevated transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-xl">
                    {community.icon_url ? (
                      <img src={community.icon_url} alt={community.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      { gaming: '🎮', friends: '👥', study: '📚', programming: '💻', creator: '🎨', other: '🌐' }[community.category] || '🌐'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate group-hover:text-brand-300 transition-colors">
                      {community.name}
                    </p>
                    <p className="text-xs text-text-muted capitalize">{community.category}</p>
                  </div>
                </div>
                {community.description && (
                  <p className="text-xs text-text-muted line-clamp-2">{community.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-600/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Your Communities Await</h2>
          <p className="text-text-muted max-w-sm mb-8 text-sm leading-relaxed">
            Create your own community or join one with an invite link. Bring your people together.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={() => setShowCreate(true)}
              icon={<Plus className="w-5 h-5" />}
            >
              Create Community
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowJoin(true)}
              icon={<Hash className="w-5 h-5" />}
            >
              Join Community
            </Button>
          </div>
        </div>
      )}

      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}

export default HomeView
