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
        
        // Add these debug logs
        console.log('Total vitals loaded:', vitals.length);
        console.log('Temperature vitals:', vitals.filter(v => v.code?.coding?.some(c => c.code === '8331-1')).length);
        console.log('Blood pressure vitals:', vitals.filter(v => v.code?.coding?.some(c => c.code === '85354-9')).length);
        console.log('Heart rate vitals:', vitals.filter(v => v.code?.coding?.some(c => c.code === '8867-4')).length);
        console.log('Respiratory vitals:', vitals.filter(v => v.code?.coding?.some(c => c.code === '9279-1')).length);
        console.log('O2 vitals:', vitals.filter(v => v.code?.coding?.some(c => c.code === '59408-5')).length);
        
        // Log a sample vital to check its structure
        if (vitals.length > 0) {
          console.log('Sample vital structure:', vitals[0]);
        }
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

      if (newVital.type === 'blood-pressure') {
        if (!newVital.systolic || !newVital.diastolic) {
          error = 'Both systolic and diastolic values are required';
          return;
        }

        console.log('Submitting blood pressure:', {
          patientId: $authStore.patientId,
          type: newVital.type,
          systolic: parseFloat(newVital.systolic),
          diastolic: parseFloat(newVital.diastolic),
          unit: selectedType.unit
        });

        await vitalsService.addVital({
          patientId: $authStore.patientId,
          type: newVital.type,
          systolic: parseFloat(newVital.systolic),
          diastolic: parseFloat(newVital.diastolic),
          unit: selectedType.unit
        });
      } else {
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
      }

      // Reset form and reload vitals
      newVital.value = '';
      newVital.systolic = '';
      newVital.diastolic = '';
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

  <!-- After the Add Vital Form and before the grid -->
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-semibold">Vitals History</h2>
    <div class="flex gap-4 text-sm">
      <a href="#temperature" class="text-primary hover:text-primary-dark">Temperature</a>
      <span class="text-gray-300">|</span>
      <a href="#blood-pressure" class="text-primary hover:text-primary-dark">Blood Pressure</a>
      <span class="text-gray-300">|</span>
      <a href="#respiratory" class="text-primary hover:text-primary-dark">Respiratory</a>
      <span class="text-gray-300">|</span>
      <a href="#oxygen" class="text-primary hover:text-primary-dark">O2 Saturation</a>
    </div>
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
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Temperature Card -->
      <div id="temperature" class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold text-primary mb-3">Temperature</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-xs text-gray-500 border-b">
                <th class="pb-2 text-left">Value</th>
                <th class="pb-2 text-left">Date</th>
                <th class="pb-2 text-right">User</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each vitals.filter(v => v.code?.coding?.some(c => c.code === '8331-1')) as vital}
                <tr class="hover:bg-gray-50">
                  <td class="py-2 font-medium">
                    {#if vital.valueQuantity}
                      {vital.valueQuantity.value}°C
                      <span class="text-gray-500 text-sm">
                        ({(vital.valueQuantity.value * 9/5 + 32).toFixed(1)}°F)
                      </span>
                    {/if}
                  </td>
                  <td class="py-2 text-sm text-gray-600">
                    {new Date(vital.effectiveDateTime).toLocaleString()}
                  </td>
                  <td class="py-2 text-sm text-gray-600 text-right">
                    {#if vital.performer?.[0]?.reference}
                      {vital.performer[0].reference.split('/')[1]}
                      <span class="text-xs text-gray-400 ml-1">
                        ({vital.performer[0].reference.split('/')[0]})
                      </span>
                    {:else}
                      -
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-right">
          <a href="#" class="text-sm text-primary hover:text-primary-dark">Back to top</a>
        </div>
      </div>

      <!-- Blood Pressure & Heart Rate Card -->
      <div id="blood-pressure" class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold text-primary mb-3">Blood Pressure & Heart Rate</h3>
        
        <!-- Blood Pressure Section -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 mb-2">Blood Pressure</h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-xs text-gray-500 border-b">
                  <th class="pb-2 text-left">Value</th>
                  <th class="pb-2 text-left">Date</th>
                  <th class="pb-2 text-right">User</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each vitals.filter(v => v.code?.coding?.some(c => c.code === '85354-9')) as vital}
                  <tr class="hover:bg-gray-50">
                    <td class="py-2 font-medium">
                      {#if vital.component && vital.component.length >= 2 && vital.component[0]?.valueQuantity?.value && vital.component[1]?.valueQuantity?.value}
                        {vital.component[0].valueQuantity.value}/{vital.component[1].valueQuantity.value} mmHg
                      {:else}
                        No value recorded
                      {/if}
                    </td>
                    <td class="py-2 text-sm text-gray-600">
                      {new Date(vital.effectiveDateTime).toLocaleString()}
                    </td>
                    <td class="py-2 text-sm text-gray-600 text-right">
                      {#if vital.performer?.[0]?.reference}
                        {vital.performer[0].reference.split('/')[1]}
                        <span class="text-xs text-gray-400 ml-1">
                          ({vital.performer[0].reference.split('/')[0]})
                        </span>
                      {:else}
                        -
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Heart Rate Section -->
        <div>
          <h4 class="text-sm font-medium text-gray-600 mb-2">Heart Rate</h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-xs text-gray-500 border-b">
                  <th class="pb-2 text-left">Value</th>
                  <th class="pb-2 text-left">Date</th>
                  <th class="pb-2 text-right">User</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each vitals.filter(v => v.code?.coding?.some(c => c.code === '8867-4')) as vital}
                  <tr class="hover:bg-gray-50">
                    <td class="py-2 font-medium">
                      {#if vital.valueQuantity}
                        {vital.valueQuantity.value} bpm
                      {/if}
                    </td>
                    <td class="py-2 text-sm text-gray-600">
                      {new Date(vital.effectiveDateTime).toLocaleString()}
                    </td>
                    <td class="py-2 text-sm text-gray-600 text-right">
                      {#if vital.performer?.[0]?.reference}
                        {vital.performer[0].reference.split('/')[1]}
                        <span class="text-xs text-gray-400 ml-1">
                          ({vital.performer[0].reference.split('/')[0]})
                        </span>
                      {:else}
                        -
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        <div class="mt-4 text-right">
          <a href="#" class="text-sm text-primary hover:text-primary-dark">Back to top</a>
        </div>
      </div>

      <!-- Respiratory Rate Card -->
      <div id="respiratory" class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold text-primary mb-3">Respiratory Rate</h3>
        <div class="space-y-2">
          {#each vitals.filter(v => v.code?.coding?.some(c => c.code === '9279-1')) as vital}
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <div>
                <span class="font-medium">
                  {#if vital.valueQuantity}
                    {vital.valueQuantity.value} /min
                  {/if}
                </span>
                <div class="text-sm text-gray-500">
                  {new Date(vital.effectiveDateTime).toLocaleString()}
                </div>
              </div>
              <div class="text-sm text-gray-500">
                {#if vital.performer?.[0]?.reference}
                  {vital.performer[0].reference.split('/')[1]}
                  <span class="text-xs text-gray-400 ml-1">
                    ({vital.performer[0].reference.split('/')[0]})
                  </span>
                {:else}
                  -
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="mt-4 text-right">
          <a href="#" class="text-sm text-primary hover:text-primary-dark">Back to top</a>
        </div>
      </div>

      <!-- O2 Saturation Card -->
      <div id="oxygen" class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold text-primary mb-3">Oxygen Saturation</h3>
        <div class="space-y-2">
          {#each vitals.filter(v => v.code?.coding?.some(c => c.code === '59408-5')) as vital}
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <div>
                <span class="font-medium">
                  {#if vital.valueQuantity}
                    {vital.valueQuantity.value}%
                  {/if}
                </span>
                <div class="text-sm text-gray-500">
                  {new Date(vital.effectiveDateTime).toLocaleString()}
                </div>
              </div>
              <div class="text-sm text-gray-500">
                {#if vital.performer?.[0]?.reference}
                  {vital.performer[0].reference.split('/')[1]}
                  <span class="text-xs text-gray-400 ml-1">
                    ({vital.performer[0].reference.split('/')[0]})
                  </span>
                {:else}
                  -
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="mt-4 text-right">
          <a href="#" class="text-sm text-primary hover:text-primary-dark">Back to top</a>
        </div>
      </div>
    </div>
  {/if}
</div> 