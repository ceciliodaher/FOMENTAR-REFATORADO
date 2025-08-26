<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Plano de Refatoração Detalhado - Sistema FOMENTAR

## Resumo Executivo

O arquivo script.js (13.798 linhas) contém 408 funções que precisam ser migradas para a arquitetura modular ES6 em js/src/. A análise identifica:

- Arquitetura ES6 estabelecida com 25+ módulos organizados por responsabilidade.
- Funções duplicadas já presentes em módulos modernos.
- Cerca de 150 funções únicas restantes no monólito.
- Necessidade de migração estratégica focada em funções críticas não duplicadas.

Benefícios da migração completa incluem maior manutenibilidade, testabilidade, performance e escalabilidade. Estimativa: 40-50 funções críticas para priorização.

## Classificação de Funções por Módulo/Propósito

### Interface \& UI (35 funções)

- Maioria migrada para /ui/ (ex.: updateStatus(), showError() para UIManager; addLog() para Logger; switchTab() para TabManager; handlers de drag \& drop para DragDropManager).
- Funções únicas restantes: highlightFomentarZone(), unhighlightFomentarZone(), handleFomentarDragEnter/Over/Leave/Drop(); highlightProgoisZone(), unhighlightProgoisZone().


### Processamento SPED (15 funções)

- Migrada para /sped/ (ex.: lerArquivoSpedCompleto() para SpedParser; processarSpedParaExcel() para SpedProcessor; isLinhaValida() para SpedValidator).
- Funções únicas restantes: detectAndRead() (detecção de encoding); lerArquivoSpedParaHeader() (parsing otimizado de header).


### FOMENTAR (45 funções)

- Parcialmente migrada para /modules/fomentar/ (ex.: calculateFomentar() para FomentarCalculator; classifyOperations() para FomentarCalculator; exportFomentarReport() para FomentarExporter).
- Funções críticas restantes: analisarCodigosE111(), processarRegistroE111(); analisarCodigosC197D197(), processarRegistrosC197D197(); verificarExistenciaCfopsGenericos(), detectarCfopsGenericosIndividuais(); continuarCalculoFomentar(), aplicarCorrecoesECalcular(); generateRegistroE115(), extractE115FromSped(), confrontarE115().


### ProGoiás (35 funções)

- Parcialmente migrada para /modules/progoias/ (ex.: calculateProgoias() para ProgoiasCalculator; exportProgoisReport() para ProgoiasExporter).
- Funções críticas restantes: analisarCodigosE111Progoias(), processarRegistroE111Progoias(); analisarCodigosC197D197Progoias(), processarRegistrosC197D197Progoias(); verificarExistenciaCfopsGenericosProgoias(); calculateProgoisWithFruitionYear(), calculateProgoisFruitionYear(); gerarRegistroE115ProGoias(), exportConfrontoE115ProgoiasExcel().


### LogPRODUZIR (20 funções)

- Bem migrada para /modules/logproduzir/ (ex.: calculateLogproduzir() para LogproduzirCalculator; processarFretesLogproduzir() para LogproduzirCalculator; exportLogproduzirReport() para LogproduzirExporter).
- Funções restantes: handleLogproduzirConfigChange(), atualizarInterfaceLogproduzir(); handlers de drag \& drop específicos.


### Múltiplos Períodos (25 funções)

- Migrada para /modules/multiperiod.js (ex.: processMultipleSpeds() para MultiPeriodManager; calculateMultiPeriodFomentar() para MultiPeriodManager).
- Funções específicas restantes: handleMultipleSpedSelection(), removeFile(); applyAutomaticSaldoCredorCarryover(); showMultiPeriodResults(), selectPeriod().


### Excel \& Exportação (30 funções)

- Migrada para /excel/generator.js (ex.: gerarExcel() para ExcelGenerator; _processarRegistros(), _criarAbaConsolidada() para métodos de ExcelGenerator).
- Funções específicas restantes: exportMemoriaCalculoAuditoria(), gerarMemoriaCalculoDetalhada(); createComparativeExcelHeader(), formatComparativeSheet().


### Validação \& Confrontação (15 funções)

- Migrada para /validation/ (ex.: geração E115 para E115Generator; confrontação para ValidationManager).


## Funções Críticas Não Migradas

### Prioridade Alta (Funcionalidade Core)

