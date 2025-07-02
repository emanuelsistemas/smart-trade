# 🔌 Integração API Cedro - Documentação Completa

## 📋 Visão Geral

A **Cedro Technologies** é o fornecedor oficial de dados da B3, oferecendo APIs robustas para dados de mercado em tempo real e históricos. Esta documentação detalha a integração completa com seus serviços.

## 🏢 Informações da Cedro Technologies

### **Contato e Suporte**
- **Empresa**: Cedro Technologies
- **Telefone**: +55 34 3239-0003
- **Email**: contato@cedrotech.com
- **Site**: https://www.marketdatacloud.com.br/
- **Documentação**: https://developers.cedrotech.com/
- **Teste Grátis**: 15 dias

### **Planos Disponíveis**
```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANOS CEDRO TECHNOLOGIES                    │
├─────────────────────────────────────────────────────────────────┤
│  BÁSICO           │  PROFISSIONAL     │    ENTERPRISE           │
│  R$ 500/mês       │  R$ 1.200/mês     │    R$ 2.500/mês         │
│  ┌─────────────┐  │  ┌─────────────┐  │   ┌─────────────────┐   │
│  │ Dados Reais │  │  │ Dados Reais │  │   │ Dados Reais     │   │
│  │ 1 Símbolo   │  │  │ 5 Símbolos  │  │   │ Ilimitados      │   │
│  │ WebSocket   │  │  │ WebSocket   │  │   │ WebSocket       │   │
│  │ Histórico   │  │  │ Histórico   │  │   │ Histórico       │   │
│  └─────────────┘  │  │ Level 2     │  │   │ Level 2         │   │
│                   │  │ Times&Trades│  │   │ Times&Trades    │   │
│                   │  └─────────────┘  │   │ Suporte 24/7    │   │
│                   │                   │   │ SLA 99.9%       │   │
│                   │                   │   └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Autenticação e Configuração

### **1. Obtenção das Credenciais**
```javascript
// Após contrato com Cedro, você receberá:
const credentials = {
  apiKey: "sua_api_key_aqui",
  apiSecret: "seu_api_secret_aqui",
  websocketUrl: "wss://api.cedrotech.com/streaming",
  restApiUrl: "https://api.cedrotech.com/v1",
  environment: "production" // ou "sandbox"
};
```

### **2. Configuração no Sistema**
```php
// config/cedro.php
<?php
return [
    'api_key' => env('CEDRO_API_KEY'),
    'api_secret' => env('CEDRO_API_SECRET'),
    'api_url' => env('CEDRO_API_URL', 'https://api.cedrotech.com/v1'),
    'websocket_url' => env('CEDRO_WS_URL', 'wss://api.cedrotech.com/streaming'),
    'environment' => env('CEDRO_ENV', 'production'),
    
    // Configurações específicas
    'timeout' => 30,
    'retry_attempts' => 3,
    'rate_limit' => 1000, // requests por minuto
    
    // Símbolos suportados
    'symbols' => [
        'DOL' => 'Dólar Futuro',
        'IND' => 'Índice Futuro',
        'WIN' => 'Mini Índice',
        'WDO' => 'Mini Dólar'
    ]
];
```

## 📡 APIs Disponíveis

### **1. REST API**

#### **Endpoints Principais**
```
GET /v1/market-data/symbols          # Lista símbolos disponíveis
GET /v1/market-data/quote/{symbol}   # Cotação atual
GET /v1/market-data/historical       # Dados históricos
GET /v1/market-data/book/{symbol}    # Book de ofertas
GET /v1/market-data/trades/{symbol}  # Times & Trades
```

#### **Exemplo de Implementação**
```php
<?php
namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class CedroRestAPI
{
    private $client;
    private $config;
    
    public function __construct()
    {
        $this->config = config('cedro');
        $this->client = new Client([
            'base_uri' => $this->config['api_url'],
            'timeout' => $this->config['timeout'],
            'headers' => [
                'Authorization' => 'Bearer ' . $this->config['api_key'],
                'Content-Type' => 'application/json',
                'User-Agent' => 'NexoPedidos-TradingSystem/1.0'
            ]
        ]);
    }
    
    /**
     * Obter cotação atual
     */
    public function getCurrentQuote($symbol)
    {
        try {
            $response = $this->client->get("/market-data/quote/{$symbol}");
            $data = json_decode($response->getBody(), true);
            
            return [
                'symbol' => $data['symbol'],
                'price' => $data['last_price'],
                'bid' => $data['bid'],
                'ask' => $data['ask'],
                'volume' => $data['volume'],
                'timestamp' => $data['timestamp']
            ];
            
        } catch (\Exception $e) {
            Log::error("Erro ao obter cotação {$symbol}: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Obter dados históricos
     */
    public function getHistoricalData($symbol, $startDate, $endDate, $interval = 'tick')
    {
        try {
            $response = $this->client->get('/market-data/historical', [
                'query' => [
                    'symbol' => $symbol,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'interval' => $interval,
                    'format' => 'json',
                    'include_book' => true,
                    'include_trades' => true
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error("Erro ao obter dados históricos: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Obter book de ofertas
     */
    public function getOrderBook($symbol, $levels = 10)
    {
        try {
            $response = $this->client->get("/market-data/book/{$symbol}", [
                'query' => ['levels' => $levels]
            ]);
            
            $data = json_decode($response->getBody(), true);
            
            return [
                'symbol' => $symbol,
                'timestamp' => $data['timestamp'],
                'bids' => $data['bids'],
                'asks' => $data['asks'],
                'spread' => $data['spread']
            ];
            
        } catch (\Exception $e) {
            Log::error("Erro ao obter book {$symbol}: " . $e->getMessage());
            throw $e;
        }
    }
}
```

### **2. WebSocket API**

#### **Conexão e Autenticação**
```javascript
// websocket/cedro-client.js
const WebSocket = require('ws');
const EventEmitter = require('events');

class CedroWebSocketClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.ws = null;
        this.authenticated = false;
        this.subscriptions = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    connect() {
        console.log('🔌 Conectando ao WebSocket Cedro...');
        
        this.ws = new WebSocket(this.config.websocketUrl, {
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`
            }
        });
        
        this.ws.on('open', () => {
            console.log('✅ WebSocket Cedro conectado');
            this.authenticate();
        });
        
        this.ws.on('message', (data) => {
            this.handleMessage(data);
        });
        
        this.ws.on('close', (code, reason) => {
            console.log(`❌ WebSocket fechado: ${code} - ${reason}`);
            this.authenticated = false;
            this.scheduleReconnect();
        });
        
        this.ws.on('error', (error) => {
            console.error('❌ Erro WebSocket:', error);
            this.emit('error', error);
        });
    }
    
    authenticate() {
        const authMessage = {
            action: 'authenticate',
            token: this.config.apiKey,
            timestamp: Date.now()
        };
        
        this.send(authMessage);
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'auth_success':
                    this.authenticated = true;
                    this.reconnectAttempts = 0;
                    console.log('✅ Autenticação WebSocket bem-sucedida');
                    this.emit('authenticated');
                    this.resubscribeAll();
                    break;
                    
                case 'auth_error':
                    console.error('❌ Erro de autenticação:', message.error);
                    this.emit('auth_error', message.error);
                    break;
                    
                case 'tick':
                    this.emit('tick', message.data);
                    break;
                    
                case 'book_update':
                    this.emit('book_update', message.data);
                    break;
                    
                case 'trade':
                    this.emit('trade', message.data);
                    break;
                    
                case 'error':
                    console.error('❌ Erro da API:', message.error);
                    this.emit('api_error', message.error);
                    break;
                    
                default:
                    console.log('📨 Mensagem não reconhecida:', message);
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }
    
    subscribe(symbol, dataTypes = ['tick', 'book', 'trade']) {
        if (!this.authenticated) {
            console.log('⏳ Aguardando autenticação para subscrever...');
            this.once('authenticated', () => this.subscribe(symbol, dataTypes));
            return;
        }
        
        const subscription = {
            action: 'subscribe',
            symbol: symbol,
            types: dataTypes
        };
        
        this.send(subscription);
        this.subscriptions.add(`${symbol}:${dataTypes.join(',')}`);
        
        console.log(`📡 Subscrito: ${symbol} - ${dataTypes.join(', ')}`);
    }
    
    unsubscribe(symbol, dataTypes = ['tick', 'book', 'trade']) {
        const unsubscription = {
            action: 'unsubscribe',
            symbol: symbol,
            types: dataTypes
        };
        
        this.send(unsubscription);
        this.subscriptions.delete(`${symbol}:${dataTypes.join(',')}`);
        
        console.log(`📡 Desinscrito: ${symbol} - ${dataTypes.join(', ')}`);
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('❌ WebSocket não está conectado');
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Backoff exponencial
            this.reconnectAttempts++;
            
            console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('❌ Máximo de tentativas de reconexão atingido');
            this.emit('max_reconnect_attempts');
        }
    }
    
    resubscribeAll() {
        this.subscriptions.forEach(subscription => {
            const [symbol, types] = subscription.split(':');
            const dataTypes = types.split(',');
            this.subscribe(symbol, dataTypes);
        });
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

module.exports = CedroWebSocketClient;
```

## 📊 Estruturas de Dados

### **1. Tick Data (Times & Trades)**
```javascript
const tickData = {
    symbol: "DOL",
    timestamp: "2025-06-27T14:30:25.123Z",
    sequence: 1001,
    price: 6.0450,
    volume: 50,
    side: "BUY", // BUY ou SELL
    aggressor: true, // Quem iniciou o negócio
    trade_id: "12345678",
    session: "MAIN", // MAIN, PRE, POST
    conditions: [] // Condições especiais do negócio
};
```

### **2. Book de Ofertas (Level 2)**
```javascript
const bookData = {
    symbol: "DOL",
    timestamp: "2025-06-27T14:30:25.123Z",
    sequence: 2001,
    
    // Ofertas de compra (bids) - ordenadas por preço decrescente
    bids: [
        { price: 6.0445, volume: 200, orders: 4 },
        { price: 6.0440, volume: 150, orders: 3 },
        { price: 6.0435, volume: 300, orders: 6 }
    ],
    
    // Ofertas de venda (asks) - ordenadas por preço crescente
    asks: [
        { price: 6.0450, volume: 100, orders: 2 },
        { price: 6.0455, volume: 250, orders: 5 },
        { price: 6.0460, volume: 180, orders: 4 }
    ],
    
    spread: 0.0005, // Diferença entre melhor ask e melhor bid
    mid_price: 6.04475 // Preço médio
};
```

### **3. Dados Históricos**
```javascript
const historicalData = {
    symbol: "DOL",
    interval: "tick", // tick, 1min, 5min, etc.
    start_date: "2025-06-01T09:00:00Z",
    end_date: "2025-06-01T18:00:00Z",
    
    data: [
        {
            timestamp: "2025-06-01T09:00:00.123Z",
            price: 6.0400,
            volume: 100,
            side: "BUY",
            aggressor: true
        },
        // ... mais dados
    ],
    
    metadata: {
        total_records: 150000,
        compressed: true,
        checksum: "abc123def456"
    }
};
```

## 🔧 Tratamento de Erros

### **Códigos de Erro Comuns**
```javascript
const errorCodes = {
    // Autenticação
    401: "Token inválido ou expirado",
    403: "Acesso negado - verificar permissões",
    
    // Rate Limiting
    429: "Muitas requisições - aguardar",
    
    // Dados
    404: "Símbolo não encontrado",
    422: "Parâmetros inválidos",
    
    // Servidor
    500: "Erro interno do servidor",
    503: "Serviço temporariamente indisponível",
    
    // WebSocket
    1000: "Conexão fechada normalmente",
    1001: "Endpoint indo embora",
    1002: "Erro de protocolo",
    1003: "Dados não suportados",
    1006: "Conexão perdida anormalmente",
    1011: "Erro interno do servidor"
};
```

### **Implementação de Retry**
```javascript
class CedroAPIWithRetry {
    constructor(config) {
        this.config = config;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
    }
    
    async makeRequest(endpoint, options = {}, retryCount = 0) {
        try {
            const response = await this.client.request(endpoint, options);
            return response;
            
        } catch (error) {
            if (this.shouldRetry(error) && retryCount < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, retryCount);
                
                console.log(`🔄 Tentativa ${retryCount + 1}/${this.maxRetries} em ${delay}ms`);
                
                await this.sleep(delay);
                return this.makeRequest(endpoint, options, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    shouldRetry(error) {
        const retryableCodes = [429, 500, 502, 503, 504];
        return retryableCodes.includes(error.response?.status);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## 📈 Monitoramento e Logs

### **Sistema de Monitoramento**
```javascript
class CedroMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            latency: [],
            uptime: Date.now()
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Monitorar a cada 30 segundos
        setInterval(() => {
            this.checkHealth();
            this.logMetrics();
        }, 30000);
    }
    
    checkHealth() {
        // Verificar conectividade
        this.pingAPI();
        this.checkWebSocketConnection();
    }
    
    logMetrics() {
        const uptime = Date.now() - this.metrics.uptime;
        const errorRate = this.metrics.errors / this.metrics.requests;
        const avgLatency = this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length;
        
        console.log('📊 Métricas Cedro API:', {
            uptime: `${Math.floor(uptime / 1000)}s`,
            requests: this.metrics.requests,
            errorRate: `${(errorRate * 100).toFixed(2)}%`,
            avgLatency: `${avgLatency.toFixed(2)}ms`
        });
    }
}
```

## 🔒 Segurança e Boas Práticas

### **1. Proteção de Credenciais**
```bash
# .env
CEDRO_API_KEY=sua_api_key_aqui
CEDRO_API_SECRET=seu_api_secret_aqui
CEDRO_ENV=production

# Nunca commitar credenciais no código!
```

### **2. Rate Limiting**
```javascript
class RateLimiter {
    constructor(maxRequests = 1000, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    canMakeRequest() {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        // Remover requisições antigas
        this.requests = this.requests.filter(time => time > windowStart);
        
        return this.requests.length < this.maxRequests;
    }
    
    recordRequest() {
        this.requests.push(Date.now());
    }
}
```

### **3. Validação de Dados**
```javascript
const validateTickData = (data) => {
    const required = ['symbol', 'timestamp', 'price', 'volume', 'side'];
    
    for (const field of required) {
        if (!data[field]) {
            throw new Error(`Campo obrigatório ausente: ${field}`);
        }
    }
    
    if (data.price <= 0) {
        throw new Error('Preço deve ser positivo');
    }
    
    if (data.volume <= 0) {
        throw new Error('Volume deve ser positivo');
    }
    
    if (!['BUY', 'SELL'].includes(data.side)) {
        throw new Error('Side deve ser BUY ou SELL');
    }
    
    return true;
};
```

---

**📝 Nota**: A integração com a Cedro API é fundamental para o sucesso do sistema. Mantenha sempre as credenciais seguras e monitore o uso para evitar limites de rate limiting.
