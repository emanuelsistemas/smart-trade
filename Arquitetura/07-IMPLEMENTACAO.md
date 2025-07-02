# 🛠️ Guia de Implementação - Sistema de Trading

## 📋 Visão Geral

Este guia fornece instruções detalhadas para implementar o sistema completo de trading, desde a configuração inicial até o deploy em produção.

## 🚀 Configuração Inicial

### **1. Preparação do Ambiente**

#### **Requisitos de Sistema**
```bash
# Sistema Operacional
Ubuntu 20.04+ ou Windows 10/11

# Hardware Mínimo
CPU: Intel i5 ou AMD Ryzen 5
RAM: 16GB DDR4
Storage: SSD 500GB
Internet: 100Mbps estável

# Software Base
Node.js v18+
PHP v8.1+
MySQL v8.0+
Redis v6.0+
```

#### **Instalação das Dependências**
```bash
# Node.js e npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PHP e extensões
sudo apt update
sudo apt install php8.1 php8.1-cli php8.1-mysql php8.1-redis php8.1-curl php8.1-json

# MySQL
sudo apt install mysql-server
sudo mysql_secure_installation

# Redis
sudo apt install redis-server
sudo systemctl enable redis-server

# Composer (PHP)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### **2. Estrutura do Projeto**

#### **Organização de Diretórios**
```
/root/nexo-pedidos/trade/
├── backend/                    # Backend PHP/Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── TradingController.php
│   │   │   ├── BacktestController.php
│   │   │   └── AnalysisController.php
│   │   ├── Models/
│   │   │   ├── Trade.php
│   │   │   ├── Analysis.php
│   │   │   └── Portfolio.php
│   │   └── Services/
│   │       ├── CedroService.php
│   │       ├── OrderFlowService.php
│   │       └── FootprintService.php
│   ├── config/
│   │   ├── cedro.php
│   │   └── trading.php
│   └── database/
│       └── migrations/
├── frontend/                   # Frontend React/Vue
│   ├── src/
│   │   ├── components/
│   │   │   ├── FootprintChart/
│   │   │   ├── OrderFlowDashboard/
│   │   │   └── TradingSimulator/
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── websocket.js
│   │   │   └── cedro.js
│   │   └── utils/
│   ├── public/
│   └── package.json
├── websocket/                  # Servidor WebSocket
│   ├── server.js
│   ├── handlers/
│   └── package.json
└── docs/                      # Documentação
```

### **3. Configuração do Banco de Dados**

#### **Schema Principal**
```sql
-- Tabela de trades
CREATE TABLE trades (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    type ENUM('BUY', 'SELL') NOT NULL,
    volume INT NOT NULL,
    open_price DECIMAL(10,4) NOT NULL,
    close_price DECIMAL(10,4) NULL,
    stop_loss DECIMAL(10,4) NULL,
    take_profit DECIMAL(10,4) NULL,
    realized_pl DECIMAL(12,2) NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NULL,
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    reason VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de análises IA
CREATE TABLE trade_analyses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trade_id BIGINT NOT NULL,
    analysis_type ENUM('ENTRY', 'EXIT') NOT NULL,
    quality_score INT NOT NULL,
    order_flow_score INT NOT NULL,
    timing_score INT NOT NULL,
    risk_management_score INT NOT NULL,
    confluence_score INT NOT NULL,
    feedback JSON NULL,
    recommendations JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id)
);

-- Tabela de dados de mercado
CREATE TABLE market_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    volume INT NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    aggressor BOOLEAN NOT NULL,
    book_data JSON NULL,
    INDEX idx_symbol_timestamp (symbol, timestamp)
);

-- Tabela de footprint
CREATE TABLE footprint_bars (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    price_data JSON NOT NULL,
    summary JSON NOT NULL,
    patterns JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_timeframe_timestamp (symbol, timeframe, timestamp)
);

