<template>
  <main class="app-shell">
    <p class="eyebrow">Oracle</p>
    <h1>Public signal monitoring workspace</h1>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 0.5rem;
  padding: 2rem;
  background: #090d14;
  color: #eef4ff;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  text-align: center;
}

.eyebrow {
  margin: 0;
  color: #8fb4ff;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}
</style>
