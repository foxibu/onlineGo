'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ChatMessage {
  id: number;
  room_id: string;
  sender: string;
  message: string;
  created_at: string;
}

interface ChatProps {
  roomId: string;
  nickname: string;
}

export default function Chat({ roomId, nickname }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(0);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data && data.length > 0) {
      setMessages(data);
      lastIdRef.current = data[data.length - 1].id;
    }
  };

  useEffect(() => {
    fetchMessages();

    // Realtime subscription (no filter - more reliable on Supabase Cloud)
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          // Client-side filter by room_id
          if (msg.room_id === roomId) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              lastIdRef.current = msg.id;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    // Polling fallback (every 3s) in case Realtime is not working
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .gt('id', lastIdRef.current)
        .order('created_at', { ascending: true })
        .limit(20);
      if (data && data.length > 0) {
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !existing.has(m.id));
          if (newMsgs.length === 0) return prev;
          lastIdRef.current = data[data.length - 1].id;
          return [...prev, ...newMsgs];
        });
      }
    }, 3000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setSendError('');
    setInput('');

    const { error } = await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender: nickname,
      message: text,
    });

    if (error) {
      setSendError('전송 실패');
      setInput(text); // restore input
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 lg:static bg-stone-800 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-stone-700 text-sm"
        title="채팅"
      >
        💬
      </button>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg flex flex-col h-60 lg:h-80">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
        <span className="text-xs font-medium text-stone-600">채팅</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-stone-400 hover:text-stone-600 text-xs"
        >
          닫기
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className={`font-medium ${msg.sender === nickname ? 'text-amber-700' : 'text-stone-800'}`}>
              {msg.sender}:
            </span>{' '}
            <span className="text-stone-600">{msg.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs text-stone-400 text-center py-4">아직 메시지가 없습니다</div>
        )}
      </div>
      {sendError && (
        <div className="text-xs text-red-500 px-3 py-1">{sendError}</div>
      )}
      <form onSubmit={handleSend} className="flex border-t border-stone-100">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="메시지 입력..."
          maxLength={200}
          className="flex-1 px-3 py-2 text-xs text-stone-800 bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-30"
        >
          전송
        </button>
      </form>
    </div>
  );
}
