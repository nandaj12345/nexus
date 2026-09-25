import React, { useState, useRef } from 'react'
import { Camera, LogOut, User, Bell, Shield, Palette } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

type Tab = 'profile' | 'status' | 'account'

interface Props { onClose: () => void }

const STATUS_OPTIONS: { value: 'online' | 'idle' | 'dnd' | 'offline'; label: string; color: string; description: string }[] = [
  { value: 'online',  label: 'Online',         color: 'bg-online',  description: 'Visible to others' },
  { value: 'idle',    label: 'Idle',            color: 'bg-idle',    description: 'Away for a while' },
  { value: 'dnd',     label: 'Do Not Disturb', color: 'bg-dnd',     description: 'No notifications' },
  { value: 'offline', label: 'Invisible',      color: 'bg-offline', description: 'Appear offline' },
]

export const UserSettingsModal: React.FC<Props> = ({ onClose }) => {
  const { user, updateProfile, uploadAvatar, signOut, setStatus } = useAuthStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveProfile = async () => {
    setSaving(true)
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      custom_status: customStatus.trim() || null,
    })
    setSaving(false)
    if (error) toast.error(error)
    else toast.success('Profile updated!')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Avatar must be under 2MB'); return }

    setUploadingAvatar(true)
    const { url, error } = await uploadAvatar(file)
    setUploadingAvatar(false)
    if (error) toast.error(error)
    else toast.success('Avatar updated!')
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  if (!user) return null

  return (
    <Modal open onClose={onClose} title="Settings" size="lg">
      <div className="flex gap-6 -mt-2">
        {/* Tab nav */}
        <div className="w-40 flex-shrink-0 space-y-0.5">
          {([
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
            { id: 'status',  label: 'Status',  icon: <div className="w-4 h-4 flex items-center justify-center"><div className={`w-2.5 h-2.5 rounded-full ${user.status === 'online' ? 'bg-online' : user.status === 'idle' ? 'bg-idle' : user.status === 'dnd' ? 'bg-dnd' : 'bg-offline'}`} /></div> },
            { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left
                ${tab === t.id
                  ? 'bg-bg-active text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
                }
              `}
            >
              {t.icon}
              {t.label}
            </button>
          ))}

          <div className="pt-4 border-t border-bg-border mt-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-dnd hover:bg-dnd/10 transition-all text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name || user.username}
                    userId={user.id}
                    size="xl"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{user.display_name || user.username}</p>
                  <p className="text-sm text-text-muted">@{user.username}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change avatar'}
                  </button>
                </div>
              </div>

              <Input
                label="Display Name"
                placeholder="How others see you"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">Username</label>
                <div className="px-4 py-2.5 bg-bg-tertiary border border-bg-border rounded-xl text-sm text-text-muted">
                  @{user.username}
                </div>
                <p className="text-xs text-text-muted mt-1">Username cannot be changed</p>
              </div>
              <Textarea
                label="Bio"
                placeholder="Tell people a bit about yourself"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSaveProfile} loading={saving} fullWidth>
                Save Changes
              </Button>
            </div>
          )}

          {tab === 'status' && (
            <div className="space-y-4">
              <Input
                label="Custom Status"
                placeholder="What are you up to?"
                value={customStatus}
                onChange={e => setCustomStatus(e.target.value)}
              />

              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Status
                </p>
                <div className="space-y-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                        ${user.status === opt.value
                          ? 'border-brand-500 bg-brand-600/10'
                          : 'border-bg-border bg-bg-tertiary hover:border-bg-hover'
                        }
                      `}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.color}`} />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                        <p className="text-xs text-text-muted">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveProfile} loading={saving} fullWidth>
                Save Status
              </Button>
            </div>
          )}

          {tab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-bg-tertiary rounded-xl border border-bg-border space-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Email</p>
                  <p className="text-sm text-text-primary">Hidden for security</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Account Created</p>
                  <p className="text-sm text-text-primary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">User ID</p>
                  <p className="text-xs font-mono text-text-muted break-all">{user.id}</p>
                </div>
              </div>

              <div className="border-t border-bg-border pt-4">
                <p className="text-sm font-medium text-text-secondary mb-3">Danger Zone</p>
                <Button
                  variant="danger"
                  onClick={handleSignOut}
                  icon={<LogOut className="w-4 h-4" />}
                  fullWidth
                >
                  Sign Out of All Devices
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default UserSettingsModal
