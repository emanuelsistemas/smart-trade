# ⚡ Order Flow Analysis - Documentação Completa

## 📋 Visão Geral

**Order Flow Analysis** é a análise do fluxo de ordens em tempo real, revelando as intenções dos participantes do mercado antes que se reflitam no preço.

## 🎯 Conceito Fundamental

### **O que é Order Flow?**
Order Flow é a sequência de ordens de compra e venda que movem o preço. Diferente da análise técnica tradicional, que é **reativa**, o Order Flow é **preditivo**.

```
ANÁLISE TRADICIONAL:          ORDER FLOW ANALYSIS:
├─ RSI (atrasado)            ├─ Agressão em tempo real
├─ MACD (atrasado)           ├─ Volume por preço
├─ Médias (atrasadas)        ├─ Imbalance instantâneo
└─ Volume (básico)           └─ Intenção dos players

RESULTADO:                   RESULTADO:
Reativo - Vê depois         Preditivo - Vê antes
```

## 📊 Componentes do Order Flow

### **1. Times & Trades**
```javascript
const timesTradesData = {
  symbol: "DOL",
  trades: [
    {
      timestamp: "2025-06-27T14:30:25.123Z",
      price: 6.0450,
      volume: 50,
      side: "BUY",        // Agressão compradora
      aggressor: true,    // Quem iniciou
      tradeId: "12345"
    },
    {
      timestamp: "2025-06-27T14:30:25.456Z",
      price: 6.0455,
      volume: 200,        // Ordem grande!
      side: "BUY",
      aggressor: true,
      tradeId: "12346"
    }
  ]
};
```

### **2. Book de Ofertas (Level 2)**
```javascript
const bookData = {
  symbol: "DOL",
  timestamp: "2025-06-27T14:30:25.123Z",
  
  // Ofertas de venda (ASK)
  asks: [
    { price: 6.0460, volume: 100, orders: 2 },
    { price: 6.0465, volume: 300, orders: 5 },
    { price: 6.0470, volume: 150, orders: 3 }
  ],
  
  // Ofertas de compra (BID)
  bids: [
    { price: 6.0455, volume: 200, orders: 4 },
    { price: 6.0450, volume: 400, orders: 8 },
    { price: 6.0445, volume: 250, orders: 6 }
  ],
  
  spread: 0.0005, // 6.0460 - 6.0455
  midPrice: 6.04575
};
```

## 🧮 Algoritmos de Análise

### **1. Análise de Agressão**
```javascript
class AggressionAnalyzer {
  analyzeAggression(timesTradesData, period = 60) {
    const recentTrades = this.getRecentTrades(timesTradesData, period);
    
    const buyVolume = recentTrades
      .filter(trade => trade.side === 'BUY')
      .reduce((sum, trade) => sum + trade.volume, 0);
      
    const sellVolume = recentTrades
      .filter(trade => trade.side === 'SELL')
      .reduce((sum, trade) => sum + trade.volume, 0);
    
    const totalVolume = buyVolume + sellVolume;
    const buyRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;
    
    return {
      buyVolume: buyVolume,
      sellVolume: sellVolume,
      totalVolume: totalVolume,
      buyRatio: buyRatio,
      sellRatio: 1 - buyRatio,
      dominance: buyRatio > 0.6 ? 'BUY' : buyRatio < 0.4 ? 'SELL' : 'NEUTRAL',
      intensity: this.calculateIntensity(buyRatio),
      confidence: this.calculateConfidence(totalVolume, recentTrades.length)
    };
  }
  
  calculateIntensity(ratio) {
    const deviation = Math.abs(ratio - 0.5);
    if (deviation > 0.3) return 'EXTREME';
    if (deviation > 0.2) return 'STRONG';
    if (deviation > 0.1) return 'MODERATE';
    return 'WEAK';
  }
  
  calculateConfidence(volume, tradeCount) {
    // Mais volume e mais trades = maior confiança
    const volumeScore = Math.min(volume / 1000000, 1); // Normalizar para 1M
    const tradeScore = Math.min(tradeCount / 100, 1);  // Normalizar para 100 trades
    return (volumeScore + tradeScore) / 2;
  }
}
```

