import React, { useState } from 'react'
import { Hash, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Community } from '@/types'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

export const JoinCommunityModal: React.FC<Props> = ({ onClose }) => {
  const [inviteCode, setInviteCode] = useState('')
  const [preview, setPreview] = useState<Community | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)

  const { user } = useAuthStore()
  const { addCommunity, setActiveCommunity } = useAppStore()

  const handleLookup = async () => {
    const code = inviteCode.trim()
    if (!code) return
    setLoading(true)
    setPreview(null)

    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('invite_code', code)
      .single()

    setLoading(false)
    if (error || !data) {
      toast.error('Invite code not found')
      return
    }
    setPreview(data)
  }

  const handleJoin = async () => {
    if (!preview || !user) return
    setJoining(true)

    // Check not already a member
    const { data: existing } = await supabase
      .from('community_members')
      .select('id, is_banned')
      .eq('community_id', preview.id)
      .eq('user_id', user.id)
      .single()

    if (existing?.is_banned) {
      toast.error('You are banned from this community')
      setJoining(false)
      return
    }

    if (existing) {
      // Already a member, just switch
      addCommunity(preview)
      setActiveCommunity(preview.id)
      toast.success(`Switched to ${preview.name}`)
      onClose()
      setJoining(false)
      return
    }

    const { error } = await supabase
      .from('community_members')
      .insert({
        community_id: preview.id,
        user_id: user.id,
        role: 'member',
      })

    setJoining(false)

    if (error) {
      toast.error('Failed to join community')
      return
    }

    addCommunity(preview)
    setActiveCommunity(preview.id)
    toast.success(`Joined ${preview.name}!`)
    onClose()
  }

  const CATEGORY_EMOJI: Record<string, string> = {
    gaming: '🎮', friends: '👥', study: '📚',
    programming: '💻', creator: '🎨', other: '🌐',
  }

  return (
    <Modal open onClose={onClose} title="Join a Community" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Enter an invite code to join a community.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value); setPreview(null) }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            icon={<Hash className="w-3.5 h-3.5" />}
            className="flex-1"
          />
          <Button
            onClick={handleLookup}
            loading={loading}
            variant="secondary"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {preview && (
          <div className="p-4 bg-bg-tertiary rounded-xl border border-bg-border animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center text-2xl">
                {CATEGORY_EMOJI[preview.category] || '🌐'}
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{preview.name}</h3>
                <p className="text-xs text-text-muted capitalize">{preview.category} Community</p>
              </div>
            </div>
            {preview.description && (
              <p className="text-sm text-text-secondary mb-3">{preview.description}</p>
            )}
            <Button fullWidth onClick={handleJoin} loading={joining}>
              Join {preview.name}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default JoinCommunityModal
