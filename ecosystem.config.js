module.exports = {
  apps: [
    {
      // 🔧 Backend - Smart-Trade Server
      name: 'smart-trade-server',
      script: 'npm',
      args: 'start',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        CEDRO_HOST: 'datafeed1.cedrotech.com',
        CEDRO_PORT: '81',
        CEDRO_USERNAME: 'emanuel_socket',
        CEDRO_PASSWORD: 'bABqwq',
        CEDRO_SOFTWARE_KEY: '',
        SERVER_PORT: '8080',
        SERVER_HOST: '0.0.0.0',
        WS_PORT: '8081',
        WS_HOST: '0.0.0.0',
        WS_JWT_SECRET: 'smart-trade-jwt-secret-key-2025',
        WS_JWT_EXPIRES_IN: '24h',
        WS_MAX_CONNECTIONS: '100',
        WS_MAX_SESSIONS: '10',
        WS_HEARTBEAT_INTERVAL: '30000',
        LOG_LEVEL: 'info',
        CEDRO_LOG_LEVEL: 'info',
        LOG_MAX_FILES: '5',
        LOG_MAX_SIZE: '10m',
        SQLITE_PATH: './data/smart-trade.db',
        REDIS_URL: 'redis://localhost:6379',
        CACHE_TTL: '300',
        CACHE_MAX_SIZE: '1000',
        BATCH_SIZE: '100',
        BATCH_INTERVAL: '1000',
        MAX_TICKS_BUFFER: '10000',
        MAX_ORDERFLOW_BUFFER: '1000',
        MAX_FOOTPRINT_BUFFER: '500'
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        CEDRO_LOG_LEVEL: 'error'
      },
      error_file: './logs/smart-trade-server-error.log',
      out_file: './logs/smart-trade-server-out.log',
      log_file: './logs/smart-trade-server-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      // 🌐 Frontend - Smart-Trade Client
      name: 'smart-trade-client',
      script: 'npm',
      args: 'run dev',
      cwd: './client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: 'http://localhost:8080',
        VITE_WS_URL: 'ws://localhost:8081'
      },
      env_production: {
        NODE_ENV: 'production',
        VITE_API_URL: 'http://localhost:8080',
        VITE_WS_URL: 'ws://localhost:8081'
      },
      error_file: './logs/smart-trade-client-error.log',
      out_file: './logs/smart-trade-client-out.log',
      log_file: './logs/smart-trade-client-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  // Configuração de deploy (opcional)
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/master',
      repo: 'git@github.com:emanuelsistemas/smart-trade.git',
      path: '/var/www/smart-trade',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
