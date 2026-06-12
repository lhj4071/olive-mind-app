import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user:    User | null;
  loaded:  boolean;
  setSession: (session: Session | null) => void;
  setLoaded:  (loaded: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user:    null,
  loaded:  false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoaded:  (loaded)  => set({ loaded }),
}));
