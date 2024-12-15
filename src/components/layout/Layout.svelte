<script lang="ts">
  import TokenBanner from '../common/TokenBanner.svelte';
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <TokenBanner />
  <main class="flex-grow">
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold text-primary mb-6">Patient Vitals Dashboard</h1>
      <slot />
    </div>
  </main>
</div>

<style>
  :global(html) {
    background-color: rgb(249, 250, 251);
  }
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style> 