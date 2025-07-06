#!/bin/bash

# 🗄️ SQLite Monitor Script for Smart-Trade
# Monitoramento completo do SQLite

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
DB_PATH="./server/data/smart-trade.db"

# Função para exibir ajuda
show_help() {
    echo -e "${BLUE}🗄️ SQLite Monitor - Smart-Trade${NC}"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponíveis:"
    echo -e "  ${GREEN}status${NC}      - Status geral do SQLite"
    echo -e "  ${GREEN}info${NC}        - Informações do banco"
    echo -e "  ${GREEN}tables${NC}      - Listar tabelas"
    echo -e "  ${GREEN}schema${NC}      - Esquema das tabelas"
    echo -e "  ${GREEN}size${NC}        - Tamanho do banco"
    echo -e "  ${GREEN}count${NC}       - Contagem de registros"
    echo -e "  ${GREEN}integrity${NC}   - Verificar integridade"
    echo -e "  ${GREEN}vacuum${NC}      - Otimizar banco"
    echo -e "  ${GREEN}backup${NC}      - Fazer backup"
    echo -e "  ${GREEN}test${NC}        - Testar funcionalidade"
    echo ""
}

# Função para verificar se SQLite está disponível
check_sqlite() {
    if ! command -v sqlite3 &> /dev/null; then
        echo -e "${RED}❌ SQLite3 não está instalado!${NC}"
        echo "Instale com: apt install sqlite3"
        exit 1
    fi
    
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}❌ Banco de dados não encontrado: $DB_PATH${NC}"
        exit 1
    fi
}

# Função para mostrar status
show_status() {
    echo -e "${BLUE}🗄️ Status do SQLite${NC}"
    echo ""
    
    # Versão do SQLite
    VERSION=$(sqlite3 --version | cut -d' ' -f1)
    echo -e "${BLUE}📋 Versão: ${VERSION}${NC}"
    
    # Verificar se o banco existe
    if [ -f "$DB_PATH" ]; then
        echo -e "${GREEN}✅ Banco: Encontrado${NC}"
    else
        echo -e "${RED}❌ Banco: Não encontrado${NC}"
        return 1
    fi
    
    # Tamanho do arquivo
    SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo -e "${BLUE}💾 Tamanho: ${SIZE}${NC}"
    
    # Última modificação
    MODIFIED=$(stat -c %y "$DB_PATH" | cut -d'.' -f1)
    echo -e "${BLUE}📅 Modificado: ${MODIFIED}${NC}"
    
    # Verificar se está acessível
    if sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Acesso: OK${NC}"
    else
        echo -e "${RED}❌ Acesso: Falha${NC}"
    fi
}

# Função para mostrar informações
show_info() {
    echo -e "${BLUE}🗄️ Informações do Banco${NC}"
    echo ""
    
    echo -e "${YELLOW}=== CONFIGURAÇÕES ===${NC}"
    sqlite3 "$DB_PATH" "PRAGMA compile_options;" | head -5
    
    echo -e "\n${YELLOW}=== ESTATÍSTICAS ===${NC}"
    echo -e "${CYAN}Encoding:${NC} $(sqlite3 "$DB_PATH" "PRAGMA encoding;")"
    echo -e "${CYAN}Page Size:${NC} $(sqlite3 "$DB_PATH" "PRAGMA page_size;") bytes"
    echo -e "${CYAN}Page Count:${NC} $(sqlite3 "$DB_PATH" "PRAGMA page_count;")"
    echo -e "${CYAN}Cache Size:${NC} $(sqlite3 "$DB_PATH" "PRAGMA cache_size;")"
    
    echo -e "\n${YELLOW}=== JOURNAL MODE ===${NC}"
    echo -e "${CYAN}Journal Mode:${NC} $(sqlite3 "$DB_PATH" "PRAGMA journal_mode;")"
    echo -e "${CYAN}Synchronous:${NC} $(sqlite3 "$DB_PATH" "PRAGMA synchronous;")"
}

