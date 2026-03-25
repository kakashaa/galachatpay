import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  chatRoomId: string;
  adminUsername: string;
  adminDisplayName: string;
  onClose: () => void;
}

interface CallState {
  id: string;
  room_id: string;
  chat_room_id: string;
  started_by: string;
  started_by_name: string;
  status: string;
  participants: string[];
  created_at: string;
}

const ZEGO_APP_ID = 1095905537;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getColor = (name: string): string => {
  const colors = ['#4A90D9', '#50C878', '#9B59B6', '#F5A623', '#E74C3C', '#00BCD4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const GroupVoiceCall: React.FC<Props> = ({ chatRoomId, adminUsername, adminDisplayName, onClose }) => {
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const zegoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Listen for active call in this chat room
  useEffect(() => {
    const fetchActiveCall = async () => {
      const { data } = await supabase
        .from('admin_calls' as any)
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && (data as any[]).length > 0) {
        setCallState((data as any[])[0]);
      }
    };
    fetchActiveCall();

    const channel = supabase
      .channel(`call_${chatRoomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_calls',
        filter: `chat_room_id=eq.${chatRoomId}`,
      }, (payload) => {
        const newData = payload.new as CallState;
        if (newData.status === 'active') {
          setCallState(newData);
        } else if (newData.status === 'ended') {
          setCallState(null);
          handleLeaveCall(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatRoomId]);

  // Call duration timer
  useEffect(() => {
    if (inCall) {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [inCall]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getToken = async (): Promise<{ token: string; app_id: number }> => {
    const { data, error } = await supabase.functions.invoke('zego-token', {
      body: { user_id: adminUsername, room_id: `call_${chatRoomId}` },
    });
    if (error) throw error;
    return data;
  };

  const startCall = async () => {
    setConnecting(true);
    try {
      const { token } = await getToken();

      // Dynamic import of ZegoExpressEngine
      const { ZegoExpressEngine } = await import('zego-express-engine-webrtc');
      const zg = new ZegoExpressEngine(ZEGO_APP_ID, 'wss://webliveroom-api.zego.im/ws');
      zegoRef.current = zg;

      const roomId = `call_${chatRoomId}`;

      // Login to room
      await zg.loginRoom(roomId, token, { userID: adminUsername, userName: adminDisplayName });

      // Create & publish audio stream
      const localStream = await zg.createStream({ camera: { video: false, audio: true } });
      streamRef.current = localStream;
      await zg.startPublishingStream(`${adminUsername}_audio`, localStream);

      // Listen for remote streams
      zg.on('roomStreamUpdate', async (rId: string, updateType: string, streamList: any[]) => {
        if (updateType === 'ADD') {
          for (const stream of streamList) {
            const remoteStream = await zg.startPlayingStream(stream.streamID);
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.play().catch(() => {});
          }
        }
      });

      // Create or update call record
      if (!callState) {
        const { data } = await supabase
          .from('admin_calls' as any)
          .insert({
            room_id: roomId,
            chat_room_id: chatRoomId,
            started_by: adminUsername,
            started_by_name: adminDisplayName,
            status: 'active',
            participants: [adminUsername],
          } as any)
          .select()
          .single();
        if (data) setCallState(data as any);
      } else {
        const updatedParticipants = [...new Set([...callState.participants, adminUsername])];
        await supabase
          .from('admin_calls' as any)
          .update({ participants: updatedParticipants } as any)
          .eq('id', callState.id);
      }

      setInCall(true);
      toast.success('تم الانضمام للمكالمة');
    } catch (err) {
      console.error('Call error:', err);
      toast.error('فشل بدء المكالمة');
    }
    setConnecting(false);
  };

  const handleLeaveCall = useCallback(async (silent = false) => {
    try {
      if (zegoRef.current) {
        zegoRef.current.stopPublishingStream(`${adminUsername}_audio`);
        if (streamRef.current) {
          zegoRef.current.destroyStream(streamRef.current);
          streamRef.current = null;
        }
        zegoRef.current.logoutRoom(`call_${chatRoomId}`);
        zegoRef.current = null;
      }
    } catch {}

    if (callState) {
      const updatedParticipants = callState.participants.filter(p => p !== adminUsername);
      if (updatedParticipants.length === 0) {
        await supabase
          .from('admin_calls' as any)
          .update({ status: 'ended', ended_at: new Date().toISOString(), participants: [] } as any)
          .eq('id', callState.id);
      } else {
        await supabase
          .from('admin_calls' as any)
          .update({ participants: updatedParticipants } as any)
          .eq('id', callState.id);
      }
    }

    setInCall(false);
    if (!silent) {
      toast.success('تم إنهاء المكالمة');
      onClose();
    }
  }, [adminUsername, callState, chatRoomId, onClose]);

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const endCallForAll = async () => {
    if (callState) {
      await supabase
        .from('admin_calls' as any)
        .update({ status: 'ended', ended_at: new Date().toISOString(), participants: [] } as any)
        .eq('id', callState.id);
    }
    handleLeaveCall(true);
    onClose();
    toast.success('تم إنهاء المكالمة للجميع');
  };

  const participants = callState?.participants || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
    >
      <div className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden" style={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (inCall) handleLeaveCall(); else onClose(); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X className="w-4 h-4 text-white/60" />
            </button>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-white/60 font-bold uppercase tracking-wider">مكالمة جماعية</span>
            </div>
            <div className="w-8" />
          </div>

          {inCall && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-mono text-emerald-400 mb-2">
              {formatDuration(callDuration)}
            </motion.div>
          )}

          {!inCall && !callState && (
            <p className="text-sm text-white/50 mb-2">ابدأ مكالمة صوتية مع الأدمنز</p>
          )}

          {!inCall && callState && (
            <div className="mb-2">
              <p className="text-sm text-emerald-400 font-bold">مكالمة نشطة</p>
              <p className="text-xs text-white/40">بدأها {callState.started_by_name || callState.started_by}</p>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              {participants.length > 0 ? `${participants.length} في المكالمة` : 'لا أحد في المكالمة'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center min-h-[60px]">
            <AnimatePresence>
              {participants.map(p => (
                <motion.div
                  key={p}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: getColor(p) }}>
                      {getInitials(p)}
                    </div>
                    {/* Pulsing ring for active */}
                    <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ border: `2px solid ${getColor(p)}` }} />
                  </div>
                  <span className="text-[9px] text-white/50 font-bold">{p === adminUsername ? 'أنت' : p}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {participants.length === 0 && (
              <div className="flex items-center justify-center w-full">
                <Phone className="w-8 h-8 text-white/10" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-6 pt-2">
          {!inCall ? (
            <div className="flex justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startCall}
                disabled={connecting}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                <Phone className="w-5 h-5" />
                {connecting ? 'جاري الاتصال...' : callState ? 'انضم للمكالمة' : 'ابدأ المكالمة'}
              </motion.button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: muted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)' }}
              >
                {muted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-white/80" />}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleLeaveCall()}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>

              {callState?.started_by === adminUsername && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={endCallForAll}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <X className="w-6 h-6 text-red-400" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GroupVoiceCall;
