<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# SPED Web App 📊

Sistema completo de apuração fiscal digital para programas de incentivo de Goiás (FOMENTAR, ProGoiás, LogPRODUZIR) com conversão SPED para Excel.

## 🎯 **Visão Geral**

O **SPED Web App** é uma aplicação web moderna e modular para processamento de arquivos SPED (Sistema Público de Escrituração Digital) e cálculo automático de incentivos fiscais do Estado de Goiás.

### **Principais Funcionalidades**

- **✅ Conversão SPED → Excel** com análise completa dos registros fiscais
- **📈 Apuração FOMENTAR/PRODUZIR/MICROPRODUZIR** conforme IN 885/07-GSF
- **📊 Apuração ProGoiás** conforme IN 1478/2020 e Decreto 9.724/2020
- **🚛 Apuração LogPRODUZIR** conforme Lei 14.244/2002
- **🔐 Sistema de autenticação** com controle granular de permissões
- **📱 Interface responsiva** com identidade visual Expertzy
- **⚡ Processamento de múltiplos períodos** para análise comparativa


## 🚀 **Início Rápido**

### **1. Instalação**

```bash
# Clone o repositório
git clone https://github.com/expertzy/sped-web-app.git
cd sped-web-app

# Não há dependências de backend - é um projeto frontend puro!
```


### **2. Configuração**

1. **Estrutura de arquivos** (já organizada):
```
sped-web-app/
├── index.html              # Página de redirecionamento
├── sped-web-app.html       # Aplicação principal
├── css/                    # Estilos modulares
│   ├── main.css           # Estilos principais
│   ├── login.css          # Tela de login
│   └── permissions.css    # Sistema de permissões
├── js/                    # Scripts organizados
│   ├── auth.js           # Autenticação
│   ├── permissions.js    # Controle de acesso
│   └── src/              # Arquitetura modular ES6
│       ├── main.js       # Ponto de entrada
│       ├── core/         # Funcionalidades centrais
│       ├── modules/      # Módulos de negócio
│       ├── sped/         # Processamento SPED
│       ├── ui/           # Componentes de interface
│       └── excel/        # Geração de relatórios
└── images/
    └── logo-expertzy.png # Logo da empresa
```


### **3. Execução**

```bash
# Sirva os arquivos via servidor web (necessário para módulos ES6)
# Opção 1: Python
python -m http.server 8000

# Opção 2: Node.js (live-server)
npx live-server

# Opção 3: PHP
php -S localhost:8000

# Acesse: http://localhost:8000
```


## 👤 **Sistema de Autenticação**

### **Usuários Predefinidos**

| Usuário | Senha | Perfil | Descrição |
| :-- | :-- | :-- | :-- |
| `admin` | `admin0000` | Administrador | Acesso completo ao sistema |
| `fomentar.completo` | `fomc123` | FOMENTAR Completo | Todas funcionalidades FOMENTAR |
| `progoias.completo` | `proc123` | ProGoiás Completo | Todas funcionalidades ProGoiás |
| `logproduzir.completo` | `logc123` | LogPRODUZIR Completo | Todas funcionalidades LogPRODUZIR |
| `fomentar.basico` | `fom123` | FOMENTAR Básico | Apenas período único |
| `progoias.basico` | `pro123` | ProGoiás Básico | Apenas período único |
| `conversor` | `conv123` | Conversor | Apenas conversão SPED→Excel |

### **Níveis de Permissão**

- **🔴 Administrador**: Acesso total a todos os módulos
- **🟡 Completo**: Todas funcionalidades do módulo (período único + múltiplos períodos)
- **🟢 Básico**: Funcionalidades essenciais (apenas período único)
- **⚪ Conversor**: Apenas conversão de arquivos


## 📋 **Como Usar**

### **1. Login no Sistema**

- Acesse a aplicação
- Use um dos usuários predefinidos ou configure novos usuários em `js/auth.js`
- O sistema aplicará automaticamente as permissões do seu perfil


### **2. Conversão SPED → Excel**

```
1. Vá para a aba "Conversor"
2. Arraste o arquivo SPED (.txt) ou clique para selecionar
3. Defina o nome do arquivo Excel de saída
4. Clique em "Converter para Excel"
```


### **3. Apuração FOMENTAR**

```
1. Vá para a aba "FOMENTAR"
2. Importe o arquivo SPED
3. Configure: Programa, % Financiamento, ICMS por Média, Saldo Credor
4. Se necessário, corrija códigos de ajuste detectados
5. Exporte o demonstrativo completo
```


### **4. Apuração ProGoiás**

```
1. Vá para a aba "ProGoiás"
2. Importe o arquivo SPED
3. Configure: Tipo Empresa, Ano Fruição, Percentuais
4. Revise cálculos automáticos
5. Exporte relatórios e registros E115
```


### **5. Apuração LogPRODUZIR**

