module.exports = {
  apps: [
    {
      // Backend (Servidor)
      name: 'smart-trade-backend',
      script: 'start-backend.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        WEBSOCKET_PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        WEBSOCKET_PORT: 3002
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      // Frontend (Cliente)
      name: 'smart-trade-frontend',
      script: 'start-frontend.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: 'http://localhost:3001',
        VITE_WS_URL: 'ws://localhost:3002'
      },
      env_production: {
        NODE_ENV: 'production',
        VITE_API_URL: 'http://localhost:3001',
        VITE_WS_URL: 'ws://localhost:3002'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
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
