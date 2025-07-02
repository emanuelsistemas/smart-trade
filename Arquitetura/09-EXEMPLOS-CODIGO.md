# 💻 Exemplos de Código - Sistema de Trading

## 📋 Visão Geral

Esta seção contém exemplos práticos de código para implementar as principais funcionalidades do sistema de trading, desde a conexão com a API até a análise avançada de order flow.

## 🔌 Exemplo 1: Conexão Básica com Cedro API

### **Cliente WebSocket Completo**
```javascript
// websocket/trading-client.js
const WebSocket = require('ws');
const EventEmitter = require('events');

class TradingClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.ws = null;
        this.orderFlowBuffer = [];
        this.footprintData = new Map();
        this.isConnected = false;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Conectando ao sistema de trading...');
            
            this.ws = new WebSocket(this.config.websocketUrl, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });
            
            this.ws.on('open', () => {
                console.log('✅ Conectado ao WebSocket');
                this.isConnected = true;
                this.startHeartbeat();
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data));
            });
            
            this.ws.on('close', () => {
                console.log('❌ Conexão fechada');
                this.isConnected = false;
                this.scheduleReconnect();
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ Erro WebSocket:', error);
                reject(error);
            });
        });
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'tick':
                this.processTickData(message.data);
                break;
            case 'book_update':
                this.processBookUpdate(message.data);
                break;
            case 'footprint_update':
                this.processFootprintUpdate(message.data);
                break;
        }
    }
    
    processTickData(tick) {
        // Adicionar ao buffer de order flow
        this.orderFlowBuffer.push(tick);
        
        // Manter apenas últimos 1000 ticks
        if (this.orderFlowBuffer.length > 1000) {
            this.orderFlowBuffer.shift();
        }
        
        // Analisar order flow
        const analysis = this.analyzeOrderFlow();
        
        // Emitir evento
        this.emit('order_flow_update', analysis);
    }
    
    analyzeOrderFlow() {
        const recentTicks = this.orderFlowBuffer.slice(-100); // Últimos 100 ticks
        
        let buyVolume = 0;
        let sellVolume = 0;
        let bigTrades = [];
        
        recentTicks.forEach(tick => {
            if (tick.side === 'BUY') {
                buyVolume += tick.volume;
            } else {
                sellVolume += tick.volume;
            }
            
            // Detectar trades grandes (>500k)
            if (tick.volume > 500000) {
                bigTrades.push(tick);
            }
        });
        
        const totalVolume = buyVolume + sellVolume;
        const buyRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;
        
        return {
            timestamp: Date.now(),
            buyVolume,
            sellVolume,
            totalVolume,
            buyRatio,
            dominance: buyRatio > 0.6 ? 'BUY' : buyRatio < 0.4 ? 'SELL' : 'NEUTRAL',
            bigTrades: bigTrades.length,
            intensity: this.calculateIntensity(buyRatio)
        };
    }
    
    calculateIntensity(ratio) {
        const deviation = Math.abs(ratio - 0.5);
        if (deviation > 0.3) return 'EXTREME';
        if (deviation > 0.2) return 'STRONG';
        if (deviation > 0.1) return 'MODERATE';
        return 'WEAK';
    }
    
    subscribe(symbol) {
        if (this.isConnected) {
            this.ws.send(JSON.stringify({
                action: 'subscribe',
                symbol: symbol,
                types: ['tick', 'book', 'footprint']
            }));
        }
    }
    
    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected) {
                this.ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, 30000);
    }
}

// Uso
const client = new TradingClient({
    websocketUrl: 'wss://api.cedrotech.com/streaming',
    apiKey: process.env.CEDRO_API_KEY
});

client.on('order_flow_update', (analysis) => {
    console.log('📊 Order Flow:', analysis);
    
    if (analysis.intensity === 'STRONG' && analysis.dominance !== 'NEUTRAL') {
        console.log(`🚨 Sinal forte detectado: ${analysis.dominance}`);
    }
});

client.connect().then(() => {
    client.subscribe('DOL');
});
```

## 📊 Exemplo 2: Processador de Footprint Chart

