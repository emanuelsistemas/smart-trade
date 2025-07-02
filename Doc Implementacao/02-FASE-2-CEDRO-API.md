# 📡 FASE 2: Integração Cedro API

## 🎯 Objetivo da Fase
Implementar cliente TCP/Telnet para conexão com Cedro Crystal, estabelecer autenticação e criar sistema de recebimento de dados em tempo real.

## ⏱️ Duração Estimada
**5-7 dias** (40-56 horas de desenvolvimento)

## 📋 Pré-requisitos
- ✅ Fase 1 concluída (Checkpoint 1 validado)
- 📄 Documentação Cedro API disponível
- 🔑 Credenciais de acesso Cedro (para testes)

## 📋 Tarefas da Fase

### **2.1 Implementar Cliente TCP Base**
**Duração**: 8-12 horas

#### **Arquivo**: `server/src/cedro/client.ts`
```typescript
import net from 'net';
import { EventEmitter } from 'events';
import { CedroConfig, CedroMessage } from '@smart-trade/shared/types/cedro';

export class CedroTcpClient extends EventEmitter {
    private socket: net.Socket | null = null;
    private config: CedroConfig;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 5000;

    constructor(config: CedroConfig) {
        super();
        this.config = config;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            // Configurar timeout
            this.socket.setTimeout(30000);
            
            // Event handlers
            this.socket.on('connect', () => {
                console.log('🔌 Conectado ao Cedro Crystal');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleRawData(data);
            });

            this.socket.on('close', () => {
                console.log('❌ Conexão fechada');
                this.isConnected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            });

            this.socket.on('error', (error) => {
                console.error('❌ Erro de conexão:', error);
                this.emit('error', error);
                reject(error);
            });

            // Conectar
            this.socket.connect(this.config.port, this.config.host);
        });
    }

    private handleRawData(data: Buffer): void {
        const message = data.toString('utf8');
        console.log('📨 Dados recebidos:', message);
        
        // Processar múltiplas mensagens se necessário
        const messages = message.split('\n').filter(msg => msg.trim());
        
        messages.forEach(msg => {
            this.emit('message', msg.trim());
        });
    }

    send(command: string): void {
        if (!this.isConnected || !this.socket) {
            throw new Error('Cliente não conectado');
        }

        console.log('📤 Enviando comando:', command);
        this.socket.write(command + '\n');
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Máximo de tentativas de reconexão atingido');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectDelay}ms`);
        
        setTimeout(() => {
            this.connect().catch(console.error);
        }, this.reconnectDelay);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
            this.isConnected = false;
        }
    }
}
```

#### **Arquivo**: `shared/types/cedro.ts`
```typescript
export interface CedroConfig {
    host: string;
    port: number;
    softwareKey?: string;
    username: string;
    password: string;
    timeout: number;
    maxReconnectAttempts: number;
}

export interface CedroMessage {
    type: 'T' | 'B' | 'V' | 'Z' | 'O' | 'G' | 'E';
    symbol: string;
    timestamp: string;
    data: any;
}

export interface TickData {
    symbol: string;
    timestamp: number;
    price: number;
    volume: number;
    side: 'BUY' | 'SELL';
    aggressor: boolean;
    tradeId: string;
}

export interface BookData {
    symbol: string;
    timestamp: number;
    bids: BookLevel[];
    asks: BookLevel[];
}

export interface BookLevel {
    position: number;
    price: number;
    volume: number;
    orders: number;
    broker?: number;
}
```

### **2.2 Sistema de Autenticação**
**Duração**: 4-6 horas

#### **Arquivo**: `server/src/cedro/auth.ts`
```typescript
import { CedroTcpClient } from './client';
import { CedroConfig } from '@smart-trade/shared/types/cedro';

export class CedroAuthenticator {
    private client: CedroTcpClient;
    private config: CedroConfig;
    private authState: 'disconnected' | 'connecting' | 'authenticating' | 'authenticated' = 'disconnected';

