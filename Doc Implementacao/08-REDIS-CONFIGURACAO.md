# 🔴 Fase 8: Configuração Redis para Smart-Trade

## 📊 Visão Geral

Esta documentação detalha a implementação completa do Redis como sistema de cache e armazenamento temporário para o Smart-Trade, otimizado para dados de trading em tempo real.

## 🏗️ Arquitetura Redis

### Componentes Principais
```
Redis Smart-Trade
├── Cache de Quotes (Database 0)
│   ├── Preços em tempo real
│   ├── TTL: 60 segundos
│   └── Chaves: quote:SYMBOL:timestamp
├── Order Flow Data (Database 1)
│   ├── Times & Trades
│   ├── TTL: 300 segundos
│   └── Chaves: orderflow:SYMBOL:timestamp
├── Footprint Data (Database 2)
│   ├── Volume por preço
│   ├── TTL: 600 segundos
│   └── Chaves: footprint:SYMBOL:level
├── Cache de Cálculos (Database 3)
│   ├── Indicadores calculados
│   ├── TTL: 1800 segundos
│   └── Chaves: calc:SYMBOL:indicator
├── Sessões WebSocket (Database 4)
│   ├── Conexões ativas
│   ├── TTL: 3600 segundos
│   └── Chaves: session:USER_ID
└── Configurações (Database 5)
    ├── Preferências do usuário
    ├── TTL: Permanente
    └── Chaves: config:USER_ID:setting
```

## 🔧 Configuração Implementada

### Status da Instalação
- ✅ **Redis Server**: Instalado e funcionando
- ✅ **Porta**: 6379 (padrão)
- ✅ **Auto-start**: Configurado no boot
- ✅ **Configuração**: Otimizada para trading
- ✅ **Integração**: Smart-Trade conectado

### Configurações Aplicadas
```ini
# Limite de memória
maxmemory 512mb
maxmemory-policy allkeys-lru

# Notificações de eventos
notify-keyspace-events "Ex"

# Performance
tcp-keepalive 300
timeout 0
```

## 📋 Estrutura de Dados

### 1. Cache de Quotes (DB 0)
```bash
# Estrutura das chaves
quote:DOL:1625097600 = {
  "symbol": "DOL",
  "price": 5.234,
  "volume": 1000,
  "timestamp": 1625097600,
  "bid": 5.233,
  "ask": 5.235
}

# TTL: 60 segundos
redis-cli -n 0 SETEX quote:DOL:$(date +%s) 60 '{"price":5.234,"volume":1000}'
```

### 2. Order Flow Data (DB 1)
```bash
# Times & Trades
orderflow:DOL:1625097600 = {
  "symbol": "DOL",
  "trades": [
    {"price": 5.234, "volume": 100, "side": "buy", "time": 1625097600},
    {"price": 5.233, "volume": 200, "side": "sell", "time": 1625097601}
  ]
}

# TTL: 300 segundos (5 minutos)
redis-cli -n 1 SETEX orderflow:DOL:$(date +%s) 300 '{"trades":[...]}'
```

### 3. Footprint Data (DB 2)
```bash
# Volume por nível de preço
footprint:DOL:5234 = {
  "price": 5.234,
  "buy_volume": 1500,
  "sell_volume": 800,
  "total_volume": 2300,
  "imbalance": 0.625
}

# TTL: 600 segundos (10 minutos)
redis-cli -n 2 SETEX footprint:DOL:5234 600 '{"buy_volume":1500,"sell_volume":800}'
```

### 4. Cache de Cálculos (DB 3)
```bash
# Indicadores calculados
calc:DOL:rsi = {
  "indicator": "rsi",
  "value": 65.4,
  "timestamp": 1625097600,
  "period": 14
}

# TTL: 1800 segundos (30 minutos)
redis-cli -n 3 SETEX calc:DOL:rsi 1800 '{"value":65.4,"period":14}'
```

### 5. Sessões WebSocket (DB 4)
```bash
# Conexões ativas
session:user123 = {
  "user_id": "user123",
  "socket_id": "abc123",
  "connected_at": 1625097600,
  "subscriptions": ["DOL", "WIN"]
}

# TTL: 3600 segundos (1 hora)
redis-cli -n 4 SETEX session:user123 3600 '{"socket_id":"abc123","subscriptions":["DOL"]}'
```

### 6. Configurações (DB 5)
```bash
# Configurações do usuário (permanente)
config:user123:theme = "dark"
config:user123:symbols = ["DOL", "WIN", "WDO"]
config:user123:alerts = {"DOL": {"price": 5.25, "type": "above"}}

# Sem TTL (permanente)
redis-cli -n 5 SET config:user123:theme "dark"
```

## 🎮 Comandos de Gerenciamento

### Verificação Básica
```bash
# Status do Redis
systemctl status redis-server

# Conectividade
redis-cli ping

# Informações do servidor
redis-cli info server

# Clientes conectados
redis-cli info clients

# Uso de memória
redis-cli info memory
```