### **Classe FootprintProcessor**
```javascript
// src/services/FootprintProcessor.js
class FootprintProcessor {
    constructor(timeframe = '500_tick') {
        this.timeframe = timeframe;
        this.currentBar = null;
        this.completedBars = [];
        this.tickCount = 0;
        this.maxTicks = this.getMaxTicksForTimeframe(timeframe);
    }
    
    processTick(tick) {
        // Criar nova barra se necessário
        if (!this.currentBar) {
            this.createNewBar(tick.timestamp);
        }
        
        // Adicionar tick à barra atual
        this.addTickToBar(tick);
        this.tickCount++;
        
        // Verificar se barra está completa
        if (this.tickCount >= this.maxTicks) {
            this.completeCurrentBar();
            this.createNewBar(tick.timestamp);
            this.tickCount = 0;
        }
        
        return {
            currentBar: this.currentBar,
            isComplete: this.tickCount >= this.maxTicks
        };
    }
    
    createNewBar(timestamp) {
        this.currentBar = {
            id: this.generateBarId(),
            timestamp: timestamp,
            timeframe: this.timeframe,
            status: 'FORMING',
            priceData: {},
            summary: {
                high: null,
                low: null,
                open: null,
                close: null,
                totalVolume: 0,
                totalDelta: 0,
                netDominance: 'NEUTRAL'
            },
            patterns: {
                absorption: null,
                exhaustion: false,
                breakout: false
            }
        };
    }
    
    addTickToBar(tick) {
        const price = tick.price.toString();
        
        // Inicializar nível de preço se não existe
        if (!this.currentBar.priceData[price]) {
            this.currentBar.priceData[price] = {
                bid: 0,
                ask: 0,
                delta: 0,
                totalVolume: 0,
                imbalance: 0,
                trades: 0,
                dominance: 'NEUTRAL'
            };
        }
        
        const priceLevel = this.currentBar.priceData[price];
        
        // Adicionar volume baseado na agressão
        if (tick.side === 'BUY') {
            priceLevel.bid += tick.volume;
        } else {
            priceLevel.ask += tick.volume;
        }
        
        priceLevel.trades++;
        
        // Recalcular métricas do nível
        this.calculatePriceLevelMetrics(priceLevel);
        
        // Atualizar resumo da barra
        this.updateBarSummary(tick);
        
        // Detectar padrões
        this.detectPatterns();
    }
    
    calculatePriceLevelMetrics(priceLevel) {
        // Delta
        priceLevel.delta = priceLevel.bid - priceLevel.ask;
        
        // Volume total
        priceLevel.totalVolume = priceLevel.bid + priceLevel.ask;
        
        // Imbalance (0-1)
        if (priceLevel.totalVolume > 0) {
            priceLevel.imbalance = Math.abs(priceLevel.delta) / priceLevel.totalVolume;
        }
        
        // Dominância
        if (priceLevel.bid > priceLevel.ask) {
            priceLevel.dominance = 'BUY';
        } else if (priceLevel.ask > priceLevel.bid) {
            priceLevel.dominance = 'SELL';
        } else {
            priceLevel.dominance = 'NEUTRAL';
        }
    }
    
    updateBarSummary(tick) {
        const summary = this.currentBar.summary;
        
        // OHLC
        if (summary.open === null) summary.open = tick.price;
        summary.close = tick.price;
        
        if (summary.high === null || tick.price > summary.high) {
            summary.high = tick.price;
        }
        
        if (summary.low === null || tick.price < summary.low) {
            summary.low = tick.price;
        }
        
        // Volume e delta totais
        summary.totalVolume += tick.volume;
        
        if (tick.side === 'BUY') {
            summary.totalDelta += tick.volume;
        } else {
            summary.totalDelta -= tick.volume;
        }
        
        // Dominância líquida
        const deltaRatio = summary.totalVolume > 0 ? 
            summary.totalDelta / summary.totalVolume : 0;
            
        if (deltaRatio > 0.1) {
            summary.netDominance = 'BUY';
        } else if (deltaRatio < -0.1) {
            summary.netDominance = 'SELL';
        } else {
            summary.netDominance = 'NEUTRAL';
        }
    }
    
    detectPatterns() {
        // Detectar absorção
        this.detectAbsorption();
        
        // Detectar exaustão
        this.detectExhaustion();
        
        // Detectar breakout
        this.detectBreakout();
    }
    
    detectAbsorption() {
        const prices = Object.keys(this.currentBar.priceData);
        
        for (const price of prices) {
            const data = this.currentBar.priceData[price];
            
            // Critérios para absorção
            const highVolume = data.totalVolume > 1000000;
            const strongImbalance = data.imbalance > 0.7;
            const significantDelta = Math.abs(data.delta) > 500000;
            
            if (highVolume && strongImbalance && significantDelta) {
                this.currentBar.patterns.absorption = {
                    detected: true,
                    level: parseFloat(price),
                    volume: data.totalVolume,
                    direction: data.dominance,
                    strength: data.imbalance
                };
                break;
            }
        }
    }
    
    detectBreakout() {
        const summary = this.currentBar.summary;
        
        // Critérios para breakout
        const volumeExplosion = summary.totalVolume > 2000000;
        const strongDelta = Math.abs(summary.totalDelta) > 1000000;
        const priceRange = summary.high - summary.low;
        const significantMove = priceRange > 0.01; // 10 pontos
        
        if (volumeExplosion && strongDelta && significantMove) {
            this.currentBar.patterns.breakout = {
                detected: true,
                direction: summary.netDominance,
                volume: summary.totalVolume,
                delta: summary.totalDelta,
                priceRange: priceRange
            };
        }
    }
    
    completeCurrentBar() {
        if (this.currentBar) {
            this.currentBar.status = 'COMPLETED';
            this.completedBars.push(this.currentBar);
            
            // Manter apenas últimas 50 barras
            if (this.completedBars.length > 50) {
                this.completedBars.shift();
            }
        }
    }
    
    getMaxTicksForTimeframe(timeframe) {
        const mapping = {
            '100_tick': 100,
            '500_tick': 500,
            '1000_tick': 1000,
            '1_min': 1000, // Aproximação
            '5_min': 5000  // Aproximação
        };
        
        return mapping[timeframe] || 500;
    }
    
    generateBarId() {
        return `${this.timeframe}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Uso
