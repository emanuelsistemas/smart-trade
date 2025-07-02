# 🦶 Footprint Chart - Documentação Completa

## 📋 Visão Geral

O **Footprint Chart** é o coração do sistema de análise, revelando a "pegada" dos traders no mercado através da visualização do volume de compra e venda em cada nível de preço.

## 🎯 Conceito Fundamental

### **Diferença dos Gráficos Tradicionais**
```
CANDLESTICK TRADICIONAL:        FOOTPRINT CHART:
     │                         ┌─────────────────┐
   ┌─┤ ← Máxima                │6.0470│ 50↑│ 20↓│
   │ │                         │6.0460│150↑│ 80↓│ ← Imbalance Comprador
   │ │                         │6.0450│300↑│120↓│ ← Volume por preço
   │ │                         │6.0440│200↑│250↓│ ← Imbalance Vendedor  
   └─┤ ← Mínima                │6.0430│100↑│180↓│
     │                         └─────────────────┘
                                Preço │Comp│Vend│

INFORMAÇÃO:                     INFORMAÇÃO:
- Preço subiu                   - 300 compradores vs 120 vendedores
- Volume alto                   - Imbalance 71% compradora
- Fechou acima                  - Agressão específica por preço
```

## 🔍 Estrutura de Dados

### **Tick Individual**
```javascript
const tick = {
  symbol: "DOL",
  timestamp: "2025-06-27T14:30:25.123Z",
  price: 6.0450,
  volume: 50,
  side: "BUY", // BUY = agressão compradora, SELL = agressão vendedora
  aggressor: true, // Quem iniciou o negócio
  tradeId: "12345678",
  sequence: 1001
};
```

### **Estrutura de Barra Footprint**
```javascript
const footprintBar = {
  // Identificação
  id: "DOL_2025-06-27_14:30:00_500tick",
  symbol: "DOL",
  timestamp: "2025-06-27T14:30:00Z",
  timeframe: "500_tick", // 500 negócios por barra
  
  // Status
  status: "FORMING", // FORMING, COMPLETED
  tickCount: 347, // Ticks processados até agora
  
  // Dados por preço
  priceData: {
    "6.0470": {
      bid: 50,        // Volume de compra (agressão)
      ask: 20,        // Volume de venda (agressão)
      delta: 30,      // Diferença (bid - ask)
      totalVolume: 70,
      imbalance: 0.71, // 71% favor compra
      trades: 8,      // Número de negócios
      dominance: "BUY"
    },
    "6.0460": {
      bid: 150, ask: 80, delta: 70, totalVolume: 230,
      imbalance: 0.65, trades: 15, dominance: "BUY"
    },
    "6.0450": {
      bid: 300, ask: 120, delta: 180, totalVolume: 420,
      imbalance: 0.71, trades: 25, dominance: "BUY"
    },
    "6.0440": {
      bid: 200, ask: 250, delta: -50, totalVolume: 450,
      imbalance: 0.56, trades: 22, dominance: "SELL"
    }
  },
  
  // Resumo da barra
  summary: {
    high: 6.0470,
    low: 6.0430,
    open: 6.0435,
    close: 6.0465,
    totalVolume: 1170,
    totalDelta: 230,
    netDominance: "BUY",
    strongestLevel: "6.0450", // Maior volume
    imbalanceAvg: 0.66
  },
  
  // Padrões detectados
  patterns: {
    absorption: null,
    exhaustion: false,
    breakout: true,
    iceberg: false
  }
};
```

## 🧮 Algoritmos de Cálculo

