# 🚀 Referência Rápida - Smart-Trade Serviços

## 📋 Informações Essenciais

### 🌐 URLs de Acesso
```
Frontend:  http://localhost:3000
API REST:  http://localhost:8080  
WebSocket: ws://localhost:8081
Health:    http://localhost:8080/health
```

### 🔌 Portas Utilizadas
| Serviço | Porta | Status |
|---------|-------|--------|
| Frontend React | 3000 | ✅ Ativo |
| API Backend | 8080 | ✅ Ativo |
| WebSocket | 8081 | ✅ Ativo |
| Cedro API | 81 | ✅ Conectado |

### 🔐 Credenciais Cedro API
```
Host: datafeed1.cedrotech.com
Port: 81
User: emanuel_socket
Pass: bABqwq
Backup: datafeed2.cedrotech.com
```

## 🎮 Comandos Principais

### Script de Gerenciamento
```bash
# Status dos serviços
./smart-trade.sh status

# Iniciar/Parar/Reiniciar
./smart-trade.sh start
./smart-trade.sh stop  
./smart-trade.sh restart

# Logs em tempo real
./smart-trade.sh logs
./smart-trade.sh logs-server
./smart-trade.sh logs-client

# Monitoramento
./smart-trade.sh monitor
./smart-trade.sh health

# Manutenção
./smart-trade.sh reload
./smart-trade.sh cleanup
```

### Comandos PM2 Diretos
```bash
# Status e controle
pm2 list
pm2 restart all
pm2 stop all
pm2 reload all

# Logs
pm2 logs
pm2 logs smart-trade-server
pm2 logs smart-trade-client

# Monitor
pm2 monit
pm2 show smart-trade-server
```

## 🏥 Verificação de Saúde

### Status dos Serviços
```bash
# Verificação completa
./smart-trade.sh health

# Verificar portas manualmente
netstat -tuln | grep -E "(3000|8080|8081)"

# Testar conectividade
curl http://localhost:8080/health
curl http://localhost:3000
```

### Indicadores Normais
- **CPU**: < 80%
- **Memória**: < 80% 
- **Disco**: < 80%
- **Uptime**: > 99%
- **Status**: online

## 🚨 Troubleshooting Rápido

### Problema: Serviço não responde
```bash
pm2 restart smart-trade-server
pm2 logs smart-trade-server
```

### Problema: Frontend desconectado
```bash
# Verificar WebSocket
netstat -tuln | grep 8081
pm2 restart smart-trade-client
```

### Problema: Cedro API desconectada
```bash
# Verificar logs do servidor
pm2 logs smart-trade-server | grep -i cedro

# Testar conectividade
telnet datafeed1.cedrotech.com 81
```

### Problema: Alto uso de recursos
```bash
pm2 monit
pm2 restart all
./smart-trade.sh cleanup
```

### Reset Completo (Emergência)
```bash
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

## 📊 Arquivos Importantes

### Configuração
- `ecosystem.config.js` - Configuração PM2
- `server/.env` - Variáveis de ambiente
- `smart-trade.sh` - Script de gerenciamento

### Logs
- `./logs/smart-trade-server-*.log` - Logs do servidor
- `./logs/smart-trade-client-*.log` - Logs do cliente

### Dados
- `server/data/smart-trade.db` - Banco SQLite
- `/root/.pm2/` - Dados do PM2

## 🔄 Auto-Start

### Verificar Auto-Start
```bash
systemctl status pm2-root
systemctl is-enabled pm2-root
```

### Controlar Auto-Start
```bash
systemctl enable pm2-root   # Habilitar
systemctl disable pm2-root  # Desabilitar
systemctl restart pm2-root  # Reiniciar
```

## 📈 Monitoramento Contínuo

### Verificação Diária
```bash
# 1. Status geral
./smart-trade.sh status

# 2. Saúde do sistema  
./smart-trade.sh health

# 3. Verificar logs de erro
pm2 logs --err

# 4. Uso de recursos
pm2 monit
```

### Manutenção Semanal
```bash
# 1. Limpar logs antigos
./smart-trade.sh cleanup

# 2. Verificar espaço em disco
df -h

# 3. Verificar memória
free -h

# 4. Restart preventivo (opcional)
./smart-trade.sh restart
```

## 🎯 Checklist de Funcionamento

### ✅ Sistema Saudável
- [ ] PM2 mostra status "online"
- [ ] Portas 3000, 8080, 8081 ativas
- [ ] Frontend carrega sem erros
- [ ] WebSocket conectado (não "Desconectado")
- [ ] Logs sem erros críticos
- [ ] Cedro API conectada
- [ ] CPU < 80%, Memória < 80%

### ❌ Problemas Detectados
- [ ] Status "errored" ou "stopped"
- [ ] Portas não respondem
- [ ] Frontend mostra "Desconectado"
- [ ] Erros nos logs
- [ ] Alto uso de recursos
- [ ] Cedro API desconectada

## 📞 Contatos de Suporte

### Cedro Technologies
- **Suporte Técnico**: [contato da Cedro]
- **Documentação**: [docs da Cedro]
- **Status**: [status da Cedro]

### Recursos Úteis
- **PM2 Docs**: https://pm2.keymetrics.io/
- **Node.js**: https://nodejs.org/
- **React**: https://reactjs.org/

---

## 🎉 Sistema Configurado

**Status**: ✅ Operacional  
**Última Atualização**: 2025-07-04  
**Versão**: 1.0.0  
**Ambiente**: Desenvolvimento  

**Tudo funcionando perfeitamente! 🚀**
