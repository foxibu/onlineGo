import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToPresence(
  roomId: string,
  nickname: string,
  onPresenceChange: (online: string[]) => void
): RealtimeChannel {
  const channel = supabase.channel(`room:${roomId}:presence`, {
    config: { presence: { key: nickname } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = Object.keys(state);
      onPresenceChange(online);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ nickname, online_at: new Date().toISOString() });
      }
    });

  return channel;
}

export function unsubscribePresence(channel: RealtimeChannel) {
  channel.unsubscribe();
}
