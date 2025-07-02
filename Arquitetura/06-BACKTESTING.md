# 📊 Sistema de Backtesting - Documentação Completa

## 📋 Visão Geral

O **Sistema de Backtesting** permite testar estratégias de trading com dados históricos reais da Cedro API, validando a eficácia das estratégias antes de aplicá-las com dinheiro real.

## 🎯 Objetivos do Backtesting

### **Funcionalidades Principais**
- **Teste com dados históricos** tick-by-tick
- **Simulação realística** de execução
- **Análise estatística** completa
- **Otimização de parâmetros** automática
- **Walk-forward analysis** para robustez
- **Relatórios detalhados** de performance

## 🏗️ Arquitetura do Sistema

### **Componentes Principais**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE BACKTESTING                       │
├─────────────────────────────────────────────────────────────────┤
│  DADOS HISTÓRICOS │  ENGINE BACKTEST  │    ANÁLISE RESULTADOS   │
│  ┌─────────────┐  │  ┌─────────────┐  │   ┌─────────────────┐   │
│  │ Cedro API   │  │  │ Simulação   │  │   │ Estatísticas    │   │
│  │ Tick by Tick│  │  │ Estratégia  │  │   │ Gráficos        │   │
│  │ Book Dados  │  │  │ Execução    │  │   │ Relatórios      │   │
│  │ Times&Trades│  │  │ P&L Virtual │  │   │ Otimização      │   │
│  └─────────────┘  │  └─────────────┘  │   └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Engine de Backtesting

