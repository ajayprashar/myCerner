<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import { vitalsService } from '../../services/vitalsService';
  import type { Observation } from '../../types/vitals';

  let vitals: Observation[] = [];
  let error: string | null = null;
  let loading = true;

  // Form state
  let newVital = {
    type: 'temperature',
    value: '',
    systolic: '',
    diastolic: '',
    unit: '°F'
  };

  const vitalTypes = [
    { id: 'temperature', name: 'Temperature', unit: '°F' },
    { id: 'blood-pressure', name: 'Blood Pressure', unit: 'mmHg' },
    { id: 'heart-rate', name: 'Heart Rate', unit: 'bpm' },
    { id: 'respiratory-rate', name: 'Respiratory Rate', unit: '/min' },
    { id: 'oxygen-saturation', name: 'Oxygen Saturation', unit: '%' }
  ];

  $: showBPFields = newVital.type === 'blood-pressure';

  onMount(async () => {
    console.log('VitalsList mounted');
    await loadVitals();
    if (vitals.length > 0) {
      console.log('Sample vital entry:', JSON.stringify(vitals[0], null, 2));
    }
  });

  async function loadVitals() {
    try {
      if ($authStore.patientId) {
        console.log('Fetching vitals for patient:', $authStore.patientId);
        vitals = await vitalsService.getPatientVitals($authStore.patientId);
        console.log('Vitals data:', vitals);
      }
    } catch (e) {
      console.error('Error loading vitals:', e);
      error = e instanceof Error ? e.message : 'Failed to load vitals';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!$authStore.patientId) return;

    try {
      const selectedType = vitalTypes.find(t => t.id === newVital.type);
      if (!selectedType) {
        error = 'Invalid vital type selected';
        return;
      }

      console.log('Submitting vital:', {
        patientId: $authStore.patientId,
        type: newVital.type,
        value: parseFloat(newVital.value),
        unit: selectedType.unit
      });

      await vitalsService.addVital({
        patientId: $authStore.patientId,
        type: newVital.type,
        value: parseFloat(newVital.value),
        unit: selectedType.unit
      });

      // Reset form and reload vitals
      newVital.value = '';
      await loadVitals();
    } catch (e) {
      console.error('Error adding vital:', e);
      error = e instanceof Error ? e.message : 'Failed to add vital';
    }
  }
</script>

<!-- Add margin-top to the container -->
<div class="mt-6">
  <!-- Add Vital Form -->
  <div class="bg-white rounded shadow p-4 mb-6">
    <h2 class="text-lg font-semibold mb-4">Add New Vital</h2>
    <form on:submit|preventDefault={handleSubmit} class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label for="vital-type" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          id="vital-type"
          bind:value={newVital.type}
          class="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        >
          {#each vitalTypes as type}
            <option value={type.id}>{type.name}</option>
          {/each}
        </select>
      </div>
      
      {#if showBPFields}
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="vital-systolic" class="block text-sm font-medium text-gray-700 mb-1">
              Systolic (mmHg)
            </label>
            <input
              id="vital-systolic"
              type="number"
              bind:value={newVital.systolic}
              required
              class="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <label for="vital-diastolic" class="block text-sm font-medium text-gray-700 mb-1">
              Diastolic (mmHg)
            </label>
            <input
              id="vital-diastolic"
              type="number"
              bind:value={newVital.diastolic}
              required
              class="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      {:else}
        <div>
          <label for="vital-value" class="block text-sm font-medium text-gray-700 mb-1">
            Value ({vitalTypes.find(t => t.id === newVital.type)?.unit || ''})
          </label>
          <input
            id="vital-value"
            type="number"
            bind:value={newVital.value}
            required
            step="0.1"
            class="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
      {/if}

      <div class="flex items-end">
        <button
          type="submit"
          class="w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
        >
          Add Vital
        </button>
      </div>
    </form>
  </div>

  {#if loading}
    <div class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="text-red-600">
      {error}
    </div>
  {:else if vitals.length === 0}
    <p>No vital signs recorded</p>
  {:else}
    <div class="bg-white rounded shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fahrenheit</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each vitals as vital}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="text-sm">
                  {#if vital.performer && vital.performer[0]?.reference}
                    {vital.performer[0].reference.split('/')[1]}
                  {:else}
                    -
                  {/if}
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="text-sm">
                  {#if vital.performer && vital.performer[0]?.reference}
                    {vital.performer[0].reference.split('/')[0]}
                  {:else}
                    -
                  {/if}
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="font-medium text-gray-900">{vital.code?.text || 'Unknown Measurement'}</div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="text-sm">
                  {#if vital.valueQuantity}
                    {vital.valueQuantity.value} {vital.valueQuantity.unit}
                  {:else}
                    No value recorded
                  {/if}
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="text-sm">
                  {#if vital.valueQuantity && vital.valueQuantity.unit === 'degC'}
                    {(vital.valueQuantity.value * 9/5 + 32).toFixed(1)}°F
                  {:else}
                    -
                  {/if}
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="text-sm text-gray-600">
                  {new Date(vital.effectiveDateTime).toLocaleString()}
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  {vital.status === 'final' ? 'bg-green-100 text-green-800' : 
                   vital.status === 'preliminary' ? 'bg-yellow-100 text-yellow-800' : 
                   'bg-gray-100 text-gray-800'}">
                  {vital.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div> 