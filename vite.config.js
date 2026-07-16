import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        collections: resolve(__dirname, 'collections.html'),
        about: resolve(__dirname, 'about.html')
      }
    }
  }
})