### **Classe Principal**
```javascript
class BacktestEngine {
  constructor(config) {
    this.config = config;
    this.historicalData = [];
    this.strategy = null;
    this.portfolio = new VirtualPortfolio(config.initialBalance);
    this.results = {
      trades: [],
      statistics: {},
      equity: [],
      drawdown: []
    };
  }
  
  // Carregar dados históricos
  async loadHistoricalData(startDate, endDate, symbol = 'DOL') {
    console.log(`📥 Carregando dados históricos: ${startDate} a ${endDate}`);
    
    try {
      const data = await this.cedroAPI.getHistoricalData({
        symbol: symbol,
        startDate: startDate,
        endDate: endDate,
        type: 'tick_by_tick',
        includeBook: true,
        includeTimesAndTrades: true
      });
      
      this.historicalData = this.processHistoricalData(data);
      console.log(`✅ ${this.historicalData.length} ticks carregados`);
      
      return this.historicalData;
    } catch (error) {
      console.error('❌ Erro ao carregar dados históricos:', error);
      throw error;
    }
  }
  
  // Processar dados históricos
  processHistoricalData(rawData) {
    return rawData.map(tick => ({
      timestamp: new Date(tick.timestamp),
      price: parseFloat(tick.price),
      volume: parseInt(tick.volume),
      side: tick.side,
      aggressor: tick.aggressor,
      bookData: tick.bookData || null
    })).sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // Executar backtesting
  async runBacktest(strategy, progressCallback = null) {
    console.log('🚀 Iniciando backtesting...');
    
    this.strategy = strategy;
    this.portfolio.reset();
    this.results = { trades: [], statistics: {}, equity: [], drawdown: [] };
    
    const totalTicks = this.historicalData.length;
    let processedTicks = 0;
    
    // Processar cada tick
    for (let i = 0; i < totalTicks; i++) {
      const tick = this.historicalData[i];
      const context = this.buildMarketContext(i);
      
      // Atualizar posições existentes
      this.portfolio.updatePositions(tick.price);
      
      // Aplicar estratégia
      const signal = this.strategy.analyze(tick, context);
      
      // Executar sinais
      if (signal && signal.action !== 'HOLD') {
        const trade = this.executeSignal(signal, tick);
        if (trade) {
          this.results.trades.push(trade);
        }
      }
      
      // Registrar equity
      this.results.equity.push({
        timestamp: tick.timestamp,
        balance: this.portfolio.currentBalance,
        equity: this.portfolio.equity,
        unrealizedPL: this.portfolio.getUnrealizedPL()
      });
      
      processedTicks++;
      
      // Callback de progresso
      if (progressCallback && processedTicks % 1000 === 0) {
        const progress = (processedTicks / totalTicks) * 100;
        progressCallback(progress);
      }
    }
    
    // Fechar posições abertas
    this.closeAllPositions(this.historicalData[totalTicks - 1].price);
    
    // Calcular estatísticas
    this.calculateStatistics();
    
    console.log('✅ Backtesting concluído');
    return this.results;
  }
  
  // Construir contexto de mercado
  buildMarketContext(currentIndex) {
    const lookback = 100; // Últimos 100 ticks
    const startIndex = Math.max(0, currentIndex - lookback);
    const recentData = this.historicalData.slice(startIndex, currentIndex + 1);
    
    return {
      currentTick: this.historicalData[currentIndex],
      recentTicks: recentData,
      orderFlow: this.analyzeOrderFlow(recentData),
      footprint: this.analyzeFootprint(recentData),
      marketConditions: this.analyzeMarketConditions(recentData)
    };
  }
  
  // Executar sinal de trading
  executeSignal(signal, tick) {
    try {
      if (signal.action === 'BUY' || signal.action === 'SELL') {
        // Verificar se já tem posição
        if (this.portfolio.positions.length > 0) {
          return null; // Já tem posição aberta
        }
        
        const position = this.portfolio.openPosition(
          signal.action,
          signal.volume || 1,
          tick.price,
          signal.stopLoss,
          signal.takeProfit
        );
        
        return {
          type: 'OPEN',
          signal: signal,
          position: position,
          timestamp: tick.timestamp,
          price: tick.price
        };
        
      } else if (signal.action === 'CLOSE') {
        // Fechar todas as posições
        const closedTrades = [];
        
        this.portfolio.positions.forEach(position => {
          const closedTrade = this.portfolio.closePosition(
            position.id, 
            tick.price, 
            'MANUAL'
          );
          
          if (closedTrade) {
            closedTrades.push({
              type: 'CLOSE',
              trade: closedTrade,
              timestamp: tick.timestamp,
              price: tick.price
            });
          }
        });
        
        return closedTrades.length > 0 ? closedTrades[0] : null;
      }
      
    } catch (error) {
      console.error('❌ Erro ao executar sinal:', error);
      return null;
    }
  }
  
  // Calcular estatísticas do backtest
  calculateStatistics() {
    const trades = this.results.trades.filter(t => t.type === 'CLOSE');
    
    if (trades.length === 0) {
      this.results.statistics = { error: 'Nenhum trade executado' };
      return;
    }
    
    const winningTrades = trades.filter(t => t.trade.realizedPL > 0);
    const losingTrades = trades.filter(t => t.trade.realizedPL <= 0);
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.trade.realizedPL, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.trade.realizedPL, 0));
    
    const equity = this.results.equity;
    const maxEquity = Math.max(...equity.map(e => e.equity));
    const minEquity = Math.min(...equity.map(e => e.equity));
    
    this.results.statistics = {
      // Performance básica
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winningTrades.length / trades.length,
      
      // P&L
      totalProfit: totalProfit,
      totalLoss: totalLoss,
      netProfit: totalProfit - totalLoss,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
      
      // Médias
      avgWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      avgTrade: (totalProfit - totalLoss) / trades.length,
      
      // Drawdown
      maxDrawdown: this.calculateMaxDrawdown(equity),
      currentDrawdown: (maxEquity - equity[equity.length - 1].equity) / maxEquity,
      
      // Ratios
      sharpeRatio: this.calculateSharpeRatio(equity),
      calmarRatio: this.calculateCalmarRatio(equity),
      
      // Sequências
      maxWinStreak: this.calculateMaxWinStreak(trades),
      maxLossStreak: this.calculateMaxLossStreak(trades),
      
      // Período
      startDate: this.historicalData[0].timestamp,
      endDate: this.historicalData[this.historicalData.length - 1].timestamp,
      
      // Retorno
      totalReturn: ((equity[equity.length - 1].equity - this.config.initialBalance) / this.config.initialBalance) * 100
    };
  }
  
  calculateMaxDrawdown(equity) {
    let maxDrawdown = 0;
    let peak = equity[0].equity;
    
    equity.forEach(point => {
      if (point.equity > peak) {
        peak = point.equity;
      }
      
      const drawdown = (peak - point.equity) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    return maxDrawdown;
  }
  
  calculateSharpeRatio(equity) {
    if (equity.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
      const ret = (equity[i].equity - equity[i-1].equity) / equity[i-1].equity;
      returns.push(ret);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }
}
```

