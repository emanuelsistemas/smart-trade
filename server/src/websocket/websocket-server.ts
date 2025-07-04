// 🌐 Servidor WebSocket para Smart-Trade
import WebSocket from 'ws';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebSocketServer');

export interface WebSocketConfig {
  port: number;
  host: string;
  jwtSecret: string;
  heartbeatInterval: number;
  maxConnections: number;
}

export interface ClientConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: number;
  authenticated: boolean;
  connectedAt: Date;
  metadata: any;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  clientId?: string;
}

export class TradingWebSocketServer extends EventEmitter {
  private server!: WebSocket.Server;
  private httpServer: any;
  private config: WebSocketConfig;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    logger.info('🌐 Inicializando WebSocket Server', { 
      port: config.port, 
      host: config.host 
    });
  }

  async start(): Promise<void> {
    try {
      // Criar servidor HTTP
      this.httpServer = createServer();
      
      // Criar servidor WebSocket
      this.server = new WebSocket.Server({
        server: this.httpServer,
        verifyClient: (info: any) => this.verifyClient(info)
      });

      // Setup event handlers
      this.setupEventHandlers();

      // Iniciar servidor HTTP
      await new Promise<void>((resolve, reject) => {
        this.httpServer.listen(this.config.port, this.config.host, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Iniciar heartbeat
      this.startHeartbeat();
      
      this.isRunning = true;
      logger.info(`✅ WebSocket Server iniciado em ws://${this.config.host}:${this.config.port}`);
      
    } catch (error) {
      logger.error('❌ Erro ao iniciar WebSocket Server:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.server.on('connection', (ws, request) => {
      this.handleNewConnection(ws, request);
    });

    this.server.on('error', (error) => {
      logger.error('❌ Erro no WebSocket Server:', error);
      this.emit('error', error);
    });
  }

  private verifyClient(info: any): boolean {
    // Verificar origem, rate limiting, etc.
    const origin = info.origin;
    const userAgent = info.req.headers['user-agent'];
    
    logger.debug('🔍 Verificando cliente:', { origin, userAgent });
    
    // Por enquanto, aceitar todas as conexões
    // TODO: Implementar verificações de segurança mais rigorosas
    return true;
  }

  private handleNewConnection(ws: WebSocket, request: any): void {
    const clientId = uuidv4();
    const client: ClientConnection = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
      authenticated: false,
      connectedAt: new Date(),
      metadata: {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent']
      }
    };

    this.clients.set(clientId, client);
    
    logger.info('🔌 Nova conexão WebSocket:', {
      clientId,
      ip: client.metadata.ip,
      totalClients: this.clients.size
    });

    // Setup event handlers para este cliente
    ws.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });

    ws.on('close', (code, reason) => {
      this.handleClientDisconnect(clientId, code, reason);
    });

    ws.on('error', (error) => {
      logger.error(`❌ Erro no cliente ${clientId}:`, error);
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    // Enviar mensagem de boas-vindas
    this.sendToClient(clientId, {
      type: 'welcome',
      payload: {
        clientId,
        serverTime: Date.now(),
        version: '1.0.0'
      },
      timestamp: Date.now()
    });

    this.emit('clientConnected', client);
  }

  private handleClientMessage(clientId: string, data: WebSocket.Data): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        logger.warn(`⚠️ Mensagem de cliente inexistente: ${clientId}`);
        return;
      }

      const message = JSON.parse(data.toString()) as WebSocketMessage;
      message.clientId = clientId;
      message.timestamp = Date.now();

      logger.debug(`📨 Mensagem recebida de ${clientId}:`, {
        type: message.type,
        authenticated: client.authenticated
      });

      // Processar mensagem baseada no tipo
      switch (message.type) {
        case 'auth':
          this.handleAuthentication(clientId, message);
          break;
          
        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;
          
        case 'ping':
          this.handlePing(clientId, message);
          break;
          
        default:
          if (client.authenticated) {
            this.emit('clientMessage', client, message);
          } else {
            this.sendError(clientId, 'NOT_AUTHENTICATED', 'Cliente não autenticado');
          }
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao processar mensagem de ${clientId}:`, error);
      this.sendError(clientId, 'INVALID_MESSAGE', 'Formato de mensagem inválido');
    }
  }

  private handleAuthentication(clientId: string, message: WebSocketMessage): void {
    try {
      const { token } = message.payload;

      if (!token) {
        this.sendError(clientId, 'MISSING_TOKEN', 'Token de autenticação obrigatório');
        return;
      }

      logger.info(`🔐 Tentando autenticar token: ${token.substring(0, 20)}...`);

      // Para desenvolvimento, aceitar tokens simples
      let isValidToken = false;
      let userId = 'dev-trader';
      let permissions = ['read', 'subscribe'];

      if (token === 'trader-dev-token' ||
          token === 'dev-token' ||
          token.includes('trader') ||
          token.startsWith('demo-')) {
        isValidToken = true;
        logger.info('🔓 Token de desenvolvimento aceito');
      } else {
        // Tentar verificar JWT normal
        try {
          const decoded = jwt.verify(token, this.config.jwtSecret) as any;
          if (decoded) {
            isValidToken = true;
            userId = decoded.userId || decoded.sub || 'trader';
            permissions = decoded.permissions || ['read', 'subscribe'];
            logger.info('🔓 Token JWT válido');
          }
        } catch (jwtError) {
          logger.warn('⚠️ JWT inválido, mas aceitando para desenvolvimento');
          // Para desenvolvimento, aceitar qualquer token
          isValidToken = true;
        }
      }

      if (!isValidToken) {
        this.sendError(clientId, 'AUTH_FAILED', 'Token inválido ou expirado');
        return;
      }

      const client = this.clients.get(clientId);
      if (client) {
        client.authenticated = true;
        client.userId = userId;

        logger.info(`✅ Cliente autenticado: ${clientId}`, {
          userId: client.userId
        });

        this.sendToClient(clientId, {
          type: 'authSuccess',
          payload: {
            userId: client.userId,
            permissions
          },
          timestamp: Date.now()
        });

        this.emit('clientAuthenticated', client);
      }

    } catch (error) {
      logger.error(`❌ Falha na autenticação de ${clientId}:`, error);
      this.sendError(clientId, 'AUTH_FAILED', 'Token inválido ou expirado');
    }
  }

  private handleSubscription(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'NOT_AUTHENTICATED', 'Autenticação necessária');
      return;
    }

    const { channel } = message.payload;
    if (!channel) {
      this.sendError(clientId, 'MISSING_CHANNEL', 'Canal de subscrição obrigatório');
      return;
    }

    client.subscriptions.add(channel);
    
    logger.info(`📡 Cliente subscrito: ${clientId} → ${channel}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { channel },
      timestamp: Date.now()
    });

    this.emit('clientSubscribed', client, channel);
  }

  private handleUnsubscription(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel } = message.payload;
    if (channel) {
      client.subscriptions.delete(channel);
      
      logger.info(`📡 Cliente desinscrito: ${clientId} ← ${channel}`);

      this.sendToClient(clientId, {
        type: 'unsubscribed',
        payload: { channel },
        timestamp: Date.now()
      });

      this.emit('clientUnsubscribed', client, channel);
    }
  }

  private handlePing(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
      
      this.sendToClient(clientId, {
        type: 'pong',
        payload: { timestamp: Date.now() },
        timestamp: Date.now()
      });
    }
  }

  private handleClientDisconnect(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      logger.info(`❌ Cliente desconectado: ${clientId}`, {
        code,
        reason: reason.toString(),
        duration: Date.now() - client.connectedAt.getTime()
      });

      this.clients.delete(clientId);
      this.emit('clientDisconnected', client, code, reason);
    }
  }

  // === MÉTODOS PÚBLICOS ===

  sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`❌ Erro ao enviar para cliente ${clientId}:`, error);
      return false;
    }
  }

  sendError(clientId: string, code: string, message: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { code, message },
      timestamp: Date.now()
    });
  }

  broadcast(message: WebSocketMessage, filter?: (client: ClientConnection) => boolean): number {
    let sent = 0;
    
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN && client.authenticated) {
        if (!filter || filter(client)) {
          if (this.sendToClient(client.id, message)) {
            sent++;
          }
        }
      }
    }
    
    logger.debug(`📡 Broadcast enviado para ${sent} clientes`);
    return sent;
  }

  broadcastToChannel(channel: string, message: WebSocketMessage): number {
    return this.broadcast(message, (client) => client.subscriptions.has(channel));
  }

  // === HEARTBEAT ===

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
    
    logger.debug('💓 Heartbeat iniciado', { interval: this.config.heartbeatInterval });
  }

  private performHeartbeat(): void {
    const now = Date.now();
    const timeout = this.config.heartbeatInterval * 2; // 2x o intervalo
    
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Verificar se cliente respondeu ao último ping
        if (now - client.lastPing > timeout) {
          logger.warn(`⏰ Cliente sem resposta: ${clientId}, desconectando`);
          client.ws.terminate();
          continue;
        }
        
        // Enviar ping
        try {
          client.ws.ping();
        } catch (error) {
          logger.error(`❌ Erro ao enviar ping para ${clientId}:`, error);
        }
      } else {
        // Remover clientes desconectados
        this.clients.delete(clientId);
      }
    }
  }

  // === ESTATÍSTICAS ===

  getStats(): object {
    const clients = Array.from(this.clients.values());
    const authenticated = clients.filter(c => c.authenticated).length;
    const subscriptions = clients.reduce((acc, c) => acc + c.subscriptions.size, 0);
    
    return {
      isRunning: this.isRunning,
      totalClients: this.clients.size,
      authenticatedClients: authenticated,
      totalSubscriptions: subscriptions,
      uptime: this.isRunning ? Date.now() - (this.heartbeatTimer ? 0 : Date.now()) : 0
    };
  }

  getClientList(): object[] {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      authenticated: client.authenticated,
      subscriptions: Array.from(client.subscriptions),
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
      ip: client.metadata.ip
    }));
  }

  // === SHUTDOWN ===

  async stop(): Promise<void> {
    logger.info('🛑 Parando WebSocket Server...');
    
    this.isRunning = false;
    
    // Parar heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Fechar todas as conexões
    for (const client of this.clients.values()) {
      try {
        client.ws.close(1001, 'Server shutdown');
      } catch (error) {
        // Ignorar erros de fechamento
      }
    }
    
    // Fechar servidor
    if (this.server) {
      this.server.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    this.clients.clear();
    
    logger.info('✅ WebSocket Server parado');
  }
}
