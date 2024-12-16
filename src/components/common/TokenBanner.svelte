<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import { vitalsService } from '../../services/vitalsService';
  import type { Patient } from '../../types/patient';

  let patient: Patient | null = null;
  let error: string | null = null;
  let timeRemaining: string = '';
  let intervalId: number;
  let showBanner: boolean = false;

  const CODE_CONSOLE_URL = 'https://code-console.cerner.com/console/details/34347926-e025-47d8-8a57-37a9046c32f2/52d68728-011e-46d8-9f37-0dcc2bc41bfc';

  onMount(async () => {
    console.log('TokenBanner mounted');
    showBanner = $authStore.needPatientBanner ?? false;
    if ($authStore.patientId) {
      try {
        console.log('Fetching patient:', $authStore.patientId);
        patient = await vitalsService.getPatient($authStore.patientId);
        console.log('Patient data:', patient);
        startTokenTimer();
      } catch (e) {
        console.error('Error in TokenBanner:', e);
        error = e instanceof Error ? e.message : 'Failed to fetch patient';
      }
    }
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  function startTokenTimer() {
    const expiresAt = $authStore.expiresAt;
    if (!expiresAt) return;

    function updateTimer() {
      const now = new Date().getTime();
      const distance = expiresAt - now;
      
      if (distance < 0) {
        clearInterval(intervalId);
        timeRemaining = 'Expired';
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      timeRemaining = `${minutes}m ${seconds}s`;
    }

    updateTimer();
    intervalId = setInterval(updateTimer, 1000);
  }

  function truncateToken(token: string | null): string {
    if (!token) return 'No token';
    if (token.length <= 20) return token;
    return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
  }

  function handleLogout() {
    authStore.clearAuth();
    window.location.href = CODE_CONSOLE_URL;
  }
</script>

<div class="bg-primary text-white py-2 px-4 shadow-md">
  <div class="container mx-auto">
    <div class="flex flex-col space-y-2">
      {#if patient && showBanner}
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div>
              <span class="font-semibold">Patient:</span>
              <span class="ml-2">
                {patient.name?.[0]?.text || `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm">
                (DOB: {new Date(patient.birthDate).toLocaleDateString()})
              </span>
              <span class="ml-3 px-2 py-1 bg-accent rounded text-sm">
                Patient ID: {$authStore.patientId}
              </span>
            </div>
          </div>
          {#if $authStore.userId}
            <span class="px-2 py-1 bg-accent rounded text-sm">
              User ID: {$authStore.userId}
            </span>
          {/if}
        </div>
      {:else if error}
        <div class="text-red-300">Error loading patient: {error}</div>
      {/if}
      
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="font-semibold">Access Token:</span>
          <span class="font-mono text-sm bg-primary-dark px-2 py-1 rounded">
            {truncateToken($authStore.accessToken)}
          </span>
        </div>
        {#if timeRemaining}
          <div class="flex items-center space-x-2">
            <span class="font-semibold">Expires in:</span>
            <span class="font-mono text-sm bg-primary-dark px-2 py-1 rounded 
              {timeRemaining === 'Expired' ? 'text-red-300' : ''}">
              {timeRemaining}
            </span>
          </div>
        {/if}
        <div class="flex-grow"></div>
        <button 
          class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
          on:click={handleLogout}
        >
          Switch Patient
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  :global(.bg-primary-dark) {
    background-color: rgba(0, 0, 0, 0.2);
  }
</style> 