import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, Pitch, Campaign, Customer } from '@/types';

// ─── App Store ───────────────────────────────────────────────────────────────

interface AppState {
  sidebarCollapsed: boolean;
  darkMode: boolean;
  notifications: Notification[];
  searchQuery: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      darkMode: false,
      notifications: [],
      searchQuery: '',

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleDarkMode: () =>
        set((state) => {
          const newDarkMode = !state.darkMode;
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { darkMode: newDarkMode };
        }),
      setDarkMode: (dark) => {
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ darkMode: dark });
      },

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: crypto.randomUUID(),
              read: false,
              created_at: new Date().toISOString(),
            },
            ...state.notifications,
          ].slice(0, 50),
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'marketing-pitch-app',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        darkMode: state.darkMode,
      }),
    }
  )
);

// ─── Pitch Store ─────────────────────────────────────────────────────────────

interface PitchState {
  currentPitch: Pitch | null;
  generationProgress: number;
  isGenerating: boolean;
  isStreaming: boolean;
  streamedContent: string;
  selectedPitchIds: string[];

  setCurrentPitch: (pitch: Pitch | null) => void;
  setGenerationProgress: (progress: number) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  appendStreamedContent: (content: string) => void;
  resetStreamedContent: () => void;
  togglePitchSelection: (id: string) => void;
  clearPitchSelection: () => void;
}

export const usePitchStore = create<PitchState>((set) => ({
  currentPitch: null,
  generationProgress: 0,
  isGenerating: false,
  isStreaming: false,
  streamedContent: '',
  selectedPitchIds: [],

  setCurrentPitch: (pitch) => set({ currentPitch: pitch }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  setIsGenerating: (generating) =>
    set({ isGenerating: generating, generationProgress: generating ? 0 : 100 }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  appendStreamedContent: (content) =>
    set((state) => ({ streamedContent: state.streamedContent + content })),
  resetStreamedContent: () => set({ streamedContent: '' }),
  togglePitchSelection: (id) =>
    set((state) => ({
      selectedPitchIds: state.selectedPitchIds.includes(id)
        ? state.selectedPitchIds.filter((pid) => pid !== id)
        : [...state.selectedPitchIds, id],
    })),
  clearPitchSelection: () => set({ selectedPitchIds: [] }),
}));

// ─── Campaign Store ──────────────────────────────────────────────────────────

interface CampaignState {
  activeCampaign: Campaign | null;
  selectedTargets: string[];
  selectedCustomers: Customer[];

  setActiveCampaign: (campaign: Campaign | null) => void;
  toggleTargetSelection: (id: string) => void;
  setSelectedTargets: (ids: string[]) => void;
  clearTargetSelection: () => void;
  addSelectedCustomer: (customer: Customer) => void;
  removeSelectedCustomer: (id: string) => void;
  setSelectedCustomers: (customers: Customer[]) => void;
  clearSelectedCustomers: () => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  activeCampaign: null,
  selectedTargets: [],
  selectedCustomers: [],

  setActiveCampaign: (campaign) => set({ activeCampaign: campaign }),
  toggleTargetSelection: (id) =>
    set((state) => ({
      selectedTargets: state.selectedTargets.includes(id)
        ? state.selectedTargets.filter((tid) => tid !== id)
        : [...state.selectedTargets, id],
    })),
  setSelectedTargets: (ids) => set({ selectedTargets: ids }),
  clearTargetSelection: () => set({ selectedTargets: [] }),
  addSelectedCustomer: (customer) =>
    set((state) => ({
      selectedCustomers: state.selectedCustomers.some((c) => c.id === customer.id)
        ? state.selectedCustomers
        : [...state.selectedCustomers, customer],
    })),
  removeSelectedCustomer: (id) =>
    set((state) => ({
      selectedCustomers: state.selectedCustomers.filter((c) => c.id !== id),
    })),
  setSelectedCustomers: (customers) => set({ selectedCustomers: customers }),
  clearSelectedCustomers: () => set({ selectedCustomers: [] }),
}));
