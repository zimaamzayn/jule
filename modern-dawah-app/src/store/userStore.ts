import { create } from 'zustand';

interface UserState {
  profile: {
    background: string;
    belief: string;
  } | null;
  setProfile: (profile: { background: string; belief: string }) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
