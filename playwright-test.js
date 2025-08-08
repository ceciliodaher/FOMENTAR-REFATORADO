const { chromium } = require('playwright');
const path = require('path');

async function runApp() {
  console.log('🚀 Iniciando Playwright para executar SPED Web App...');
  
  // Lançar o navegador
  const browser = await chromium.launch({ 
    headless: false, // Mostrar o navegador
    slowMo: 1000     // Atraso de 1s entre ações para visualização
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Caminho absoluto para o arquivo HTML
    const htmlPath = path.join(__dirname, 'sped-web-app.html');
    const fileUrl = `file://${htmlPath}`;
    
    console.log(`📄 Carregando arquivo: ${fileUrl}`);
    
    // Navegar para o arquivo HTML
    await page.goto(fileUrl);
    
    // Aguardar a página carregar
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Aplicação carregada com sucesso!');
    console.log('🔍 Informações da página:');
    console.log(`   Título: ${await page.title()}`);
    console.log(`   URL: ${page.url()}`);
    
    // Verificar se os elementos principais estão presentes
    const loginScreen = await page.locator('#loginScreen').isVisible();
    console.log(`   Tela de login visível: ${loginScreen}`);
    
    if (loginScreen) {
      console.log('🔐 Tela de login detectada');
      
      // Preencher credenciais de teste
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin0000');
      
      console.log('📝 Credenciais preenchidas (admin/admin0000)');
      console.log('⏸️  Página ficará aberta para interação manual...');
      console.log('   Pressione Ctrl+C para fechar');
      
      // Manter a página aberta
      await page.waitForTimeout(300000); // 5 minutos
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar a aplicação:', error.message);
  } finally {
    // Comentar a linha abaixo se quiser manter o navegador aberto
    // await browser.close();
    console.log('🏁 Teste finalizado');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runApp().catch(console.error);
}

module.exports = { runApp };