const processor = new FootprintProcessor('500_tick');

// Simular processamento de ticks
const sampleTick = {
    timestamp: Date.now(),
    price: 6.0450,
    volume: 100,
    side: 'BUY'
};

const result = processor.processTick(sampleTick);
console.log('📊 Footprint Bar:', result.currentBar);

if (result.isComplete) {
    console.log('✅ Barra completa!');
}
```

## 🤖 Exemplo 3: Sistema de Análise IA

### **Analisador de Trading com IA**
```javascript
// src/services/AIAnalyzer.js
class AITradingAnalyzer {
    constructor() {
        this.tradeHistory = [];
        this.patterns = new Map();
        this.learningData = [];
    }
    
    analyzeEntry(trade, marketContext) {
        const analysis = {
            tradeId: trade.id,
            timestamp: Date.now(),
            type: 'ENTRY',
            
            // Análise técnica
            technical: this.analyzeTechnicalFactors(marketContext),
            
            // Análise de order flow
            orderFlow: this.analyzeOrderFlowFactors(marketContext.orderFlow),
            
            // Análise de timing
            timing: this.analyzeTimingFactors(trade.timestamp),
            
            // Análise de risco
            risk: this.analyzeRiskFactors(trade),
            
            // Score geral
            overallScore: 0,
            grade: 'F',
            confidence: 0
        };
        
        // Calcular score geral
        analysis.overallScore = this.calculateOverallScore(analysis);
        analysis.grade = this.calculateGrade(analysis.overallScore);
        analysis.confidence = this.calculateConfidence(analysis);
        
        // Gerar feedback
        analysis.feedback = this.generateFeedback(analysis);
        
        // Salvar para aprendizado
        this.learningData.push(analysis);
        
        return analysis;
    }
    
