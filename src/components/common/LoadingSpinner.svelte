<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
</script>

<div class="flex justify-center items-center">
  <div class={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizeClasses[size]}`}>
  </div>
</div> 