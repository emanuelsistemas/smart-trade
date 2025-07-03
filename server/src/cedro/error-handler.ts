// 🚨 Tratamento de erros da Cedro API
import { createLogger } from '../utils/logger';

const logger = createLogger('CedroErrorHandler');

export interface CedroError {
  code: number;
  message: string;
  description: string;
  recoverable: boolean;
  fatal: boolean;
  action: string;
}

export class CedroErrorHandler {
  // Mapeamento dos códigos de erro conforme documentação Cedro
  private static readonly ERROR_CODES: Record<number, Omit<CedroError, 'code'>> = {
    1: {
      message: 'Comando inválido',
      description: 'O comando enviado não é reconhecido pelo sistema',
      recoverable: false,
      fatal: false,
      action: 'Verificar sintaxe do comando'
    },
    2: {
      message: 'Objeto não encontrado',
      description: 'O símbolo ou objeto solicitado não existe',
      recoverable: false,
      fatal: false,
      action: 'Verificar se o símbolo está correto e ativo'
    },
    3: {
      message: 'Sem permissão',
      description: 'Usuário não tem permissão para acessar este recurso',
      recoverable: false,
      fatal: true,
      action: 'Verificar permissões do usuário na Cedro'
    },
    4: {
      message: 'Parâmetro vazio',
      description: 'Um parâmetro obrigatório não foi fornecido',
      recoverable: false,
      fatal: false,
      action: 'Verificar parâmetros do comando'
    },
    5: {
      message: 'Não há parâmetros',
      description: 'Comando requer parâmetros mas nenhum foi fornecido',
      recoverable: false,
      fatal: false,
      action: 'Adicionar parâmetros necessários ao comando'
    },
    6: {
      message: 'Segunda conexão com mesmo usuário',
      description: 'Usuário já está conectado em outra sessão',
      recoverable: true,
      fatal: false,
      action: 'Aguardar desconexão da sessão anterior ou usar outro usuário'
    },
    7: {
      message: 'Usuário sem acesso',
      description: 'Usuário não tem acesso ao sistema',
      recoverable: false,
      fatal: true,
      action: 'Verificar credenciais e status da conta'
    },
    8: {
      message: 'Conexão duplicada em outro servidor',
      description: 'Usuário conectado em outro servidor',
      recoverable: true,
      fatal: false,
      action: 'Aguardar ou desconectar da outra sessão'
    },
    9: {
      message: 'Permissões perdidas',
      description: 'Usuário perdeu permissões durante a sessão',
      recoverable: false,
      fatal: true,
      action: 'Reconectar ou verificar status da conta'
    },
    10: {
      message: 'Parâmetro inválido',
      description: 'Um dos parâmetros fornecidos é inválido',
      recoverable: false,
      fatal: false,
      action: 'Verificar formato e valores dos parâmetros'
    },
    11: {
      message: 'Servidor indisponível',
      description: 'Servidor Cedro temporariamente indisponível',
      recoverable: true,
      fatal: false,
      action: 'Aguardar e tentar reconectar'
    },
    12: {
      message: 'Servidor será indisponível',
      description: 'Servidor entrará em manutenção em breve',
      recoverable: true,
      fatal: false,
      action: 'Preparar para desconexão e reconexão posterior'
    },
    13: {
      message: 'SUID inválido',
      description: 'Identificador de sessão inválido',
      recoverable: false,
      fatal: true,
      action: 'Reconectar com novas credenciais'
    },
    14: {
      message: 'Request ID muito grande',
      description: 'ID da requisição excede o limite permitido',
      recoverable: false,
      fatal: false,
      action: 'Usar ID menor para a requisição'
    },
    15: {
      message: 'Erro de banco de dados',
      description: 'Erro interno no banco de dados do servidor',
      recoverable: true,
      fatal: false,
      action: 'Tentar novamente após alguns segundos'
    },
    16: {
      message: 'Notícia não encontrada',
      description: 'Notícia solicitada não existe',
      recoverable: false,
      fatal: false,
      action: 'Verificar ID da notícia'
    },
    17: {
      message: 'Erro de permissão de serviço',
      description: 'Serviço específico não permitido para este usuário',
      recoverable: false,
      fatal: true,
      action: 'Verificar permissões específicas do serviço'
    },
    18: {
      message: 'Erro quantidade quotes',
      description: 'Limite de subscrições de cotações atingido',
      recoverable: false,
      fatal: false,
      action: 'Cancelar algumas subscrições antes de criar novas'
    }
  };

