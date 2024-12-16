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
    value?: number;
    systolic?: number;
    diastolic?: number;
    unit: string;
  }): Promise<void> {
    console.log('Adding vital:', vital);
    
    let observation: any = {
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
      subject: {
        reference: `Patient/${vital.patientId}`
      },
      effectiveDateTime: new Date().toISOString().split('.')[0] + '.000Z'
    };

    if (vital.type === 'blood-pressure') {
      observation = {
        ...observation,
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood pressure panel'
          }]
        },
        component: [
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8480-6',
                display: 'Systolic blood pressure'
              }]
            },
            valueQuantity: {
              value: vital.systolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          },
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8462-4',
                display: 'Diastolic blood pressure'
              }]
            },
            valueQuantity: {
              value: vital.diastolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          }
        ]
      };
    } else if (vital.type === 'heart-rate') {
      observation = {
        ...observation,
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '69000-8',
            display: 'Heart rate --sitting'
          }],
          text: 'Heart rate --sitting'
        },
        valueQuantity: {
          value: Number(vital.value?.toFixed(0)),
          unit: 'bpm',
          system: 'http://unitsofmeasure.org',
          code: '{beats}/min'
        }
      };
    } else if (vital.type === 'respiratory-rate') {
      observation = {
        ...observation,
        code: {
          coding: [{
            system: 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/72',
            code: '703537',
            display: 'Respiratory Rate',
            userSelected: true
          },
          {
            system: 'http://loinc.org',
            code: '9279-1',
            display: 'Respiratory rate'
          }],
          text: 'Respiratory Rate'
        },
        valueQuantity: {
          value: Number(vital.value?.toFixed(0)),
          unit: 'bpm',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      };
    } else if (vital.type === 'temperature') {
      let value = vital.value;
      if (vital.unit === '°F') {
        value = (vital.value - 32) * 5/9;
      }

      observation = {
        ...observation,
        code: {
          coding: [{
            system: 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/72',
            code: '703558',
            display: 'Temperature Oral',
            userSelected: true
          }],
          text: 'Temperature Oral'
        },
        valueQuantity: {
          value: Number(value?.toFixed(1)),
          unit: 'degC',
          system: 'http://unitsofmeasure.org',
          code: 'Cel',
          extension: [{
            url: 'http://hl7.org/fhir/StructureDefinition/iso21090-PQ-translation',
            valueQuantity: {
              value: Number(vital.value?.toFixed(1)),
              unit: 'degF',
              system: 'http://unitsofmeasure.org',
              code: '[degF]'
            }
          }]
        }
      };
    } else {
      // Handle oxygen saturation
      let value = vital.value;
      if (vital.type === 'oxygen-saturation' && vital.unit === '%') {
        value = value / 100;
      }

      observation = {
        ...observation,
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '59408-5',
            display: 'Oxygen saturation'
          }]
        },
        valueQuantity: {
          value: Number(value?.toFixed(2)),
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%'
        }
      };
    }

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