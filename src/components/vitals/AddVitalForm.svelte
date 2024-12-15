<script lang="ts">
  import { vitalsService } from '../../services/vitalsService';

  const vitalTypes = [
    { 
      code: '8331-1', 
      display: 'Temperature Oral', 
      unit: 'degC',
      system: 'http://loinc.org',
      unitDisplay: '°C',
      min: 30,
      max: 45
    },
    { 
      code: '8867-4', 
      display: 'Heart Rate', 
      unit: '/min',
      system: 'http://loinc.org',
      unitDisplay: 'bpm',
      min: 0,
      max: 300
    },
    { 
      code: '8480-6',
      display: 'Blood Pressure Systolic', 
      unit: 'mmHg',
      unitCode: 'mm[Hg]',
      system: 'http://loinc.org',
      unitDisplay: 'mmHg',
      min: 0,
      max: 300
    },
    { 
      code: '8462-4',
      display: 'Blood Pressure Diastolic', 
      unit: 'mmHg',
      unitCode: 'mm[Hg]',
      system: 'http://loinc.org',
      unitDisplay: 'mmHg',
      min: 0,
      max: 200
    },
    { 
      code: '9279-1',
      display: 'Respiratory Rate', 
      unit: '/min',
      unitCode: '/min',
      system: 'http://loinc.org',
      unitDisplay: '/min',
      min: 0,
      max: 100
    },
    { 
      code: '59408-5',
      display: 'Oxygen Saturation', 
      unit: '%',
      unitCode: '%',
      system: 'http://loinc.org',
      unitDisplay: '%',
      min: 0,
      max: 100
    }
  ];

  let selectedCode = vitalTypes[0].code;
  let value = '';
  let error: string | null = null;
  let success = false;
  let submitting = false;

  $: selectedType = vitalTypes.find(type => type.code === selectedCode) || vitalTypes[0];

  async function handleSubmit() {
    if (!value) {
      error = 'Please enter a value';
      return;
    }

    try {
      submitting = true;
      error = null;
      success = false;
      
      const result = await vitalsService.createVitalSign({
        code: selectedType.code,
        display: selectedType.display,
        value: parseFloat(value),
        unit: selectedType.unit,
        system: selectedType.system
      });
      
      success = true;
      value = '';
      
      dispatch('vitalAdded', { location: result.location });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to add vital sign';
      console.error('Error adding vital:', e);
    } finally {
      submitting = false;
    }
  }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<form on:submit|preventDefault={handleSubmit} class="bg-white p-4 rounded shadow mb-4">
  <div class="flex items-end gap-4">
    <div class="flex-1">
      <label for="vitalType" class="block text-sm font-medium text-gray-700 mb-1">
        Measurement Type
      </label>
      <select
        id="vitalType"
        bind:value={selectedCode}
        class="block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        disabled={submitting}
      >
        {#each vitalTypes as type}
          <option value={type.code}>
            {type.display}
          </option>
        {/each}
      </select>
    </div>
    <div class="flex-1">
      <label for="value" class="block text-sm font-medium text-gray-700 mb-1">
        Value ({selectedType.unitDisplay})
      </label>
      <input
        type="number"
        id="value"
        bind:value
        step="0.1"
        min={selectedType.min}
        max={selectedType.max}
        class="block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder={`Enter ${selectedType.display.toLowerCase()}`}
        disabled={submitting}
      />
    </div>
    <button
      type="submit"
      disabled={submitting}
      class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
    >
      {submitting ? 'Adding...' : 'Add Vital Sign'}
    </button>
  </div>

  {#if error}
    <div class="mt-2 text-sm text-secondary">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="mt-2 text-sm text-primary">
      Vital sign added successfully!
    </div>
  {/if}
</form> 