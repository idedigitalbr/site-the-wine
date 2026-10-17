import { create } from 'zustand';

export type ReservationCheckpoint = 'data' | 'time' | 'preferences';

type ReservationWizardState = {
  step: number;
  minimumStep: 1 | 2;
  flowId: string | null;
  completedCheckpoints: ReservationCheckpoint[];
  setStep: (step: number) => void;
  setFlowId: (flowId: string) => void;
  startAuthenticatedFlow: (flowId: string) => void;
  markCheckpointCompleted: (checkpoint: ReservationCheckpoint) => void;
  hasCheckpoint: (checkpoint: ReservationCheckpoint) => boolean;
  reset: () => void;
};

export const useReservationWizardStore = create<ReservationWizardState>((set, get) => ({
  step: 1,
  minimumStep: 1,
  flowId: null,
  completedCheckpoints: [],
  setStep: (step) => set((state) => ({ step: Math.max(state.minimumStep, step) })),
  setFlowId: (flowId) => set({ flowId }),
  startAuthenticatedFlow: (flowId) => set({
    step: 2,
    minimumStep: 2,
    flowId,
    completedCheckpoints: [],
  }),
  markCheckpointCompleted: (checkpoint) => set((state) => ({
    completedCheckpoints: state.completedCheckpoints.includes(checkpoint)
      ? state.completedCheckpoints
      : [...state.completedCheckpoints, checkpoint],
  })),
  hasCheckpoint: (checkpoint) => get().completedCheckpoints.includes(checkpoint),
  reset: () => set({ step: 1, minimumStep: 1, flowId: null, completedCheckpoints: [] }),
}));
