import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
base: '/', // <--- QUESTA È LA RIGA MAGICA CHE TI MANCAVA!
})

