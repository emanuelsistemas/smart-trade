# 🚀 Smart-Trade PM2 Setup

## ✅ Configuração Completa

O sistema Smart-Trade foi configurado com **PM2** para execução contínua e gerenciamento profissional.

### 📊 Status Atual
- ✅ **Backend**: `smart-trade-server` - Porta 8080/8081
- ✅ **Frontend**: `smart-trade-client` - Porta 3000
- ✅ **Auto-start**: Configurado para iniciar no boot
- ✅ **Logs**: Centralizados em `./logs/`

## 🎮 Comandos de Gerenciamento

### Script de Gerenciamento (Recomendado)
```bash
# Status dos serviços
./smart-trade.sh status

# Iniciar todos os serviços
./smart-trade.sh start

# Parar todos os serviços
./smart-trade.sh stop

# Reiniciar todos os serviços
./smart-trade.sh restart

# Ver logs em tempo real
./smart-trade.sh logs

# Ver logs apenas do servidor
./smart-trade.sh logs-server

# Ver logs apenas do cliente
./smart-trade.sh logs-client

# Monitor interativo
./smart-trade.sh monitor

# Reload sem downtime
./smart-trade.sh reload

# Verificar saúde do sistema
./smart-trade.sh health

# Limpar logs antigos
./smart-trade.sh cleanup
```

### Comandos PM2 Diretos
```bash
# Listar processos
pm2 list

# Ver logs
pm2 logs

# Reiniciar específico
pm2 restart smart-trade-server
pm2 restart smart-trade-client

# Parar específico
pm2 stop smart-trade-server
pm2 stop smart-trade-client

# Monitor em tempo real
pm2 monit

# Informações detalhadas
pm2 show smart-trade-server
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente
As credenciais da Cedro API estão configuradas em `ecosystem.config.js`:
- **CEDRO_HOST**: `datafeed1.cedrotech.com`
- **CEDRO_PORT**: `81`
- **CEDRO_USERNAME**: `emanuel_socket`
- **CEDRO_PASSWORD**: `bABqwq`

### Portas Utilizadas
- **8080**: API REST do backend
- **8081**: WebSocket para dados em tempo real
- **3000**: Frontend React (desenvolvimento)

## 📋 Logs

### Localização dos Logs
```
./logs/
├── smart-trade-server-error.log    # Erros do servidor
├── smart-trade-server-out.log      # Output do servidor
├── smart-trade-server-combined.log # Logs combinados do servidor
├── smart-trade-client-error.log    # Erros do cliente
├── smart-trade-client-out.log      # Output do cliente
└── smart-trade-client-combined.log # Logs combinados do cliente
```

### Monitoramento de Logs
```bash
# Logs em tempo real
pm2 logs

# Logs específicos
pm2 logs smart-trade-server
pm2 logs smart-trade-client

# Limpar logs
pm2 flush
```

## 🔄 Auto-Start no Boot

O sistema está configurado para iniciar automaticamente:
```bash
# Verificar status do serviço
systemctl status pm2-root

# Habilitar/desabilitar
systemctl enable pm2-root
systemctl disable pm2-root

# Iniciar/parar manualmente
systemctl start pm2-root
systemctl stop pm2-root
```

## 🏥 Monitoramento e Saúde

### Verificação Rápida
```bash
./smart-trade.sh health
```

### Métricas Importantes
- **CPU**: Uso de processador
- **Memória**: Consumo de RAM
- **Uptime**: Tempo online
- **Restarts**: Número de reinicializações

## 🚨 Troubleshooting

### Problemas Comuns

**1. Serviço não inicia:**
```bash
pm2 logs smart-trade-server
# Verificar erros nos logs
```

**2. Conexão Cedro falha:**
```bash
# Verificar credenciais em ecosystem.config.js
# Testar conectividade: telnet datafeed1.cedrotech.com 81
```

**3. Frontend não conecta:**
```bash
# Verificar se WebSocket está ativo na porta 8081
netstat -tuln | grep 8081
```

**4. Alto uso de memória:**
```bash
pm2 restart all
# ou
./smart-trade.sh restart
```

### Comandos de Emergência
```bash
# Parar tudo
pm2 kill

# Reiniciar daemon PM2
pm2 resurrect

# Recarregar configuração
pm2 start ecosystem.config.js
```

## 📈 Próximos Passos

1. **Monitoramento**: Configurar alertas para falhas
2. **Backup**: Implementar backup automático dos dados
3. **SSL**: Configurar HTTPS para produção
4. **Load Balancer**: Para múltiplas instâncias
5. **Docker**: Containerização para deploy

## 🎯 URLs de Acesso

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **WebSocket**: ws://localhost:8081

---

**Sistema configurado e funcionando! 🎉**