### **1. Processamento de Tick**
```javascript
class FootprintProcessor {
  processTick(tick, currentBar) {
    const price = tick.price;
    
    // Inicializar preço se não existe
    if (!currentBar.priceData[price]) {
      currentBar.priceData[price] = {
        bid: 0, ask: 0, delta: 0, totalVolume: 0,
        imbalance: 0, trades: 0, dominance: "NEUTRAL"
      };
    }
    
    const priceLevel = currentBar.priceData[price];
    
    // Determinar agressão
    if (tick.side === 'BUY') {
      priceLevel.bid += tick.volume;
    } else {
      priceLevel.ask += tick.volume;
    }
    
    priceLevel.trades++;
    
    // Recalcular métricas
    this.calculateMetrics(priceLevel);
    this.updateBarSummary(currentBar);
    
    return currentBar;
  }
  
  calculateMetrics(priceLevel) {
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
      priceLevel.dominance = "BUY";
    } else if (priceLevel.ask > priceLevel.bid) {
      priceLevel.dominance = "SELL";
    } else {
      priceLevel.dominance = "NEUTRAL";
    }
  }
}
```

### **2. Detecção de Padrões**
```javascript
class PatternDetector {
  detectAbsorption(footprintBar) {
    const prices = Object.keys(footprintBar.priceData).sort((a, b) => b - a);
    
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      const data = footprintBar.priceData[price];
      
      // Critérios para absorção
      const highVolume = data.totalVolume > this.getVolumeThreshold();
      const strongImbalance = data.imbalance > 0.7;
      const significantDelta = Math.abs(data.delta) > this.getDeltaThreshold();
      
      if (highVolume && strongImbalance && significantDelta) {
        return {
          detected: true,
          level: parseFloat(price),
          volume: data.totalVolume,
          direction: data.dominance,
          strength: this.calculateAbsorptionStrength(data)
        };
      }
    }
    
    return { detected: false };
  }
  
  detectExhaustion(footprintBar, previousBars) {
    if (previousBars.length < 3) return { detected: false };
    
    // Analisar últimas 3 barras
    const recent = previousBars.slice(-3);
    const volumeTrend = this.analyzeVolumeTrend(recent);
    const deltaTrend = this.analyzeDeltaTrend(recent);
    
    return {
      detected: volumeTrend.declining && deltaTrend.weakening,
      volumeDecline: volumeTrend.decline,
      deltaWeakening: deltaTrend.weakening,
      confidence: this.calculateExhaustionConfidence(volumeTrend, deltaTrend)
    };
  }
  
  detectBreakout(footprintBar, context) {
    const summary = footprintBar.summary;
    const volumeExplosion = summary.totalVolume > context.avgVolume * 2;
    const strongDelta = Math.abs(summary.totalDelta) > context.avgDelta * 1.5;
    const priceMovement = this.calculatePriceMovement(footprintBar);
    
    return {
      detected: volumeExplosion && strongDelta && priceMovement.significant,
      volume: summary.totalVolume,
      delta: summary.totalDelta,
      direction: summary.netDominance,
      strength: this.calculateBreakoutStrength(summary, context)
    };
  }
}
```

## 🎨 Visualização

### **Estrutura HTML**
```html
<div class="footprint-chart">
  <div class="chart-header">
    <h3>🦶 Footprint Chart - DOL</h3>
    <div class="timeframe-selector">
      <button data-tf="100_tick">100 Tick</button>
      <button data-tf="500_tick" class="active">500 Tick</button>
      <button data-tf="1000_tick">1000 Tick</button>
    </div>
  </div>
  
  <div class="chart-container">
    <canvas id="footprintCanvas" width="800" height="600"></canvas>
  </div>
  
  <div class="chart-controls">
    <div class="zoom-controls">
      <button id="zoomIn">+</button>
      <button id="zoomOut">-</button>
      <button id="resetZoom">Reset</button>
    </div>
    
    <div class="display-options">
      <label><input type="checkbox" id="showDelta" checked> Delta</label>
      <label><input type="checkbox" id="showImbalance" checked> Imbalance</label>
      <label><input type="checkbox" id="showVolume" checked> Volume</label>
    </div>
  </div>
</div>
```

