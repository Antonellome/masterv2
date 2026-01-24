import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.json'] })],
  server: {
    watch: {
      ignored: ["**/riso-app-tecnici/**", "**/riso-app-tecnici-repo/**", "**/temp_repo_analysis/**"]
    }
  }
})
