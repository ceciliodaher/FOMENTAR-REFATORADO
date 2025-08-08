import { TabManager } from './tabs.js';
import { DragDropManager } from './dragdrop.js';

export class EventManager {
  constructor(spedApp) {
    this.spedApp = spedApp;
    this.tabManager = new TabManager();
    this.dragDropManager = new DragDropManager(spedApp);
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    this.setupTabEvents();
    this.setupDragDropEvents();
    this.setupButtonEvents();
    this.setupConfigurationEvents();
    this.setupFileEvents();
    this.setupFormEvents();
    
    this.initialized = true;
    this.spedApp.logger.info('EventManager inicializado com sucesso');
  }

  setupTabEvents() {
    // Tab navigation
    document.getElementById('tabConverter')?.addEventListener('click', () => 
      this.tabManager.switchTab('converter'));
    document.getElementById('tabFomentar')?.addEventListener('click', () => 
      this.tabManager.switchTab('fomentar'));
    document.getElementById('tabProgoias')?.addEventListener('click', () => 
      this.tabManager.switchTab('progoias'));
    document.getElementById('tabLogproduzir')?.addEventListener('click', () => 
      this.tabManager.switchTab('logproduzir'));
  }

  setupDragDropEvents() {
    // Configurar drag & drop para todas as áreas
    this.dragDropManager.setupConverterDropZone();
    this.dragDropManager.setupFomentarDropZone();
    this.dragDropManager.setupProgoiasDropZone();
    this.dragDropManager.setupLogproduzirDropZone();
    this.dragDropManager.setupMultipleDropZones();
  }

  setupButtonEvents() {
    // Converter buttons
    document.getElementById('convertButton')?.addEventListener('click', () => 
      this.handleConvert());

    // FOMENTAR buttons
    document.getElementById('importSpedFomentar')?.addEventListener('click', () => 
      this.handleFomentarImport());
    document.getElementById('exportFomentar')?.addEventListener('click', () => 
      this.handleFomentarExport());
    document.getElementById('exportFomentarMemoria')?.addEventListener('click', () => 
      this.handleFomentarMemoriaExport());
    document.getElementById('printFomentar')?.addEventListener('click', () => 
      this.handleFomentarPrint());

    // E115 buttons
    document.getElementById('exportE115')?.addEventListener('click', () => 
      this.handleE115Export());
    document.getElementById('exportConfrontoE115')?.addEventListener('click', () => 
      this.handleConfrontoE115Export());

    // ProGoiás buttons
    document.getElementById('importSpedProgoias')?.addEventListener('click', () => 
      this.handleProgoiasImport());
    document.getElementById('exportProgoias')?.addEventListener('click', () => 
      this.handleProgoiasExport());
    document.getElementById('exportProgoisMemoria')?.addEventListener('click', () => 
      this.handleProgoiasMemoriaExport());
    document.getElementById('exportE115Progoias')?.addEventListener('click', () => 
      this.handleE115ProgoiasExport());
    document.getElementById('printProgoias')?.addEventListener('click', () => 
      this.handleProgoiasPrint());

    // LogPRODUZIR buttons
    document.getElementById('importSpedLogproduzir')?.addEventListener('click', () => 
      this.handleLogproduzirImport());
    document.getElementById('exportLogproduzir')?.addEventListener('click', () => 
      this.handleLogproduzirExport());
    document.getElementById('exportLogproduzirMemoria')?.addEventListener('click', () => 
      this.handleLogproduzirMemoriaExport());
    document.getElementById('exportLogproduzirE115')?.addEventListener('click', () => 
      this.handleLogproduzirE115Export());
    document.getElementById('printLogproduzir')?.addEventListener('click', () => 
      this.handleLogproduzirPrint());

    // Processing buttons
    document.getElementById('processLogproduzirData')?.addEventListener('click', () => 
      this.handleLogproduzirProcess());
    document.getElementById('processProgoisData')?.addEventListener('click', () => 
      this.handleProgoiasProcess());
  }

