import { create } from 'zustand';

interface Toast {
  id: number;
  text: string;
  kind: 'success' | 'info' | 'error';
}

interface UIState {
  toasts: Toast[];
  pushToast: (text: string, kind?: Toast['kind']) => void;
  removeToast: (id: number) => void;

  selectedLineIds: string[];
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  estimationPanelLineId: string | null;
  openEstimationPanel: (id: string | null) => void;
  estimationBulkIds: string[] | null;
  openBulkEstimation: (ids: string[] | null) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  pushToast: (text, kind = 'success') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  selectedLineIds: [],
  toggleSelect: (id) =>
    set((s) => ({
      selectedLineIds: s.selectedLineIds.includes(id)
        ? s.selectedLineIds.filter((x) => x !== id)
        : [...s.selectedLineIds, id],
    })),
  clearSelection: () => set({ selectedLineIds: [] }),

  estimationPanelLineId: null,
  openEstimationPanel: (id) => set({ estimationPanelLineId: id }),
  estimationBulkIds: null,
  openBulkEstimation: (ids) => set({ estimationBulkIds: ids }),
}));