  static handleError(errorCode: string, message: string): CedroError {
    const code = parseInt(errorCode);
    const errorInfo = this.ERROR_CODES[code];
    
    if (!errorInfo) {
      logger.error(`❌ Código de erro desconhecido: ${code}`, { message });
      return {
        code,
        message: message || 'Erro desconhecido',
        description: 'Código de erro não documentado',
        recoverable: false,
        fatal: false,
        action: 'Verificar documentação ou contatar suporte'
      };
    }

    const error: CedroError = {
      code,
      ...errorInfo
    };

    // Log do erro com nível apropriado
    if (error.fatal) {
      logger.error(`🚨 Erro FATAL Cedro ${code}: ${error.message}`, {
        description: error.description,
        action: error.action,
        originalMessage: message
      });
    } else if (error.recoverable) {
      logger.warn(`⚠️ Erro RECUPERÁVEL Cedro ${code}: ${error.message}`, {
        description: error.description,
        action: error.action,
        originalMessage: message
      });
    } else {
      logger.error(`❌ Erro Cedro ${code}: ${error.message}`, {
        description: error.description,
        action: error.action,
        originalMessage: message
      });
    }

    return error;
  }

  static isRecoverableError(errorCode: string | number): boolean {
    const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode;
    const errorInfo = this.ERROR_CODES[code];
    return errorInfo?.recoverable || false;
  }

  static isFatalError(errorCode: string | number): boolean {
    const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode;
    const errorInfo = this.ERROR_CODES[code];
    return errorInfo?.fatal || false;
  }

  static shouldReconnect(errorCode: string | number): boolean {
    const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode;
    // Erros que sugerem reconexão
    return [6, 8, 9, 11, 12, 13].includes(code);
  }

  static shouldRetryCommand(errorCode: string | number): boolean {
    const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode;
    // Erros que permitem retry do comando
    return [11, 15].includes(code);
  }

  static getRetryDelay(errorCode: string | number): number {
    const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode;
    
    switch (code) {
      case 6: // Segunda conexão
      case 8: // Conexão duplicada
        return 30000; // 30 segundos
      case 11: // Servidor indisponível
      case 15: // Erro de banco
        return 5000; // 5 segundos
      case 12: // Servidor será indisponível
        return 60000; // 1 minuto
      default:
        return 10000; // 10 segundos padrão
    }
  }

  static getErrorSummary(): Record<string, any> {
    const summary = {
      totalErrors: Object.keys(this.ERROR_CODES).length,
      recoverableErrors: 0,
      fatalErrors: 0,
      categories: {
        connection: [6, 7, 8, 9, 11, 12, 13],
        permission: [3, 7, 9, 17],
        parameter: [1, 4, 5, 10, 14],
        resource: [2, 16, 18],
        system: [11, 12, 15]
      }
    };

    Object.values(this.ERROR_CODES).forEach(error => {
      if (error.recoverable) summary.recoverableErrors++;
      if (error.fatal) summary.fatalErrors++;
    });

    return summary;
  }

  static formatErrorForUser(error: CedroError): string {
    return `Erro ${error.code}: ${error.message}. ${error.action}`;
  }

  static formatErrorForLog(error: CedroError, context?: any): object {
    return {
      code: error.code,
      message: error.message,
      description: error.description,
      recoverable: error.recoverable,
      fatal: error.fatal,
      action: error.action,
      context
    };
  }
}