### Monitoramento de Dados
```bash
# Ver todas as chaves (cuidado em produção)
redis-cli keys "*"

# Ver chaves por padrão
redis-cli keys "quote:*"
redis-cli keys "orderflow:*"

# Monitorar comandos em tempo real
redis-cli monitor

# Estatísticas por database
redis-cli -n 0 dbsize  # Quotes
redis-cli -n 1 dbsize  # Order Flow
redis-cli -n 2 dbsize  # Footprint
```

### Limpeza e Manutenção
```bash
# Limpar database específico
redis-cli -n 0 FLUSHDB  # Limpar quotes

# Limpar tudo (CUIDADO!)
redis-cli FLUSHALL

# Ver chaves que vão expirar
redis-cli keys "*" | xargs -I {} redis-cli TTL {}

# Remover chaves expiradas manualmente
redis-cli keys "*" | xargs -I {} sh -c 'redis-cli TTL {} | grep -q "^-1$" && redis-cli DEL {}'
```

## 📊 Monitoramento e Performance

### Métricas Importantes
```bash
# Uso de memória
redis-cli info memory | grep used_memory_human

# Operações por segundo
redis-cli info stats | grep instantaneous_ops_per_sec

# Conexões
redis-cli info clients | grep connected_clients

# Hit rate do cache
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
```

### Alertas Recomendados
- **Memória > 400MB**: Limpar cache antigo
- **Conexões > 50**: Verificar vazamentos
- **Hit Rate < 80%**: Otimizar TTL
- **Ops/sec > 1000**: Monitorar performance

## 🔧 Integração com Smart-Trade

### Configuração no Backend
```typescript
// server/src/services/RedisService.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0, // Database padrão
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// Exemplo de uso
await redis.setex('quote:DOL:' + Date.now(), 60, JSON.stringify(quote));
```

### Variáveis de Ambiente
```bash
# Em server/.env
REDIS_URL=redis://localhost:6379
REDIS_DB_QUOTES=0
REDIS_DB_ORDERFLOW=1
REDIS_DB_FOOTPRINT=2
REDIS_DB_CALC=3
REDIS_DB_SESSIONS=4
REDIS_DB_CONFIG=5

# TTL padrões (segundos)
REDIS_TTL_QUOTES=60
REDIS_TTL_ORDERFLOW=300
REDIS_TTL_FOOTPRINT=600
REDIS_TTL_CALC=1800
REDIS_TTL_SESSIONS=3600
```

## 🚨 Troubleshooting

### Problemas Comuns

**1. Redis não inicia**
```bash
# Verificar logs
sudo journalctl -u redis-server -f

# Verificar configuração
redis-server --test-config

# Reiniciar
sudo systemctl restart redis-server
```

**2. Conexão recusada**
```bash
# Verificar se está rodando
sudo systemctl status redis-server

# Verificar porta
netstat -tuln | grep 6379

# Testar conectividade
redis-cli ping
```

**3. Alto uso de memória**
```bash
# Ver uso atual
redis-cli info memory

# Limpar databases temporários
redis-cli -n 0 FLUSHDB  # Quotes
redis-cli -n 1 FLUSHDB  # Order Flow

# Ajustar maxmemory
redis-cli CONFIG SET maxmemory 256mb
```

**4. Performance lenta**
```bash
# Ver comandos lentos
redis-cli SLOWLOG GET 10

# Monitorar em tempo real
redis-cli --latency

# Verificar fragmentação
redis-cli info memory | grep mem_fragmentation_ratio
```

## 🔐 Segurança

### Configurações Básicas
```bash
# Desabilitar comandos perigosos (já configurado)
# FLUSHDB, FLUSHALL, KEYS, CONFIG foram renomeados

# Para produção, adicionar senha:
# redis-cli CONFIG SET requirepass "sua-senha-forte"

# Bind apenas localhost (já configurado)
# bind 127.0.0.1
```

### Backup e Restore
```bash
# Backup manual
redis-cli BGSAVE

# Localização do backup
ls -la /var/lib/redis/dump.rdb

# Restore (parar redis, substituir dump.rdb, iniciar)
sudo systemctl stop redis-server
sudo cp backup.rdb /var/lib/redis/dump.rdb
sudo systemctl start redis-server
```

## 📈 Próximos Passos

### Otimizações Futuras
1. **Clustering**: Para alta disponibilidade
2. **Replicação**: Master-slave setup
3. **Monitoring**: Grafana + Redis exporter
4. **Backup automático**: Scripts de backup
5. **SSL/TLS**: Conexões seguras

### Integração Avançada
1. **Pub/Sub**: Para notificações em tempo real
2. **Streams**: Para dados de trading contínuos
3. **Modules**: RedisTimeSeries para dados temporais
4. **Lua Scripts**: Para operações atômicas complexas

---

## ✅ Status da Implementação

- [x] Redis instalado e configurado
- [x] Auto-start no boot configurado
- [x] Configuração otimizada para trading
- [x] Integração com Smart-Trade
- [x] Script de monitoramento atualizado
- [x] Documentação completa
- [x] Estrutura de databases definida
- [x] Comandos de manutenção documentados

**Redis 100% operacional e integrado ao Smart-Trade! 🔴**