## 🔧 Otimização de Parâmetros

### **Otimizador Automático**
```javascript
class ParameterOptimizer {
  constructor(backtestEngine) {
    this.backtestEngine = backtestEngine;
    this.optimizationResults = [];
  }
  
  // Otimizar parâmetros da estratégia
  async optimizeParameters(strategy, parameterRanges, metric = 'sharpeRatio') {
    console.log('🔧 Iniciando otimização de parâmetros...');
    
    const combinations = this.generateParameterCombinations(parameterRanges);
    const results = [];
    
    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];
      
      console.log(`📊 Testando combinação ${i + 1}/${combinations.length}:`, params);
      
      // Configurar estratégia com novos parâmetros
      strategy.setParameters(params);
      
      // Executar backtest
      const result = await this.backtestEngine.runBacktest(strategy);
      
      results.push({
        parameters: { ...params },
        statistics: result.statistics,
        metric: result.statistics[metric] || 0
      });
    }
    
    // Ordenar por métrica
    results.sort((a, b) => b.metric - a.metric);
    
    this.optimizationResults = results;
    
    console.log('✅ Otimização concluída');
    console.log('🏆 Melhores parâmetros:', results[0].parameters);
    
    return results;
  }
  
  generateParameterCombinations(ranges) {
    const keys = Object.keys(ranges);
    const combinations = [];
    
    function generateCombos(index, current) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }
      
      const key = keys[index];
      const values = ranges[key];
      
      values.forEach(value => {
        current[key] = value;
        generateCombos(index + 1, current);
      });
    }
    
    generateCombos(0, {});
    return combinations;
  }
  
  // Walk-forward analysis
  async walkForwardAnalysis(strategy, periods = 6) {
    console.log('🚶 Iniciando Walk-Forward Analysis...');
    
    const dataLength = this.backtestEngine.historicalData.length;
    const periodSize = Math.floor(dataLength / periods);
    const results = [];
    
    for (let i = 0; i < periods - 1; i++) {
      const trainStart = i * periodSize;
      const trainEnd = (i + 1) * periodSize;
      const testStart = trainEnd;
      const testEnd = Math.min((i + 2) * periodSize, dataLength);
      
      console.log(`📈 Período ${i + 1}: Treino ${trainStart}-${trainEnd}, Teste ${testStart}-${testEnd}`);
      
      // Dados de treino
      const trainData = this.backtestEngine.historicalData.slice(trainStart, trainEnd);
      
      // Otimizar parâmetros no período de treino
      this.backtestEngine.historicalData = trainData;
      const optimization = await this.optimizeParameters(strategy, this.getParameterRanges());
      const bestParams = optimization[0].parameters;
      
      // Testar no período seguinte
      const testData = this.backtestEngine.historicalData.slice(testStart, testEnd);
      this.backtestEngine.historicalData = testData;
      strategy.setParameters(bestParams);
      const testResult = await this.backtestEngine.runBacktest(strategy);
      
      results.push({
        period: i + 1,
        trainPeriod: { start: trainStart, end: trainEnd },
        testPeriod: { start: testStart, end: testEnd },
        optimizedParams: bestParams,
        trainResult: optimization[0].statistics,
        testResult: testResult.statistics
      });
    }
    
    // Restaurar dados completos
    this.backtestEngine.historicalData = this.backtestEngine.historicalData;
    
    return this.analyzeWalkForwardResults(results);
  }
  
  analyzeWalkForwardResults(results) {
    const analysis = {
      periods: results.length,
      consistency: this.calculateConsistency(results),
      robustness: this.calculateRobustness(results),
      avgPerformance: this.calculateAvgPerformance(results),
      parameterStability: this.analyzeParameterStability(results)
    };
    
    return {
      results: results,
      analysis: analysis,
      recommendation: this.generateWalkForwardRecommendation(analysis)
    };
  }
}
```

