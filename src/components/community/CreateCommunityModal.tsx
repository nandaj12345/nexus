import React, { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { CommunityCategory } from '@/types'
import toast from 'react-hot-toast'

const CATEGORIES: { value: CommunityCategory; label: string; emoji: string; description: string }[] = [
  { value: 'gaming',      label: 'Gaming',      emoji: '🎮', description: 'Games, streamers & esports' },
  { value: 'friends',     label: 'Friends',     emoji: '👥', description: 'Your friend group' },
  { value: 'study',       label: 'Study',       emoji: '📚', description: 'Learning & education' },
  { value: 'programming', label: 'Programming', emoji: '💻', description: 'Code, dev, open source' },
  { value: 'creator',     label: 'Creator',     emoji: '🎨', description: 'Art, music & content' },
  { value: 'other',       label: 'Other',       emoji: '🌐', description: 'Something else' },
]

const DEFAULT_CHANNELS = {
  gaming:      ['welcome', 'general', 'gaming-chat', 'announcements', 'media'],
  friends:     ['welcome', 'general', 'random', 'announcements', 'photos'],
  study:       ['welcome', 'general', 'resources', 'announcements', 'help'],
  programming: ['welcome', 'general', 'code-review', 'announcements', 'showcase'],
  creator:     ['welcome', 'general', 'feedback', 'announcements', 'showcase'],
  other:       ['welcome', 'general', 'announcements', 'media'],
}

interface Props { onClose: () => void }

export const CreateCommunityModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState<'category' | 'details'>('category')
  const [category, setCategory] = useState<CommunityCategory | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const { user } = useAuthStore()
  const { addCommunity, setActiveCommunity, addChannel } = useAppStore()

  const handleCreate = async () => {
    if (!user || !category || !name.trim()) return
    setLoading(true)

    try {
      // Create community
      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error || !community) {
        toast.error('Failed to create community')
        return
      }

      // Add owner as member
      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: user.id,
        role: 'owner',
      })

      // Create default text channels
      const channelNames = DEFAULT_CHANNELS[category]
      const channelInserts = channelNames.map((name, i) => ({
        community_id: community.id,
        name,
        type: 'text' as const,
        position: i,
      }))

      const { data: createdChannels } = await supabase
        .from('channels')
        .insert(channelInserts)
        .select()

      // Add lounge voice channel
      const { data: voiceChannel } = await supabase
        .from('channels')
        .insert({
          community_id: community.id,
          name: 'lounge',
          type: 'voice',
          position: channelNames.length,
        })
        .select()
        .single()

      addCommunity(community)
      createdChannels?.forEach(c => addChannel(c))
      if (voiceChannel) addChannel(voiceChannel)

      setActiveCommunity(community.id)
      toast.success(`${community.name} created!`)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={step === 'category' ? 'Create a Community' : `${category ? CATEGORIES.find(c => c.value === category)?.emoji : ''} ${name || 'New Community'}`} size="lg">
      {step === 'category' ? (
        <div>
          <p className="text-text-muted text-sm mb-4">
            What best describes your community? This helps set up the right channels.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`
                  flex items-start gap-3 p-3 rounded-xl border transition-all text-left
                  ${category === cat.value
                    ? 'border-brand-500 bg-brand-600/10 text-text-primary'
                    : 'border-bg-border hover:border-bg-hover bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
          <Button
            fullWidth
            disabled={!category}
            onClick={() => setStep('details')}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4 p-3 bg-bg-tertiary rounded-xl">
            <span className="text-3xl">{CATEGORIES.find(c => c.value === category)?.emoji}</span>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {CATEGORIES.find(c => c.value === category)?.label} Community
              </p>
              <p className="text-xs text-text-muted">
                Starter channels: {DEFAULT_CHANNELS[category!].map(c => `#${c}`).join(', ')}, 🔊 lounge
              </p>
            </div>
          </div>

          <Input
            label="Community name"
            placeholder="My awesome community"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="What's this community about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep('category')} className="flex-1">
              Back
            </Button>
            <Button
              loading={loading}
              disabled={!name.trim()}
              onClick={handleCreate}
              className="flex-1"
            >
              Create Community
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default CreateCommunityModal