    analyzeTechnicalFactors(context) {
        const factors = {
            trendAlignment: 0,
            supportResistance: 0,
            volumeConfirmation: 0,
            momentum: 0
        };
        
        // Analisar alinhamento de tendência
        if (context.trend) {
            factors.trendAlignment = context.trend.strength * 25;
        }
        
        // Analisar suporte/resistência
        if (context.levels) {
            const nearLevel = this.findNearestLevel(context.currentPrice, context.levels);
            if (nearLevel && nearLevel.distance < 10) {
                factors.supportResistance = nearLevel.strength * 25;
            }
        }
        
        // Analisar confirmação de volume
        if (context.volume) {
            const volumeRatio = context.volume.current / context.volume.average;
            factors.volumeConfirmation = Math.min(volumeRatio * 12.5, 25);
        }
        
        // Analisar momentum
        if (context.momentum) {
            factors.momentum = Math.min(Math.abs(context.momentum) * 25, 25);
        }
        
        return {
            factors: factors,
            score: Object.values(factors).reduce((sum, val) => sum + val, 0),
            maxScore: 100
        };
    }
    
    analyzeOrderFlowFactors(orderFlow) {
        if (!orderFlow) {
            return { factors: {}, score: 0, maxScore: 100 };
        }
        
        const factors = {
            aggression: 0,
            bigPlayers: 0,
            imbalance: 0,
            momentum: 0
        };
        
        // Analisar agressão
        if (orderFlow.intensity === 'EXTREME') factors.aggression = 25;
        else if (orderFlow.intensity === 'STRONG') factors.aggression = 20;
        else if (orderFlow.intensity === 'MODERATE') factors.aggression = 10;
        
        // Analisar players grandes
        if (orderFlow.bigTrades > 5) factors.bigPlayers = 25;
        else if (orderFlow.bigTrades > 2) factors.bigPlayers = 15;
        else if (orderFlow.bigTrades > 0) factors.bigPlayers = 5;
        
        // Analisar imbalance
        const imbalanceStrength = Math.abs(orderFlow.buyRatio - 0.5) * 2;
        factors.imbalance = imbalanceStrength * 25;
        
        // Analisar momentum
        if (orderFlow.dominance !== 'NEUTRAL') {
            factors.momentum = 20;
        }
        
        return {
            factors: factors,
            score: Object.values(factors).reduce((sum, val) => sum + val, 0),
            maxScore: 100
        };
    }
    
    analyzeTimingFactors(timestamp) {
        const hour = new Date(timestamp).getHours();
        const factors = {
            sessionTiming: 0,
            liquidityWindow: 0,
            newsAvoidance: 0
        };
        
        // Analisar horário da sessão
        if (hour >= 9 && hour <= 11) {
            factors.sessionTiming = 25; // Abertura - alta volatilidade
        } else if (hour >= 14 && hour <= 16) {
            factors.sessionTiming = 20; // Tarde - boa liquidez
        } else if (hour >= 12 && hour <= 14) {
            factors.sessionTiming = 5; // Almoço - baixa liquidez
        }
        
        // Analisar janela de liquidez
        if (this.isHighLiquidityPeriod(timestamp)) {
            factors.liquidityWindow = 25;
        }
        
        // Verificar proximidade de notícias
        if (!this.isNearNewsEvent(timestamp)) {
            factors.newsAvoidance = 25;
        }
        
        return {
            factors: factors,
            score: Object.values(factors).reduce((sum, val) => sum + val, 0),
            maxScore: 75
        };
    }
    
