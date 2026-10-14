import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/tz-bridge/',
  plugins: [react()],
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
})