### **2. Detecção de Players Grandes**
```javascript
class BigPlayerDetector {
  detectBigPlayers(timesTradesData, threshold = 500000) {
    const bigTrades = timesTradesData.trades.filter(trade => 
      trade.volume >= threshold
    );
    
    if (bigTrades.length === 0) {
      return { detected: false };
    }
    
    // Analisar direção dos players grandes
    const buyVolume = bigTrades
      .filter(trade => trade.side === 'BUY')
      .reduce((sum, trade) => sum + trade.volume, 0);
      
    const sellVolume = bigTrades
      .filter(trade => trade.side === 'SELL')
      .reduce((sum, trade) => sum + trade.volume, 0);
    
    const totalBigVolume = buyVolume + sellVolume;
    const direction = buyVolume > sellVolume ? 'BUY' : 'SELL';
    const dominanceRatio = Math.max(buyVolume, sellVolume) / totalBigVolume;
    
    return {
      detected: true,
      count: bigTrades.length,
      totalVolume: totalBigVolume,
      direction: direction,
      dominanceRatio: dominanceRatio,
      avgSize: totalBigVolume / bigTrades.length,
      impact: this.calculateImpact(totalBigVolume, dominanceRatio),
      trades: bigTrades.map(trade => ({
        timestamp: trade.timestamp,
        price: trade.price,
        volume: trade.volume,
        side: trade.side
      }))
    };
  }
  
  calculateImpact(volume, dominance) {
    if (volume > 2000000 && dominance > 0.8) return 'EXTREME';
    if (volume > 1000000 && dominance > 0.7) return 'HIGH';
    if (volume > 500000 && dominance > 0.6) return 'MODERATE';
    return 'LOW';
  }
}
```

### **3. Análise de Imbalance**
```javascript
class ImbalanceAnalyzer {
  analyzeBookImbalance(bookData, levels = 5) {
    // Analisar primeiros N níveis do book
    const topBids = bookData.bids.slice(0, levels);
    const topAsks = bookData.asks.slice(0, levels);
    
    const bidVolume = topBids.reduce((sum, bid) => sum + bid.volume, 0);
    const askVolume = topAsks.reduce((sum, ask) => sum + ask.volume, 0);
    
    const totalVolume = bidVolume + askVolume;
    const imbalanceRatio = totalVolume > 0 ? bidVolume / totalVolume : 0.5;
    
    // Analisar distribuição por nível
    const levelAnalysis = this.analyzeLevelDistribution(topBids, topAsks);
    
    return {
      bidVolume: bidVolume,
      askVolume: askVolume,
      totalVolume: totalVolume,
      imbalanceRatio: imbalanceRatio,
      direction: imbalanceRatio > 0.6 ? 'BUY' : imbalanceRatio < 0.4 ? 'SELL' : 'NEUTRAL',
      strength: this.calculateImbalanceStrength(imbalanceRatio),
      levelAnalysis: levelAnalysis,
      spread: bookData.spread,
      midPrice: bookData.midPrice
    };
  }
  
  analyzeLevelDistribution(bids, asks) {
    return {
      bidLevels: bids.map((bid, index) => ({
        level: index + 1,
        price: bid.price,
        volume: bid.volume,
        orders: bid.orders,
        avgOrderSize: bid.volume / bid.orders
      })),
      askLevels: asks.map((ask, index) => ({
        level: index + 1,
        price: ask.price,
        volume: ask.volume,
        orders: ask.orders,
        avgOrderSize: ask.volume / ask.orders
      }))
    };
  }
  
  calculateImbalanceStrength(ratio) {
    const deviation = Math.abs(ratio - 0.5);
    if (deviation > 0.25) return 'EXTREME';
    if (deviation > 0.15) return 'STRONG';
    if (deviation > 0.1) return 'MODERATE';
    return 'WEAK';
  }
}
```