# Função para listar tabelas
show_tables() {
    echo -e "${BLUE}🗄️ Tabelas do Banco${NC}"
    echo ""
    
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    
    if [ -n "$TABLES" ]; then
        echo -e "${GREEN}📋 Tabelas encontradas:${NC}"
        for table in $TABLES; do
            COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
            echo -e "  ${CYAN}$table${NC}: $COUNT registros"
        done
    else
        echo -e "${YELLOW}⚠️  Nenhuma tabela encontrada${NC}"
    fi
}

# Função para mostrar esquema
show_schema() {
    echo -e "${BLUE}🗄️ Esquema das Tabelas${NC}"
    echo ""
    
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    
    for table in $TABLES; do
        echo -e "${CYAN}=== $table ===${NC}"
        sqlite3 "$DB_PATH" ".schema $table"
        echo ""
    done
}

# Função para mostrar tamanho
show_size() {
    echo -e "${BLUE}🗄️ Tamanho do Banco${NC}"
    echo ""
    
    # Tamanho do arquivo principal
    MAIN_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo -e "${BLUE}📄 Arquivo principal: ${MAIN_SIZE}${NC}"
    
    # Arquivos WAL e SHM se existirem
    if [ -f "${DB_PATH}-wal" ]; then
        WAL_SIZE=$(du -h "${DB_PATH}-wal" | cut -f1)
        echo -e "${BLUE}📄 WAL file: ${WAL_SIZE}${NC}"
    fi
    
    if [ -f "${DB_PATH}-shm" ]; then
        SHM_SIZE=$(du -h "${DB_PATH}-shm" | cut -f1)
        echo -e "${BLUE}📄 SHM file: ${SHM_SIZE}${NC}"
    fi
    
    # Tamanho total
    TOTAL_SIZE=$(du -ch "$DB_PATH"* | tail -1 | cut -f1)
    echo -e "${GREEN}📊 Total: ${TOTAL_SIZE}${NC}"
    
    # Estatísticas internas
    echo -e "\n${YELLOW}=== ESTATÍSTICAS INTERNAS ===${NC}"
    PAGE_SIZE=$(sqlite3 "$DB_PATH" "PRAGMA page_size;")
    PAGE_COUNT=$(sqlite3 "$DB_PATH" "PRAGMA page_count;")
    FREELIST_COUNT=$(sqlite3 "$DB_PATH" "PRAGMA freelist_count;")
    
    echo -e "${CYAN}Páginas totais:${NC} $PAGE_COUNT"
    echo -e "${CYAN}Páginas livres:${NC} $FREELIST_COUNT"
    echo -e "${CYAN}Tamanho da página:${NC} $PAGE_SIZE bytes"
    
    USED_PAGES=$((PAGE_COUNT - FREELIST_COUNT))
    USAGE_PERCENT=$((USED_PAGES * 100 / PAGE_COUNT))
    echo -e "${CYAN}Uso:${NC} $USAGE_PERCENT%"
}

# Função para contar registros
show_count() {
    echo -e "${BLUE}🗄️ Contagem de Registros${NC}"
    echo ""
    
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    TOTAL=0
    
    for table in $TABLES; do
        COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
        echo -e "${CYAN}$table:${NC} $COUNT registros"
        TOTAL=$((TOTAL + COUNT))
    done
    
    echo -e "\n${GREEN}📊 Total: $TOTAL registros${NC}"
}

# Função para verificar integridade
check_integrity() {
    echo -e "${BLUE}🗄️ Verificação de Integridade${NC}"
    echo ""
    
    echo -e "${YELLOW}🔍 Verificando integridade...${NC}"
    RESULT=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
    
    if [ "$RESULT" = "ok" ]; then
        echo -e "${GREEN}✅ Integridade: OK${NC}"
    else
        echo -e "${RED}❌ Problemas encontrados:${NC}"
        echo "$RESULT"
    fi
    
    echo -e "\n${YELLOW}🔍 Verificando chaves estrangeiras...${NC}"
    FK_RESULT=$(sqlite3 "$DB_PATH" "PRAGMA foreign_key_check;")
    
    if [ -z "$FK_RESULT" ]; then
        echo -e "${GREEN}✅ Chaves estrangeiras: OK${NC}"
    else
        echo -e "${RED}❌ Problemas com chaves estrangeiras:${NC}"
        echo "$FK_RESULT"
    fi
}

