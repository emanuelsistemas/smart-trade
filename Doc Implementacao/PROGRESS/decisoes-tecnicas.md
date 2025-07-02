# 🎯 Decisões Técnicas - Sistema Smart-Trade

## 📋 Registro de Decisões Arquiteturais

Este arquivo documenta todas as decisões técnicas importantes tomadas durante o desenvolvimento, suas justificativas e impactos.

---

## 📅 02/01/2025 - Decisões Iniciais de Arquitetura

### **DT-001: Escolha da Arquitetura (Web vs Electron)**
**Data**: 02/01/2025  
**Decisão**: Arquitetura Web (Node.js + React)  
**Status**: ✅ Aprovada

**Contexto**:
- Sistema para uso pessoal
- Foco em leveza e velocidade
- Necessidade de builds rápidos
- Processamento de dados em tempo real

**Alternativas Consideradas**:
1. **Electron**: Aplicação desktop nativa
2. **Web**: Aplicação web com servidor local
3. **Desktop Nativo**: C++/Rust com GUI

**Justificativa**:
- **Performance**: Web tem menor overhead que Electron
- **Desenvolvimento**: Hot reload instantâneo vs build de 30-60s
- **Recursos**: 150-300MB RAM vs 300-500MB do Electron
- **Latência**: 1-5ms vs 10-20ms do Electron
- **Flexibilidade**: Multi-monitor, múltiplas abas

**Impactos**:
- ✅ Desenvolvimento mais ágil
- ✅ Menor consumo de recursos
- ✅ Melhor performance para trading
- ⚠️ Requer servidor local rodando

---

### **DT-002: Stack Tecnológica Backend**
**Data**: 02/01/2025  
**Decisão**: Node.js + TypeScript  
**Status**: ✅ Aprovada

**Alternativas Consideradas**:
1. **Node.js + TypeScript**
2. **Python + FastAPI**
3. **Go**
4. **Rust**

**Justificativa**:
- **Ecosystem**: Excelente para WebSocket e TCP
- **Performance**: Adequada para trading (event-loop)
- **Desenvolvimento**: Mesmo linguagem frontend/backend
- **Bibliotecas**: ws, better-sqlite3, ioredis maduras

**Configuração**:
```json
{
  "runtime": "Node.js 20+",
  "language": "TypeScript 5.3+",
  "tcp": "net (nativo)",
  "websocket": "ws library",
  "database": "better-sqlite3",
  "cache": "ioredis"
}
```

---

### **DT-003: Stack Tecnológica Frontend**
**Data**: 02/01/2025  
**Decisão**: React + Vite + TypeScript  
**Status**: ✅ Aprovada

**Alternativas Consideradas**:
1. **React + Vite**
2. **Vue.js + Vite**
3. **Svelte + SvelteKit**
4. **Vanilla JS**

**Justificativa**:
- **React**: Ecosystem maduro para trading
- **Vite**: Build ultra-rápido (2-3s vs 30s Webpack)
- **TypeScript**: Type safety crítica para trading
- **TradingView**: Melhor integração com React

**Configuração**:
```json
{
  "framework": "React 18",
  "bundler": "Vite 5",
  "language": "TypeScript 5.3+",
  "charts": "TradingView Lightweight Charts",
  "state": "Zustand",
  "styling": "Tailwind CSS"
}
```

---

### **DT-004: Estratégia de Dados**
**Data**: 02/01/2025  
**Decisão**: Híbrido SQLite + Redis  
**Status**: ✅ Aprovada

**Alternativas Consideradas**:
1. **SQLite apenas**
2. **Redis apenas**
3. **SQLite + Redis** ⭐
4. **PostgreSQL**

**Justificativa**:
- **SQLite**: Persistência, zero configuração, queries complexas
- **Redis**: Cache ultra-rápido, TTL automático, estruturas otimizadas
- **Híbrido**: Melhor dos dois mundos

**Estratégia**:
```
L1 Cache (Redis): Dados tempo real (TTL: 1s-5min)
├── Cotações atuais
├── Book de ofertas
├── Times & Trades buffer
└── Order Flow cache

L2 Storage (SQLite): Dados históricos
├── Ticks históricos
├── Análises Order Flow
├── Configurações
└── Sessões de trading
```

---

### **DT-005: Protocolo de Comunicação Cedro**
**Data**: 02/01/2025  
**Decisão**: TCP/Telnet Nativo  
**Status**: ✅ Aprovada

