import { create } from "zustand";

type State = {
    state: 'visible' | 'hidden';
    setVisible: (visible: 'visible' | 'hidden') => void;
}

export const useTabVisibilityStore = create<State>((set) => ({
    state: 'visible',
    setVisible: (state) => set({ state }),
}));