### **CSS Styling**
```css
.footprint-chart {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  color: #fff;
}

.footprint-bar {
  display: flex;
  flex-direction: column;
  border: 1px solid #444;
  margin: 2px;
  min-width: 60px;
}

.price-level {
  display: flex;
  justify-content: space-between;
  padding: 2px 4px;
  font-size: 10px;
  border-bottom: 1px solid #333;
}

.price-level.buy-dominance {
  background: rgba(0, 255, 0, 0.2);
  border-left: 3px solid #00ff00;
}

.price-level.sell-dominance {
  background: rgba(255, 0, 0, 0.2);
  border-left: 3px solid #ff0000;
}

.price-level.high-imbalance {
  font-weight: bold;
  box-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
}

.bid-volume {
  color: #00ff00;
  font-weight: bold;
}

.ask-volume {
  color: #ff0000;
  font-weight: bold;
}

.delta-positive {
  color: #00ff00;
}

.delta-negative {
  color: #ff0000;
}
```

### **JavaScript Rendering**
```javascript
class FootprintRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bars = [];
    this.config = {
      barWidth: 80,
      priceHeight: 20,
      colors: {
        buyDominance: '#00ff00',
        sellDominance: '#ff0000',
        neutral: '#888888',
        background: '#1a1a1a',
        text: '#ffffff'
      }
    };
  }
  
  renderBar(bar, x) {
    const prices = Object.keys(bar.priceData).sort((a, b) => b - a);
    let y = 50; // Posição inicial Y
    
    prices.forEach(price => {
      const data = bar.priceData[price];
      this.renderPriceLevel(data, price, x, y);
      y += this.config.priceHeight;
    });
    
    // Renderizar timestamp
    this.ctx.fillStyle = this.config.colors.text;
    this.ctx.font = '10px Arial';
    this.ctx.fillText(
      new Date(bar.timestamp).toLocaleTimeString(),
      x, y + 15
    );
  }
  
  renderPriceLevel(data, price, x, y) {
    const { barWidth, priceHeight, colors } = this.config;
    
    // Background baseado na dominância
    let bgColor = colors.neutral;
    if (data.imbalance > 0.6) {
      bgColor = data.dominance === 'BUY' ? colors.buyDominance : colors.sellDominance;
    }
    
    // Desenhar background
    this.ctx.fillStyle = bgColor + '33'; // 20% opacity
    this.ctx.fillRect(x, y, barWidth, priceHeight);
    
    // Desenhar border para high imbalance
    if (data.imbalance > 0.7) {
      this.ctx.strokeStyle = bgColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, barWidth, priceHeight);
    }
    
    // Texto do preço
    this.ctx.fillStyle = colors.text;
    this.ctx.font = '9px Arial';
    this.ctx.fillText(price, x + 2, y + 12);
    
    // Volume bid (verde)
    this.ctx.fillStyle = colors.buyDominance;
    this.ctx.fillText(data.bid + '↑', x + 25, y + 8);
    
    // Volume ask (vermelho)
    this.ctx.fillStyle = colors.sellDominance;
    this.ctx.fillText(data.ask + '↓', x + 25, y + 16);
    
    // Delta
    const deltaColor = data.delta > 0 ? colors.buyDominance : colors.sellDominance;
    this.ctx.fillStyle = deltaColor;
    this.ctx.fillText(
      (data.delta > 0 ? '+' : '') + data.delta,
      x + 50, y + 12
    );
  }
  
  update(newBar) {
    // Adicionar nova barra
    this.bars.push(newBar);
    
    // Manter apenas últimas 20 barras visíveis
    if (this.bars.length > 20) {
      this.bars.shift();
    }
    
    // Re-renderizar
    this.render();
  }
  
  render() {
    // Limpar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Renderizar cada barra
    this.bars.forEach((bar, index) => {
      const x = index * (this.config.barWidth + 10) + 10;
      this.renderBar(bar, x);
    });
  }
}
```

## 📊 Interpretação de Padrões