# Função para otimizar banco
vacuum_db() {
    echo -e "${BLUE}🗄️ Otimização do Banco${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  Esta operação pode demorar alguns minutos!${NC}"
    read -p "Continuar? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🔧 Executando VACUUM...${NC}"
        
        BEFORE_SIZE=$(du -h "$DB_PATH" | cut -f1)
        echo -e "${CYAN}Tamanho antes: ${BEFORE_SIZE}${NC}"
        
        sqlite3 "$DB_PATH" "VACUUM;"
        
        AFTER_SIZE=$(du -h "$DB_PATH" | cut -f1)
        echo -e "${CYAN}Tamanho depois: ${AFTER_SIZE}${NC}"
        
        echo -e "${GREEN}✅ Otimização concluída!${NC}"
    else
        echo -e "${YELLOW}❌ Operação cancelada${NC}"
    fi
}

# Função para backup
backup_db() {
    echo -e "${BLUE}🗄️ Backup do SQLite${NC}"
    echo ""
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="sqlite-backup-$(date +%Y%m%d-%H%M%S).db"
    
    mkdir -p "$BACKUP_DIR"
    
    echo -e "${BLUE}💾 Criando backup...${NC}"
    
    # Backup usando .backup command (mais seguro)
    sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/$BACKUP_FILE"
    
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup criado: $BACKUP_DIR/$BACKUP_FILE (${BACKUP_SIZE})${NC}"
        
        # Verificar integridade do backup
        INTEGRITY=$(sqlite3 "$BACKUP_DIR/$BACKUP_FILE" "PRAGMA integrity_check;")
        if [ "$INTEGRITY" = "ok" ]; then
            echo -e "${GREEN}✅ Backup verificado: Íntegro${NC}"
        else
            echo -e "${RED}❌ Backup com problemas!${NC}"
        fi
    else
        echo -e "${RED}❌ Erro ao criar backup${NC}"
    fi
}

# Função para teste
test_functionality() {
    echo -e "${BLUE}🗄️ Teste de Funcionalidade${NC}"
    echo ""
    
    # Teste de acesso
    echo -e "${BLUE}🧪 Testando acesso ao banco...${NC}"
    if sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Acesso: OK${NC}"
    else
        echo -e "${RED}❌ Acesso: Falha${NC}"
        return 1
    fi
    
    # Teste de leitura das tabelas
    echo -e "${BLUE}🧪 Testando leitura das tabelas...${NC}"
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    if [ -n "$TABLES" ]; then
        echo -e "${GREEN}✅ Tabelas: $(echo $TABLES | wc -w) encontradas${NC}"
    else
        echo -e "${YELLOW}⚠️  Nenhuma tabela encontrada${NC}"
    fi
    
    # Teste de integridade rápido
    echo -e "${BLUE}🧪 Testando integridade...${NC}"
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA quick_check;")
    if [ "$INTEGRITY" = "ok" ]; then
        echo -e "${GREEN}✅ Integridade: OK${NC}"
    else
        echo -e "${RED}❌ Integridade: Problemas detectados${NC}"
    fi
    
    # Teste de escrita (tabela temporária)
    echo -e "${BLUE}🧪 Testando escrita...${NC}"
    TEST_RESULT=$(sqlite3 "$DB_PATH" "CREATE TEMP TABLE test_table (id INTEGER); INSERT INTO test_table VALUES (1); SELECT COUNT(*) FROM test_table;" 2>/dev/null)
    if [ "$TEST_RESULT" = "1" ]; then
        echo -e "${GREEN}✅ Escrita: OK${NC}"
    else
        echo -e "${RED}❌ Escrita: Falha${NC}"
    fi
    
    echo -e "\n${GREEN}🎉 Testes concluídos!${NC}"
}

# Verificar SQLite
check_sqlite

# Processar comando
case "${1:-}" in
    status)
        show_status
        ;;
    info)
        show_info
        ;;
    tables)
        show_tables
        ;;
    schema)
        show_schema
        ;;
    size)
        show_size
        ;;
    count)
        show_count
        ;;
    integrity)
        check_integrity
        ;;
    vacuum)
        vacuum_db
        ;;
    backup)
        backup_db
        ;;
    test)
        test_functionality
        ;;
    *)
        show_help
        ;;
esac