### **4. Análise de Momentum**
```javascript
class MomentumAnalyzer {
  analyzeMomentum(timesTradesData, periods = [30, 60, 120]) {
    const momentum = {};
    
    periods.forEach(period => {
      const recentTrades = this.getRecentTrades(timesTradesData, period);
      
      if (recentTrades.length < 2) {
        momentum[`${period}s`] = null;
        return;
      }
      
      // Calcular momentum de preço
      const firstPrice = recentTrades[0].price;
      const lastPrice = recentTrades[recentTrades.length - 1].price;
      const priceChange = lastPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;
      
      // Calcular momentum de volume
      const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.volume, 0);
      const avgVolumePerTrade = totalVolume / recentTrades.length;
      
      // Calcular aceleração
      const acceleration = this.calculateAcceleration(recentTrades);
      
      momentum[`${period}s`] = {
        priceChange: priceChange,
        priceChangePercent: priceChangePercent,
        totalVolume: totalVolume,
        avgVolumePerTrade: avgVolumePerTrade,
        tradeCount: recentTrades.length,
        acceleration: acceleration,
        direction: priceChange > 0 ? 'UP' : priceChange < 0 ? 'DOWN' : 'SIDEWAYS',
        strength: this.calculateMomentumStrength(priceChangePercent, totalVolume)
      };
    });
    
    return momentum;
  }
  
  calculateAcceleration(trades) {
    if (trades.length < 3) return 0;
    
    const midPoint = Math.floor(trades.length / 2);
    const firstHalf = trades.slice(0, midPoint);
    const secondHalf = trades.slice(midPoint);
    
    const firstHalfAvgPrice = firstHalf.reduce((sum, trade) => sum + trade.price, 0) / firstHalf.length;
    const secondHalfAvgPrice = secondHalf.reduce((sum, trade) => sum + trade.price, 0) / secondHalf.length;
    
    return secondHalfAvgPrice - firstHalfAvgPrice;
  }
  
  calculateMomentumStrength(priceChangePercent, volume) {
    const priceScore = Math.min(Math.abs(priceChangePercent) * 10, 1);
    const volumeScore = Math.min(volume / 1000000, 1);
    return (priceScore + volumeScore) / 2;
  }
}
```

## 🎯 Sinais de Trading

### **1. Sinal de Compra Forte**
```javascript
const strongBuySignal = {
  conditions: {
    aggression: {
      buyRatio: "> 0.75",
      intensity: "STRONG ou EXTREME",
      confidence: "> 0.7"
    },
    bigPlayers: {
      detected: true,
      direction: "BUY",
      impact: "HIGH ou EXTREME"
    },
    imbalance: {
      direction: "BUY",
      strength: "STRONG ou EXTREME",
      imbalanceRatio: "> 0.7"
    },
    momentum: {
      direction: "UP",
      acceleration: "> 0",
      strength: "> 0.6"
    }
  },
  
  example: {
    aggression: { buyRatio: 0.82, intensity: "STRONG" },
    bigPlayers: { detected: true, direction: "BUY", impact: "HIGH" },
    imbalance: { direction: "BUY", strength: "STRONG", imbalanceRatio: 0.78 },
    momentum: { direction: "UP", acceleration: 0.15, strength: 0.75 }
  },
  
  action: "COMPRAR",
  confidence: 0.89,
  riskReward: "1:2 ou melhor"
};
```

### **2. Sinal de Venda Forte**
```javascript
const strongSellSignal = {
  conditions: {
    aggression: {
      sellRatio: "> 0.75",
      intensity: "STRONG ou EXTREME",
      confidence: "> 0.7"
    },
    bigPlayers: {
      detected: true,
      direction: "SELL",
      impact: "HIGH ou EXTREME"
    },
    imbalance: {
      direction: "SELL",
      strength: "STRONG ou EXTREME",
      imbalanceRatio: "< 0.3"
    },
    momentum: {
      direction: "DOWN",
      acceleration: "< 0",
      strength: "> 0.6"
    }
  },
  
  action: "VENDER",
  confidence: 0.85,
  riskReward: "1:2 ou melhor"
};
```

