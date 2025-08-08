const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Servidor HTTP simples
function createServer(port = 8000) {
  return http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Redirecionar root para o arquivo principal
    if (pathname === '/') {
      pathname = '/sped-web-app.html';
    }
    
    const filePath = path.join(__dirname, pathname);
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      
      // Definir Content-Type baseado na extensão
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.ico': 'image/x-icon'
      };
      
      const contentType = mimeTypes[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

async function runAppWithServer() {
  const port = 8000;
  
  console.log('🚀 Iniciando servidor HTTP e Playwright...');
  
  // Iniciar servidor HTTP
  const server = createServer(port);
  server.listen(port, () => {
    console.log(`🌐 Servidor rodando em http://localhost:${port}`);
  });
  
  // Aguardar um momento para o servidor inicializar
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Lançar o navegador
  const browser = await chromium.launch({ 
    headless: false, // Mostrar o navegador
    slowMo: 500      // Atraso de 0.5s entre ações
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const appUrl = `http://localhost:${port}`;
    console.log(`📄 Carregando aplicação: ${appUrl}`);
    
    // Navegar para a aplicação
    await page.goto(appUrl);
    
    // Aguardar a página carregar
    await page.waitForLoadState('domcontentloaded');
    
    console.log('✅ Aplicação carregada com sucesso!');
    console.log('🔍 Informações da página:');
    console.log(`   Título: ${await page.title()}`);
    console.log(`   URL: ${page.url()}`);
    
    // Verificar se os elementos principais estão presentes
    const loginScreen = await page.locator('#loginScreen').isVisible();
    console.log(`   Tela de login visível: ${loginScreen}`);
    
    if (loginScreen) {
      console.log('🔐 Tela de login detectada');
      console.log('📝 Preenchendo credenciais de teste...');
      
      // Preencher credenciais de teste
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin0000');
      
      console.log('✅ Credenciais preenchidas (admin/admin0000)');
      console.log('🖱️  Clique em "Entrar" para testar o login');
      console.log('⏸️  Página ficará aberta para interação manual...');
      console.log('   Pressione Ctrl+C para fechar');
    }
    
    // Manter a página aberta para interação
    await new Promise(() => {}); // Loop infinito até Ctrl+C
    
  } catch (error) {
    console.error('❌ Erro ao executar a aplicação:', error.message);
  } finally {
    console.log('🏁 Fechando servidor e navegador...');
    server.close();
    await browser.close();
  }
}

// Manipular Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Finalizando aplicação...');
  process.exit(0);
});

// Executar se chamado diretamente
if (require.main === module) {
  runAppWithServer().catch(console.error);
}

module.exports = { runAppWithServer };