- Correção E111 (8 funções): analisarCodigosE111(), processarRegistroE111(), aplicarCorrecoesECalcular() (e variantes ProGoiás).
- Correção C197/D197 (10 funções): analisarCodigosC197D197(), processarRegistrosC197D197(), aplicarCorrecoesC197D197ECalcular() (e variantes ProGoiás).
- CFOPs Genéricos (8 funções): verificarExistenciaCfopsGenericos(), detectarCfopsGenericosIndividuais(), mostrarInterfaceCfopsGenericosIndividuais() (e variantes ProGoiás).
- Geração E115 (6 funções): generateRegistroE115(), gerarRegistroE115ProGoias(), extractE115FromSped(), confrontarE115(), exportConfrontoE115Excel().


### Prioridade Média (Interface \& UX)

- Fluxo de Conversão (8 funções): iniciarConversao(), validarEntrada(), continuarCalculoFomentar(), processSpedFile(), detectAndRead().
- Interface Específica por Módulo (15 funções): handlers de drag \& drop específicos, handleConfigChange(), highlight zones específicas.


### Prioridade Baixa (Utilitários \& Reports)

- Memória de Cálculo (12 funções): gerarMemoriaCalculoDetalhada(), exportMemoriaCalculoAuditoria(), seções de auditoria.
- Relatórios Avançados (10 funções): PDF exports específicos, formatação comparativa, validação detalhada.


## Análise dos Conversores Existentes

### Conversor sped-web/script.js (JavaScript - Aprovado)

- Fluxo: iniciarConversao() → processarSpedParaExcel() → lerArquivoSpedCompleto() → gerarExcel().
- Arquitetura: Funcional com XlsxPopulate.
- Funcionalidades: Drag \& drop, detecção de encoding, progress bar, múltiplas abas Excel (C190, C590, D190, D590, E110, E111, Consolidada), logs integrados.


### Conversor Python v23 (Aprovado)

- Fluxo: converter() → processar_sped_para_excel() → ler_arquivo_sped() → gerar_excel().
- Arquitetura: OOP com Tkinter + Pandas.
- Funcionalidades: Detecção de encoding com chardet, validação de linha SPED, threading para UI responsiva, logging estruturado, tratamento de erros robusto.


## Estratégia Revisada

Princípio: Não reinventar a roda. Usar sped-web/script.js como base para o módulo conversor, adaptando para ES6 modular, integrando StateManager para eliminar variáveis globais e mantendo o fluxo aprovado.

## Padronização de Nomenclatura e Arquitetura

### Convenções de Nomenclatura

| Tipo | Convenção | Exemplo | Uso |
| :-- | :-- | :-- | :-- |
| Constantes Globais | SCREAMING_SNAKE_CASE | CFOP_ENTRADAS_INCENTIVADAS | Constants exportadas |
| Classes | PascalCase | SpedProcessor, FomentarCalculator | Classes ES6 |
| Métodos | camelCase | calculateFomentar(), processSpedFile() | Métodos de classe |
| Variáveis Estado | camelCase com prefixo | fomentarData, progoiasData | Estado do módulo |
| Arquivos | kebab-case | excel-generator.js, sped-parser.js | Nomes de arquivo |
| Módulos | camelCase | import spedParser from | Imports/exports |

### Estrutura de Estado Centralizada

Classe StateManager em js/src/core/state-manager.js gerencia estado global e por módulo (sped, fomentar, progoias, logproduzir).

### Tabela de Mapeamento de Variáveis/Constantes

| Variável Original (script.js) | Novo Nome | Módulo Destino | Tipo |
| :-- | :-- | :-- | :-- |
| spedFile | state.sped.file | StateManager | File |
| spedFileContent | state.sped.content | StateManager | String |
| sharedNomeEmpresa | state.sped.headerInfo.nomeEmpresa | StateManager | String |
| sharedPeriodo | state.sped.headerInfo.periodo | StateManager | String |
| registrosCompletos | state.sped.registrosCompletos | StateManager | Object |
| fomentarData | state.fomentar.data | StateManager | Object |
| progoiasData | state.progoias.data | StateManager | Object |
| logproduzirData | state.logproduzir.data | StateManager | Object |
| codigosCorrecao | state.fomentar.corrections.e111 | StateManager | Object |
| codigosCorrecaoC197D197 | state.fomentar.corrections.c197d197 | StateManager | Object |
| cfopsGenericosConfig | state.fomentar.corrections.cfopsGenericos | StateManager | Object |
| multiPeriodData | state.fomentar.multiPeriod | StateManager | Array |
| progoiasMultiPeriodData | state.progoias.multiPeriod | StateManager | Array |
| logproduzirMultiPeriodData | state.logproduzir.multiPeriod | StateManager | Array |

