// src/ui/handlers.js
import { addLog } from '../core/logger.js';

let progoiasRegistrosCompletos = null;
let progoiasCurrentImportMode = 'single';

function setProgoiasData(registros, mode) {
    progoiasRegistrosCompletos = registros;
    progoiasCurrentImportMode = mode;
}

function initializeEventListeners() {
    document.getElementById('tabConverter').addEventListener('click', () => switchTab('converter'));
    document.getElementById('tabFomentar').addEventListener('click', () => switchTab('fomentar'));
    document.getElementById('tabProgoias').addEventListener('click', () => switchTab('progoias'));
    document.getElementById('tabLogproduzir').addEventListener('click', () => switchTab('logproduzir'));
}

function switchTab(tab) {
    const targetTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (targetTab && targetTab.classList.contains('disabled')) {
        console.log(`[PERMISSION] Acesso negado à aba: ${tab}`);
        return;
    }
    
    const tabs = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    
    const tabId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    const panelId = `${tab}Panel`;

    document.getElementById(tabId)?.classList.add('active');
    document.getElementById(panelId)?.classList.add('active');
    
    if (tab === 'progoias') {
        initializeProgoiasTab();
    }
}

function initializeProgoiasTab() {
    const statusElement = document.getElementById('progoiasSpedStatus');
    const reviewButtons = document.getElementById('progoiasReviewButtons');
    const processButton = document.getElementById('processProgoisData');
    const resultsSection = document.getElementById('progoiasResults');
    
    if (progoiasRegistrosCompletos) {
        const empresa = progoiasRegistrosCompletos.empresa || 'Empresa';
        const periodo = progoiasRegistrosCompletos.periodo || 'Período';
        const totalOperacoes = (progoiasRegistrosCompletos.C190?.length || 0) + 
                             (progoiasRegistrosCompletos.C590?.length || 0) + 
                             (progoiasRegistrosCompletos.D190?.length || 0) + 
                             (progoiasRegistrosCompletos.D590?.length || 0);
        
        statusElement.textContent = `${empresa} - ${periodo} (Arquivo carregado - ${totalOperacoes} operações)`;
        statusElement.style.color = '#20e3b2';
        
        document.getElementById('progoiasConfigPanel').style.display = 'block';
        if (reviewButtons) reviewButtons.style.display = 'block';
        if (processButton) processButton.style.display = 'block';
        
        addLog(`ProGoiás: Interface inicializada com SPED carregado (${empresa} - ${periodo})`, 'info');
    } else {
        statusElement.textContent = 'Nenhum arquivo SPED importado';
        statusElement.style.color = '#666';
        
        if (reviewButtons) reviewButtons.style.display = 'none';
        if (processButton) processButton.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        
        addLog('ProGoiás: Interface inicializada - Aguardando importação de SPED', 'info');
    }
    
    const importMode = progoiasCurrentImportMode || 'single';
    document.getElementById('singleImportSectionProgoias').style.display = importMode === 'single' ? 'block' : 'none';
    document.getElementById('multipleImportSectionProgoias').style.display = importMode === 'multiple' ? 'block' : 'none';
    document.getElementById('progoiasSingleConfig').style.display = importMode === 'single' ? 'block' : 'none';
    document.getElementById('progoiasMultipleConfig').style.display = importMode === 'multiple' ? 'block' : 'none';
}

export { initializeEventListeners, setProgoiasData };