# 📋 Fase 7: Configuração de Serviços PM2 e Infraestrutura

## 📊 Visão Geral

Esta documentação detalha a implementação completa dos serviços PM2, configurações de rede, portas e infraestrutura do Smart-Trade para execução contínua e profissional.

## 🏗️ Arquitetura de Serviços

### Componentes Principais
```
Smart-Trade System
├── Backend (smart-trade-server)
│   ├── API REST (Porta 8080)
│   ├── WebSocket Server (Porta 8081)
│   ├── Cedro API Client (TCP)
│   ├── SQLite Database
│   └── Redis Cache (Opcional)
├── Frontend (smart-trade-client)
│   ├── React + Vite (Porta 3000)
│   ├── WebSocket Client
│   └── API Client
└── PM2 Process Manager
    ├── Auto-restart
    ├── Log Management
    └── System Monitoring
```

## 🔌 Configuração de Portas

### Portas Utilizadas
| Serviço | Porta | Protocolo | Descrição |
|---------|-------|-----------|-----------|
| **API REST** | 8080 | HTTP | Endpoints da API backend |
| **WebSocket** | 8081 | WS | Dados em tempo real |
| **Frontend** | 3000 | HTTP | Interface React (dev) |
| **Cedro API** | 81 | TCP | Conexão com datafeed |

### Configuração de Rede
```bash
# Verificar portas ativas
netstat -tuln | grep -E "(8080|8081|3000)"

# Testar conectividade
curl http://localhost:8080/health
curl http://localhost:3000
```

## 🚀 Configuração PM2

### Arquivo de Configuração: `ecosystem.config.js`
```javascript
module.exports = {
  apps: [
    {
      // Backend - Smart-Trade Server
      name: 'smart-trade-server',
      script: 'npm',
      args: 'run dev',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        CEDRO_HOST: 'datafeed1.cedrotech.com',
        CEDRO_PORT: '81',
        CEDRO_USERNAME: 'emanuel_socket',
        CEDRO_PASSWORD: 'bABqwq',
        SERVER_PORT: '8080',
        WS_PORT: '8081',
        // ... outras variáveis
      }
    },
    {
      // Frontend - Smart-Trade Client
      name: 'smart-trade-client',
      script: 'npm',
      args: 'run dev',
      cwd: './client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: 'http://localhost:8080',
        VITE_WS_URL: 'ws://localhost:8081'
      }
    }
  ]
};
```

### Variáveis de Ambiente Críticas
```bash
# Cedro API - Conexão Real
CEDRO_HOST=datafeed1.cedrotech.com
CEDRO_PORT=81
CEDRO_USERNAME=emanuel_socket
CEDRO_PASSWORD=bABqwq

# Servidor
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
WS_PORT=8081
WS_HOST=0.0.0.0

# Segurança
WS_JWT_SECRET=smart-trade-jwt-secret-key-2025
WS_JWT_EXPIRES_IN=24h
WS_MAX_CONNECTIONS=100

# Dados
SQLITE_PATH=./data/smart-trade.db
REDIS_URL=redis://localhost:6379

# Logs
LOG_LEVEL=info
CEDRO_LOG_LEVEL=info
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m
```

## 📋 Gerenciamento de Serviços

### Script de Gerenciamento: `smart-trade.sh`
```bash
#!/bin/bash
# Script completo de gerenciamento

# Comandos principais
./smart-trade.sh start     # Iniciar serviços
./smart-trade.sh stop      # Parar serviços
./smart-trade.sh restart   # Reiniciar serviços
./smart-trade.sh status    # Status dos serviços
./smart-trade.sh logs      # Logs em tempo real
./smart-trade.sh health    # Verificação de saúde
./smart-trade.sh monitor   # Monitor interativo
```

### Comandos PM2 Diretos
```bash
# Gerenciamento básico
pm2 start ecosystem.config.js
pm2 stop all
pm2 restart all
pm2 reload all
pm2 list

# Logs e monitoramento
pm2 logs
pm2 logs smart-trade-server
pm2 logs smart-trade-client
pm2 monit

# Informações detalhadas
pm2 show smart-trade-server
pm2 describe smart-trade-client
```

## 🔄 Auto-Start no Boot

### Configuração Systemd
```bash
# Configurar auto-start
pm2 startup
pm2 save

# Verificar serviço
systemctl status pm2-root
systemctl enable pm2-root

# Controle manual
systemctl start pm2-root
systemctl stop pm2-root
systemctl restart pm2-root
```

### Arquivo de Serviço: `/etc/systemd/system/pm2-root.service`
```ini
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=root
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/root/.pm2
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target
```

## 📊 Sistema de Logs

### Estrutura de Logs
```
./logs/
├── smart-trade-server-error.log     # Erros do servidor
├── smart-trade-server-out.log       # Output do servidor
├── smart-trade-server-combined.log  # Logs combinados servidor
├── smart-trade-client-error.log     # Erros do cliente
├── smart-trade-client-out.log       # Output do cliente
└── smart-trade-client-combined.log  # Logs combinados cliente
```

