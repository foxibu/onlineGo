'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ChatMessage {
  id: number;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing messages
    supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender: nickname,
      message: input.trim(),
    });

    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 lg:static bg-stone-800 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-stone-700 text-sm"
        title="Chat"
      >
        Chat
      </button>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg flex flex-col h-60 lg:h-80">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
        <span className="text-xs font-medium text-stone-600">Chat</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-stone-400 hover:text-stone-600 text-xs"
        >
          Close
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className="font-medium text-stone-800">{msg.sender}:</span>{' '}
            <span className="text-stone-600">{msg.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs text-stone-400 text-center py-4">No messages yet</div>
        )}
      </div>
      <form onSubmit={handleSend} className="flex border-t border-stone-100">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 px-3 py-2 text-xs text-stone-800 bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}