  setupConfigurationEvents() {
    // FOMENTAR configuration
    document.getElementById('programType')?.addEventListener('change', 
      () => this.handleFomentarConfigChange());
    document.getElementById('percentualFinanciamento')?.addEventListener('input', 
      () => this.handleFomentarConfigChange());
    document.getElementById('icmsPorMedia')?.addEventListener('input', 
      () => this.handleFomentarConfigChange());
    document.getElementById('saldoCredorAnterior')?.addEventListener('input', 
      () => this.handleFomentarConfigChange());

    // ProGoiás configuration
    document.getElementById('progoiasTipoEmpresa')?.addEventListener('change', 
      () => this.handleProgoiasConfigChange());
    document.getElementById('progoiasOpcaoCalculo')?.addEventListener('change', 
      () => this.handleProgoiasOpcaoCalculoChange());
    document.getElementById('progoiasAnoFruicao')?.addEventListener('change', 
      () => this.handleProgoiasConfigChange());
    document.getElementById('progoiasPercentualManual')?.addEventListener('input', 
      () => this.handleProgoiasConfigChange());
    document.getElementById('progoiasIcmsPorMedia')?.addEventListener('input', 
      () => this.handleProgoiasConfigChange());
    document.getElementById('progoiasSaldoCredorAnterior')?.addEventListener('input', 
      () => this.handleProgoiasConfigChange());

    // LogPRODUZIR configuration
    document.getElementById('logproduzirCategoria')?.addEventListener('change', 
      () => this.handleLogproduzirConfigChange());
    document.getElementById('logproduzirMediaBase')?.addEventListener('input', 
      () => this.handleLogproduzirConfigChange());
    document.getElementById('logproduzirIgpDi')?.addEventListener('input', 
      () => this.handleLogproduzirConfigChange());
    document.getElementById('logproduzirSaldoCredorAnterior')?.addEventListener('input', 
      () => this.handleLogproduzirConfigChange());
  }

  setupFileEvents() {
    // Multiple file selection
    document.getElementById('selectMultipleSpeds')?.addEventListener('click', () => {
      document.getElementById('multipleSpedFiles')?.click();
    });
    
    document.getElementById('multipleSpedFiles')?.addEventListener('change', 
      (e) => this.handleMultipleSpedSelection(e));

    document.getElementById('processMultipleSpeds')?.addEventListener('click', 
      () => this.handleMultipleSpedProcess());

    // ProGoiás multiple files
    document.getElementById('selectMultipleSpedsProgoias')?.addEventListener('click', () => {
      document.getElementById('multipleSpedFilesProgoias')?.click();
    });
    
    document.getElementById('multipleSpedFilesProgoias')?.addEventListener('change', 
      (e) => this.handleProgoiasMultipleSpedSelection(e));

    // LogPRODUZIR multiple files
    document.getElementById('selectMultipleSpedsLogproduzir')?.addEventListener('click', () => {
      document.getElementById('multipleSpedFilesLogproduzir')?.click();
    });
    
    document.getElementById('multipleSpedFilesLogproduzir')?.addEventListener('change', 
      (e) => this.handleLogproduzirMultipleSpedSelection(e));
  }

  setupFormEvents() {
    // Import mode changes
    document.querySelectorAll('input[name="importMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.handleImportModeChange(e));
    });

