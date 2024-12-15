<script lang="ts">
  import { authStore } from '../../stores/authStore';
</script>

<div class="bg-gray-100 p-4 rounded-lg mt-4">
  <h3 class="font-bold mb-2">Debug Info</h3>
  <pre class="whitespace-pre-wrap break-all text-sm">
    Access Token: {$authStore.accessToken}
    Patient ID: {$authStore.patientId}
    Expires At: {new Date($authStore.expiresAt || 0).toLocaleString()}
  </pre>
</div> 