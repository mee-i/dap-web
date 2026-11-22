// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

const siteUrl = process.env.SITE_URL || 'https://dap-web.pages.dev'

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  compressHTML: true,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    worker: {
      format: 'es',
    },
  },
})