    constructor(client: CedroTcpClient, config: CedroConfig) {
        this.client = client;
        this.config = config;
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connected', () => {
            this.authState = 'authenticating';
            this.startAuthentication();
        });

        this.client.on('message', (message: string) => {
            this.handleAuthMessage(message);
        });
    }

    private async startAuthentication(): Promise<void> {
        try {
            console.log('🔐 Iniciando autenticação...');
            
            // Aguardar prompt inicial
            await this.waitForPrompt();
            
            // 1. Software Key (ENTER se não tiver)
            const softwareKey = this.config.softwareKey || '';
            this.client.send(softwareKey);
            console.log('📤 Software Key enviada');
            
            await this.sleep(1000);
            
            // 2. Username
            this.client.send(this.config.username);
            console.log('📤 Username enviado');
            
            await this.sleep(1000);
            
            // 3. Password
            this.client.send(this.config.password);
            console.log('📤 Password enviada');
            
        } catch (error) {
            console.error('❌ Erro na autenticação:', error);
            throw error;
        }
    }

    private handleAuthMessage(message: string): void {
        console.log('🔐 Mensagem de auth:', message);
        
        if (message.includes('You are connected')) {
            console.log('✅ Autenticação bem-sucedida!');
            this.authState = 'authenticated';
            this.client.emit('authenticated');
        } else if (message.includes('Invalid') || message.includes('Error')) {
            console.error('❌ Falha na autenticação:', message);
            this.authState = 'disconnected';
            this.client.emit('authError', message);
        }
    }

    private waitForPrompt(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 2000); // Aguardar prompt inicial
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isAuthenticated(): boolean {
        return this.authState === 'authenticated';
    }
}
```

### **2.3 Parser de Mensagens Cedro**
**Duração**: 12-16 horas

#### **Arquivo**: `server/src/cedro/parser.ts`
```typescript
import { CedroMessage, TickData, BookData } from '@smart-trade/shared/types/cedro';

export class CedroMessageParser {
    
    parseMessage(rawMessage: string): CedroMessage | null {
        try {
            const type = rawMessage.charAt(0) as CedroMessage['type'];
            
            switch (type) {
                case 'T': // Quote (SQT)
                    return this.parseQuoteMessage(rawMessage);
                case 'B': // Book (BQT)
                    return this.parseBookMessage(rawMessage);
                case 'V': // Trade (GQT)
                    return this.parseTradeMessage(rawMessage);
                case 'Z': // Aggregated Book (SAB)
                    return this.parseAggregatedBookMessage(rawMessage);
                case 'E': // Error
                    return this.parseErrorMessage(rawMessage);
                default:
                    console.warn('⚠️ Tipo de mensagem desconhecido:', type);
                    return null;
            }
        } catch (error) {
            console.error('❌ Erro ao parsear mensagem:', error, rawMessage);
            return null;
        }
    }

    private parseQuoteMessage(message: string): CedroMessage {
        // Formato: T:SYMBOL:TIME:INDEX:VALUE:INDEX:VALUE:...!
        const parts = message.split(':');
        const symbol = parts[1];
        const timestamp = parts[2];
        
        const data: any = { symbol, timestamp };
        
        // Processar pares índice:valor
        for (let i = 3; i < parts.length - 1; i += 2) {
            const index = parseInt(parts[i]);
            const value = parts[i + 1];
            
            // Mapear índices conforme documentação
            switch (index) {
                case 2: data.lastPrice = parseFloat(value); break;
                case 3: data.bidPrice = parseFloat(value); break;
                case 4: data.askPrice = parseFloat(value); break;
                case 6: data.currentVolume = parseInt(value); break;
                case 7: data.lastVolume = parseInt(value); break;
                case 9: data.totalVolume = parseInt(value); break;
                // ... outros índices conforme necessário
            }
        }

        return {
            type: 'T',
            symbol,
            timestamp,
            data
        };
    }

    private parseBookMessage(message: string): CedroMessage {
        // Formato: B:SYMBOL:OPERATION:...
        const parts = message.split(':');
        const symbol = parts[1];
        const operation = parts[2]; // A, U, D, E
        
        let data: any = { symbol, operation };
        
        switch (operation) {
            case 'A': // Add
                data = {
                    ...data,
                    position: parseInt(parts[3]),
                    side: parts[4], // A ou V
                    price: parseFloat(parts[5]),
                    volume: parseInt(parts[6]),
                    broker: parseInt(parts[7]),
                    datetime: parts[8],
                    orderId: parts[9],
                    orderType: parts[10]
                };
                break;
            case 'U': // Update
                data = {
                    ...data,
                    newPosition: parseInt(parts[3]),
                    oldPosition: parseInt(parts[4]),
                    side: parts[5],
                    price: parseFloat(parts[6]),
                    volume: parseInt(parts[7]),
                    broker: parseInt(parts[8]),
                    datetime: parts[9],
                    orderId: parts[10],
                    orderType: parts[11]
                };
                break;
            case 'D': // Delete
                data = {
                    ...data,
                    deleteType: parseInt(parts[3]),
                    side: parts[4],
                    position: parseInt(parts[5])
                };
                break;
        }

        return {
            type: 'B',
            symbol,
            timestamp: new Date().toISOString(),
            data
        };
    }

