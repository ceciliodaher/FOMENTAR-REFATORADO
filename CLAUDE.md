# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a frontend-only web application for fiscal calculation and SPED (Digital Public Bookkeeping System) file processing for Goiás state tax incentive programs (FOMENTAR, ProGoiás, LogPRODUZIR). The application was refactored from a monolithic ~695k character script into a modular ES6 architecture.

## Development Commands

Since this is a frontend-only project with no package.json, use a static web server for development:

```bash
# Python (most common)
python -m http.server 8000

# Node.js (if available)
npx live-server

# PHP
php -S localhost:8000

# Access at http://localhost:8000
```

**Important**: The application MUST be served via HTTP (not file://) due to ES6 module restrictions.

## Architecture

### Modular ES6 Structure

The application uses a clean modular architecture with ES6 imports/exports:

```
js/src/
├── main.js                 # Main application controller (SpedWebApp class)
├── core/                   # Core utilities and constants
│   ├── constants.js        # Tax constants, CFOPs, adjustment codes
│   ├── utils.js           # Shared utility functions
│   └── logger.js          # Logging system with UI integration
├── sped/                  # SPED file processing
│   ├── parser.js          # SPED file parsing and validation
│   └── validator.js       # Business rule validation
├── modules/               # Tax calculation modules
│   ├── fomentar/          # FOMENTAR/PRODUZIR/MICROPRODUZIR
│   ├── progoias/          # ProGoiás program
│   └── logproduzir/       # LogPRODUZIR program
├── ui/                    # User interface management
│   ├── events.js          # Event handling
│   ├── tabs.js            # Tab navigation
│   └── dragdrop.js        # File drag & drop
└── excel/                 # Excel report generation
    └── generator.js       # Excel workbook creation
```

### Authentication System

- **File**: `js/auth.js` - Complete authentication with predefined user profiles
- **Users**: Hardcoded user database with roles (admin, fomentarCompleto, progoiasBasico, etc.)
- **Session**: 4-hour timeout with localStorage persistence
- **Permissions**: Granular access control via `js/permissions.js`

### Key Classes

1. **SpedWebApp** (`js/src/main.js`) - Main application controller
2. **SpedParser** (`js/src/sped/parser.js`) - SPED file processing with encoding detection
3. **Tax Calculators** - Separate calculators for each program (FOMENTAR, ProGoiás, LogPRODUZIR)
4. **ExcelGenerator** (`js/src/excel/generator.js`) - Professional Excel report generation

## Tax Programs

### FOMENTAR/PRODUZIR/MICROPRODUZIR
- 70% financing percentage default
- Quadro A, B, and C calculations
- CFOP-based operation classification
- Adjustment code validation (E111 records)

### ProGoiás  
- Year-based calculation (74% → 62% declining)
- E115 record generation
- Automatic percentage calculation by fruition year

### LogPRODUZIR
- Category I/II/III with different percentages (50%/73%/80%)
- Interstate freight analysis
- IGP-DI index correction

## File Processing

The application handles:
- **Input**: SPED .txt files with automatic encoding detection (UTF-8/ISO-8859-1)
- **Processing**: Parse fiscal records (C190, C590, D190, D590, E110, E111)
- **Output**: Professional Excel reports with calculations and legal compliance

## Important Constants

Key fiscal constants are defined in `js/src/core/constants.js`:
- `CFOP_ENTRADAS_INCENTIVADAS` / `CFOP_SAIDAS_INCENTIVADAS` - Incentivized operation CFOPs
- `CODIGOS_AJUSTE_INCENTIVADOS` - Valid tax adjustment codes
- `PROGOIAS_CONFIG` - ProGoiás percentage configuration by year
- `SPED_LAYOUTS` - SPED record field layouts

## Authentication

Default test users (defined in `js/auth.js`):
- `admin / admin0000` - Full system access
- `fomentar.completo / fomc123` - All FOMENTAR features
- `progoias.completo / proc123` - All ProGoiás features  
- `logproduzir.completo / logc123` - All LogPRODUZIR features
- `conversor / conv123` - SPED to Excel conversion only

## UI Components

- **Bootstrap 5.3** for responsive design
- **Font Awesome 6.4** for icons
- **xlsx-populate** for Excel generation
- Custom CSS with Expertzy branding (blue/red color scheme)

## Key Files to Understand

1. `sped-web-app.html` - Main application UI and HTML structure
2. `js/src/main.js` - Application logic and state management  
3. `js/auth.js` - Authentication system
4. `js/src/core/constants.js` - All tax constants and CFOPs
5. `css/main.css` - Primary styling and layout

## Development Notes

- No build process required - direct ES6 modules
- Must be served over HTTP for module imports to work
- Extensive logging system available via Logger class
- State management handled by SpedWebApp.state object
- Real-time UI updates via event-driven architecture

## Important Coding Rules

### ⚠️ NEVER Use Fallbacks
- **NUNCA** use fallbacks que silenciosamente pulam etapas do fluxo
- **SEMPRE** lance exceções explícitas quando componentes obrigatórios não estão disponíveis
- **PROIBIDO** usar padrões como `if (!component) { return; }` ou `if (!component) { proceedToNextStep(); }`
- **OBRIGATÓRIO** falhar com mensagem de erro clara: `throw new Error('Component X não disponível - obrigatório para o fluxo')`
- **EVITE** duplicação de lógica entre módulos (ex: WorkflowOrchestrator vs CorrectionInterface)

## Debugging

Use browser dev tools and the built-in log window. The application provides extensive logging through the Logger class, with both console and UI output available.

## Nomenclatura e IDs - Problemas Identificados

### ⚠️ Inconsistências Críticas na Interface de Correções

**PROBLEMA**: JavaScript procura elementos HTML que NÃO existem devido a nomenclatura inconsistente.

#### C197/D197 Interface:
- **HTML correto**: `codigoCorrecaoSectionC197D197` (sped-web-fomentar.html)
- **JS atual**: Busca elementos `select[name="acao_${index}"]` ✅
- **JS antigo**: Procura `input[name="c197d197_${index}"]:checked` ❌

#### E111 Interface:
- **HTML correto**: `codigoCorrecaoSection` (sped-web-fomentar.html) 
- **JS atual**: Busca elementos `select[name="acao_e111_${index}"]` ✅

#### CFOPs Genéricos:
- **HTML correto**: `cfopGenericoSection` (sped-web-fomentar.html)
- **JS atual**: Interface implementada corretamente ✅

### Padrão de Nomenclatura Adotado
- **Seções**: `{tipoCorrecao}Section` (sem prefixo de programa)
- **Formulários**: `select[name="acao_{tipo}_{index}"]` para ações
- **Inputs**: `input[name="novoCodigo_{tipo}_{index}"]` para novos códigos
- **Botões**: `btnAplicar{TipoCorrecao}` e `btnPular{TipoCorrecao}`

### Precedência de Arquivos
1. **sped-web-fomentar.html** - Define IDs HTML (precedência máxima)
2. **corrections.js** - Interface de correções (deve seguir HTML)
3. **main.js** - Controlador principal (integrações)

## Decisão de Arquitetura - HTML Principal

**DECISÃO**: Utilizar `sped-web-fomentar.html` como arquivo HTML principal ao invés de `sped-web-app.html`.

**MOTIVO**: O HTML legado (`sped-web-fomentar.html`) possui estrutura completa com:
- Todas as seções de correção (CFOPs genéricos, C197/D197, E111)
- IDs de botões já definidos e funcionais
- Layout mais robusto e testado
- Interfaces de workflow já implementadas

**AÇÃO REALIZADA**:
- Sistema ES6 modular será adaptado para funcionar com este HTML
- `index.html` corrigido para redirecionar para `sped-web-fomentar.html`
- `sped-web-app.html` será descontinuado
- Arquitetura ES6 mantida, apenas adaptada aos IDs existentes