<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from './stores/authStore';
  import TokenBanner from './components/common/TokenBanner.svelte';
  import VitalsList from './components/vitals/VitalsList.svelte';
  import { authService } from './services/authService';

  const CODE_CONSOLE_URL = 'https://code-console.cerner.com/console/details/34347926-e025-47d8-8a57-37a9046c32f2/52d68728-011e-46d8-9f37-0dcc2bc41bfc';
  let error: string | null = null;

  // Basic log to see if script runs
  console.log('App script starting');

  onMount(async () => {
    console.log('App mounted');
    console.log('Current URL:', window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const launch = urlParams.get('launch');
    const iss = urlParams.get('iss');

    console.log('URL params:', { code, state, launch, iss });
    console.log('Auth store state:', $authStore);

    // Handle SMART launch
    if (launch && iss) {
      console.log('SMART launch detected, initializing auth');
      try {
        await authService.initialize();
      } catch (e) {
        console.error('Auth initialization failed:', e);
        error = e instanceof Error ? e.message : 'Failed to initialize';
      }
      return;
    }

    // Handle auth callback
    if (code && state) {
      console.log('Found authorization code, verifying state');
      const storedState = sessionStorage.getItem('auth_state');
      console.log('Stored state:', storedState);
      
      if (state !== storedState) {
        console.error('State mismatch');
        error = 'Authentication failed: state mismatch';
        window.location.href = CODE_CONSOLE_URL;
        return;
      }
      
      try {
        await authService.handleCallback(code);
      } catch (e) {
        console.error('Auth callback failed:', e);
        error = e instanceof Error ? e.message : 'Authentication failed';
      }
      return;
    }

    // If no launch or code, redirect to Code Console
    if (!$authStore.isAuthenticated) {
      console.log('No launch or code found, redirecting to Code Console');
      window.location.href = CODE_CONSOLE_URL;
    }
  });
</script>

{#if error}
  <div class="min-h-screen flex items-center justify-center bg-red-50">
    <div class="text-red-600 p-4">
      {error}
    </div>
  </div>
{:else if $authStore.isAuthenticated}
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <TokenBanner />
    <main class="flex-grow">
      <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold text-primary mb-6">Patient Vitals Dashboard</h1>
        <VitalsList />
      </div>
    </main>
  </div>
{/if}

<style>
  :global(html) {
    background-color: rgb(249, 250, 251);
  }
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