    document.querySelectorAll('input[name="importModeProgoias"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.handleProgoiasImportModeChange(e));
    });

    document.querySelectorAll('input[name="importModeLogproduzir"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.handleLogproduzirImportModeChange(e));
    });

    // View switching
    document.getElementById('viewSinglePeriod')?.addEventListener('click', 
      () => this.handleViewSwitch('single'));
    document.getElementById('viewComparative')?.addEventListener('click', 
      () => this.handleViewSwitch('comparative'));

    document.getElementById('progoiasViewSinglePeriod')?.addEventListener('click', 
      () => this.handleProgoiasViewSwitch('single'));
    document.getElementById('progoiasViewComparative')?.addEventListener('click', 
      () => this.handleProgoiasViewSwitch('comparative'));
  }

  // Event handlers
  async handleConvert() {
    try {
      await this.spedApp.convertToExcel();
    } catch (error) {
      this.spedApp.logger.error(`Erro na conversão: ${error.message}`);
    }
  }

  async handleFomentarImport() {
    try {
      await this.spedApp.importSpedForFomentar();
    } catch (error) {
      this.spedApp.logger.error(`Erro na importação FOMENTAR: ${error.message}`);
    }
  }

  async handleFomentarExport() {
    try {
      await this.spedApp.exportFomentarReport();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação FOMENTAR: ${error.message}`);
    }
  }

  async handleFomentarMemoriaExport() {
    try {
      await this.spedApp.exportFomentarMemoria();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação memória FOMENTAR: ${error.message}`);
    }
  }

  handleFomentarPrint() {
    this.spedApp.printFomentarReport();
  }

  async handleE115Export() {
    try {
      await this.spedApp.exportE115();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação E115: ${error.message}`);
    }
  }

  async handleConfrontoE115Export() {
    try {
      await this.spedApp.exportConfrontoE115();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação confronto E115: ${error.message}`);
    }
  }

  async handleProgoiasImport() {
    try {
      await this.spedApp.importSpedForProgoias();
    } catch (error) {
      this.spedApp.logger.error(`Erro na importação ProGoiás: ${error.message}`);
    }
  }

  async handleProgoiasExport() {
    try {
      await this.spedApp.exportProgoiasReport();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação ProGoiás: ${error.message}`);
    }
  }

  async handleProgoiasMemoriaExport() {
    try {
      await this.spedApp.exportProgoiasMemoria();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação memória ProGoiás: ${error.message}`);
    }
  }

  async handleE115ProgoiasExport() {
    try {
      await this.spedApp.exportE115Progoias();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação E115 ProGoiás: ${error.message}`);
    }
  }

  handleProgoiasPrint() {
    this.spedApp.printProgoiasReport();
  }

  async handleLogproduzirImport() {
    try {
      await this.spedApp.importSpedForLogproduzir();
    } catch (error) {
      this.spedApp.logger.error(`Erro na importação LogPRODUZIR: ${error.message}`);
    }
  }

  async handleLogproduzirExport() {
    try {
      await this.spedApp.exportLogproduzirReport();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação LogPRODUZIR: ${error.message}`);
    }
  }

  async handleLogproduzirMemoriaExport() {
    try {
      await this.spedApp.exportLogproduzirMemoria();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação memória LogPRODUZIR: ${error.message}`);
    }
  }

  async handleLogproduzirE115Export() {
    try {
      await this.spedApp.exportLogproduzirE115();
    } catch (error) {
      this.spedApp.logger.error(`Erro na exportação E115 LogPRODUZIR: ${error.message}`);
    }
  }

  handleLogproduzirPrint() {
    this.spedApp.printLogproduzirReport();
  }

  async handleLogproduzirProcess() {
    try {
      await this.spedApp.processLogproduzirData();
    } catch (error) {
      this.spedApp.logger.error(`Erro no processamento LogPRODUZIR: ${error.message}`);
    }
  }

  async handleProgoiasProcess() {
    try {
      await this.spedApp.processProgoiasData();
    } catch (error) {
      this.spedApp.logger.error(`Erro no processamento ProGoiás: ${error.message}`);
    }
  }

  handleFomentarConfigChange() {
    if (this.spedApp.state.fomentarData) {
      this.spedApp.recalculateFomentar();
    }
  }

  handleProgoiasConfigChange() {
    if (this.spedApp.state.progoiasData) {
      this.spedApp.recalculateProgoias();
    }
  }

  handleLogproduzirConfigChange() {
    if (this.spedApp.state.logproduzirData) {
      this.spedApp.recalculateLogproduzir();
    }
  }

  handleProgoiasOpcaoCalculoChange() {
    const opcao = document.getElementById('progoiasOpcaoCalculo')?.value;
    const manualField = document.getElementById('progoiasPercentualManual');
    
    if (manualField) {
      manualField.disabled = opcao !== 'manual';
      if (opcao !== 'manual') {
        manualField.value = '';
      }
    }
    
    this.handleProgoiasConfigChange();
  }

  handleMultipleSpedSelection(event) {
    this.spedApp.handleMultipleSpedSelection(event);
  }

  async handleMultipleSpedProcess() {
    try {
      await this.spedApp.processMultipleSpeds();
    } catch (error) {
      this.spedApp.logger.error(`Erro no processamento múltiplo: ${error.message}`);
    }
  }

  handleProgoiasMultipleSpedSelection(event) {
    this.spedApp.handleProgoiasMultipleSpedSelection(event);
  }

  handleLogproduzirMultipleSpedSelection(event) {
    this.spedApp.handleLogproduzirMultipleSpedSelection(event);
  }

  handleImportModeChange(event) {
    this.spedApp.handleImportModeChange(event.target.value);
  }

  handleProgoiasImportModeChange(event) {
    this.spedApp.handleProgoiasImportModeChange(event.target.value);
  }

  handleLogproduzirImportModeChange(event) {
    this.spedApp.handleLogproduzirImportModeChange(event.target.value);
  }

  handleViewSwitch(view) {
    this.spedApp.switchView(view);
  }

  handleProgoiasViewSwitch(view) {
    this.spedApp.switchProgoiasView(view);
  }
}

export default EventManager;