### **3. Sinais de Alerta**
```javascript
const alertSignals = {
  // Divergência entre preço e order flow
  divergence: {
    condition: "Preço subindo mas order flow vendedor",
    action: "CUIDADO - Possível reversão",
    example: {
      priceDirection: "UP",
      orderFlowDirection: "SELL",
      confidence: 0.7
    }
  },
  
  // Absorção detectada
  absorption: {
    condition: "Volume alto sendo absorvido",
    action: "AGUARDAR - Possível reversão",
    example: {
      level: 6.0470,
      volume: 2000000,
      direction: "SELL_ABSORPTION"
    }
  },
  
  // Exaustão de movimento
  exhaustion: {
    condition: "Volume e momentum diminuindo",
    action: "FECHAR POSIÇÃO - Movimento perdendo força",
    example: {
      volumeDecline: 0.4,
      momentumWeakening: true
    }
  }
};
```

## 📊 Dashboard de Order Flow

### **Interface HTML**
```html
<div class="order-flow-dashboard">
  <div class="dashboard-header">
    <h2>⚡ Order Flow Analysis - DOL</h2>
    <div class="status-indicator" id="orderFlowStatus">
      <span class="status-light"></span>
      <span class="status-text">Analisando...</span>
    </div>
  </div>
  
  <div class="metrics-grid">
    <!-- Agressão -->
    <div class="metric-card aggression">
      <h3>🎯 Agressão</h3>
      <div class="metric-value" id="aggressionValue">75% COMPRA</div>
      <div class="metric-bar">
        <div class="bar-fill buy" style="width: 75%"></div>
      </div>
      <div class="metric-details">
        <span>Intensidade: <strong id="aggressionIntensity">FORTE</strong></span>
        <span>Confiança: <strong id="aggressionConfidence">85%</strong></span>
      </div>
    </div>
    
    <!-- Players Grandes -->
    <div class="metric-card big-players">
      <h3>🐋 Players Grandes</h3>
      <div class="metric-value" id="bigPlayersValue">3 DETECTADOS</div>
      <div class="player-direction" id="playerDirection">COMPRANDO</div>
      <div class="metric-details">
        <span>Volume: <strong id="bigPlayerVolume">2.5M</strong></span>
        <span>Impacto: <strong id="bigPlayerImpact">ALTO</strong></span>
      </div>
    </div>
    
    <!-- Imbalance -->
    <div class="metric-card imbalance">
      <h3>⚖️ Imbalance</h3>
      <div class="metric-value" id="imbalanceValue">+68%</div>
      <div class="imbalance-visual">
        <div class="bid-side" style="height: 68%">BID</div>
        <div class="ask-side" style="height: 32%">ASK</div>
      </div>
      <div class="metric-details">
        <span>Força: <strong id="imbalanceStrength">FORTE</strong></span>
        <span>Spread: <strong id="spread">0.5</strong></span>
      </div>
    </div>
    
    <!-- Momentum -->
    <div class="metric-card momentum">
      <h3>🚀 Momentum</h3>
      <div class="metric-value" id="momentumValue">ALTA</div>
      <div class="momentum-chart" id="momentumChart"></div>
      <div class="metric-details">
        <span>30s: <strong id="momentum30s">+0.15%</strong></span>
        <span>60s: <strong id="momentum60s">+0.28%</strong></span>
      </div>
    </div>
  </div>
  
  <!-- Sinais -->
  <div class="signals-section">
    <h3>🎯 Sinais de Trading</h3>
    <div class="signal-card" id="currentSignal">
      <div class="signal-type buy">COMPRA FORTE</div>
      <div class="signal-confidence">Confiança: 89%</div>
      <div class="signal-details">
        <span>R/R: 1:2.5</span>
        <span>Stop: 6.0420</span>
        <span>Alvo: 6.0520</span>
      </div>
    </div>
  </div>
  
  <!-- Alertas -->
  <div class="alerts-section">
    <h3>🚨 Alertas</h3>
    <div class="alert-list" id="alertList">
      <!-- Alertas dinâmicos -->
    </div>
  </div>
</div>
```

