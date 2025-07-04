module.exports = {
  apps: [
    {
      // Backend (Servidor)
      name: 'smart-trade-backend',
      script: './server/dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
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
    }
  ],

  // Configuração de deploy
  deploy: {
    production: {
      user: 'root',
      host: ['SEU_IP_VPS'],
      ref: 'origin/master',
      repo: 'https://github.com/emanuelsistemas/smart-trade.git',
      path: '/var/www/smart-trade',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd server && npm install && npm run build && cd ../client && npm install && npm run build && cd .. && pm2 reload ecosystem.linux.config.js --env production',
      'pre-setup': 'apt update && apt install -y nodejs npm git'
    }
  }
};