```
1. Vá para a aba "LogPRODUZIR"
2. Importe o arquivo SPED
3. Configure: Categoria, Média Base, IGP-DI
4. Analise fretes interestaduais automaticamente
5. Exporte demonstrativo com economia calculada
```


## 🏗️ **Arquitetura do Sistema**

### **Arquitetura Modular ES6**

```javascript
// Estrutura modular substituiu monólito de ~695k caracteres
js/src/
├── main.js                 // Controlador principal
├── core/
│   ├── constants.js        // Constantes fiscais
│   ├── utils.js           // Utilitários gerais
│   └── logger.js          // Sistema de logging
├── sped/
│   ├── parser.js          // Análise arquivos SPED
│   └── validator.js       // Validação dados fiscais
├── modules/               // Lógica de negócio
│   ├── fomentar/
│   ├── progoias/
│   └── logproduzir/
├── ui/                    // Interface do usuário
└── excel/                 // Geração de relatórios
```


### **Principais Benefícios da Refatoração**

- **📦 Modularidade**: Cada funcionalidade em seu próprio módulo
- **🔧 Manutenibilidade**: Código organizado e fácil de manter
- **⚡ Performance**: Carregamento otimizado apenas do necessário
- **🧪 Testabilidade**: Módulos independentes e testáveis
- **🔄 Escalabilidade**: Fácil adição de novos programas de incentivo


## 🎨 **Identidade Visual Expertzy**

O sistema segue a identidade visual oficial da Expertzy:

### **Paleta de Cores**

- **🔴 Vermelho Expertzy** (`#FF002D`): Energia, Velocidade, Força
- **🔵 Azul Marinho** (`#091A30`): Segurança, Intelecto, Precisão
- **⚪ Branco** (`#FFFFFF`): Respeito, Proteção, Transparência


### **Aplicação no Sistema**

- **Header**: Gradiente azul marinho Expertzy
- **Botões principais**: Azul marinho para ações primárias
- **Alertas e CTAs**: Vermelho Expertzy para destaques
- **Logo**: Integrado harmoniosamente no header


## ⚙️ **Configuração Avançada**

### **Adicionando Novos Usuários**

```javascript
// Em js/auth.js - USERS_DATABASE
'novo.usuario': {
    password: 'senha123',
    profile: 'fomentarCompleto',
    name: 'João Silva',
    description: 'Contador - FOMENTAR'
}
```


### **Configurando Permissões**

```javascript
// Em js/permissions.js - USER_PERMISSIONS
novoProfile: {
    tabs: {
        converter: false,
        fomentar: true,
        progoias: false,
        logproduzir: false
    },
    fomentar: {
        periodoUnico: true,
        multiplosPeriodos: false,
        exportar: true
    }
}
```


### **Personalizando CFOPs**

```javascript
// Em js/src/core/constants.js
export const CFOP_FOMENTAR_INCENTIVADOS = [
    '5101', '5102', '5103', // Adicione CFOPs específicos
    '6101', '6102', '6103'  // conforme necessidade
];
```


## 📊 **Funcionalidades Técnicas**

### **Processamento SPED**

- ✅ **Auto-detecção** de encoding (UTF-8, ISO-8859-1)
- ✅ **Validação** completa de registros fiscais
- ✅ **Análise automática** de operações por CFOP/CST
- ✅ **Classificação inteligente** de operações incentivadas
- ✅ **Correção assistida** de códigos de ajuste


### **Cálculos Fiscais**

- ✅ **FOMENTAR**: Quadros A, B e C com 70% de financiamento
- ✅ **ProGoiás**: Cálculo por ano de fruição (64%-74%)
- ✅ **LogPRODUZIR**: Categorias I/II/III com análise de fretes
- ✅ **Múltiplos períodos**: Análise comparativa automática
- ✅ **Saldo credor**: Carregamento automático entre períodos


### **Relatórios e Exportação**

- ✅ **Excel profissional** com formatação completa
- ✅ **Memória de cálculo** detalhada por período
- ✅ **Registros E115** prontos para SPED
- ✅ **Confronto E115** para validação cruzada
- ✅ **Relatórios comparativos** multi-período


## 🛠️ **Desenvolvimento**

### **Tecnologias Utilizadas**

- **Frontend**: HTML5, CSS3 (Variáveis CSS), JavaScript ES6+
- **Bibliotecas**: xlsx-populate (geração Excel), Font Awesome (ícones)
- **Framework CSS**: Bootstrap 5.3 (componentes)
- **Arquitetura**: Módulos ES6, Sistema de Events, MVC Pattern


### **Estrutura de Desenvolvimento**

```bash
# Desenvolvimento ativo
git checkout development

# Funcionalidades
git checkout feature/nova-funcionalidade

# Testes
npm test  # (configurar conforme necessidade)

# Build de produção  
git checkout main
```


### **Padrões de Código**

- **ES6+**: Uso de módulos, async/await, destructuring
- **Nomenclatura**: camelCase para JS, kebab-case para CSS
- **Organização**: Um módulo por funcionalidade fiscal
- **Documentação**: JSDoc para funções complexas