**Contexto**: Cedro API usa TCP porta 81 com protocolo Telnet

**Alternativas Consideradas**:
1. **TCP Nativo** (net module) ⭐
2. **Telnet Library**
3. **WebSocket Wrapper**

**Justificativa**:
- **Performance**: Menor overhead
- **Controle**: Controle total sobre conexão
- **Simplicidade**: Protocolo é texto simples
- **Debugging**: Mais fácil debug de mensagens

**Implementação**:
```typescript
// Usar net.Socket nativo
import net from 'net';
const socket = new net.Socket();
socket.connect(81, 'cedro-host');
```

---

### **DT-006: Arquitetura de WebSocket**
**Data**: 02/01/2025  
**Decisão**: Servidor WebSocket Dedicado  
**Status**: ✅ Aprovada

**Alternativas Consideradas**:
1. **WebSocket integrado ao HTTP**
2. **Servidor WebSocket dedicado** ⭐
3. **Server-Sent Events (SSE)**

**Justificativa**:
- **Performance**: Sem overhead HTTP
- **Latência**: Conexão direta para dados trading
- **Escalabilidade**: Pode rodar em porta separada
- **Simplicidade**: Foco apenas em dados tempo real

**Configuração**:
```
Cedro TCP:81 → Parser → SQLite/Redis → WebSocket:3001 → React
```

---

### **DT-007: Estratégia de Testes**
**Data**: 02/01/2025  
**Decisão**: Testes Focados em Componentes Críticos  
**Status**: ✅ Aprovada

**Componentes Críticos**:
1. **Parser Cedro**: 100% cobertura
2. **Data Managers**: Testes de integração
3. **Order Flow**: Testes unitários + dados mock
4. **WebSocket**: Testes de stress

**Ferramentas**:
- **Backend**: Jest + ts-jest
- **Frontend**: Vitest + Testing Library
- **E2E**: Playwright (se necessário)

---

### **DT-008: Estrutura de Monorepo**
**Data**: 02/01/2025  
**Decisão**: Workspaces npm  
**Status**: ✅ Aprovada

**Estrutura**:
```
smart-trade/
├── server/     # Backend Node.js
├── client/     # Frontend React  
├── shared/     # Tipos compartilhados
└── scripts/    # Scripts de automação
```

**Justificativa**:
- **Tipos compartilhados**: Evita duplicação
- **Build coordenado**: Scripts centralizados
- **Desenvolvimento**: Dev server coordenado
- **Simplicidade**: Sem complexidade Lerna/Nx

---

## 📊 Impacto das Decisões

### **Performance Esperada**
- **Latência**: < 100ms dados Cedro → Frontend
- **Throughput**: > 1000 mensagens/segundo
- **Memória**: < 500MB total
- **CPU**: < 30% em operação normal

### **Desenvolvimento**
- **Hot Reload**: < 3 segundos
- **Build Completo**: < 30 segundos
- **Testes**: < 10 segundos
- **Deploy**: < 5 minutos

### **Manutenibilidade**
- **TypeScript**: Type safety em todo stack
- **Monorepo**: Código organizado
- **Documentação**: Decisões documentadas
- **Testes**: Cobertura em componentes críticos

## 🔄 Revisões de Decisões

### **Quando Revisar**
- Performance não atende requisitos
- Complexidade excessiva
- Problemas de manutenibilidade
- Novas tecnologias relevantes

### **Processo de Revisão**
1. Documentar problema com decisão atual
2. Avaliar alternativas
3. Calcular custo de mudança
4. Decidir e documentar nova decisão
5. Planejar migração (se necessário)

---

## 📝 Template para Novas Decisões

### **DT-XXX: [Título da Decisão]**
**Data**: DD/MM/AAAA  
**Decisão**: [Decisão tomada]  
**Status**: [Proposta/Aprovada/Rejeitada/Revisada]

**Contexto**:
[Situação que levou à necessidade da decisão]

**Alternativas Consideradas**:
1. **Opção 1**: [Descrição]
2. **Opção 2**: [Descrição]
3. **Opção 3**: [Descrição]

**Justificativa**:
[Por que esta decisão foi tomada]

**Impactos**:
- ✅ Benefícios
- ⚠️ Riscos/Limitações
- 📊 Métricas esperadas

**Implementação**:
[Como implementar a decisão]

---

**📝 Última Atualização**: 02/01/2025  
**Próxima Revisão**: Após Fase 4 (WebSocket implementado)
