export interface Performer {
  reference: string;
  display?: string;
  type?: string;
}

export interface ValueQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface CodeableConcept {
  coding?: Array<{
    system: string;
    code: string;
    display: string;
  }>;
  text: string;
}

export interface Component {
  code: CodeableConcept;
  valueQuantity: ValueQuantity;
}

export interface VitalSign {
  id: string;
  resourceType: string;
  status: string;
  code?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  performer?: Performer[];
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
}

export interface VitalSignsResponse {
  resourceType: string;
  type: string;
  total: number;
  entry?: Array<{
    resource: VitalSign;
  }>;
} 