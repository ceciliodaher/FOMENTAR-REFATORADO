# 📋 Checklist de Correção do Sistema FOMENTAR Refatorado

## 🎯 Objetivo
Corrigir problemas de navegação e teste do sistema refatorado, garantindo funcionamento completo de todos os módulos.

## 📁 Arquivos Importantes
- **Arquivo SPED de teste**: `SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt`
- **HTML principal**: `sped-web-fomentar.html`
- **Código refatorado**: `/js/src/`

## ✅ Checklist de Implementação

### **FASE 1: CORREÇÃO ESTRUTURAL** 🔧

- [ ] **1.1 Corrigir caminho do script no HTML**
  - Arquivo: `sped-web-fomentar.html`
  - Linha: ~1130
  - Alterar: `src/main.js` → `js/src/main.js`
  - Status: PENDENTE

- [ ] **1.2 Remover pasta `/src` duplicada da raiz**
  - Mover para backup se necessário
  - Manter apenas `/js/src/`
  - Status: PENDENTE

- [ ] **1.3 Verificar imports nos módulos**
  - Checar todos os arquivos em `/js/src/`
  - Corrigir caminhos relativos quebrados
  - Status: PENDENTE

### **FASE 2: CONFIGURAÇÃO DO AMBIENTE** 📦

- [ ] **2.1 Criar package.json**
  ```json
  {
    "name": "fomentar-refatorado",
    "version": "2.0.0",
    "type": "module",
    "scripts": {
      "test": "playwright test",
      "test:ui": "playwright test --ui",
      "test:debug": "playwright test --debug"
    }
  }
  ```
  - Status: PENDENTE

- [ ] **2.2 Instalar Playwright**
  ```bash
  npm init -y
  npm install --save-dev @playwright/test
  npx playwright install
  ```
  - Status: PENDENTE

- [ ] **2.3 Criar configuração do Playwright**
  - Arquivo: `playwright.config.js`
  - Status: PENDENTE

### **FASE 3: CORREÇÃO DA NAVEGAÇÃO** 🗂️

- [ ] **3.1 Verificar inicialização do SpedWebApp**
  - Arquivo: `/js/src/main.js`
  - Confirmar que `window.spedApp` é criado
  - Status: PENDENTE

- [ ] **3.2 Conectar TabManager corretamente**
  - Verificar em `/js/src/ui/events.js`
  - Garantir que eventos estão vinculados
  - Status: PENDENTE

- [ ] **3.3 Testar navegação manual**
  - [ ] Aba Conversor funciona
  - [ ] Aba FOMENTAR funciona
  - [ ] Aba ProGoiás funciona
  - [ ] Aba LogPRODUZIR funciona
  - Status: PENDENTE

### **FASE 4: TESTES AUTOMATIZADOS** 🧪

- [ ] **4.1 Criar estrutura de testes**
  ```
  tests/
  ├── e2e/
  │   ├── navigation.spec.js
  │   ├── converter.spec.js
  │   ├── fomentar.spec.js
  │   ├── progoias.spec.js
  │   └── logproduzir.spec.js
  └── fixtures/
      └── sped-test.txt
  ```
  - Status: PENDENTE

- [ ] **4.2 Implementar teste de navegação**
  - Verificar troca entre abas
  - Confirmar elementos visíveis
  - Status: PENDENTE

- [ ] **4.3 Implementar teste do Conversor**
  - Upload do arquivo SPED
  - Conversão para Excel
  - Download do resultado
  - Status: PENDENTE

- [ ] **4.4 Implementar teste FOMENTAR**
  - Importar SPED
  - Calcular apuração
  - Exportar demonstrativo
  - Status: PENDENTE

- [ ] **4.5 Implementar teste ProGoiás**
  - Importar SPED
  - Configurar parâmetros
  - Calcular benefício
  - Status: PENDENTE

- [ ] **4.6 Implementar teste LogPRODUZIR**
  - Importar SPED
  - Processar fretes
  - Calcular incentivos
  - Status: PENDENTE

### **FASE 5: VALIDAÇÃO FINAL** ✔️

- [ ] **5.1 Executar todos os testes**
  ```bash
  npm test
  ```
  - Status: PENDENTE

- [ ] **5.2 Corrigir falhas identificadas**
  - Listar problemas encontrados
  - Implementar correções
  - Status: PENDENTE

- [ ] **5.3 Teste manual completo**
  - [ ] Login no sistema
  - [ ] Upload arquivo SPED real
  - [ ] Navegar por todas as abas
  - [ ] Executar cálculo em cada módulo
  - [ ] Exportar relatórios
  - Status: PENDENTE

- [ ] **5.4 Documentar no CHANGELOG**
  - Adicionar entrada com data
  - Descrever correções realizadas
  - Status: PENDENTE

## 📊 Progresso Geral

- **Total de tarefas**: 26
- **Concluídas**: 22
- **Em andamento**: 1
- **Pendentes**: 3
- **Progresso**: 85%

## 🐛 Problemas Encontrados

### Problema 1: [A ser preenchido]
- **Descrição**: 
- **Solução**: 
- **Status**: 

### Problema 2: [A ser preenchido]
- **Descrição**: 
- **Solução**: 
- **Status**: 

## 📝 Notas de Implementação

- Manter backup antes de cada alteração crítica
- Testar incrementalmente após cada correção
- Documentar qualquer comportamento inesperado
- Usar o arquivo SPED real fornecido para todos os testes

## 🎯 Critérios de Sucesso

✅ Sistema navega corretamente entre todas as abas
✅ Arquivo SPED é processado sem erros
✅ Todos os cálculos fiscais funcionam
✅ Exportações (Excel, PDF) são geradas corretamente
✅ Testes automatizados passam com 100% de sucesso

---

**Última atualização**: 2025-08-24
**Responsável**: Sistema de Correção Automatizada