## 📊 Relatórios e Visualização

### **Gerador de Relatórios**
```javascript
class BacktestReportGenerator {
  constructor(backtestResults) {
    this.results = backtestResults;
  }
  
  generateHTMLReport() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Relatório de Backtesting</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-card { background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
            .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
            .metric-label { color: #666; margin-top: 5px; }
            .chart-container { margin: 20px 0; }
            .positive { color: #28a745; }
            .negative { color: #dc3545; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <div class="header">
            <h1>📊 Relatório de Backtesting</h1>
            <p>Período: ${this.formatDate(this.results.statistics.startDate)} a ${this.formatDate(this.results.statistics.endDate)}</p>
        </div>
        
        ${this.generateMetricsSection()}
        ${this.generateChartsSection()}
        ${this.generateTradesSection()}
        ${this.generateRecommendationsSection()}
    </body>
    </html>`;
  }
  
  generateMetricsSection() {
    const stats = this.results.statistics;
    
    return `
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value ${stats.winRate >= 0.6 ? 'positive' : 'negative'}">
                ${(stats.winRate * 100).toFixed(1)}%
            </div>
            <div class="metric-label">Win Rate</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value ${stats.profitFactor >= 1.5 ? 'positive' : 'negative'}">
                ${stats.profitFactor.toFixed(2)}
            </div>
            <div class="metric-label">Profit Factor</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value ${stats.netProfit >= 0 ? 'positive' : 'negative'}">
                R$ ${stats.netProfit.toLocaleString()}
            </div>
            <div class="metric-label">Lucro Líquido</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value ${stats.maxDrawdown <= 0.1 ? 'positive' : 'negative'}">
                ${(stats.maxDrawdown * 100).toFixed(1)}%
            </div>
            <div class="metric-label">Max Drawdown</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value ${stats.sharpeRatio >= 1.5 ? 'positive' : 'negative'}">
                ${stats.sharpeRatio.toFixed(2)}
            </div>
            <div class="metric-label">Sharpe Ratio</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value">
                ${stats.totalTrades}
            </div>
            <div class="metric-label">Total Trades</div>
        </div>
    </div>`;
  }
  
  generateChartsSection() {
    return `
    <div class="chart-container">
        <h2>📈 Curva de Capital</h2>
        <canvas id="equityChart" width="800" height="400"></canvas>
    </div>
    
    <div class="chart-container">
        <h2>📉 Drawdown</h2>
        <canvas id="drawdownChart" width="800" height="300"></canvas>
    </div>
    
    <script>
        // Gráfico de Equity
        const equityCtx = document.getElementById('equityChart').getContext('2d');
        new Chart(equityCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(this.results.equity.map(e => this.formatDate(e.timestamp)))},
                datasets: [{
                    label: 'Capital',
                    data: ${JSON.stringify(this.results.equity.map(e => e.equity))},
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
        
        // Gráfico de Drawdown
        const drawdownCtx = document.getElementById('drawdownChart').getContext('2d');
        new Chart(drawdownCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(this.results.drawdown.map(d => this.formatDate(d.timestamp)))},
                datasets: [{
                    label: 'Drawdown %',
                    data: ${JSON.stringify(this.results.drawdown.map(d => d.drawdown * 100))},
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        reverse: true,
                        beginAtZero: true
                    }
                }
            }
        });
    </script>`;
  }
  
  exportToCSV() {
    const trades = this.results.trades.filter(t => t.type === 'CLOSE');
    
    let csv = 'Data,Tipo,Preço Entrada,Preço Saída,P&L,Duração\n';
    
    trades.forEach(trade => {
      csv += `${this.formatDate(trade.trade.openTime)},`;
      csv += `${trade.trade.type},`;
      csv += `${trade.trade.openPrice},`;
      csv += `${trade.trade.closePrice},`;
      csv += `${trade.trade.realizedPL},`;
      csv += `${trade.trade.duration}\n`;
    });
    
    return csv;
  }
}
```

## 🎯 Configuração de Estratégias

### **Interface de Estratégia**
```javascript
class TradingStrategy {
  constructor(name, parameters = {}) {
    this.name = name;
    this.parameters = parameters;
  }
  
