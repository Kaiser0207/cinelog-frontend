import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // The OBJECT form matches a module by its entry id, and `react-dom` resolves to
        // its tiny index.js re-export — NOT to `react-dom/client`, which is what main.jsx
        // actually imports and where the 178kB renderer lives. So the "stable vendor
        // chunk" held almost none of React, and the whole renderer was riding along in
        // the app chunk: every deploy, however small, made every returning visitor
        // re-download all of react-dom.
        //
        // The function form matches on the resolved path, so it catches the subpaths.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) {
            return 'vendor-react'
          }
          // gsap is used by exactly ONE component (the nav menu) and nothing else. It was
          // bundled in with framer-motion, which the whole app needs — so 70kB of it sat
          // on the critical path for an animation nobody sees until they tap the burger.
          // Its own chunk, so it can be split off properly.
          if (id.includes('node_modules/gsap')) return 'vendor-gsap'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) {
            return 'vendor-motion'
          }
          return undefined
        }
      }
    }
  }
})
