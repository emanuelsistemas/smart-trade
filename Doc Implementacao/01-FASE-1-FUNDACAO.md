# 🏗️ FASE 1: Fundação e Estrutura Base

## 🎯 Objetivo da Fase
Configurar ambiente de desenvolvimento, criar estrutura de projeto e estabelecer fundação sólida para o sistema Smart-Trade.

## ⏱️ Duração Estimada
**3-4 dias** (24-32 horas de desenvolvimento)

## 📋 Tarefas da Fase

### **1.1 Configurar Ambiente de Desenvolvimento**
**Duração**: 4-6 horas

#### **Requisitos de Sistema**
```bash
# Verificar versões mínimas
node --version    # >= 20.0.0
npm --version     # >= 10.0.0
git --version     # >= 2.30.0
```

#### **Instalações Necessárias**
```bash
# Node.js 20+ (se não tiver)
# Windows: https://nodejs.org/
# Via Chocolatey: choco install nodejs

# Git (se não tiver)
# Windows: https://git-scm.com/
# Via Chocolatey: choco install git

# VS Code (recomendado)
# https://code.visualstudio.com/
# Via Chocolatey: choco install vscode
```

#### **Extensões VS Code Recomendadas**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### **Validação**
```bash
# Testar instalações
node -e "console.log('Node.js funcionando!')"
npm -v
git --version
```

### **1.2 Criar Estrutura de Pastas**
**Duração**: 2-3 horas

#### **Estrutura Completa do Projeto**
```
smart-trade/
├── README.md
├── .gitignore
├── package.json
├── tsconfig.json
├── Doc Implementacao/          # Documentação (já existe)
├── server/                     # Backend Node.js
│   ├── src/
│   │   ├── cedro/             # Cliente Cedro API
│   │   │   ├── client.ts
│   │   │   ├── parser.ts
│   │   │   └── types.ts
│   │   ├── data/              # Gerenciamento de dados
│   │   │   ├── sqlite-manager.ts
│   │   │   ├── redis-manager.ts
│   │   │   └── data-flow.ts
│   │   ├── websocket/         # Servidor WebSocket
│   │   │   ├── server.ts
│   │   │   └── handlers.ts
│   │   ├── analysis/          # Análises de trading
│   │   │   ├── order-flow.ts
│   │   │   ├── footprint.ts
│   │   │   └── patterns.ts
│   │   ├── utils/             # Utilitários
│   │   │   ├── logger.ts
│   │   │   └── config.ts
│   │   └── main.ts            # Ponto de entrada
│   ├── tests/                 # Testes do backend
│   ├── data/                  # Dados SQLite
│   ├── logs/                  # Arquivos de log
│   ├── package.json
│   └── tsconfig.json
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── common/        # Componentes comuns
│   │   │   ├── charts/        # Gráficos trading
│   │   │   ├── order-flow/    # Componentes Order Flow
│   │   │   └── footprint/     # Componentes Footprint
│   │   ├── hooks/             # Hooks customizados
│   │   │   ├── useMarketData.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useOrderFlow.ts
│   │   ├── stores/            # Estado global (Zustand)
│   │   │   ├── marketStore.ts
│   │   │   └── uiStore.ts
│   │   ├── types/             # Tipos TypeScript
│   │   │   └── market.ts
│   │   ├── utils/             # Utilitários frontend
│   │   │   └── formatters.ts
│   │   ├── styles/            # Estilos CSS
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── tests/                 # Testes do frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── shared/                     # Tipos compartilhados
│   ├── types/
│   │   ├── cedro.ts
│   │   ├── market.ts
│   │   └── websocket.ts
│   └── package.json
└── scripts/                    # Scripts de automação
    ├── setup.sh
    ├── dev.sh
    └── build.sh
```