## 🐛 **Troubleshooting**

### **Problemas Comuns**

**❓ Erro de CORS/Módulos ES6**

```bash
# Solução: Servir via HTTP (não file://)
python -m http.server 8000
# Acesse: http://localhost:8000
```

**❓ Arquivo SPED não é reconhecido**

```
- Verifique se é arquivo .txt
- Confirme encoding (UTF-8 ou ISO-8859-1)  
- Valide formato de registros SPED
```

**❓ Login não funciona**

```
- Use usuários predefinidos da tabela
- Verifique localStorage do navegador
- Limpe cache se necessário
```

**❓ Permissões não aplicam**

```
- Aguarde carregamento completo da página
- Verifique console para erros JavaScript
- Confirme perfil do usuário logado
```


## 📈 **Changelog**

### **v2.0.0** - Refatoração Completa *(Atual)*

- 🔥 **BREAKING**: Arquitetura modular completa
- ✨ **NEW**: Sistema de autenticação e permissões
- ✨ **NEW**: Identidade visual Expertzy
- ✨ **NEW**: Suporte a LogPRODUZIR
- ⚡ **IMPROVED**: Performance e manutenibilidade
- 🐛 **FIXED**: Múltiplos bugs do sistema monolítico


### **v1.x** - Sistema Monolítico *(Legado)*

- 📄 Script único de ~695k caracteres
- ⚠️ Difícil manutenção e escalabilidade
- 🔧 Funcionalidades FOMENTAR e ProGoiás


## 🤝 **Contribuição**

### **Como Contribuir**

1. **Fork** o repositório
2. **Crie** branch para sua funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. **Push** para branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** Pull Request

### **Diretrizes**

- ✅ Mantenha arquitetura modular ES6
- ✅ Siga padrões de nomenclatura existentes
- ✅ Adicione testes para novas funcionalidades
- ✅ Documente mudanças no código
- ✅ Respeite identidade visual Expertzy


## 📄 **Licença**

Copyright © 2024 **Expertzy**. Todos os direitos reservados.

Este software é proprietário e confidencial. Não é permitida reprodução, distribuição ou modificação sem autorização expressa da Expertzy.

## 📞 **Suporte**

### **Contato Técnico**

- 🌐 **Website**: [www.expertzy.com.br](https://www.expertzy.com.br)
- 📧 **Email**: suporte@expertzy.com.br
- 📱 **WhatsApp**: (62) 99999-9999
- 📍 **Endereço**: Anápolis, GO - Brasil


### **Documentação Adicional**

- 📖 [Manual do Usuário](docs/manual-usuario.pdf)
- 📋 [Especificações SPED](docs/sped-specs.md)
- ⚖️ [Legislação Fiscal GO](docs/legislacao-go.md)
- 🔧 [API Reference](docs/api-reference.md)

<div align="center">

**Desenvolvido com ❤️ pela equipe Expertzy**

*Sistema de Apuração Fiscal Digital - Versão 2.0*


</div>
<div style="text-align: center">⁂</div>

[^1]: script.js

[^2]: sped-web-fomentar.html

[^3]: auth.js

[^4]: permissions.js

[^5]: Pages-from-Apresentacao-Conceitual-Expertzy.pdf

[^6]: https://dev.to/lanars_inc/web-application-architecture-best-practices-and-guides-35ek

[^7]: https://crowdbotics.com/posts/blog/best-practices-for-building-a-modularized-app/

[^8]: https://www.progress.com/blogs/web-application-development-best-practices-with-progress-openedge

[^9]: https://dev.to/siddhant_teotia/building-scalable-web-applications-best-practices-for-web-developers-al0

[^10]: https://www.sencha.com/blog/micro-frontends-the-new-approach-to-modular-web-app-development/

[^11]: https://www.freecodecamp.org/news/how-to-build-scalable-access-control-for-your-web-app/

[^12]: https://moldstud.com/articles/p-mastering-modular-css-best-practices-for-front-end-developers

[^13]: https://brandcolors.net

[^14]: https://blog.narima.id/best-practices-of-building-scalable-web-applications/

[^15]: https://www.youtube.com/watch?v=HHuiV841g_w

[^16]: https://snipcart.com/blog/organize-css-modular-architecture

[^17]: https://webzoneexpertz.com.au/brand-identity/

[^18]: https://asperbrothers.com/blog/web-application-architecture/

[^19]: https://dev.to/wasp/permissions-access-control-in-web-apps-j6b

[^20]: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Organizing

[^21]: https://digitalexpertz.com/branding/

[^22]: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-web-app-role-based-access-control?toc=%2Fentra%2Fexternal-id%2Ftoc.json\&bc=%2Fentra%2Fexternal-id%2Fbreadcrumb%2Ftoc.json

[^23]: https://www.dhiwise.com/post/how-to-structure-and-organize-react-css-modules

[^24]: https://expertzy.com.br

[^25]: https://www.honeybadger.io/blog/javascript-authentication-guide/

