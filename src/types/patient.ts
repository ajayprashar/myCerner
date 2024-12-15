export interface Patient {
  id: string;
  resourceType: 'Patient';
  name?: Array<{
    given?: string[];
    family?: string;
    text?: string;
  }>;
  birthDate?: string;
  gender?: string;
}

export interface PatientState {
  patientId: string | null;
  patient: Patient | null;
  error: string | null;
  loading: boolean;
} 