  // Método principal de análise
  analyze(tick, context) {
    // Implementar lógica da estratégia
    throw new Error('Método analyze deve ser implementado');
  }
  
  // Configurar parâmetros
  setParameters(params) {
    this.parameters = { ...this.parameters, ...params };
  }
  
  // Obter parâmetros atuais
  getParameters() {
    return { ...this.parameters };
  }
}

// Exemplo de estratégia baseada em Order Flow
class OrderFlowStrategy extends TradingStrategy {
  constructor() {
    super('Order Flow Strategy', {
      aggressionThreshold: 0.7,
      volumeThreshold: 1000000,
      imbalanceThreshold: 0.65,
      stopLoss: 30,
      takeProfit: 60
    });
  }
  
  analyze(tick, context) {
    const { orderFlow, footprint } = context;
    
    if (!orderFlow || !footprint) {
      return { action: 'HOLD' };
    }
    
    // Verificar condições de compra
    const buyConditions = [
      orderFlow.aggression.buyRatio > this.parameters.aggressionThreshold,
      orderFlow.bigPlayers.detected && orderFlow.bigPlayers.direction === 'BUY',
      orderFlow.imbalance.imbalanceRatio > this.parameters.imbalanceThreshold,
      footprint.summary.totalVolume > this.parameters.volumeThreshold
    ];
    
    // Verificar condições de venda
    const sellConditions = [
      orderFlow.aggression.sellRatio > this.parameters.aggressionThreshold,
      orderFlow.bigPlayers.detected && orderFlow.bigPlayers.direction === 'SELL',
      orderFlow.imbalance.imbalanceRatio < (1 - this.parameters.imbalanceThreshold),
      footprint.summary.totalVolume > this.parameters.volumeThreshold
    ];
    
    const buyScore = buyConditions.filter(Boolean).length / buyConditions.length;
    const sellScore = sellConditions.filter(Boolean).length / sellConditions.length;
    
    if (buyScore >= 0.75) {
      return {
        action: 'BUY',
        volume: 1,
        stopLoss: tick.price - this.parameters.stopLoss,
        takeProfit: tick.price + this.parameters.takeProfit,
        confidence: buyScore
      };
    }
    
    if (sellScore >= 0.75) {
      return {
        action: 'SELL',
        volume: 1,
        stopLoss: tick.price + this.parameters.stopLoss,
        takeProfit: tick.price - this.parameters.takeProfit,
        confidence: sellScore
      };
    }
    
    return { action: 'HOLD' };
  }
}
```

---

**📝 Nota**: O sistema de backtesting é essencial para validar estratégias antes de aplicá-las com dinheiro real. A combinação de dados históricos precisos com simulação realística fornece confiança na estratégia desenvolvida.