#### **Comandos para Criar Estrutura**
```bash
# Criar diretórios principais
mkdir -p server/src/{cedro,data,websocket,analysis,utils}
mkdir -p server/{tests,data,logs}
mkdir -p client/src/{components/{common,charts,order-flow,footprint},hooks,stores,types,utils,styles}
mkdir -p client/{public,tests}
mkdir -p shared/types
mkdir -p scripts

# Criar arquivos base
touch server/src/main.ts
touch client/src/{App.tsx,main.tsx}
touch shared/types/{cedro.ts,market.ts,websocket.ts}
```

### **1.3 Configurar Package.json e Dependências**
**Duração**: 3-4 horas

#### **Package.json Raiz**
```json
{
  "name": "smart-trade",
  "version": "1.0.0",
  "description": "Sistema de Trading com Order Flow e Footprint Chart",
  "private": true,
  "workspaces": [
    "server",
    "client", 
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:shared && npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build",
    "build:shared": "cd shared && npm run build",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "cd client && npm test",
    "clean": "rm -rf server/dist client/dist shared/dist",
    "setup": "npm install && npm run build:shared"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

#### **Server Package.json**
```json
{
  "name": "@smart-trade/server",
  "version": "1.0.0",
  "description": "Backend do sistema Smart-Trade",
  "main": "dist/main.js",
  "scripts": {
    "dev": "nodemon src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "ws": "^8.16.0",
    "ioredis": "^5.3.2",
    "better-sqlite3": "^9.2.2",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/ws": "^8.5.10",
    "@types/better-sqlite3": "^7.6.8",
    "typescript": "^5.3.3",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

#### **Client Package.json**
```json
{
  "name": "@smart-trade/client",
  "version": "1.0.0",
  "description": "Frontend do sistema Smart-Trade",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7",
    "lightweight-charts": "^4.1.3",
    "@smart-trade/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0"
  }
}
```

### **1.4 Setup Git e Versionamento**
**Duração**: 1-2 horas

#### **.gitignore**
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Database
server/data/*.db
server/data/*.db-*

# Redis dump
dump.rdb

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output

# Temporary files
*.tmp
*.temp
```

#### **Comandos Git**
```bash
# Inicializar repositório
git init

# Configurar usuário (se necessário)
git config user.name "Seu Nome"
git config user.email "seu.email@exemplo.com"

# Primeiro commit
git add .
git commit -m "🎉 Initial commit: Estrutura base do projeto Smart-Trade"

# Criar branch de desenvolvimento
git checkout -b develop
```

## ✅ CHECKPOINT 1: Validação da Fase

### **Critérios de Aprovação**
```bash
# 1. Verificar Node.js e npm
node --version  # >= 20.0.0
npm --version   # >= 10.0.0

# 2. Verificar estrutura de pastas
ls -la server/src/
ls -la client/src/
ls -la shared/types/

# 3. Verificar package.json
cat package.json | grep "workspaces"
cat server/package.json | grep "nodemon"
cat client/package.json | grep "vite"

# 4. Verificar Git
git status
git log --oneline

# 5. Testar build básico
npm install
npm run build:shared
```

### **Checklist de Validação**
- [ ] Node.js 20+ instalado e funcionando
- [ ] Estrutura de pastas criada conforme especificação
- [ ] Package.json configurados (raiz, server, client, shared)
- [ ] Dependências básicas instaladas
- [ ] Git inicializado com primeiro commit
- [ ] TypeScript configurado em todos os módulos
- [ ] Scripts npm funcionando (dev, build, test)

### **Problemas Comuns e Soluções**
1. **Erro de permissão npm**: `npm config set prefix ~/.npm-global`
2. **TypeScript não encontrado**: `npm install -g typescript`
3. **Workspace não funciona**: Verificar versão npm >= 7.0.0

## 🎯 Próximos Passos
Após completar o Checkpoint 1, avançar para:
**FASE 2: Integração Cedro API** (`02-FASE-2-CEDRO-API.md`)

---

**📝 Status**: ⏳ Aguardando implementação
**Responsável**: Desenvolvedor
**Última Atualização**: 02/01/2025
