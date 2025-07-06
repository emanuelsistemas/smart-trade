#!/bin/bash

# 🔴 Redis Monitor Script for Smart-Trade
# Monitoramento completo do Redis

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para exibir ajuda
show_help() {
    echo -e "${RED}🔴 Redis Monitor - Smart-Trade${NC}"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponíveis:"
    echo -e "  ${GREEN}status${NC}      - Status geral do Redis"
    echo -e "  ${GREEN}info${NC}        - Informações detalhadas"
    echo -e "  ${GREEN}memory${NC}      - Uso de memória"
    echo -e "  ${GREEN}clients${NC}     - Clientes conectados"
    echo -e "  ${GREEN}databases${NC}   - Status dos databases"
    echo -e "  ${GREEN}keys${NC}        - Listar chaves por padrão"
    echo -e "  ${GREEN}monitor${NC}     - Monitor em tempo real"
    echo -e "  ${GREEN}slowlog${NC}     - Comandos lentos"
    echo -e "  ${GREEN}stats${NC}       - Estatísticas de performance"
    echo -e "  ${GREEN}cleanup${NC}     - Limpar dados temporários"
    echo -e "  ${GREEN}backup${NC}      - Fazer backup"
    echo -e "  ${GREEN}test${NC}        - Testar funcionalidade"
    echo ""
}

# Função para verificar se Redis está rodando
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${RED}❌ Redis não está rodando!${NC}"
        echo "Inicie com: sudo systemctl start redis-server"
        exit 1
    fi
}

# Função para mostrar status
show_status() {
    echo -e "${RED}🔴 Status do Redis${NC}"
    echo ""
    
    # Status do serviço
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN}✅ Serviço: Ativo${NC}"
    else
        echo -e "${RED}❌ Serviço: Inativo${NC}"
    fi
    
    # Conectividade
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Conectividade: OK${NC}"
    else
        echo -e "${RED}❌ Conectividade: Falha${NC}"
    fi
    
    # Versão
    VERSION=$(redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}📋 Versão: ${VERSION}${NC}"
    
    # Uptime
    UPTIME=$(redis-cli info server | grep uptime_in_seconds | cut -d: -f2 | tr -d '\r')
    UPTIME_HOURS=$((UPTIME / 3600))
    echo -e "${BLUE}⏰ Uptime: ${UPTIME_HOURS}h${NC}"
    
    # Porta
    PORT=$(redis-cli info server | grep tcp_port | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}🔌 Porta: ${PORT}${NC}"
}

# Função para mostrar informações detalhadas
show_info() {
    echo -e "${RED}🔴 Informações Detalhadas${NC}"
    echo ""
    
    echo -e "${YELLOW}=== SERVIDOR ===${NC}"
    redis-cli info server | head -10
    
    echo -e "\n${YELLOW}=== MEMÓRIA ===${NC}"
    redis-cli info memory | grep -E "(used_memory_human|maxmemory_human|mem_fragmentation_ratio)"
    
    echo -e "\n${YELLOW}=== CLIENTES ===${NC}"
    redis-cli info clients | grep -E "(connected_clients|blocked_clients)"
    
    echo -e "\n${YELLOW}=== ESTATÍSTICAS ===${NC}"
    redis-cli info stats | grep -E "(total_commands_processed|instantaneous_ops_per_sec|keyspace_hits|keyspace_misses)"
}

# Função para mostrar uso de memória
show_memory() {
    echo -e "${RED}🔴 Uso de Memória${NC}"
    echo ""
    
    # Memória usada
    USED_MEMORY=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}💾 Memória Usada: ${USED_MEMORY}${NC}"
    
    # Memória máxima
    MAX_MEMORY=$(redis-cli info memory | grep maxmemory_human | cut -d: -f2 | tr -d '\r')
    if [ -n "$MAX_MEMORY" ] && [ "$MAX_MEMORY" != "0B" ]; then
        echo -e "${BLUE}📊 Memória Máxima: ${MAX_MEMORY}${NC}"
    else
        echo -e "${YELLOW}⚠️  Memória Máxima: Ilimitada${NC}"
    fi
    
    # Fragmentação
    FRAGMENTATION=$(redis-cli info memory | grep mem_fragmentation_ratio | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}🔧 Fragmentação: ${FRAGMENTATION}${NC}"
    
    # Política de eviction
    POLICY=$(redis-cli config get maxmemory-policy | tail -1)
    echo -e "${BLUE}📋 Política: ${POLICY}${NC}"
}

