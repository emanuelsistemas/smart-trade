# 🚀 Smart-Trade - Sistema de Trading Avançado

Sistema proprietário de análise de trading com Order Flow Analysis, Footprint Chart e IA para evolução do trader.

## 🎯 Funcionalidades

- **Order Flow Analysis** em tempo real
- **Footprint Chart** com dados tick-by-tick
- **Simulador Paper Trading** com IA
- **Monitor de Evolução** do trader
- **Análise Preditiva** baseada em dados reais

## 🚀 Quick Start

### **Desenvolvimento Local (Windows):**
```bash
# Instalar dependências
npm install

# Iniciar com scripts automáticos
start-smart-trade.bat          # Modo desenvolvimento
start-with-pm2.bat            # Modo PM2
status-smart-trade.bat        # Verificar status
stop-smart-trade.bat          # Parar sistema
```

### **Deploy em VPS Linux:**
```bash
# 1. Clonar repositório
git clone https://github.com/emanuelsistemas/smart-trade.git
cd smart-trade

# 2. Executar script de deploy
chmod +x scripts/deploy-linux.sh
./scripts/deploy-linux.sh

# 3. Configurar Nginx (opcional)
sudo cp nginx/smart-trade.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/smart-trade /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## 📖 **DOCUMENTAÇÃO COMPLETA**

- 📋 **[DEPLOY-VPS-LINUX.md](DEPLOY-VPS-LINUX.md)** - Guia completo para VPS Linux
- 🏗️ **[Arquitetura/](Arquitetura/)** - Documentação técnica detalhada
- 📝 **[Doc Implementacao/](Doc%20Implementacao/)** - Cronograma e progresso

## 📚 Documentação

Veja `Doc Implementacao/` para documentação completa de implementação.

## 🏗️ Arquitetura

- **Backend**: Node.js + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Dados**: SQLite + Redis
- **API**: Cedro Technologies (B3)

## 📊 Status do Projeto

- ✅ Fase 1: Fundação e Estrutura Base
- ⏳ Fase 2: Integração Cedro API
- ⏳ Fase 3: Sistema de Dados
- ⏳ Fase 4: WebSocket e Tempo Real
- ⏳ Fase 5: Frontend Base
- ⏳ Fase 6: Order Flow Analysis
- ⏳ Fase 7: Footprint Chart
- ⏳ Fase 8: Otimização e Testes
