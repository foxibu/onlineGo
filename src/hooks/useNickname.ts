'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'go_nickname';

export function useNickname() {
  const [nickname, setNicknameState] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setNicknameState(stored);
    setLoaded(true);
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    localStorage.setItem(STORAGE_KEY, name);
  }, []);

  return { nickname, setNickname, loaded };
}