# Função para mostrar clientes
show_clients() {
    echo -e "${RED}🔴 Clientes Conectados${NC}"
    echo ""
    
    CONNECTED=$(redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
    echo -e "${GREEN}👥 Conectados: ${CONNECTED}${NC}"
    
    BLOCKED=$(redis-cli info clients | grep blocked_clients | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}⏸️  Bloqueados: ${BLOCKED}${NC}"
    
    echo -e "\n${YELLOW}=== LISTA DE CLIENTES ===${NC}"
    redis-cli client list | head -10
}

# Função para mostrar status dos databases
show_databases() {
    echo -e "${RED}🔴 Status dos Databases${NC}"
    echo ""
    
    echo -e "${CYAN}DB 0 - Quotes:${NC}"
    DB0_SIZE=$(redis-cli -n 0 dbsize)
    echo -e "  📊 Chaves: ${DB0_SIZE}"
    
    echo -e "${CYAN}DB 1 - Order Flow:${NC}"
    DB1_SIZE=$(redis-cli -n 1 dbsize)
    echo -e "  📊 Chaves: ${DB1_SIZE}"
    
    echo -e "${CYAN}DB 2 - Footprint:${NC}"
    DB2_SIZE=$(redis-cli -n 2 dbsize)
    echo -e "  📊 Chaves: ${DB2_SIZE}"
    
    echo -e "${CYAN}DB 3 - Cálculos:${NC}"
    DB3_SIZE=$(redis-cli -n 3 dbsize)
    echo -e "  📊 Chaves: ${DB3_SIZE}"
    
    echo -e "${CYAN}DB 4 - Sessões:${NC}"
    DB4_SIZE=$(redis-cli -n 4 dbsize)
    echo -e "  📊 Chaves: ${DB4_SIZE}"
    
    echo -e "${CYAN}DB 5 - Configurações:${NC}"
    DB5_SIZE=$(redis-cli -n 5 dbsize)
    echo -e "  📊 Chaves: ${DB5_SIZE}"
}

# Função para listar chaves
show_keys() {
    echo -e "${RED}🔴 Chaves por Padrão${NC}"
    echo ""
    
    echo -e "${CYAN}Quotes (DB 0):${NC}"
    redis-cli -n 0 keys "quote:*" | head -5
    
    echo -e "\n${CYAN}Order Flow (DB 1):${NC}"
    redis-cli -n 1 keys "orderflow:*" | head -5
    
    echo -e "\n${CYAN}Footprint (DB 2):${NC}"
    redis-cli -n 2 keys "footprint:*" | head -5
    
    echo -e "\n${CYAN}Sessões (DB 4):${NC}"
    redis-cli -n 4 keys "session:*" | head -5
    
    echo -e "\n${YELLOW}(Mostrando apenas 5 primeiras de cada tipo)${NC}"
}

# Função para monitor em tempo real
show_monitor() {
    echo -e "${RED}🔴 Monitor em Tempo Real (Ctrl+C para sair)${NC}"
    echo ""
    redis-cli monitor
}

# Função para mostrar slowlog
show_slowlog() {
    echo -e "${RED}🔴 Comandos Lentos${NC}"
    echo ""
    
    SLOWLOG_LEN=$(redis-cli slowlog len)
    echo -e "${BLUE}📊 Total de comandos lentos: ${SLOWLOG_LEN}${NC}"
    
    if [ "$SLOWLOG_LEN" -gt 0 ]; then
        echo -e "\n${YELLOW}=== ÚLTIMOS 10 COMANDOS LENTOS ===${NC}"
        redis-cli slowlog get 10
    else
        echo -e "${GREEN}✅ Nenhum comando lento registrado${NC}"
    fi
}

# Função para mostrar estatísticas
show_stats() {
    echo -e "${RED}🔴 Estatísticas de Performance${NC}"
    echo ""
    
    # Comandos processados
    TOTAL_COMMANDS=$(redis-cli info stats | grep total_commands_processed | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}📊 Total de Comandos: ${TOTAL_COMMANDS}${NC}"
    
    # Ops por segundo
    OPS_SEC=$(redis-cli info stats | grep instantaneous_ops_per_sec | cut -d: -f2 | tr -d '\r')
    echo -e "${BLUE}⚡ Ops/segundo: ${OPS_SEC}${NC}"
    
    # Hit rate
    HITS=$(redis-cli info stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
    MISSES=$(redis-cli info stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')
    
    if [ "$HITS" -gt 0 ] || [ "$MISSES" -gt 0 ]; then
        TOTAL=$((HITS + MISSES))
        HIT_RATE=$((HITS * 100 / TOTAL))
        echo -e "${GREEN}🎯 Hit Rate: ${HIT_RATE}%${NC}"
        echo -e "${BLUE}✅ Hits: ${HITS}${NC}"
        echo -e "${BLUE}❌ Misses: ${MISSES}${NC}"
    else
        echo -e "${YELLOW}⚠️  Sem estatísticas de cache ainda${NC}"
    fi
}

# Função para limpeza
cleanup_data() {
    echo -e "${RED}🔴 Limpeza de Dados Temporários${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  Esta operação irá limpar dados temporários!${NC}"
    read -p "Continuar? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🧹 Limpando DB 0 (Quotes)...${NC}"
        redis-cli -n 0 flushdb
        
        echo -e "${BLUE}🧹 Limpando DB 1 (Order Flow)...${NC}"
        redis-cli -n 1 flushdb
        
        echo -e "${BLUE}🧹 Limpando DB 2 (Footprint)...${NC}"
        redis-cli -n 2 flushdb
        
        echo -e "${GREEN}✅ Limpeza concluída!${NC}"
    else
        echo -e "${YELLOW}❌ Operação cancelada${NC}"
    fi
}

# Função para backup
backup_data() {
    echo -e "${RED}🔴 Backup do Redis${NC}"
    echo ""
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="redis-backup-$(date +%Y%m%d-%H%M%S).rdb"
    
    mkdir -p "$BACKUP_DIR"
    
    echo -e "${BLUE}💾 Iniciando backup...${NC}"
    redis-cli bgsave
    
    echo -e "${BLUE}⏳ Aguardando conclusão...${NC}"
    sleep 2
    
    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp "/var/lib/redis/dump.rdb" "$BACKUP_DIR/$BACKUP_FILE"
        echo -e "${GREEN}✅ Backup salvo em: $BACKUP_DIR/$BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Erro ao criar backup${NC}"
    fi
}

# Função para teste
test_functionality() {
    echo -e "${RED}🔴 Teste de Funcionalidade${NC}"
    echo ""
    
    # Teste básico
    echo -e "${BLUE}🧪 Testando conectividade...${NC}"
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ping: OK${NC}"
    else
        echo -e "${RED}❌ Ping: Falha${NC}"
        return 1
    fi
    
    # Teste de escrita/leitura
    echo -e "${BLUE}🧪 Testando escrita/leitura...${NC}"
    TEST_KEY="smart-trade:test:$(date +%s)"
    TEST_VALUE="test-value-$(date +%s)"
    
    redis-cli set "$TEST_KEY" "$TEST_VALUE" EX 10 > /dev/null
    RESULT=$(redis-cli get "$TEST_KEY")
    
    if [ "$RESULT" = "$TEST_VALUE" ]; then
        echo -e "${GREEN}✅ Escrita/Leitura: OK${NC}"
        redis-cli del "$TEST_KEY" > /dev/null
    else
        echo -e "${RED}❌ Escrita/Leitura: Falha${NC}"
    fi
    
    # Teste de TTL
    echo -e "${BLUE}🧪 Testando TTL...${NC}"
    TTL_KEY="smart-trade:ttl-test"
    redis-cli set "$TTL_KEY" "ttl-test" EX 5 > /dev/null
    TTL_VALUE=$(redis-cli ttl "$TTL_KEY")
    
    if [ "$TTL_VALUE" -gt 0 ] && [ "$TTL_VALUE" -le 5 ]; then
        echo -e "${GREEN}✅ TTL: OK (${TTL_VALUE}s)${NC}"
    else
        echo -e "${RED}❌ TTL: Falha${NC}"
    fi
    
    echo -e "\n${GREEN}🎉 Testes concluídos!${NC}"
}

# Verificar Redis
check_redis

# Processar comando
case "${1:-}" in
    status)
        show_status
        ;;
    info)
        show_info
        ;;
    memory)
        show_memory
        ;;
    clients)
        show_clients
        ;;
    databases)
        show_databases
        ;;
    keys)
        show_keys
        ;;
    monitor)
        show_monitor
        ;;
    slowlog)
        show_slowlog
        ;;
    stats)
        show_stats
        ;;
    cleanup)
        cleanup_data
        ;;
    backup)
        backup_data
        ;;
    test)
        test_functionality
        ;;
    *)
        show_help
        ;;
esac