    analyzeRiskFactors(trade) {
        const factors = {
            stopLossSet: 0,
            takeProfitSet: 0,
            riskRewardRatio: 0,
            positionSize: 0
        };
        
        // Stop loss definido
        if (trade.stopLoss) {
            factors.stopLossSet = 25;
            
            // Analisar risk/reward
            if (trade.takeProfit) {
                const risk = Math.abs(trade.openPrice - trade.stopLoss);
                const reward = Math.abs(trade.takeProfit - trade.openPrice);
                const rrRatio = reward / risk;
                
                if (rrRatio >= 2) factors.riskRewardRatio = 25;
                else if (rrRatio >= 1.5) factors.riskRewardRatio = 20;
                else if (rrRatio >= 1) factors.riskRewardRatio = 10;
            }
        }
        
        // Take profit definido
        if (trade.takeProfit) {
            factors.takeProfitSet = 15;
        }
        
        // Tamanho da posição (assumindo 2% máximo do capital)
        const riskAmount = Math.abs(trade.openPrice - (trade.stopLoss || trade.openPrice * 0.95));
        const riskPercent = (riskAmount * trade.volume) / 100000; // Capital assumido
        
        if (riskPercent <= 0.02) factors.positionSize = 25;
        else if (riskPercent <= 0.03) factors.positionSize = 15;
        else if (riskPercent <= 0.05) factors.positionSize = 5;
        
        return {
            factors: factors,
            score: Object.values(factors).reduce((sum, val) => sum + val, 0),
            maxScore: 90
        };
    }
    
    calculateOverallScore(analysis) {
        const weights = {
            technical: 0.25,
            orderFlow: 0.35,
            timing: 0.20,
            risk: 0.20
        };
        
        const weightedScore = 
            (analysis.technical.score * weights.technical) +
            (analysis.orderFlow.score * weights.orderFlow) +
            (analysis.timing.score * weights.timing) +
            (analysis.risk.score * weights.risk);
        
        return Math.round(weightedScore);
    }
    
    calculateGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'C+';
        if (score >= 65) return 'C';
        if (score >= 60) return 'D+';
        if (score >= 55) return 'D';
        return 'F';
    }
    
    calculateConfidence(analysis) {
        // Confiança baseada na consistência dos fatores
        const scores = [
            analysis.technical.score,
            analysis.orderFlow.score,
            analysis.timing.score,
            analysis.risk.score
        ];
        
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        
        // Menor desvio padrão = maior confiança
        const confidence = Math.max(0, 1 - (stdDev / 50));
        
        return Math.round(confidence * 100) / 100;
    }
    
    generateFeedback(analysis) {
        const feedback = [];
        
        // Feedback técnico
        if (analysis.technical.score < 50) {
            feedback.push("⚠️ Sinais técnicos fracos - aguarde melhor setup");
        }
        
        // Feedback order flow
        if (analysis.orderFlow.score < 50) {
            feedback.push("📊 Order flow não confirma - aguarde sinais mais claros");
        }
        
        // Feedback timing
        if (analysis.timing.score < 40) {
            feedback.push("⏰ Timing inadequado - evite horários de baixa liquidez");
        }
        
        // Feedback risco
        if (analysis.risk.score < 60) {
            feedback.push("🛡️ Gestão de risco inadequada - defina stops e targets");
        }
        
        // Feedback positivo
        if (analysis.overallScore >= 80) {
            feedback.push("✅ Excelente setup - todos os fatores alinhados");
        }
        
        return feedback;
    }
    
    // Métodos auxiliares
    isHighLiquidityPeriod(timestamp) {
        const hour = new Date(timestamp).getHours();
        return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
    }
    
    isNearNewsEvent(timestamp) {
        // Implementar verificação de calendário econômico
        return false;
    }
    
    findNearestLevel(price, levels) {
        let nearest = null;
        let minDistance = Infinity;
        
        levels.forEach(level => {
            const distance = Math.abs(price - level.price);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...level, distance };
            }
        });
        
        return nearest;
    }
}

// Uso
const analyzer = new AITradingAnalyzer();

const trade = {
    id: 'trade_001',
    openPrice: 6.0450,
    stopLoss: 6.0420,
    takeProfit: 6.0510,
    volume: 1,
    timestamp: Date.now()
};

const marketContext = {
    orderFlow: {
        intensity: 'STRONG',
        dominance: 'BUY',
        buyRatio: 0.75,
        bigTrades: 3
    },
    trend: { strength: 0.8 },
    volume: { current: 1500000, average: 1000000 }
};

const analysis = analyzer.analyzeEntry(trade, marketContext);
console.log('🤖 Análise IA:', analysis);
```

---

**📝 Nota**: Estes exemplos fornecem uma base sólida para implementação. Adapte o código conforme suas necessidades específicas e adicione tratamento de erros adequado para produção.
