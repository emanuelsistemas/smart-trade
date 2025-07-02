#!/bin/bash

# 🚀 Script de Setup do Ambiente - Sistema Smart-Trade
# Este script configura o ambiente de desenvolvimento completo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para verificar versão mínima
check_version() {
    local cmd=$1
    local min_version=$2
    local current_version=$($cmd --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
    
    if [ -z "$current_version" ]; then
        return 1
    fi
    
    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        return 0
    else
        return 1
    fi
}

# Verificar pré-requisitos
check_prerequisites() {
    log_info "🔍 Verificando pré-requisitos..."
    
    # Verificar Node.js
    if command_exists node; then
        if check_version "node" "20.0.0"; then
            log_success "Node.js $(node --version) está OK"
        else
            log_error "Node.js versão >= 20.0.0 é necessária"
            log_info "Instale Node.js 20+ de https://nodejs.org/"
            exit 1
        fi
    else
        log_error "Node.js não encontrado"
        log_info "Instale Node.js 20+ de https://nodejs.org/"
        exit 1
    fi
    
    # Verificar npm
    if command_exists npm; then
        if check_version "npm" "10.0.0"; then
            log_success "npm $(npm --version) está OK"
        else
            log_warning "npm versão < 10.0.0, considere atualizar"
        fi
    else
        log_error "npm não encontrado"
        exit 1
    fi
    
    # Verificar Git
    if command_exists git; then
        log_success "Git $(git --version | cut -d' ' -f3) está OK"
    else
        log_error "Git não encontrado"
        log_info "Instale Git de https://git-scm.com/"
        exit 1
    fi
}

# Criar estrutura de diretórios
create_directory_structure() {
    log_info "📁 Criando estrutura de diretórios..."
    
    # Diretórios principais
    local dirs=(
        "server/src/cedro"
        "server/src/data"
        "server/src/websocket"
        "server/src/analysis"
        "server/src/utils"
        "server/tests"
        "server/data"
        "server/logs"
        "client/src/components/common"
        "client/src/components/charts"
        "client/src/components/order-flow"
        "client/src/components/footprint"
        "client/src/hooks"
        "client/src/stores"
        "client/src/types"
        "client/src/utils"
        "client/src/styles"
        "client/public"
        "client/tests"
        "shared/types"
        "scripts"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_success "Criado: $dir"
        else
            log_info "Já existe: $dir"
        fi
    done
}

# Criar arquivos base
create_base_files() {
    log_info "📄 Criando arquivos base..."
    
    # .gitignore
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << 'EOF'
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
EOF
        log_success "Criado: .gitignore"
    fi
    
    # README.md principal
    if [ ! -f "README.md" ]; then
        cat > README.md << 'EOF'
# 🚀 Smart-Trade - Sistema de Trading Avançado

Sistema proprietário de análise de trading com Order Flow Analysis, Footprint Chart e IA para evolução do trader.

## 🎯 Funcionalidades

- **Order Flow Analysis** em tempo real
- **Footprint Chart** com dados tick-by-tick
- **Simulador Paper Trading** com IA
- **Monitor de Evolução** do trader
- **Análise Preditiva** baseada em dados reais

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📚 Documentação

Veja `Doc Implementacao/` para documentação completa de implementação.

## 🏗️ Arquitetura

- **Backend**: Node.js + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Dados**: SQLite + Redis
- **API**: Cedro Technologies (B3)
EOF
        log_success "Criado: README.md"
    fi
    
    # Arquivos TypeScript base
    local ts_files=(
        "server/src/main.ts"
        "client/src/App.tsx"
        "client/src/main.tsx"
        "shared/types/cedro.ts"
        "shared/types/market.ts"
        "shared/types/websocket.ts"
    )
    
    for file in "${ts_files[@]}"; do
        if [ ! -f "$file" ]; then
            touch "$file"
            log_success "Criado: $file"
        fi
    done
}

# Configurar package.json
setup_package_json() {
    log_info "📦 Configurando package.json..."
    
    # Package.json raiz
    if [ ! -f "package.json" ]; then
        cat > package.json << 'EOF'
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
EOF
        log_success "Criado: package.json (raiz)"
    fi
    
    # Server package.json
    if [ ! -f "server/package.json" ]; then
        cat > server/package.json << 'EOF'
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
EOF
        log_success "Criado: server/package.json"
    fi
    
    # Client package.json
    if [ ! -f "client/package.json" ]; then
        cat > client/package.json << 'EOF'
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
EOF
        log_success "Criado: client/package.json"
    fi
    
    # Shared package.json
    if [ ! -f "shared/package.json" ]; then
        cat > shared/package.json << 'EOF'
{
  "name": "@smart-trade/shared",
  "version": "1.0.0",
  "description": "Tipos compartilhados do sistema Smart-Trade",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
EOF
        log_success "Criado: shared/package.json"
    fi
}

# Configurar TypeScript
setup_typescript() {
    log_info "⚙️ Configurando TypeScript..."
    
    # tsconfig.json raiz
    if [ ! -f "tsconfig.json" ]; then
        cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "references": [
    { "path": "./server" },
    { "path": "./client" },
    { "path": "./shared" }
  ]
}
EOF
        log_success "Criado: tsconfig.json (raiz)"
    fi
    
    # Server tsconfig.json
    if [ ! -f "server/tsconfig.json" ]; then
        cat > server/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
        log_success "Criado: server/tsconfig.json"
    fi
    
    # Client tsconfig.json
    if [ ! -f "client/tsconfig.json" ]; then
        cat > client/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
        log_success "Criado: client/tsconfig.json"
    fi
    
    # Shared tsconfig.json
    if [ ! -f "shared/tsconfig.json" ]; then
        cat > shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./types",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["types/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
        log_success "Criado: shared/tsconfig.json"
    fi
}

# Instalar dependências
install_dependencies() {
    log_info "📦 Instalando dependências..."
    
    # Instalar dependências raiz
    log_info "Instalando dependências raiz..."
    npm install
    
    log_success "Dependências instaladas com sucesso!"
}

# Inicializar Git
setup_git() {
    log_info "🔧 Configurando Git..."
    
    if [ ! -d ".git" ]; then
        git init
        log_success "Repositório Git inicializado"
        
        # Primeiro commit
        git add .
        git commit -m "🎉 Initial commit: Estrutura base do projeto Smart-Trade"
        log_success "Primeiro commit realizado"
        
        # Criar branch develop
        git checkout -b develop
        log_success "Branch develop criada"
    else
        log_info "Repositório Git já existe"
    fi
}

# Função principal
main() {
    echo "🚀 Smart-Trade - Setup do Ambiente"
    echo "=================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    create_directory_structure
    echo ""
    
    create_base_files
    echo ""
    
    setup_package_json
    echo ""
    
    setup_typescript
    echo ""
    
    install_dependencies
    echo ""
    
    setup_git
    echo ""
    
    log_success "🎉 Setup concluído com sucesso!"
    echo ""
    log_info "Próximos passos:"
    echo "1. Revisar arquivos criados"
    echo "2. Configurar credenciais Cedro (quando disponíveis)"
    echo "3. Executar: npm run dev"
    echo "4. Seguir documentação em Doc Implementacao/"
}

# Executar função principal
main "$@"
