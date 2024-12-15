import type { Observation } from '../types/vitals';
import type { Patient } from '../types/patient';
import { authStore } from '../stores/authStore';
import { get } from 'svelte/store';

class VitalsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d';
  }

  async getPatient(patientId: string): Promise<Patient> {
    console.log('Fetching patient with token:', get(authStore).accessToken);
    const response = await fetch(`${this.baseUrl}/Patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${get(authStore).accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Patient fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch patient: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPatientVitals(patientId: string): Promise<Observation[]> {
    console.log('Fetching vitals for patient:', patientId);
    const response = await fetch(
      `${this.baseUrl}/Observation?patient=${patientId}&category=vital-signs&_count=100`,
      {
        headers: {
          'Authorization': `Bearer ${get(authStore).accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vitals fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch vitals: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Parsed vitals data:', data);
    return data.entry?.map((e: any) => e.resource) || [];
  }

  async addVital(vital: {
    patientId: string;
    type: string;
    value: number;
    unit: string;
  }): Promise<void> {
    console.log('Adding vital:', vital);
    
    // Convert Fahrenheit to Celsius
    let value = vital.value;
    if (vital.type === 'temperature' && vital.unit === '°F') {
      value = (vital.value - 32) * 5/9;
    }

    // Format the date with milliseconds
    const now = new Date();
    const effectiveDateTime = now.toISOString().split('.')[0] + '.000Z';
    
    const observation: any = {
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }],
        text: 'Vital Signs'
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '8331-1'
        }],
        text: 'Temperature Oral'
      },
      subject: {
        reference: `Patient/${vital.patientId}`
      },
      effectiveDateTime: effectiveDateTime,
      valueQuantity: {
        value: Number(value.toFixed(1)),
        unit: 'degC',
        system: 'http://unitsofmeasure.org',
        code: 'Cel'
      }
    };

    const maxRetries = 3;
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/Observation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${get(authStore).accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(observation)
        });

        let responseText = '';
        try {
          responseText = await response.text();
        } catch (e) {
          console.error('Failed to get response text:', e);
        }

        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          console.error('Failed to parse response:', e);
          responseData = null;
        }

        if (response.ok) {
          console.log('Successfully added vital:', responseData);
          return;
        }

        lastError = `${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`;

        // Only retry on timeout errors
        if (response.status !== 504) {
          throw new Error(`Failed to add vital: ${lastError}`);
        }

        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
        attempt++;
        if (attempt < maxRetries && e instanceof Error && e.message.includes('504')) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          throw e;
        }
      }
    }

    throw new Error(`Failed to add vital after ${maxRetries} attempts: ${lastError}`);
  }

  private getCodeForVitalType(type: string) {
    const codes: Record<string, any> = {
      'blood-pressure': {
        coding: [{
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure'
        }]
      },
      'heart-rate': {
        coding: [{
          system: 'http://loinc.org',
          code: '8867-4',
          display: 'Heart rate'
        }]
      },
      'respiratory-rate': {
        coding: [{
          system: 'http://loinc.org',
          code: '9279-1',
          display: 'Respiratory rate'
        }]
      },
      'temperature': {
        coding: [{
          system: 'http://loinc.org',
          code: '8310-5',
          display: 'Body temperature'
        }]
      },
      'oxygen-saturation': {
        coding: [{
          system: 'http://loinc.org',
          code: '59408-5',
          display: 'Oxygen saturation'
        }]
      }
    };
    return codes[type];
  }

  private getUnitCode(unit: string): string {
    const unitCodes: Record<string, string> = {
      '°F': '[degF]',
      'mmHg': 'mm[Hg]',
      'bpm': '{beats}/min',
      '/min': '/min',
      '%': '%'
    };
    return unitCodes[unit] || unit;
  }
}

export const vitalsService = new VitalsService();