    private parseTradeMessage(message: string): CedroMessage {
        // Formato: V:SYMBOL:OPERATION:TIME:PRICE:BUYER:SELLER:VOLUME:TRADEID:...
        const parts = message.split(':');
        const symbol = parts[1];
        const operation = parts[2];
        
        const data = {
            symbol,
            operation,
            time: parts[3],
            price: parseFloat(parts[4]),
            buyerBroker: parseInt(parts[5]),
            sellerBroker: parseInt(parts[6]),
            volume: parseInt(parts[7]),
            tradeId: parts[8],
            condition: parts[9],
            aggressor: parts[10]
        };

        return {
            type: 'V',
            symbol,
            timestamp: new Date().toISOString(),
            data
        };
    }

    private parseAggregatedBookMessage(message: string): CedroMessage {
        // Similar ao parseBookMessage mas para livro agregado
        return this.parseBookMessage(message);
    }

    private parseErrorMessage(message: string): CedroMessage {
        const parts = message.split(':');
        const errorCode = parts[1];
        const errorMessage = parts.slice(2).join(':');
        
        return {
            type: 'E',
            symbol: '',
            timestamp: new Date().toISOString(),
            data: {
                code: errorCode,
                message: errorMessage
            }
        };
    }
}
```

### **2.4 Sistema de Subscrições**
**Duração**: 6-8 horas

#### **Arquivo**: `server/src/cedro/subscription-manager.ts`
```typescript
import { CedroTcpClient } from './client';
import { EventEmitter } from 'events';

export type SubscriptionType = 'quote' | 'book' | 'trades' | 'aggregatedBook' | 'vap';

export interface Subscription {
    symbol: string;
    type: SubscriptionType;
    active: boolean;
    subscribedAt: Date;
}

export class SubscriptionManager extends EventEmitter {
    private client: CedroTcpClient;
    private subscriptions: Map<string, Subscription> = new Map();

    constructor(client: CedroTcpClient) {
        super();
        this.client = client;
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('authenticated', () => {
            console.log('✅ Cliente autenticado, subscrições disponíveis');
        });
    }

    async subscribeQuote(symbol: string, snapshot: boolean = false): Promise<void> {
        const command = snapshot ? `SQT ${symbol} N` : `SQT ${symbol}`;
        await this.subscribe(symbol, 'quote', command);
    }

    async subscribeBook(symbol: string): Promise<void> {
        const command = `BQT ${symbol}`;
        await this.subscribe(symbol, 'book', command);
    }

    async subscribeTrades(symbol: string): Promise<void> {
        const command = `GQT ${symbol} S`;
        await this.subscribe(symbol, 'trades', command);
    }

    async subscribeAggregatedBook(symbol: string): Promise<void> {
        const command = `SAB ${symbol}`;
        await this.subscribe(symbol, 'aggregatedBook', command);
    }

    async subscribeVAP(symbol: string, period?: number): Promise<void> {
        const command = period ? `VAP ${symbol} ${period}` : `VAP ${symbol}`;
        await this.subscribe(symbol, 'vap', command);
    }

    private async subscribe(symbol: string, type: SubscriptionType, command: string): Promise<void> {
        try {
            const key = `${symbol}:${type}`;
            
            if (this.subscriptions.has(key)) {
                console.warn(`⚠️ Já subscrito em ${key}`);
                return;
            }

            console.log(`📡 Subscrevendo: ${command}`);
            this.client.send(command);

            const subscription: Subscription = {
                symbol,
                type,
                active: true,
                subscribedAt: new Date()
            };

            this.subscriptions.set(key, subscription);
            this.emit('subscribed', subscription);

        } catch (error) {
            console.error(`❌ Erro ao subscrever ${symbol}:${type}:`, error);
            throw error;
        }
    }

    async unsubscribe(symbol: string, type: SubscriptionType): Promise<void> {
        const key = `${symbol}:${type}`;
        const subscription = this.subscriptions.get(key);

        if (!subscription) {
            console.warn(`⚠️ Subscrição ${key} não encontrada`);
            return;
        }

        let command: string;
        switch (type) {
            case 'quote':
                command = `USQ ${symbol}`;
                break;
            case 'book':
                command = `UBQ ${symbol}`;
                break;
            case 'trades':
                command = `UQT ${symbol}`;
                break;
            case 'aggregatedBook':
                command = `UAB ${symbol}`;
                break;
            default:
                throw new Error(`Tipo de subscrição não suportado: ${type}`);
        }

        console.log(`📡 Cancelando subscrição: ${command}`);
        this.client.send(command);

        subscription.active = false;
        this.subscriptions.delete(key);
        this.emit('unsubscribed', subscription);
    }

