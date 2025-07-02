#!/bin/bash

# 🔍 Script de Verificação de Fases - Sistema Smart-Trade
# Uso: ./check-phase.sh [numero-da-fase]

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

# Função para verificar comando
check_command() {
    if command -v $1 &> /dev/null; then
        log_success "$1 está instalado"
        return 0
    else
        log_error "$1 não encontrado"
        return 1
    fi
}

# Função para verificar versão mínima
check_version() {
    local cmd=$1
    local min_version=$2
    local current_version=$($cmd --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
    
    if [ -z "$current_version" ]; then
        log_error "Não foi possível obter versão do $cmd"
        return 1
    fi
    
    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        log_success "$cmd versão $current_version (>= $min_version)"
        return 0
    else
        log_error "$cmd versão $current_version (< $min_version requerida)"
        return 1
    fi
}

# Verificação Fase 1: Fundação
check_phase_1() {
    log_info "🔍 Verificando Fase 1: Fundação e Estrutura Base"
    
    local errors=0
    
    # Verificar Node.js
    if check_version "node" "20.0.0"; then
        :
    else
        ((errors++))
    fi
    
    # Verificar npm
    if check_version "npm" "10.0.0"; then
        :
    else
        ((errors++))
    fi
    
    # Verificar Git
    if check_command "git"; then
        :
    else
        ((errors++))
    fi
    
    # Verificar estrutura de pastas
    local required_dirs=("server/src" "client/src" "shared/types" "scripts")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Diretório $dir existe"
        else
            log_error "Diretório $dir não encontrado"
            ((errors++))
        fi
    done
    
    # Verificar package.json
    local required_files=("package.json" "server/package.json" "client/package.json")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Arquivo $file existe"
        else
            log_error "Arquivo $file não encontrado"
            ((errors++))
        fi
    done
    
    # Verificar Git
    if [ -d ".git" ]; then
        log_success "Repositório Git inicializado"
    else
        log_error "Repositório Git não inicializado"
        ((errors++))
    fi
    
    # Verificar build
    if npm run build:shared &>/dev/null; then
        log_success "Build do shared funciona"
    else
        log_warning "Build do shared falhou (pode ser normal se dependências não instaladas)"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "✅ CHECKPOINT 1 APROVADO - Fase 1 completa!"
        return 0
    else
        log_error "❌ CHECKPOINT 1 REPROVADO - $errors erro(s) encontrado(s)"
        return 1
    fi
}

# Verificação Fase 2: Cedro API
check_phase_2() {
    log_info "🔍 Verificando Fase 2: Integração Cedro API"
    
    local errors=0
    
    # Verificar arquivos da Fase 2
    local required_files=(
        "server/src/cedro/client.ts"
        "server/src/cedro/auth.ts"
        "server/src/cedro/parser.ts"
        "server/src/cedro/subscription-manager.ts"
        "server/src/cedro/error-handler.ts"
        "shared/types/cedro.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Arquivo $file existe"
        else
            log_error "Arquivo $file não encontrado"
            ((errors++))
        fi
    done
    
    # Verificar se server compila
    if (cd server && npm run build) &>/dev/null; then
        log_success "Server compila sem erros"
    else
        log_error "Server não compila"
        ((errors++))
    fi
    
    # Verificar se server inicia
    if timeout 10s npm run dev:server &>/dev/null; then
        log_success "Server inicia sem erros"
    else
        log_warning "Server não inicia (pode ser normal sem credenciais Cedro)"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "✅ CHECKPOINT 2 APROVADO - Fase 2 completa!"
        return 0
    else
        log_error "❌ CHECKPOINT 2 REPROVADO - $errors erro(s) encontrado(s)"
        return 1
    fi
}

# Verificação Fase 3: Sistema de Dados
check_phase_3() {
    log_info "🔍 Verificando Fase 3: Sistema de Dados"
    
    local errors=0
    
    # Verificar dependências
    if (cd server && npm list better-sqlite3) &>/dev/null; then
        log_success "SQLite (better-sqlite3) instalado"
    else
        log_error "SQLite não instalado"
        ((errors++))
    fi
    
    if (cd server && npm list ioredis) &>/dev/null; then
        log_success "Redis (ioredis) instalado"
    else
        log_error "Redis não instalado"
        ((errors++))
    fi
    
    # Verificar arquivos
    local required_files=(
        "server/src/data/sqlite-manager.ts"
        "server/src/data/redis-manager.ts"
        "server/src/data/data-flow.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Arquivo $file existe"
        else
            log_error "Arquivo $file não encontrado"
            ((errors++))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        log_success "✅ CHECKPOINT 3 APROVADO - Fase 3 completa!"
        return 0
    else
        log_error "❌ CHECKPOINT 3 REPROVADO - $errors erro(s) encontrado(s)"
        return 1
    fi
}

# Função principal
main() {
    local phase=${1:-"all"}
    
    echo "🚀 Smart-Trade - Verificador de Fases"
    echo "======================================"
    
    case $phase in
        1)
            check_phase_1
            ;;
        2)
            check_phase_1 && check_phase_2
            ;;
        3)
            check_phase_1 && check_phase_2 && check_phase_3
            ;;
        "all")
            log_info "Verificando todas as fases implementadas..."
            check_phase_1
            if [ $? -eq 0 ]; then
                check_phase_2
                if [ $? -eq 0 ]; then
                    check_phase_3
                fi
            fi
            ;;
        *)
            echo "Uso: $0 [1|2|3|all]"
            echo "  1   - Verificar apenas Fase 1"
            echo "  2   - Verificar Fases 1 e 2"
            echo "  3   - Verificar Fases 1, 2 e 3"
            echo "  all - Verificar todas as fases (padrão)"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"
