<script lang="ts">
  import { onMount } from 'svelte';
  import { authService } from '../services/authService';
  import LoadingSpinner from '../components/common/LoadingSpinner.svelte';
  import { navigate } from 'svelte-routing';

  let error: string | null = null;

  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code) {
        throw new Error('No authorization code received');
      }

      const savedState = sessionStorage.getItem('auth_state');
      if (state !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      await authService.handleCallback(code);
      sessionStorage.removeItem('auth_state');
      
      // Navigate back to the main app
      navigate('/');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to handle callback';
    }
  });
</script>

{#if error}
  <div class="h-screen flex items-center justify-center bg-white">
    <div class="text-red-600 p-4 rounded-lg shadow-md">
      <h2 class="font-bold mb-2">Error</h2>
      <p>{error}</p>
    </div>
  </div>
{:else}
  <div class="h-screen flex items-center justify-center bg-white">
    <LoadingSpinner size="lg" />
  </div>
{/if} 