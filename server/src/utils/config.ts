// ⚙️ Configurações do Smart-Trade
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Forçar reload das variáveis

export interface AppConfig {
  // Servidor
  server: {
    port: number;
    host: string;
    env: string;
  };
  
  // Cedro API
  cedro: {
    host: string;
    port: number;
    softwareKey?: string;
    username: string;
    password: string;
    timeout: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
  };
  
  // WebSocket
  websocket: {
    port: number;
    host: string;
    heartbeatInterval: number;
    jwtSecret: string;
    jwtExpiresIn: string;
    maxConnections: number;
    maxSessions: number;
  };
  
  // Logging
  logging: {
    level: string;
    cedroLevel: string;
    maxFiles: number;
    maxSize: string;
  };
  
  // Dados
  data: {
    sqlitePath: string;
    redisUrl?: string;
    batchSize: number;
    bufferSize: number;
  };
}

// Função para criar configuração dinamicamente
function createConfig(): AppConfig {
  return {
    server: {
      port: parseInt(process.env.SERVER_PORT || '3001'),
      host: process.env.SERVER_HOST || 'localhost',
      env: process.env.NODE_ENV || 'development'
    },

    cedro: {
      host: process.env.CEDRO_HOST || 'localhost',
      port: parseInt(process.env.CEDRO_PORT || '81'),
      softwareKey: process.env.CEDRO_SOFTWARE_KEY || '',
      username: process.env.CEDRO_USERNAME || '',
      password: process.env.CEDRO_PASSWORD || '',
      timeout: parseInt(process.env.CEDRO_TIMEOUT || '30000'),
      maxReconnectAttempts: parseInt(process.env.CEDRO_MAX_RECONNECT || '5'),
      reconnectDelay: parseInt(process.env.CEDRO_RECONNECT_DELAY || '5000')
    },

    websocket: {
      port: parseInt(process.env.WS_PORT || '3002'),
      host: process.env.WS_HOST || 'localhost',
      heartbeatInterval: parseInt(process.env.WS_HEARTBEAT || '30000'),
      jwtSecret: process.env.JWT_SECRET || 'smart-trade-secret-key-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '100'),
      maxSessions: parseInt(process.env.WS_MAX_SESSIONS || '3')
    },

    logging: {
      level: process.env.LOG_LEVEL || 'info',
      cedroLevel: process.env.CEDRO_LOG_LEVEL || 'debug',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      maxSize: process.env.LOG_MAX_SIZE || '5242880'
    },

    data: {
      sqlitePath: process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'smart-trade.db'),
      redisUrl: process.env.REDIS_URL,
      batchSize: parseInt(process.env.DATA_BATCH_SIZE || '100'),
      bufferSize: parseInt(process.env.DATA_BUFFER_SIZE || '1000')
    }
  };
}

// Validar configuração
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];
  
  // Validar Cedro
  if (!config.cedro.host) {
    errors.push('CEDRO_HOST é obrigatório');
  }
  
  if (!config.cedro.username) {
    errors.push('CEDRO_USERNAME é obrigatório');
  }
  
  if (!config.cedro.password) {
    errors.push('CEDRO_PASSWORD é obrigatório');
  }
  
  // Validar portas
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('SERVER_PORT deve estar entre 1 e 65535');
  }
  
  if (config.websocket.port < 1 || config.websocket.port > 65535) {
    errors.push('WS_PORT deve estar entre 1 e 65535');
  }
  
  if (config.cedro.port < 1 || config.cedro.port > 65535) {
    errors.push('CEDRO_PORT deve estar entre 1 e 65535');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuração inválida:\n${errors.join('\n')}`);
  }
}

// Exportar configuração validada
export const config: AppConfig = (() => {
  try {
    const currentConfig = createConfig();
    validateConfig(currentConfig);
    return currentConfig;
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
    process.exit(1);
  }
})();

// Função para criar arquivo .env de exemplo
export function createEnvExample(): string {
  return `# 🚀 Smart-Trade - Configurações de Ambiente

# Servidor
SERVER_PORT=3001
SERVER_HOST=localhost
NODE_ENV=development

# Cedro API
CEDRO_HOST=seu-host-cedro.com
CEDRO_PORT=81
CEDRO_SOFTWARE_KEY=
CEDRO_USERNAME=seu-usuario
CEDRO_PASSWORD=sua-senha
CEDRO_TIMEOUT=30000
CEDRO_MAX_RECONNECT=5
CEDRO_RECONNECT_DELAY=5000

# WebSocket
WS_PORT=3002
WS_HOST=localhost
WS_HEARTBEAT=30000

# Logging
LOG_LEVEL=info
CEDRO_LOG_LEVEL=debug
LOG_MAX_FILES=5
LOG_MAX_SIZE=5242880

# Dados
SQLITE_PATH=./data/smart-trade.db
REDIS_URL=redis://localhost:6379
DATA_BATCH_SIZE=100
DATA_BUFFER_SIZE=1000
`;
}

// Função para exibir configuração (sem senhas)
export function getConfigSummary(): object {
  return {
    server: config.server,
    cedro: {
      ...config.cedro,
      password: '***',
      username: config.cedro.username ? '***' : 'NOT_SET'
    },
    websocket: config.websocket,
    logging: config.logging,
    data: {
      ...config.data,
      redisUrl: config.data.redisUrl ? '***' : 'NOT_SET'
    }
  };
}

export default config;
