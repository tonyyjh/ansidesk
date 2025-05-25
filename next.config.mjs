let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  allowedDevOrigins: ["https://ansidesk.cat", "https://www.ansidesk.cat"],
  async rewrites() {
    return [
      {
        source: '/api/login', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/login', // Ruta del backend
      },
      {
        source: '/api/register', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/register', // Ruta del backend
      },
      {
        source: '/api/users/:user_id', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/users/:user_id', // Ruta del backend
      },
      {
        source: '/api/users/:user_id/password', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/users/:user_id/password', // Ruta del backend
      },
      {
        source: '/api/machines/user/:user_id', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/machines/user/:user_id', // Ruta del backend
      },
      {
        source: '/api/create-machine', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/create-machine', // Ruta del backend
      },
      {
        source: '/api/forgot-password', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/forgot-password' 
      },
      {
        source: '/api/reset-password', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/reset-password' 
      },
      {
        source: '/api/machines/:vm_id/user/:user_id', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/machines/:vm_id/user/:user_id', // Ruta del backend
      },
      {
        source: '/api/machines/:vmid/user/:user_id/toggle', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/machines/:vmid/user/:user_id/toggle', // Ruta del backend
      },
      {
        source: '/api/machines/:user_id/novnc-url/:idvm', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/api/machines/:user_id/novnc-url/:idvm', // Ruta del backend
      },
      
      {
        source: '/api/verify-otp', // Ruta en el frontend
        destination: 'http://10.144.64.101:5001/verify-otp', // Ruta del backend
      },
      
    ]
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig