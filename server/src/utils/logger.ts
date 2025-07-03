// 📝 Sistema de logging para Smart-Trade
import winston from 'winston';
import path from 'path';

// Configuração do formato de log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'APP'}] ${level.toUpperCase()}: ${message} ${metaStr}`;
  })
);

// Logger principal
const mainLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // Arquivo para logs gerais
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Arquivo separado para erros
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Logger específico para Cedro API
const cedroLogger = winston.createLogger({
  level: process.env.CEDRO_LOG_LEVEL || 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'cedro.log'),
      maxsize: 10485760, // 10MB (mais dados da API)
      maxFiles: 10
    })
  ]
});

// Factory function para criar loggers com contexto
export function createLogger(service: string): winston.Logger {
  if (service.toLowerCase().includes('cedro')) {
    return cedroLogger.child({ service });
  }
  
  return mainLogger.child({ service });
}

// Logger padrão
export const logger = mainLogger;

// Configurar tratamento de exceções não capturadas
if (process.env.NODE_ENV !== 'test') {
  mainLogger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  );
  
  mainLogger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  );
}

export default mainLogger;
