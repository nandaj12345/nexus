import React, { useState, useEffect, useRef } from 'react'
import {
  Mic, MicOff, Volume2, VolumeX, PhoneOff, Phone,
  Users, Settings, Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Channel, VoiceParticipant } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  channel: Channel
}

interface LocalStream {
  stream: MediaStream | null
  isMuted: boolean
  isDeafened: boolean
}

export const VoiceChannel: React.FC<Props> = ({ channel }) => {
  const { user } = useAuthStore()
  const [joined, setJoined] = useState(false)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [localStream, setLocalStream] = useState<LocalStream>({ stream: null, isMuted: false, isDeafened: false })
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Load participants
  useEffect(() => {
    loadParticipants()

    const sub = supabase
      .channel(`voice:${channel.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_sessions',
        filter: `channel_id=eq.${channel.id}`,
      }, () => loadParticipants())
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [channel.id])

  const loadParticipants = async () => {
    const { data } = await supabase
      .from('voice_sessions')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channel.id)

    const parts: VoiceParticipant[] = (data || []).map(s => ({
      user_id: s.user_id,
      channel_id: s.channel_id,
      is_muted: s.is_muted,
      is_deafened: s.is_deafened,
      is_speaking: false,
      profile: s.profile,
    }))

    setParticipants(parts)
    setJoined(parts.some(p => p.user_id === user?.id))
  }

  const joinVoice = async () => {
    if (!user || loading) return
    setLoading(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      setLocalStream({ stream, isMuted: false, isDeafened: false })

      // Set up voice activity detection
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioContextRef.current = ctx
      analyserRef.current = analyser

      // Detect speaking
      const detectSpeaking = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setSpeaking(avg > 20)
        animFrameRef.current = requestAnimationFrame(detectSpeaking)
      }
      detectSpeaking()

      await supabase.from('voice_sessions').upsert({
        channel_id: channel.id,
        user_id: user.id,
        is_muted: false,
        is_deafened: false,
      })

      toast.success(`Joined ${channel.name}`)
      loadParticipants()
    } catch (err) {
      toast.error('Could not access microphone. Check permissions.')
    } finally {
      setLoading(false)
    }
  }

  const leaveVoice = async () => {
    if (!user) return

    // Clean up audio
    if (localStream.stream) {
      localStream.stream.getTracks().forEach(t => t.stop())
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()

    setLocalStream({ stream: null, isMuted: false, isDeafened: false })
    setSpeaking(false)

    await supabase.from('voice_sessions').delete()
      .eq('channel_id', channel.id)
      .eq('user_id', user.id)

    toast(`Left ${channel.name}`)
    loadParticipants()
  }

  const toggleMute = async () => {
    if (!user || !localStream.stream) return
    const newMuted = !localStream.isMuted
    localStream.stream.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    setLocalStream(prev => ({ ...prev, isMuted: newMuted }))
    await supabase.from('voice_sessions').update({ is_muted: newMuted })
      .eq('channel_id', channel.id).eq('user_id', user.id)
  }

  const toggleDeafen = async () => {
    if (!user) return
    const newDeafened = !localStream.isDeafened
    setLocalStream(prev => ({ ...prev, isDeafened: newDeafened }))
    await supabase.from('voice_sessions').update({ is_deafened: newDeafened })
      .eq('channel_id', channel.id).eq('user_id', user.id)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (joined) leaveVoice()
    }
  }, [])

  return (
    <div className="flex flex-col flex-1 bg-bg-tertiary min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border bg-bg-secondary flex-shrink-0">
        <Volume2 className="w-4 h-4 text-text-muted" />
        <h2 className="font-semibold text-text-primary">{channel.name}</h2>
        <span className="text-xs text-text-muted">Voice Channel</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-text-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{participants.length}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!joined ? (
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-6">
              <Volume2 className="w-10 h-10 text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">{channel.name}</h2>
            <p className="text-text-muted mb-6">
              {participants.length > 0
                ? `${participants.length} ${participants.length === 1 ? 'person' : 'people'} in this channel`
                : 'No one is here yet. Be the first to join!'
              }
            </p>

            {/* Preview of who's in voice */}
            {participants.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                {participants.slice(0, 5).map(p => (
                  <Avatar
                    key={p.user_id}
                    src={p.profile?.avatar_url}
                    name={p.profile?.display_name || p.profile?.username || '?'}
                    userId={p.user_id}
                    size="md"
                  />
                ))}
                {participants.length > 5 && (
                  <span className="text-text-muted text-sm">+{participants.length - 5} more</span>
                )}
              </div>
            )}

            <Button
              size="lg"
              onClick={joinVoice}
              loading={loading}
              icon={<Phone className="w-5 h-5" />}
              className="px-8"
            >
              Join Voice
            </Button>
            <p className="text-xs text-text-muted mt-3">
              Your microphone will be requested
            </p>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Participants grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {participants.map(p => {
                const isSelf = p.user_id === user?.id
                const isSpeaking = isSelf ? speaking : p.is_speaking

                return (
                  <div
                    key={p.user_id}
                    className={`
                      flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all
                      ${isSpeaking
                        ? 'border-online bg-online/10 shadow-[0_0_20px_rgba(59,206,111,0.2)]'
                        : 'border-bg-border bg-bg-elevated'
                      }
                    `}
                  >
                    <div className="relative">
                      <Avatar
                        src={p.profile?.avatar_url}
                        name={p.profile?.display_name || p.profile?.username || '?'}
                        userId={p.user_id}
                        size="xl"
                      />
                      {/* Speaking ring */}
                      {isSpeaking && (
                        <div className="absolute inset-0 rounded-full border-2 border-online animate-pulse-slow" />
                      )}
                      {/* Muted indicator */}
                      {(isSelf ? localStream.isMuted : p.is_muted) && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-dnd rounded-full flex items-center justify-center border-2 border-bg-tertiary">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-text-primary">
                        {p.profile?.display_name || p.profile?.username}
                        {isSelf && ' (you)'}
                      </p>
                      {p.is_deafened && (
                        <p className="text-xs text-text-muted">Deafened</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Tooltip content={localStream.isMuted ? 'Unmute' : 'Mute'}>
                <button
                  onClick={toggleMute}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${localStream.isMuted
                      ? 'bg-dnd hover:bg-dnd/80 text-white'
                      : 'bg-bg-elevated hover:bg-bg-hover text-text-primary border border-bg-border'
                    }
                  `}
                >
                  {localStream.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </Tooltip>

              <Tooltip content={localStream.isDeafened ? 'Undeafen' : 'Deafen'}>
                <button
                  onClick={toggleDeafen}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${localStream.isDeafened
                      ? 'bg-dnd hover:bg-dnd/80 text-white'
                      : 'bg-bg-elevated hover:bg-bg-hover text-text-primary border border-bg-border'
                    }
                  `}
                >
                  {localStream.isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </Tooltip>

              <Tooltip content="Leave voice">
                <button
                  onClick={leaveVoice}
                  className="w-12 h-12 rounded-full bg-dnd hover:bg-dnd/80 flex items-center justify-center text-white transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <p className="text-center text-xs text-text-muted mt-4">
              {localStream.isMuted ? '🔇 Muted' : speaking ? '🔊 Speaking' : '🎤 Connected'}
              {localStream.isDeafened && ' · 🔕 Deafened'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceChannel
