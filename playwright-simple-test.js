const { chromium } = require('playwright');

async function simpleTest() {
  console.log('🚀 Testando instalação do Playwright...');
  
  try {
    // Lançar navegador em modo headless para teste
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navegar para uma página simples
    await page.goto('data:text/html,<h1>Teste Playwright OK!</h1>');
    
    // Verificar título
    const content = await page.textContent('h1');
    console.log('✅ Playwright funcionando!');
    console.log(`   Conteúdo da página: "${content}"`);
    
    await browser.close();
    console.log('🏁 Teste concluído com sucesso');
    
    return true;
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

// Executar teste
if (require.main === module) {
  simpleTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = { simpleTest };