    getActiveSubscriptions(): Subscription[] {
        return Array.from(this.subscriptions.values()).filter(sub => sub.active);
    }

    isSubscribed(symbol: string, type: SubscriptionType): boolean {
        const key = `${symbol}:${type}`;
        const subscription = this.subscriptions.get(key);
        return subscription?.active || false;
    }
}
```

### **2.5 Tratamento de Erros e Reconexão**
**Duração**: 6-8 horas

#### **Arquivo**: `server/src/cedro/error-handler.ts`
```typescript
export class CedroErrorHandler {
    private static readonly ERROR_CODES = {
        1: 'Comando inválido',
        2: 'Objeto não encontrado',
        3: 'Sem permissão',
        4: 'Parâmetro vazio',
        5: 'Não há parâmetros',
        6: 'Segunda conexão com mesmo usuário',
        7: 'Usuário sem acesso',
        8: 'Conexão duplicada em outro servidor',
        9: 'Permissões perdidas',
        10: 'Parâmetro inválido',
        11: 'Servidor indisponível',
        12: 'Servidor será indisponível',
        13: 'SUID inválido',
        14: 'Request ID muito grande',
        15: 'Erro de banco de dados',
        16: 'Notícia não encontrada',
        17: 'Erro de permissão de serviço',
        18: 'Erro quantidade quotes'
    };

    static handleError(errorCode: string, message: string): void {
        const code = parseInt(errorCode);
        const description = this.ERROR_CODES[code] || 'Erro desconhecido';
        
        console.error(`❌ Erro Cedro ${code}: ${description}`);
        console.error(`📝 Mensagem: ${message}`);

        // Ações específicas por tipo de erro
        switch (code) {
            case 2: // Objeto não encontrado
                console.warn('⚠️ Símbolo pode não existir ou estar inativo');
                break;
            case 3: // Sem permissão
                console.error('🚫 Verificar permissões do usuário');
                break;
            case 6:
            case 8: // Conexões duplicadas
                console.warn('🔄 Conexão será fechada, aguardar reconexão');
                break;
            case 11:
            case 12: // Servidor indisponível
                console.warn('🔄 Servidor indisponível, tentando reconectar');
                break;
            case 18: // Muitas subscrições
                console.warn('⚠️ Limite de subscrições atingido');
                break;
        }
    }

    static isRecoverableError(errorCode: string): boolean {
        const code = parseInt(errorCode);
        // Erros que permitem reconexão/retry
        return [6, 7, 8, 11, 12].includes(code);
    }

    static isFatalError(errorCode: string): boolean {
        const code = parseInt(errorCode);
        // Erros que requerem intervenção manual
        return [3, 9, 13, 17].includes(code);
    }
}
```

## ✅ CHECKPOINT 2: Validação da Fase

### **Critérios de Aprovação**
```bash
# 1. Testar conexão TCP
npm run dev:server
# Verificar logs de conexão

# 2. Testar autenticação
# Verificar mensagem "You are connected"

# 3. Testar subscrição DOL
# Verificar recebimento de dados SQT DOL

# 4. Testar parser
# Verificar parsing correto das mensagens

# 5. Testar reconexão
# Simular desconexão e verificar reconexão automática
```

### **Checklist de Validação**
- [ ] Cliente TCP conecta na porta 81
- [ ] Autenticação completa com sucesso
- [ ] Mensagem "You are connected" recebida
- [ ] SQT DOL retorna dados de cotação
- [ ] Parser interpreta mensagens corretamente
- [ ] Sistema de subscrições funcional
- [ ] Tratamento de erros implementado
- [ ] Reconexão automática funcionando
- [ ] Logs detalhados de todas as operações

### **Testes Manuais**
```bash
# Teste 1: Conexão básica
node -e "
const { CedroTcpClient } = require('./dist/cedro/client');
const client = new CedroTcpClient({
  host: 'seu-host-cedro',
  port: 81,
  username: 'seu-usuario',
  password: 'sua-senha'
});
client.connect();
"

# Teste 2: Subscrição DOL
# Verificar se dados chegam após SQT DOL
```

## 🎯 Próximos Passos
Após completar o Checkpoint 2, avançar para:
**FASE 3: Sistema de Dados** (`03-FASE-3-SISTEMA-DADOS.md`)

---

**📝 Status**: ⏳ Aguardando implementação
**Dependências**: Credenciais Cedro para testes
**Última Atualização**: 02/01/2025