### Configuração de Logs
```javascript
// Em ecosystem.config.js
{
  error_file: './logs/smart-trade-server-error.log',
  out_file: './logs/smart-trade-server-out.log',
  log_file: './logs/smart-trade-server-combined.log',
  time: true,
  merge_logs: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
}
```

### Gerenciamento de Logs
```bash
# Ver logs em tempo real
pm2 logs

# Logs específicos
pm2 logs smart-trade-server --lines 100

# Limpar logs
pm2 flush

# Rotação automática (configurar)
pm2 install pm2-logrotate
```

## 🔐 Configuração de Segurança

### Credenciais Cedro API
```bash
# Produção - Cedro Technologies
CEDRO_HOST=datafeed1.cedrotech.com
CEDRO_PORT=81
CEDRO_USERNAME=emanuel_socket
CEDRO_PASSWORD=bABqwq

# Backup server
CEDRO_HOST_BACKUP=datafeed2.cedrotech.com
```

### JWT e WebSocket
```bash
# Segurança WebSocket
WS_JWT_SECRET=smart-trade-jwt-secret-key-2025
WS_JWT_EXPIRES_IN=24h
WS_MAX_CONNECTIONS=100
WS_MAX_SESSIONS=10
WS_HEARTBEAT_INTERVAL=30000
```

### Firewall (Opcional)
```bash
# Configurar UFW
ufw allow 8080/tcp  # API
ufw allow 8081/tcp  # WebSocket
ufw allow 3000/tcp  # Frontend (dev)
ufw enable
```

## 🏥 Monitoramento e Saúde

### Verificação Automática
```bash
# Script de health check
./smart-trade.sh health

# Saída esperada:
✅ PM2: Funcionando
✅ Servidor: Porta 8080 ativa
✅ WebSocket: Porta 8081 ativa
✅ Frontend: Porta 3000 ativa
✅ Disco: 45% usado
✅ Memória: 62% usada
```

### Métricas Importantes
| Métrica | Valor Normal | Ação se Exceder |
|---------|--------------|-----------------|
| **CPU** | < 80% | Investigar processo |
| **Memória** | < 80% | Restart serviços |
| **Disco** | < 80% | Limpar logs |
| **Uptime** | > 99% | Verificar estabilidade |

### Alertas e Notificações
```bash
# Configurar alertas (futuro)
pm2 install pm2-server-monit
pm2 set pm2-server-monit:email your@email.com
```

## 🌐 URLs de Acesso

### Desenvolvimento
```
Frontend:  http://localhost:3000
API REST:  http://localhost:8080
WebSocket: ws://localhost:8081
Health:    http://localhost:8080/health
Status:    http://localhost:8080/status
```

### Produção (Futuro)
```
Frontend:  https://smart-trade.com
API REST:  https://api.smart-trade.com
WebSocket: wss://ws.smart-trade.com
```

## 🚨 Troubleshooting

### Problemas Comuns

**1. Serviço não inicia**
```bash
# Verificar logs
pm2 logs smart-trade-server

# Verificar configuração
pm2 show smart-trade-server

# Reiniciar
pm2 restart smart-trade-server
```

**2. Conexão Cedro falha**
```bash
# Testar conectividade
telnet datafeed1.cedrotech.com 81

# Verificar credenciais
grep CEDRO ecosystem.config.js

# Tentar servidor backup
# Alterar CEDRO_HOST para datafeed2.cedrotech.com
```

**3. Frontend não conecta WebSocket**
```bash
# Verificar porta WebSocket
netstat -tuln | grep 8081

# Verificar configuração frontend
grep WS_URL client/src/hooks/useSmartTradeWebSocket.ts

# Deve ser: ws://localhost:8081
```

**4. Alto uso de recursos**
```bash
# Verificar processos
pm2 monit

# Restart com limite
pm2 restart smart-trade-server --max-memory-restart 1G

# Limpar logs
pm2 flush
```

### Comandos de Emergência
```bash
# Parar tudo
pm2 kill

# Reiniciar daemon
pm2 resurrect

# Recarregar configuração
pm2 delete all
pm2 start ecosystem.config.js

# Reset completo
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

## 📈 Próximos Passos

### Melhorias Planejadas
1. **SSL/HTTPS**: Certificados para produção
2. **Load Balancer**: Nginx para múltiplas instâncias
3. **Docker**: Containerização completa
4. **CI/CD**: Pipeline de deploy automático
5. **Monitoring**: Grafana + Prometheus
6. **Backup**: Automático do SQLite
7. **Clustering**: PM2 cluster mode

### Otimizações
1. **Redis**: Instalar para cache
2. **Compression**: Gzip para API
3. **Rate Limiting**: Proteção contra spam
4. **CDN**: Para assets estáticos

---

## ✅ Status da Implementação

- [x] PM2 instalado e configurado
- [x] Serviços backend e frontend ativos
- [x] Auto-start configurado
- [x] Logs centralizados
- [x] Script de gerenciamento
- [x] Conexão real Cedro API
- [x] WebSocket funcionando
- [x] Documentação completa

**Sistema 100% operacional e profissional! 🚀**
