import { writable } from 'svelte/store';
import type { PatientState } from '../types/patient';

function createPatientStore() {
  const initialState: PatientState = {
    patientId: null,
    patient: null,
    error: null,
    loading: false
  };

  const { subscribe, set, update } = writable<PatientState>(initialState);

  return {
    subscribe,
    setPatientId: (patientId: string) => {
      update(state => ({
        ...state,
        patientId,
        loading: true
      }));
    },
    setPatient: (patient: any) => {
      update(state => ({
        ...state,
        patient,
        loading: false,
        error: null
      }));
    },
    setError: (error: string) => {
      update(state => ({
        ...state,
        error,
        loading: false
      }));
    },
    reset: () => set(initialState)
  };
}

export const patientStore = createPatientStore(); 