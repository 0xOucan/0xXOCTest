import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Try to load environment variables from multiple locations
  const envPaths = [
    '.env',
    '../.env',
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
  ]

  // Load environment variables directly
  let envDir = __dirname
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      envDir = path.dirname(envPath)
      break
    }
  }

  // Load the env vars with the VITE_ prefix
  const env = loadEnv(mode, envDir, 'VITE_')
  
  // Load all environment variables for internal processing
  // Note: Only variables with VITE_ prefix will be exposed to the client
  const allEnv = loadEnv(mode, envDir, '')
  
  console.log('Loaded environment variables from:', envDir)
  console.log('Available frontend environment variables:', 
    Object.keys(env).filter(key => key.startsWith('VITE_')).join(', '))

  return {
    plugins: [react()],
    define: {
      // Only variables with VITE_ prefix will be accessible in the client code
      // This is a Vite security feature
      'process.env': {}
    },
    server: {
      proxy: {
        '/api': {
          target: allEnv.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