-- Tabela de evolução do trader
CREATE TABLE trader_evolution (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    win_rate DECIMAL(5,4) NOT NULL,
    profit_factor DECIMAL(8,4) NOT NULL,
    discipline_score INT NOT NULL,
    risk_management_score INT NOT NULL,
    learning_score INT NOT NULL,
    level_name VARCHAR(50) NOT NULL,
    achievements JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Implementação Backend

### **1. Serviço Cedro API**
```php
<?php
// app/Services/CedroService.php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CedroService
{
    private $client;
    private $config;
    private $websocket;
    
    public function __construct()
    {
        $this->config = config('cedro');
        $this->client = new Client([
            'base_uri' => $this->config['api_url'],
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->config['api_key'],
                'Content-Type' => 'application/json'
            ]
        ]);
    }
    
    /**
     * Conectar WebSocket para dados em tempo real
     */
    public function connectWebSocket()
    {
        $this->websocket = new \Ratchet\Client\WebSocket\WebSocketClient();
        
        $connector = new \Ratchet\Client\Connector();
        
        $connector($this->config['websocket_url'])
            ->then(function ($conn) {
                // Autenticar
                $conn->send(json_encode([
                    'action' => 'authenticate',
                    'token' => $this->config['api_key']
                ]));
                
                // Subscrever símbolos
                $conn->send(json_encode([
                    'action' => 'subscribe',
                    'symbols' => ['DOL'],
                    'types' => ['times_trades', 'book_ofertas']
                ]));
                
                $conn->on('message', function ($msg) {
                    $this->handleWebSocketMessage($msg);
                });
                
            }, function ($e) {
                Log::error('Erro conexão WebSocket: ' . $e->getMessage());
            });
    }
    
    /**
     * Processar mensagens do WebSocket
     */
    private function handleWebSocketMessage($message)
    {
        $data = json_decode($message, true);
        
        switch ($data['type']) {
            case 'times_trades':
                $this->processTimesTradesData($data);
                break;
                
            case 'book_ofertas':
                $this->processBookData($data);
                break;
        }
    }
    
    /**
     * Obter dados históricos
     */
    public function getHistoricalData($symbol, $startDate, $endDate, $type = 'tick_by_tick')
    {
        try {
            $response = $this->client->get('/historical', [
                'query' => [
                    'symbol' => $symbol,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'type' => $type,
                    'format' => 'json'
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error('Erro ao obter dados históricos: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Processar dados Times & Trades
     */
    private function processTimesTradesData($data)
    {
        // Salvar no banco
        \App\Models\MarketData::create([
            'symbol' => $data['symbol'],
            'timestamp' => $data['timestamp'],
            'price' => $data['price'],
            'volume' => $data['volume'],
            'side' => $data['side'],
            'aggressor' => $data['aggressor']
        ]);
        
        // Processar order flow
        app(OrderFlowService::class)->processNewTick($data);
        
        // Processar footprint
        app(FootprintService::class)->processNewTick($data);
        
        // Broadcast via WebSocket para frontend
        broadcast(new \App\Events\NewMarketData($data));
    }
}
```

### **2. Serviço Order Flow**
```php
<?php
// app/Services/OrderFlowService.php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class OrderFlowService
{
    private $redis;
    
    public function __construct()
    {
        $this->redis = Redis::connection();
    }
    
    /**
     * Processar novo tick para análise de order flow
     */
    public function processNewTick($tickData)
    {
        // Adicionar tick ao buffer
        $this->addTickToBuffer($tickData);
        
        // Analisar agressão
        $aggression = $this->analyzeAggression($tickData['symbol']);
        
        // Detectar players grandes
        $bigPlayers = $this->detectBigPlayers($tickData['symbol']);
        
        // Analisar momentum
        $momentum = $this->analyzeMomentum($tickData['symbol']);
        
        $analysis = [
            'symbol' => $tickData['symbol'],
            'timestamp' => $tickData['timestamp'],
            'aggression' => $aggression,
            'bigPlayers' => $bigPlayers,
            'momentum' => $momentum
        ];
        
        // Cache da análise
        Cache::put("order_flow:{$tickData['symbol']}", $analysis, 60);
        
        // Broadcast para frontend
        broadcast(new \App\Events\OrderFlowUpdate($analysis));
        
        return $analysis;
    }
    
    /**
     * Analisar agressão de compra/venda
     */
    private function analyzeAggression($symbol, $period = 60)
    {
        $recentTicks = $this->getRecentTicks($symbol, $period);
        
        $buyVolume = 0;
        $sellVolume = 0;
        
        foreach ($recentTicks as $tick) {
            if ($tick['side'] === 'BUY') {
                $buyVolume += $tick['volume'];
            } else {
                $sellVolume += $tick['volume'];
            }
        }
        
        $totalVolume = $buyVolume + $sellVolume;
        $buyRatio = $totalVolume > 0 ? $buyVolume / $totalVolume : 0.5;
        
        return [
            'buyVolume' => $buyVolume,
            'sellVolume' => $sellVolume,
            'totalVolume' => $totalVolume,
            'buyRatio' => $buyRatio,
            'sellRatio' => 1 - $buyRatio,
            'dominance' => $buyRatio > 0.6 ? 'BUY' : ($buyRatio < 0.4 ? 'SELL' : 'NEUTRAL'),
            'intensity' => $this->calculateIntensity($buyRatio)
        ];
    }
    
    /**
     * Detectar players grandes
     */
    private function detectBigPlayers($symbol, $threshold = 500000)
    {
        $recentTicks = $this->getRecentTicks($symbol, 300); // 5 minutos
        
        $bigTrades = array_filter($recentTicks, function($tick) use ($threshold) {
            return $tick['volume'] >= $threshold;
        });
        
        if (empty($bigTrades)) {
            return ['detected' => false];
        }
        
        $buyVolume = 0;
        $sellVolume = 0;
        
        foreach ($bigTrades as $trade) {
            if ($trade['side'] === 'BUY') {
                $buyVolume += $trade['volume'];
            } else {
                $sellVolume += $trade['volume'];
            }
        }
        
        $totalBigVolume = $buyVolume + $sellVolume;
        $direction = $buyVolume > $sellVolume ? 'BUY' : 'SELL';
        
        return [
            'detected' => true,
            'count' => count($bigTrades),
            'totalVolume' => $totalBigVolume,
            'direction' => $direction,
            'avgSize' => $totalBigVolume / count($bigTrades),
            'impact' => $this->calculateImpact($totalBigVolume)
        ];
    }
    
    /**
     * Obter ticks recentes do Redis
     */
    private function getRecentTicks($symbol, $seconds)
    {
        $key = "ticks:{$symbol}";
        $cutoff = time() - $seconds;
        
        // Remover ticks antigos
        $this->redis->zremrangebyscore($key, 0, $cutoff);
        
        // Obter ticks recentes
        $ticks = $this->redis->zrangebyscore($key, $cutoff, '+inf');
        
        return array_map(function($tick) {
            return json_decode($tick, true);
        }, $ticks);
    }
    
    /**
     * Adicionar tick ao buffer Redis
     */
    private function addTickToBuffer($tickData)
    {
        $key = "ticks:{$tickData['symbol']}";
        $timestamp = strtotime($tickData['timestamp']);
        
        $this->redis->zadd($key, $timestamp, json_encode($tickData));
        
        // Manter apenas últimos 30 minutos
        $cutoff = $timestamp - 1800;
        $this->redis->zremrangebyscore($key, 0, $cutoff);
    }
}
```

## 🎨 Implementação Frontend

### **1. Componente Footprint Chart**
```javascript
// src/components/FootprintChart/FootprintChart.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import './FootprintChart.css';

const FootprintChart = ({ symbol = 'DOL', timeframe = '500_tick' }) => {
  const canvasRef = useRef(null);
  const [bars, setBars] = useState([]);
  const [currentBar, setCurrentBar] = useState(null);
  
  const { data: marketData } = useWebSocket('/ws/market-data');
  
  useEffect(() => {
    if (marketData && marketData.type === 'footprint_update') {
      updateFootprintData(marketData.data);
    }
  }, [marketData]);
  
  const updateFootprintData = (data) => {
    if (data.status === 'FORMING') {
      setCurrentBar(data);
    } else if (data.status === 'COMPLETED') {
      setBars(prev => [...prev.slice(-19), data]); // Manter últimas 20 barras
      setCurrentBar(null);
    }
    
    renderChart();
  };
  
  const renderChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Limpar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Configurações
    const barWidth = 80;
    const barSpacing = 10;
    const priceHeight = 20;
    
    // Renderizar barras
    bars.forEach((bar, index) => {
      const x = index * (barWidth + barSpacing) + 20;
      renderFootprintBar(ctx, bar, x, barWidth, priceHeight);
    });
    
    // Renderizar barra atual (se existir)
    if (currentBar) {
      const x = bars.length * (barWidth + barSpacing) + 20;
      renderFootprintBar(ctx, currentBar, x, barWidth, priceHeight, true);
    }
  };
  
  const renderFootprintBar = (ctx, bar, x, barWidth, priceHeight, isForming = false) => {
    const prices = Object.keys(bar.priceData).sort((a, b) => b - a);
    let y = 50;
    
    prices.forEach(price => {
      const data = bar.priceData[price];
      renderPriceLevel(ctx, data, price, x, y, barWidth, priceHeight, isForming);
      y += priceHeight;
    });
    
    // Timestamp
    ctx.fillStyle = isForming ? '#ffaa00' : '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(
      new Date(bar.timestamp).toLocaleTimeString(),
      x, y + 15
    );
  };
  
  const renderPriceLevel = (ctx, data, price, x, y, barWidth, priceHeight, isForming) => {
    // Background baseado na dominância
    let bgColor = '#444444';
    if (data.imbalance > 0.6) {
      bgColor = data.dominance === 'BUY' ? '#00ff0033' : '#ff000033';
    }
    
    // Desenhar background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, barWidth, priceHeight);
    
    // Border para high imbalance
    if (data.imbalance > 0.7) {
      ctx.strokeStyle = data.dominance === 'BUY' ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barWidth, priceHeight);
    }
    
    // Preço
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial';
    ctx.fillText(price, x + 2, y + 12);
    
    // Volume bid (verde)
    ctx.fillStyle = '#00ff00';
    ctx.fillText(data.bid + '↑', x + 25, y + 8);
    
    // Volume ask (vermelho)
    ctx.fillStyle = '#ff0000';
    ctx.fillText(data.ask + '↓', x + 25, y + 16);
    
    // Delta
    const deltaColor = data.delta > 0 ? '#00ff00' : '#ff0000';
    ctx.fillStyle = deltaColor;
    ctx.fillText(
      (data.delta > 0 ? '+' : '') + data.delta,
      x + 50, y + 12
    );
    
    // Indicador de barra em formação
    if (isForming) {
      ctx.fillStyle = '#ffaa0066';
      ctx.fillRect(x, y, barWidth, priceHeight);
    }
  };
  
  return (
    <div className="footprint-chart">
      <div className="chart-header">
        <h3>🦶 Footprint Chart - {symbol}</h3>
        <div className="timeframe-selector">
          <button 
            className={timeframe === '100_tick' ? 'active' : ''}
            onClick={() => setTimeframe('100_tick')}
          >
            100 Tick
          </button>
          <button 
            className={timeframe === '500_tick' ? 'active' : ''}
            onClick={() => setTimeframe('500_tick')}
          >
            500 Tick
          </button>
          <button 
            className={timeframe === '1000_tick' ? 'active' : ''}
            onClick={() => setTimeframe('1000_tick')}
          >
            1000 Tick
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <canvas 
          ref={canvasRef}
          width={1200}
          height={600}
          className="footprint-canvas"
        />
      </div>
      
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color buy"></span>
          <span>Agressão Compradora</span>
        </div>
        <div className="legend-item">
          <span className="legend-color sell"></span>
          <span>Agressão Vendedora</span>
        </div>
        <div className="legend-item">
          <span className="legend-color forming"></span>
          <span>Barra em Formação</span>
        </div>
      </div>
    </div>
  );
};

export default FootprintChart;
```

### **2. Hook WebSocket**
```javascript
// src/hooks/useWebSocket.js

import { useEffect, useState, useRef } from 'react';

export const useWebSocket = (url) => {
  const [data, setData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const ws = useRef(null);
  
  useEffect(() => {
    const wsUrl = `${process.env.REACT_APP_WS_URL}${url}`;
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      setConnectionStatus('Connected');
      console.log('✅ WebSocket conectado:', url);
    };
    
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setData(message);
      } catch (error) {
        console.error('❌ Erro ao parsear mensagem WebSocket:', error);
      }
    };
    
    ws.current.onclose = () => {
      setConnectionStatus('Disconnected');
      console.log('❌ WebSocket desconectado:', url);
      
      // Tentar reconectar após 3 segundos
      setTimeout(() => {
        if (ws.current.readyState === WebSocket.CLOSED) {
          setConnectionStatus('Reconnecting');
          // Reconectar...
        }
      }, 3000);
    };
    
    ws.current.onerror = (error) => {
      setConnectionStatus('Error');
      console.error('❌ Erro WebSocket:', error);
    };
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);
  
  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };
  
  return { data, connectionStatus, sendMessage };
};
```

## 🚀 Deploy e Produção

### **1. Configuração do Servidor**
```bash
# Configurar servidor VPS
sudo apt update && sudo apt upgrade -y

# Instalar Nginx
sudo apt install nginx
sudo systemctl enable nginx

# Configurar SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com

# Configurar PM2 para Node.js
npm install -g pm2
pm2 startup
```

### **2. Configuração Nginx**
```nginx
# /etc/nginx/sites-available/trading-system
server {
    listen 80;
    server_name seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    
    # Frontend React
    location / {
        root /var/www/trading-frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **3. Scripts de Deploy**
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy do sistema de trading..."

# Atualizar código
git pull origin main

# Backend
echo "📦 Atualizando backend..."
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
cd ..

# Frontend
echo "🎨 Buildando frontend..."
cd frontend
npm ci
npm run build
sudo cp -r build/* /var/www/trading-frontend/
cd ..

# WebSocket Server
echo "⚡ Atualizando WebSocket server..."
cd websocket
npm ci
pm2 restart trading-websocket
cd ..

# Reiniciar serviços
sudo systemctl reload nginx
sudo systemctl restart php8.1-fpm

echo "✅ Deploy concluído com sucesso!"
```

---

**📝 Nota**: Este guia fornece uma base sólida para implementação. Ajuste as configurações conforme suas necessidades específicas e ambiente de produção.
