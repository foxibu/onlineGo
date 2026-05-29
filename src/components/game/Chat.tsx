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
  hideToggle?: boolean;
}

export default function Chat({ roomId, nickname, hideToggle = false }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(hideToggle);
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
    if (hideToggle) return null;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 lg:static bg-go-s2 text-go-t2 border border-white/10 rounded-full w-10 h-10 flex items-center justify-center hover:bg-go-s3 hover:text-go-t1 transition-all text-sm"
        title="채팅"
      >
        💬
      </button>
    );
  }

  return (
    <div className="go-card flex flex-col h-60 lg:h-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/7">
        <span className="text-[11px] font-semibold text-go-t3 uppercase tracking-wider">채팅</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-go-t3 hover:text-go-t2 text-xs transition-colors"
        >
          닫기
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs leading-relaxed">
            <span className={`font-semibold ${msg.sender === nickname ? 'text-go-gold' : 'text-go-t2'}`}>
              {msg.sender}
            </span>
            <span className="text-go-t3 mx-1">·</span>
            <span className="text-go-t2">{msg.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs text-go-t3 text-center py-4">아직 메시지가 없습니다</div>
        )}
      </div>

      {sendError && (
        <div className="text-xs text-go-red px-3 py-1">{sendError}</div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex border-t border-white/7">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="메시지 입력..."
          maxLength={200}
          className="flex-1 px-3 py-2 text-xs text-go-t1 bg-transparent focus:outline-none placeholder:text-go-t3"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 text-xs font-medium text-go-gold hover:text-go-gold2 disabled:opacity-30 transition-colors"
        >
          전송
        </button>
      </form>
    </div>
  );
}
