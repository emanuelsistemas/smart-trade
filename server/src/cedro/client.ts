// 📡 Cliente TCP para Cedro Crystal API
import net from 'net';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('CedroClient');

export interface CedroConfig {
  host: string;
  port: number;
  softwareKey?: string;
  username: string;
  password: string;
  timeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

export class CedroTcpClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: CedroConfig;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageBuffer: string = '';

  constructor(config: CedroConfig) {
    super();
    this.config = config;
    logger.info('🔧 Cliente Cedro inicializado', { host: config.host, port: config.port });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('🔌 Iniciando conexão TCP com Cedro Crystal...');
        
        this.socket = new net.Socket();
        
        // Configurar timeout
        this.socket.setTimeout(this.config.timeout);
        
        // Event handlers
        this.socket.on('connect', () => {
          logger.info('✅ Conexão TCP estabelecida com sucesso');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // Iniciar processo de autenticação
          this.startAuthentication()
            .then(() => resolve())
            .catch(reject);
        });

        this.socket.on('data', (data) => {
          this.handleRawData(data);
        });

        this.socket.on('close', () => {
          logger.warn('❌ Conexão TCP fechada');
          this.isConnected = false;
          this.isAuthenticated = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.socket.on('error', (error) => {
          logger.error('❌ Erro de conexão TCP:', error);
          this.emit('error', error);
          reject(error);
        });

        this.socket.on('timeout', () => {
          logger.error('⏰ Timeout de conexão');
          this.socket?.destroy();
          reject(new Error('Connection timeout'));
        });

        // Conectar
        logger.info(`🔗 Conectando em ${this.config.host}:${this.config.port}`);
        this.socket.connect(this.config.port, this.config.host);
        
      } catch (error) {
        logger.error('❌ Erro ao iniciar conexão:', error);
        reject(error);
      }
    });
  }

  private async startAuthentication(): Promise<void> {
    logger.info('🔐 Iniciando processo de autenticação...');
    
    try {
      // Aguardar prompt inicial (pequeno delay para estabilizar)
      await this.sleep(1000);
      
      // 1. Software Key (ENTER se não tiver)
      const softwareKey = this.config.softwareKey || '';
      logger.info('📤 Enviando Software Key...');
      this.sendRaw(softwareKey);
      
      await this.sleep(500);
      
      // 2. Username
      logger.info('📤 Enviando Username...');
      this.sendRaw(this.config.username);
      
      await this.sleep(500);
      
      // 3. Password
      logger.info('📤 Enviando Password...');
      this.sendRaw(this.config.password);
      
      logger.info('⏳ Aguardando confirmação de autenticação...');
      
    } catch (error) {
      logger.error('❌ Erro na autenticação:', error);
      throw error;
    }
  }

  private handleRawData(data: Buffer): void {
    const message = data.toString('utf8');
    
    // Adicionar ao buffer para lidar com mensagens fragmentadas
    this.messageBuffer += message;
    
    // Processar mensagens completas (terminadas com \n ou \r\n)
    const lines = this.messageBuffer.split(/\r?\n/);
    
    // Manter a última linha no buffer se não terminar com quebra
    this.messageBuffer = lines.pop() || '';
    
    // Processar cada linha completa
    lines.forEach(line => {
      if (line.trim()) {
        this.processMessage(line.trim());
      }
    });
  }

  private processMessage(message: string): void {
    logger.debug('📨 Mensagem recebida:', message);
    
    // Verificar se é confirmação de autenticação
    if (message.includes('You are connected')) {
      logger.info('✅ Autenticação bem-sucedida!');
      this.isAuthenticated = true;
      this.emit('authenticated');
      return;
    }
    
    // Verificar se é erro de autenticação
    if (message.includes('Invalid') || message.includes('Error') || message.includes('Denied')) {
      logger.error('❌ Falha na autenticação:', message);
      this.emit('authError', message);
      return;
    }
    
    // Se autenticado, processar mensagens de dados
    if (this.isAuthenticated) {
      this.emit('message', message);
    } else {
      // Durante autenticação, logar mensagens para debug
      logger.debug('🔐 Mensagem durante autenticação:', message);
    }
  }

  private sendRaw(data: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Cliente não conectado');
    }
    
    const message = data + '\r\n';
    logger.debug('📤 Enviando dados brutos:', { data, length: message.length });
    this.socket.write(message);
  }

  send(command: string): void {
    if (!this.isAuthenticated) {
      throw new Error('Cliente não autenticado');
    }
    
    logger.info('📤 Enviando comando:', command);
    this.sendRaw(command);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('❌ Máximo de tentativas de reconexão atingido');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts; // Backoff exponencial
    
    logger.warn(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} em ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        logger.error('❌ Falha na reconexão:', error);
      });
    }, delay);
  }

  disconnect(): void {
    logger.info('🔌 Desconectando cliente Cedro...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    
    logger.info('✅ Cliente desconectado');
  }

  // Getters para status
  get connected(): boolean {
    return this.isConnected;
  }

  get authenticated(): boolean {
    return this.isAuthenticated;
  }

  get connectionInfo(): object {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      host: this.config.host,
      port: this.config.port
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
