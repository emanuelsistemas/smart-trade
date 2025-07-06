#!/bin/bash

# 🚀 Smart-Trade Management Script
# Gerenciamento completo do sistema Smart-Trade com PM2

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir ajuda
show_help() {
    echo -e "${BLUE}🚀 Smart-Trade Management Script${NC}"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponíveis:"
    echo -e "  ${GREEN}start${NC}     - Iniciar todos os serviços"
    echo -e "  ${GREEN}stop${NC}      - Parar todos os serviços"
    echo -e "  ${GREEN}restart${NC}   - Reiniciar todos os serviços"
    echo -e "  ${GREEN}status${NC}    - Mostrar status dos serviços"
    echo -e "  ${GREEN}logs${NC}      - Mostrar logs em tempo real"
    echo -e "  ${GREEN}logs-server${NC} - Logs apenas do servidor"
    echo -e "  ${GREEN}logs-client${NC} - Logs apenas do cliente"
    echo -e "  ${GREEN}monitor${NC}   - Monitor interativo PM2"
    echo -e "  ${GREEN}reload${NC}    - Reload sem downtime"
    echo -e "  ${GREEN}setup${NC}     - Configurar auto-start no boot"
    echo -e "  ${GREEN}cleanup${NC}   - Limpar logs antigos"
    echo -e "  ${GREEN}health${NC}    - Verificar saúde do sistema"
    echo ""
}

# Função para verificar se PM2 está instalado
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 não está instalado!${NC}"
        echo "Instale com: npm install -g pm2"
        exit 1
    fi
}

# Função para iniciar serviços
start_services() {
    echo -e "${BLUE}🚀 Iniciando Smart-Trade...${NC}"
    pm2 start ecosystem.config.js
    echo -e "${GREEN}✅ Serviços iniciados!${NC}"
}

# Função para parar serviços
stop_services() {
    echo -e "${YELLOW}⏹️  Parando Smart-Trade...${NC}"
    pm2 stop all
    echo -e "${GREEN}✅ Serviços parados!${NC}"
}

# Função para reiniciar serviços
restart_services() {
    echo -e "${YELLOW}🔄 Reiniciando Smart-Trade...${NC}"
    pm2 restart all
    echo -e "${GREEN}✅ Serviços reiniciados!${NC}"
}

# Função para mostrar status
show_status() {
    echo -e "${BLUE}📊 Status do Smart-Trade:${NC}"
    pm2 list
}

# Função para mostrar logs
show_logs() {
    echo -e "${BLUE}📋 Logs do Smart-Trade (Ctrl+C para sair):${NC}"
    pm2 logs
}

# Função para logs do servidor
show_server_logs() {
    echo -e "${BLUE}📋 Logs do Servidor (Ctrl+C para sair):${NC}"
    pm2 logs smart-trade-server
}

# Função para logs do cliente
show_client_logs() {
    echo -e "${BLUE}📋 Logs do Cliente (Ctrl+C para sair):${NC}"
    pm2 logs smart-trade-client
}

# Função para monitor
show_monitor() {
    echo -e "${BLUE}📊 Monitor PM2 (q para sair):${NC}"
    pm2 monit
}

# Função para reload
reload_services() {
    echo -e "${YELLOW}🔄 Reload sem downtime...${NC}"
    pm2 reload all
    echo -e "${GREEN}✅ Reload concluído!${NC}"
}

# Função para configurar auto-start
setup_autostart() {
    echo -e "${BLUE}⚙️  Configurando auto-start...${NC}"
    pm2 startup
    pm2 save
    echo -e "${GREEN}✅ Auto-start configurado!${NC}"
}

# Função para limpeza
cleanup_logs() {
    echo -e "${YELLOW}🧹 Limpando logs antigos...${NC}"
    pm2 flush
    find ./logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    echo -e "${GREEN}✅ Logs limpos!${NC}"
}

# Função para verificar saúde
health_check() {
    echo -e "${BLUE}🏥 Verificação de Saúde:${NC}"
    echo ""
    
    # Verificar PM2
    if pm2 list | grep -q "online"; then
        echo -e "${GREEN}✅ PM2: Funcionando${NC}"
    else
        echo -e "${RED}❌ PM2: Problemas detectados${NC}"
    fi
    
    # Verificar portas
    if netstat -tuln | grep -q ":8080"; then
        echo -e "${GREEN}✅ Servidor: Porta 8080 ativa${NC}"
    else
        echo -e "${RED}❌ Servidor: Porta 8080 não encontrada${NC}"
    fi
    
    if netstat -tuln | grep -q ":8081"; then
        echo -e "${GREEN}✅ WebSocket: Porta 8081 ativa${NC}"
    else
        echo -e "${RED}❌ WebSocket: Porta 8081 não encontrada${NC}"
    fi
    
    if netstat -tuln | grep -q ":3000"; then
        echo -e "${GREEN}✅ Frontend: Porta 3000 ativa${NC}"
    else
        echo -e "${RED}❌ Frontend: Porta 3000 não encontrada${NC}"
    fi

    # Verificar Redis
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis: Funcionando${NC}"
    else
        echo -e "${RED}❌ Redis: Não conectado${NC}"
    fi

    # Verificar SQLite
    if [ -f "./server/data/smart-trade.db" ] && sqlite3 "./server/data/smart-trade.db" "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SQLite: Funcionando${NC}"
    else
        echo -e "${RED}❌ SQLite: Não acessível${NC}"
    fi
    
    # Verificar espaço em disco
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✅ Disco: ${DISK_USAGE}% usado${NC}"
    else
        echo -e "${YELLOW}⚠️  Disco: ${DISK_USAGE}% usado (atenção!)${NC}"
    fi
    
    # Verificar memória
    MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✅ Memória: ${MEM_USAGE}% usada${NC}"
    else
        echo -e "${YELLOW}⚠️  Memória: ${MEM_USAGE}% usada (atenção!)${NC}"
    fi
}

# Verificar PM2
check_pm2

# Processar comando
case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    logs-server)
        show_server_logs
        ;;
    logs-client)
        show_client_logs
        ;;
    monitor)
        show_monitor
        ;;
    reload)
        reload_services
        ;;
    setup)
        setup_autostart
        ;;
    cleanup)
        cleanup_logs
        ;;
    health)
        health_check
        ;;
    *)
        show_help
        ;;
esac