### **1. Absorption (Absorção)**
```javascript
// Exemplo de absorção detectada
const absorptionPattern = {
  description: "Preço tenta subir mas é absorvido por vendedores",
  example: {
    "6.0470": { bid: 50, ask: 300, delta: -250 }, // ← ABSORÇÃO!
    "6.0460": { bid: 100, ask: 250, delta: -150 },
    "6.0450": { bid: 200, ask: 150, delta: 50 },
    "6.0440": { bid: 300, ask: 100, delta: 200 }
  },
  interpretation: "Vendedores absorvendo toda compra = REVERSÃO",
  action: "Preparar para venda"
};
```

### **2. Exhaustion (Exaustão)**
```javascript
// Exemplo de exaustão
const exhaustionPattern = {
  description: "Movimento perdendo força",
  example: [
    { totalVolume: 1000, delta: 300 }, // Barra 1: Forte
    { totalVolume: 800, delta: 200 },  // Barra 2: Diminuindo
    { totalVolume: 500, delta: 100 }   // Barra 3: Fraco
  ],
  interpretation: "Volume e delta diminuindo = FIM DO MOVIMENTO",
  action: "Fechar posição ou reverter"
};
```

### **3. Breakout Confirmation**
```javascript
// Exemplo de rompimento confirmado
const breakoutPattern = {
  description: "Rompimento com volume explosivo",
  example: {
    "6.0480": { bid: 400, ask: 50, delta: 350 }, // ← EXPLOSÃO!
    "6.0470": { bid: 350, ask: 80, delta: 270 },
    "6.0460": { bid: 200, ask: 300, delta: -100 } // Era resistência
  },
  interpretation: "Volume explosivo = ROMPIMENTO VERDADEIRO",
  action: "Seguir o movimento"
};
```

## 🎯 Configurações Recomendadas

### **Para Dólar Futuro (DOL)**
```javascript
const dollarConfig = {
  timeframes: {
    scalping: "100_tick",
    dayTrade: "500_tick",
    swing: "1000_tick"
  },
  
  thresholds: {
    volumeHigh: 1000000,     // Volume alto
    imbalanceStrong: 0.7,    // Imbalance forte
    deltaSignificant: 500000  // Delta significativo
  },
  
  colors: {
    buyStrong: '#00ff00',
    buyWeak: '#66ff66',
    sellStrong: '#ff0000',
    sellWeak: '#ff6666',
    neutral: '#888888'
  }
};
```

### **Alertas Automáticos**
```javascript
const alertConfig = {
  absorption: {
    enabled: true,
    minVolume: 1000000,
    minImbalance: 0.75,
    sound: 'absorption.wav'
  },
  
  breakout: {
    enabled: true,
    volumeMultiplier: 2.0,
    deltaMultiplier: 1.5,
    sound: 'breakout.wav'
  },
  
  exhaustion: {
    enabled: true,
    barsToAnalyze: 3,
    volumeDeclineThreshold: 0.3,
    sound: 'exhaustion.wav'
  }
};
```

## 🔧 Performance e Otimização

### **Otimizações de Rendering**
```javascript
class OptimizedFootprintRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.dirty = true;
  }
  
  // Renderizar apenas quando necessário
  render() {
    if (!this.dirty) return;
    
    // Renderizar no canvas offscreen
    this.renderToOffscreen();
    
    // Copiar para canvas principal
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    
    this.dirty = false;
  }
  
  // Usar requestAnimationFrame para smooth updates
  scheduleRender() {
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.render();
        this.renderScheduled = false;
      });
    }
  }
}
```

## 📱 Responsividade

### **Adaptação para Mobile**
```css
@media (max-width: 768px) {
  .footprint-chart {
    padding: 10px;
  }
  
  .footprint-bar {
    min-width: 40px;
  }
  
  .price-level {
    font-size: 8px;
    padding: 1px 2px;
  }
  
  .chart-controls {
    flex-direction: column;
    gap: 10px;
  }
}
```

---

**📝 Nota**: O Footprint Chart é a ferramenta mais poderosa para análise de order flow. Dominar sua interpretação é fundamental para o sucesso do sistema de trading.