### **CSS Styling**
```css
.order-flow-dashboard {
  background: #1a1a1a;
  color: #fff;
  padding: 20px;
  border-radius: 10px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.metric-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px;
}

.metric-card.aggression {
  border-left: 4px solid #00ff00;
}

.metric-card.big-players {
  border-left: 4px solid #0099ff;
}

.metric-card.imbalance {
  border-left: 4px solid #ffaa00;
}

.metric-card.momentum {
  border-left: 4px solid #ff00ff;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
}

.metric-bar {
  height: 10px;
  background: #444;
  border-radius: 5px;
  overflow: hidden;
  margin: 10px 0;
}

.bar-fill.buy {
  background: linear-gradient(90deg, #00ff00, #66ff66);
  height: 100%;
  transition: width 0.3s ease;
}

.bar-fill.sell {
  background: linear-gradient(90deg, #ff0000, #ff6666);
  height: 100%;
  transition: width 0.3s ease;
}

.signal-card {
  background: #2a2a2a;
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.signal-type.buy {
  color: #00ff00;
  font-size: 20px;
  font-weight: bold;
}

.signal-type.sell {
  color: #ff0000;
  font-size: 20px;
  font-weight: bold;
}

.status-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00ff00;
  display: inline-block;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
```

## 🔧 Integração com Sistema

### **Classe Principal**
```javascript
class OrderFlowEngine {
  constructor(config) {
    this.config = config;
    this.aggressionAnalyzer = new AggressionAnalyzer();
    this.bigPlayerDetector = new BigPlayerDetector();
    this.imbalanceAnalyzer = new ImbalanceAnalyzer();
    this.momentumAnalyzer = new MomentumAnalyzer();
    
    this.currentAnalysis = null;
    this.callbacks = [];
  }
  
  // Processar novos dados
  processData(timesTradesData, bookData) {
    const analysis = {
      timestamp: Date.now(),
      aggression: this.aggressionAnalyzer.analyzeAggression(timesTradesData),
      bigPlayers: this.bigPlayerDetector.detectBigPlayers(timesTradesData),
      imbalance: this.imbalanceAnalyzer.analyzeBookImbalance(bookData),
      momentum: this.momentumAnalyzer.analyzeMomentum(timesTradesData)
    };
    
    // Gerar sinais
    analysis.signals = this.generateSignals(analysis);
    
    // Detectar alertas
    analysis.alerts = this.detectAlerts(analysis);
    
    this.currentAnalysis = analysis;
    
    // Notificar callbacks
    this.notifyCallbacks(analysis);
    
    return analysis;
  }
  
  generateSignals(analysis) {
    const signals = [];
    
    // Lógica de geração de sinais baseada na análise
    const buyConditions = [
      analysis.aggression.buyRatio > 0.7,
      analysis.bigPlayers.detected && analysis.bigPlayers.direction === 'BUY',
      analysis.imbalance.direction === 'BUY' && analysis.imbalance.strength !== 'WEAK',
      analysis.momentum['60s'] && analysis.momentum['60s'].direction === 'UP'
    ];
    
    const sellConditions = [
      analysis.aggression.sellRatio > 0.7,
      analysis.bigPlayers.detected && analysis.bigPlayers.direction === 'SELL',
      analysis.imbalance.direction === 'SELL' && analysis.imbalance.strength !== 'WEAK',
      analysis.momentum['60s'] && analysis.momentum['60s'].direction === 'DOWN'
    ];
    
    const buyScore = buyConditions.filter(Boolean).length / buyConditions.length;
    const sellScore = sellConditions.filter(Boolean).length / sellConditions.length;
    
    if (buyScore >= 0.75) {
      signals.push({
        type: 'BUY',
        strength: buyScore > 0.9 ? 'STRONG' : 'MODERATE',
        confidence: buyScore,
        reasoning: this.generateReasoning(analysis, 'BUY')
      });
    }
    
    if (sellScore >= 0.75) {
      signals.push({
        type: 'SELL',
        strength: sellScore > 0.9 ? 'STRONG' : 'MODERATE',
        confidence: sellScore,
        reasoning: this.generateReasoning(analysis, 'SELL')
      });
    }
    
    return signals;
  }
  
  // Registrar callback para updates
  onUpdate(callback) {
    this.callbacks.push(callback);
  }
  
  notifyCallbacks(analysis) {
    this.callbacks.forEach(callback => {
      try {
        callback(analysis);
      } catch (error) {
        console.error('Error in order flow callback:', error);
      }
    });
  }
}
```

---

**📝 Nota**: Order Flow Analysis é a base para decisões de trading precisas. A combinação de agressão, players grandes, imbalance e momentum fornece uma visão completa das intenções do mercado.
