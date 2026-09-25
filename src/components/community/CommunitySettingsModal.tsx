import React, { useState } from 'react'
import { Copy, Trash2, Check, Shield, Users, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import type { Community, ModerationAction } from '@/types'
import toast from 'react-hot-toast'
import { formatRelativeTime } from '@/lib/utils'

type Tab = 'overview' | 'members' | 'modlog'

interface Props {
  community: Community
  onClose: () => void
}

export const CommunitySettingsModal: React.FC<Props> = ({ community, onClose }) => {
  const [tab, setTab] = useState<Tab>('overview')
  const [name, setName] = useState(community.name)
  const [description, setDescription] = useState(community.description || '')
  const [saving, setSaving] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [modLog, setModLog] = useState<ModerationAction[]>([])
  const [modLogLoaded, setModLogLoaded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { user } = useAuthStore()
  const { updateCommunity, removeCommunity, members } = useAppStore()
  const communityMembers = members[community.id] || []

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('communities')
      .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', community.id)

    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    updateCommunity(community.id, { name: name.trim(), description: description.trim() || null })
    toast.success('Settings saved')
  }

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invite=${community.invite_code}`
    navigator.clipboard.writeText(link)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
    toast.success('Invite link copied!')
  }

  const handleDeleteCommunity = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    const { error } = await supabase.from('communities').delete().eq('id', community.id)
    if (error) { toast.error('Failed to delete community'); return }
    removeCommunity(community.id)
    toast.success('Community deleted')
    onClose()
  }

  const loadModLog = async () => {
    if (modLogLoaded) return
    const { data } = await supabase
      .from('moderation_actions')
      .select('*, moderator:profiles!moderator_id(*), target_user:profiles!target_user_id(*)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setModLog(data || [])
    setModLogLoaded(true)
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'modlog') loadModLog()
  }

  const inviteUrl = `${window.location.origin}?invite=${community.invite_code}`

  const ACTION_COLOR: Record<string, string> = {
    kick: 'text-idle', ban: 'text-dnd', unban: 'text-online',
    mute: 'text-text-muted', unmute: 'text-online', warn: 'text-idle',
  }

  return (
    <Modal open onClose={onClose} title={`${community.name} Settings`} size="xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-bg-border -mt-2 pb-0">
        {(['overview', 'members', 'modlog'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`
              px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors
              ${tab === t
                ? 'border-brand-500 text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
              }
            `}
          >
            {t === 'modlog' ? 'Mod Log' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <Input label="Community name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
              Invite Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-bg-tertiary border border-bg-border rounded-xl px-3 py-2.5 text-sm text-text-secondary truncate">
                {inviteUrl}
              </div>
              <Button variant="secondary" onClick={copyInviteLink} icon={copiedInvite ? <Check className="w-4 h-4 text-online" /> : <Copy className="w-4 h-4" />}>
                {copiedInvite ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1">Code: <code className="bg-bg-elevated px-1 rounded font-mono">{community.invite_code}</code></p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Save Changes</Button>
          </div>

          <div className="border-t border-bg-border pt-4">
            <h3 className="text-sm font-semibold text-dnd mb-2">Danger Zone</h3>
            <Button
              variant="danger"
              onClick={handleDeleteCommunity}
              icon={<Trash2 className="w-4 h-4" />}
            >
              {confirmDelete ? 'Click again to confirm deletion' : 'Delete Community'}
            </Button>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-2">
          {communityMembers.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-6">No members found</p>
          ) : (
            communityMembers.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg-elevated transition-colors">
                <Avatar
                  src={member.profile?.avatar_url}
                  name={member.profile?.display_name || member.profile?.username || '?'}
                  userId={member.user_id}
                  size="sm"
                  status={member.profile?.status}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {member.profile?.display_name || member.profile?.username}
                  </p>
                  <p className="text-xs text-text-muted capitalize">{member.role}</p>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {member.is_muted && <span className="px-1.5 py-0.5 bg-idle/20 text-idle rounded-full">Muted</span>}
                  {member.is_banned && <span className="px-1.5 py-0.5 bg-dnd/20 text-dnd rounded-full">Banned</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'modlog' && (
        <div className="space-y-2">
          {modLog.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-text-muted text-sm">No moderation actions yet</p>
            </div>
          ) : (
            modLog.map(action => (
              <div key={action.id} className="flex items-start gap-3 p-3 rounded-xl bg-bg-tertiary border border-bg-border">
                <div className={`text-sm font-semibold capitalize min-w-12 ${ACTION_COLOR[action.action] || 'text-text-muted'}`}>
                  {action.action}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">
                      {(action as any).target_user?.username || 'Unknown'}
                    </span>
                    {' '}by{' '}
                    <span className="font-medium text-brand-400">
                      {(action as any).moderator?.username || 'Unknown'}
                    </span>
                  </p>
                  {action.reason && <p className="text-xs text-text-muted mt-0.5">{action.reason}</p>}
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {formatRelativeTime(action.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  )
}

export default CommunitySettingsModal
