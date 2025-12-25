import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// import tailwindcss from '@tailwindcss/vite

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})



// Updated: Thu Dec 25 17:21:33 IST 2025