### Tabela de Mapeamento de Funções

| Função | Módulo Origem | Módulo(s) Consumidor(es) | Dependências |
| :-- | :-- | :-- | :-- |
| detectAndRead() | SpedParser | SpedWebApp, todos módulos | TextDecoder |
| lerArquivoSpedCompleto() | SpedParser | SpedProcessor, FomentarCalculator | - |
| extrairInformacoesHeader() | SpedParser | SpedWebApp, ExcelGenerator | registrosCompletos |
| iniciarConversao() | SpedWebApp | UI (botão converter) | UIManager, UIValidator |
| converter() | script.js | SpedWebApp | processarSpedParaExcel |
| processarSpedParaExcel() | script.js | SpedWebApp | lerArquivoSpedCompleto, gerarExcel |
| gerarExcel() | script.js | ExcelGenerator | XLSXPopulate |
| calculateFomentar() | FomentarCalculator | SpedWebApp | registrosCompletos, constants |
| analisarCodigosE111() | script.js | FomentarCorrections | registrosCompletos |
| generateRegistroE115() | script.js | E115Generator | fomentarData |

## Arquitetura Alvo

- js/src/core/workflow.js: Orquestração principal.
- js/src/ui/interface.js: Interface unificada.
- js/src/modules/**/calculator.js: Lógica de negócio.
- js/src/modules/**/exporter.js: Exportações.
- js/src/validation/e115.js: Geração E115 integrada.
- js/src/validation/confronto.js: Validação unificada.


## Plano de Migração Estratégico

### Metodologia

- Análise módulo a módulo para identificar funções faltantes.
- Migração incremental com testes Playwright.
- Aprovação por etapa antes de prosseguir.


### Fases

1. **Core Business Logic**: Migrar correções E111/C197D197, gestão CFOPs genéricos, geração E115 integrada.
2. **Interface \& Fluxos**: Modernizar iniciarConversao(), integrar drag \& drop, consolidar event handlers.
3. **Reports \& Advanced Features**: Migrar memória de cálculo, implementar relatórios avançados, otimizar exports.

### Estratégia Incremental

- Etapa 1: Infraestrutura (criar StateManager, atualizar constants.js, configurar ESLint).
- Etapa 2: Conversor SPED (migrar funções faltantes, integrar StateManager, testes).
- Etapa 3: FOMENTAR (criar submódulos para correções e E115, migrar com padronização).
- Etapa 4: ProGoiás (herdar de FOMENTAR, adicionar específicas).
- Etapa 5: LogPRODUZIR (ajustes menores).
- Etapa 6: Limpeza (remover duplicados, atualizar documentação).


### Implementação Modular para Conversor

Classe SpedConverter em /js/src/modules/converter/sped-converter.js, baseada em sped-web/script.js, com métodos como executeConversion(), processSpedForExcel(), readCompleteSpedFile(), generateExcel().

### Regras de Governança

- Imports/Exports: Named para utilitários, default para classes principais.
- Estado: Sempre via StateManager, sem variáveis globais.
- Nomenclatura de Eventos: Padrão módulo:ação.


## Cronograma Estimado

| Fase | Módulo | Estimativa | Status |
| :-- | :-- | :-- | :-- |
| 1 | Conversor SPED | 2-3 horas | Em andamento |
| 2 | FOMENTAR | 4-5 horas | Pendente |
| 3 | ProGoiás | 3-4 horas | Pendente |
| 4 | LogPRODUZIR | 1-2 horas | Pendente |
| 5 | Limpeza | 2-3 horas | Pendente |

Total estimado: 12-17 horas.

## Critérios de Aceitação e Métricas de Sucesso

- Funcionalidade idêntica ao original, Excel com abas esperadas, logs e progress bar funcionando, StateManager gerenciando estado.
- Redução de script.js para <1.000 linhas, 0 funções duplicadas, 100% aderência a convenções, 100% cobertura de testes, tempo de carregamento <2s.


## Próximos Passos Imediatos

1. Criar /js/src/modules/converter/sped-converter.js.
2. Migrar funções de sped-web/script.js mantendo lógica.
3. Adaptar para ES6 + StateManager.
4. Testar com arquivo SPED real (SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt).
5. Validar Excel gerado vs. original.
6. Aguardar aprovação antes de prosseguir.
<span style="display:none">[^1]</span>

<div style="text-align: center">⁂</div>

[^1]: Orquestracao.md

