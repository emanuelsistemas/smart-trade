// 🔐 Gerenciador de Autenticação JWT para Smart-Trade
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthManager');

export interface UserCredentials {
  username: string;
  password: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  maxSessions: number;
}

export class AuthManager {
  private config: AuthConfig;
  private users: Map<string, UserProfile> = new Map();
  private activeSessions: Map<string, Set<string>> = new Map(); // userId -> Set<tokenId>

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializeDefaultUsers();
    logger.info('🔐 Auth Manager inicializado');
  }

  private initializeDefaultUsers(): void {
    // Usuário padrão para desenvolvimento
    const defaultUser: UserProfile = {
      userId: 'user-001',
      username: 'trader',
      permissions: ['read:quotes', 'read:trades', 'read:orderflow', 'read:footprint'],
      createdAt: new Date()
    };

    this.users.set('trader', defaultUser);
    
    // Usuário admin
    const adminUser: UserProfile = {
      userId: 'admin-001',
      username: 'admin',
      permissions: ['*'], // Todas as permissões
      createdAt: new Date()
    };

    this.users.set('admin', adminUser);
    
    logger.info('👥 Usuários padrão criados:', {
      users: Array.from(this.users.keys())
    });
  }

  async authenticate(credentials: UserCredentials): Promise<string | null> {
    try {
      const { username, password } = credentials;
      
      // Validação básica (em produção, usar hash + salt)
      if (!this.isValidCredentials(username, password)) {
        logger.warn('🚫 Tentativa de login inválida:', { username });
        return null;
      }

      const user = this.users.get(username);
      if (!user) {
        logger.warn('🚫 Usuário não encontrado:', { username });
        return null;
      }

      // Verificar limite de sessões
      const userSessions = this.activeSessions.get(user.userId) || new Set();
      if (userSessions.size >= this.config.maxSessions) {
        logger.warn('🚫 Limite de sessões atingido:', { 
          userId: user.userId, 
          sessions: userSessions.size 
        });
        return null;
      }

      // Gerar token JWT
      const tokenId = this.generateTokenId();
      const jwtPayload = {
        userId: user.userId,
        username: user.username,
        permissions: user.permissions,
        tokenId
      };

      const token = jwt.sign(jwtPayload, this.config.jwtSecret);

      // Registrar sessão ativa
      if (!this.activeSessions.has(user.userId)) {
        this.activeSessions.set(user.userId, new Set());
      }
      this.activeSessions.get(user.userId)!.add(tokenId);

      // Atualizar último login
      user.lastLogin = new Date();

      logger.info('✅ Login bem-sucedido:', {
        userId: user.userId,
        username: user.username,
        tokenId: tokenId.substring(0, 8) + '...'
      });

      return token;

    } catch (error) {
      logger.error('❌ Erro na autenticação:', error);
      return null;
    }
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      // Verificar se é um token de desenvolvimento
      if (token === 'dev-token' || token === 'trader-dev-token' || token.startsWith('demo-')) {
        logger.info('🔓 Token de desenvolvimento aceito');
        return {
          userId: 'dev-trader',
          username: 'trader',
          permissions: ['read', 'subscribe'],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
      }

      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload & { tokenId: string };

      // Verificar se sessão ainda está ativa
      const userSessions = this.activeSessions.get(decoded.userId);
      if (!userSessions || !userSessions.has(decoded.tokenId)) {
        logger.warn('🚫 Token de sessão inválida:', {
          userId: decoded.userId,
          tokenId: decoded.tokenId.substring(0, 8) + '...'
        });
        return null;
      }

      return decoded;

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('🚫 Token JWT inválido:', error.message);

        // Para desenvolvimento, aceitar qualquer token que contenha 'trader'
        if (token.includes('trader')) {
          logger.info('🔓 Fallback de desenvolvimento: token aceito');
          return {
            userId: 'dev-trader',
            username: 'trader',
            permissions: ['read', 'subscribe'],
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
          };
        }
      } else {
        logger.error('❌ Erro ao verificar token:', error);
      }
      return null;
    }
  }

  revokeToken(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload & { tokenId: string };
      if (!decoded || !decoded.userId || !decoded.tokenId) {
        return false;
      }

      const userSessions = this.activeSessions.get(decoded.userId);
      if (userSessions) {
        const removed = userSessions.delete(decoded.tokenId);
        
        if (removed) {
          logger.info('🚪 Token revogado:', {
            userId: decoded.userId,
            tokenId: decoded.tokenId.substring(0, 8) + '...'
          });
        }
        
        return removed;
      }

      return false;

    } catch (error) {
      logger.error('❌ Erro ao revogar token:', error);
      return false;
    }
  }

  revokeAllUserSessions(userId: string): number {
    const userSessions = this.activeSessions.get(userId);
    if (userSessions) {
      const count = userSessions.size;
      userSessions.clear();
      
      logger.info('🚪 Todas as sessões revogadas:', { userId, count });
      return count;
    }
    
    return 0;
  }

  hasPermission(token: string, permission: string): boolean {
    const payload = this.verifyToken(token);
    if (!payload) {
      return false;
    }

    // Admin tem todas as permissões
    if (payload.permissions.includes('*')) {
      return true;
    }

    // Verificar permissão específica
    return payload.permissions.includes(permission);
  }

  getUserProfile(userId: string): UserProfile | null {
    for (const user of this.users.values()) {
      if (user.userId === userId) {
        return { ...user }; // Retornar cópia
      }
    }
    return null;
  }

  createUser(username: string, permissions: string[]): UserProfile {
    if (this.users.has(username)) {
      throw new Error(`Usuário ${username} já existe`);
    }

    const user: UserProfile = {
      userId: this.generateUserId(),
      username,
      permissions,
      createdAt: new Date()
    };

    this.users.set(username, user);
    
    logger.info('👤 Usuário criado:', {
      userId: user.userId,
      username,
      permissions
    });

    return { ...user };
  }

  updateUserPermissions(username: string, permissions: string[]): boolean {
    const user = this.users.get(username);
    if (!user) {
      return false;
    }

    user.permissions = [...permissions];
    
    logger.info('🔧 Permissões atualizadas:', {
      userId: user.userId,
      username,
      permissions
    });

    return true;
  }

  getActiveSessionsCount(userId: string): number {
    const userSessions = this.activeSessions.get(userId);
    return userSessions ? userSessions.size : 0;
  }

  getSystemStats(): object {
    const totalUsers = this.users.size;
    const totalSessions = Array.from(this.activeSessions.values())
      .reduce((acc, sessions) => acc + sessions.size, 0);
    
    const userStats = Array.from(this.users.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      activeSessions: this.getActiveSessionsCount(user.userId),
      lastLogin: user.lastLogin,
      permissions: user.permissions.length
    }));

    return {
      totalUsers,
      totalSessions,
      maxSessionsPerUser: this.config.maxSessions,
      users: userStats
    };
  }

  // === MÉTODOS PRIVADOS ===

  private isValidCredentials(username: string, password: string): boolean {
    // Validação simples para desenvolvimento
    // Em produção, usar hash bcrypt + salt
    const validCredentials = {
      'trader': 'trader123',
      'admin': 'admin123'
    };

    return validCredentials[username as keyof typeof validCredentials] === password;
  }

  private generateTokenId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateUserId(): string {
    return 'user-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // === LIMPEZA ===

  cleanup(): void {
    logger.info('🧹 Limpando Auth Manager...');
    
    // Limpar sessões expiradas
    let expiredSessions = 0;
    
    for (const [userId, sessions] of this.activeSessions) {
      const validSessions = new Set<string>();
      
      for (const tokenId of sessions) {
        // Em uma implementação real, verificaríamos se o token ainda é válido
        // Por simplicidade, mantemos todas as sessões por enquanto
        validSessions.add(tokenId);
      }
      
      if (validSessions.size !== sessions.size) {
        expiredSessions += sessions.size - validSessions.size;
        this.activeSessions.set(userId, validSessions);
      }
    }
    
    if (expiredSessions > 0) {
      logger.info(`🧹 ${expiredSessions} sessões expiradas removidas`);
    }
  }

  shutdown(): void {
    logger.info('🛑 Parando Auth Manager...');
    
    // Revogar todas as sessões
    let totalSessions = 0;
    for (const sessions of this.activeSessions.values()) {
      totalSessions += sessions.size;
      sessions.clear();
    }
    
    this.activeSessions.clear();
    
    logger.info(`✅ Auth Manager parado (${totalSessions} sessões revogadas)`);
  }
}
