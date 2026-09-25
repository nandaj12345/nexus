import React, { useState } from 'react'
import { Hash, Volume2, Megaphone, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { ChannelType } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  communityId: string
  onClose: () => void
}

const CHANNEL_TYPES: { type: ChannelType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'text',         label: 'Text Channel',         icon: <Hash className="w-5 h-5" />,      description: 'Send messages and files' },
  { type: 'voice',        label: 'Voice Channel',        icon: <Volume2 className="w-5 h-5" />,   description: 'Talk with voice & video' },
  { type: 'announcement', label: 'Announcement Channel', icon: <Megaphone className="w-5 h-5" />, description: 'Post important updates' },
]

export const CreateChannelModal: React.FC<Props> = ({ communityId, onClose }) => {
  const [channelType, setChannelType] = useState<ChannelType>('text')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)

  const { channels, addChannel, setActiveChannel } = useAppStore()

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)

    const position = (channels[communityId] || []).length

    const { data, error } = await supabase
      .from('channels')
      .insert({
        community_id: communityId,
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type: channelType,
        topic: topic.trim() || null,
        is_private: isPrivate,
        position,
      })
      .select()
      .single()

    setLoading(false)

    if (error) { toast.error('Failed to create channel'); return }
    addChannel(data)
    setActiveChannel(data.id)
    toast.success(`#${data.name} created`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Create Channel" size="md">
      <div className="space-y-5">
        {/* Type selection */}
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Channel Type
          </p>
          <div className="space-y-1.5">
            {CHANNEL_TYPES.map(ct => (
              <button
                key={ct.type}
                onClick={() => setChannelType(ct.type)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  ${channelType === ct.type
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-bg-border hover:border-bg-hover bg-bg-tertiary'
                  }
                `}
              >
                <span className={channelType === ct.type ? 'text-brand-400' : 'text-text-muted'}>
                  {ct.icon}
                </span>
                <div>
                  <p className={`text-sm font-medium ${channelType === ct.type ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {ct.label}
                  </p>
                  <p className="text-xs text-text-muted">{ct.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Channel Name"
          placeholder={channelType === 'voice' ? 'lounge' : 'general-chat'}
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
          icon={channelType === 'voice' ? <Volume2 className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
        />

        {channelType !== 'voice' && (
          <Input
            label="Topic (optional)"
            placeholder="What's this channel about?"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        )}

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-bg-tertiary border border-bg-border">
          <Lock className="w-4 h-4 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary">Private Channel</p>
            <p className="text-xs text-text-muted">Only specific members can access</p>
          </div>
          <div
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isPrivate ? 'bg-brand-600' : 'bg-bg-border'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button loading={loading} disabled={!name.trim()} onClick={handleCreate} className="flex-1">
            Create Channel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateChannelModal
