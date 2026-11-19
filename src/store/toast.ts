import { create } from 'zustand';

export interface Toast { id: number; tone: 'success' | 'error' | 'info'; message: string }
interface ToastState { toasts: Toast[]; push: (message: string, tone?: Toast['tone']) => void; dismiss: (id: number) => void }

let seq = 0;
export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++seq;
    set({ toasts: [...get().toasts, { id, tone, message }] });
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
export const toast = (message: string, tone?: Toast['tone']) => useToast.getState().push(message, tone);
