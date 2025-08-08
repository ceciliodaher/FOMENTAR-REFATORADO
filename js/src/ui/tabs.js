export class TabManager {
  constructor() {
    this.currentTab = 'converter';
    this.tabPermissions = {
      converter: true,
      fomentar: true,
      progoias: true,
      logproduzir: true
    };
  }

  switchTab(tabName) {
    // Verificar permissões
    if (!this.tabPermissions[tabName]) {
      console.log(`Acesso negado à aba: ${tabName}`);
      return false;
    }

    // Verificar se a aba está desabilitada
    const targetTab = document.getElementById(`tab${this.capitalizeFirst(tabName)}`);
    if (targetTab && targetTab.classList.contains('disabled')) {
      console.log(`Aba desabilitada: ${tabName}`);
      return false;
    }

    try {
      // Remover classes ativas de todas as abas
      this.deactivateAllTabs();
      
      // Ativar aba selecionada
      this.activateTab(tabName);
      
      // Executar inicialização específica da aba
      this.initializeTab(tabName);
      
      this.currentTab = tabName;
      
      console.log(`Aba ativada: ${tabName}`);
      return true;
      
    } catch (error) {
      console.error(`Erro ao trocar para aba ${tabName}:`, error);
      return false;
    }
  }

  deactivateAllTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));
  }

  activateTab(tabName) {
    const tabButton = document.getElementById(`tab${this.capitalizeFirst(tabName)}`);
    const tabPanel = document.getElementById(`${tabName}Panel`);
    
    if (tabButton) {
      tabButton.classList.add('active');
    } else {
      console.warn(`Botão da aba não encontrado: tab${this.capitalizeFirst(tabName)}`);
    }
    
    if (tabPanel) {
      tabPanel.classList.add('active');
    } else {
      console.warn(`Painel da aba não encontrado: ${tabName}Panel`);
    }
  }

  initializeTab(tabName) {
    switch (tabName) {
      case 'converter':
        this.initializeConverterTab();
        break;
      case 'fomentar':
        this.initializeFomentarTab();
        break;
      case 'progoias':
        this.initializeProgoiasTab();
        break;
      case 'logproduzir':
        this.initializeLogproduzirTab();
        break;
    }
  }

  initializeConverterTab() {
    // Verificar se há arquivo carregado
    const selectedFile = document.getElementById('selectedSpedFile');
    if (selectedFile && selectedFile.textContent.includes('selecionado')) {
      console.log('Converter: Arquivo SPED já carregado');
    } else {
      console.log('Converter: Aguardando arquivo SPED');
    }
  }

  initializeFomentarTab() {
    // Verificar estado dos dados FOMENTAR
    if (window.spedApp && window.spedApp.state.fomentarData) {
      this.updateFomentarStatus('Dados FOMENTAR carregados', 'success');
      this.showFomentarResults();
    } else {
      this.updateFomentarStatus('Nenhum arquivo SPED importado', 'info');
      this.hideFomentarResults();
    }
  }

  initializeProgoiasTab() {
    // Verificar estado dos dados ProGoiás
    if (window.spedApp && window.spedApp.state.progoiasData) {
      this.updateProgoiasStatus('Dados ProGoiás carregados', 'success');
      this.showProgoiasResults();
    } else {
      this.updateProgoiasStatus('Nenhum arquivo SPED importado', 'info');
      this.hideProgoiasResults();
      
      // Mostrar seção de importação baseada no modo atual
      this.updateProgoiasImportMode();
    }
  }

  initializeLogproduzirTab() {
    // Verificar estado dos dados LogPRODUZIR
    if (window.spedApp && window.spedApp.state.logproduzirData) {
      this.updateLogproduzirStatus('Dados LogPRODUZIR carregados', 'success');
      this.showLogproduzirResults();
    } else {
      this.updateLogproduzirStatus('Nenhum arquivo SPED importado', 'info');
      this.hideLogproduzirResults();
    }
  }

  updateFomentarStatus(message, type) {
    const statusElement = document.getElementById('fomentarSpedStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${type}`;
    }
  }

  updateProgoiasStatus(message, type) {
    const statusElement = document.getElementById('progoiasSpedStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${type}`;
    }
  }

  updateLogproduzirStatus(message, type) {
    const statusElement = document.getElementById('logproduzirSpedStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${type}`;
    }
  }

  showFomentarResults() {
    const resultsSection = document.getElementById('fomentarResults');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }

  hideFomentarResults() {
    const resultsSection = document.getElementById('fomentarResults');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  }

  showProgoiasResults() {
    const resultsSection = document.getElementById('progoiasResults');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }

  hideProgoiasResults() {
    const resultsSection = document.getElementById('progoiasResults');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  }

  showLogproduzirResults() {
    const resultsSection = document.getElementById('logproduzirResults');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }

  hideLogproduzirResults() {
    const resultsSection = document.getElementById('logproduzirResults');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  }

  updateProgoiasImportMode() {
    const currentMode = window.spedApp ? window.spedApp.state.progoiasImportMode : 'single';
    
    if (currentMode === 'single') {
      this.showElement('singleImportSectionProgoias');
      this.hideElement('multipleImportSectionProgoias');
      this.showElement('progoiasSingleConfig');
      this.hideElement('progoiasMultipleConfig');
    } else {
      this.hideElement('singleImportSectionProgoias');
      this.showElement('multipleImportSectionProgoias');
      this.hideElement('progoiasSingleConfig');
      this.showElement('progoiasMultipleConfig');
    }
  }

  showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'block';
    }
  }

  hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
    }
  }

  setTabPermission(tabName, allowed) {
    this.tabPermissions[tabName] = allowed;
    
    const tabButton = document.getElementById(`tab${this.capitalizeFirst(tabName)}`);
    if (tabButton) {
      if (allowed) {
        tabButton.classList.remove('disabled');
      } else {
        tabButton.classList.add('disabled');
      }
    }
  }

  disableTab(tabName) {
    this.setTabPermission(tabName, false);
  }

  enableTab(tabName) {
    this.setTabPermission(tabName, true);
  }

  getCurrentTab() {
    return this.currentTab;
  }

  isTabActive(tabName) {
    return this.currentTab === tabName;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Método para atualizar badges/contadores nas abas
  updateTabBadge(tabName, count) {
    const tabButton = document.getElementById(`tab${this.capitalizeFirst(tabName)}`);
    if (tabButton) {
      let badge = tabButton.querySelector('.tab-badge');
      
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tab-badge';
          tabButton.appendChild(badge);
        }
        badge.textContent = count;
        badge.style.display = 'inline';
      } else {
        if (badge) {
          badge.style.display = 'none';
        }
      }
    }
  }

  // Método para mostrar indicador de carregamento na aba
  setTabLoading(tabName, loading) {
    const tabButton = document.getElementById(`tab${this.capitalizeFirst(tabName)}`);
    if (tabButton) {
      if (loading) {
        tabButton.classList.add('loading');
      } else {
        tabButton.classList.remove('loading');
      }
    }
  }
}

export default TabManager;

