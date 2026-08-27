import { create } from 'zustand';

type ReservationWizardState = {
  step: number;
  setStep: (step: number) => void;
  reset: () => void;
};

export const useReservationWizardStore = create<ReservationWizardState>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),
  reset: () => set({ step: 1 }),
}));
