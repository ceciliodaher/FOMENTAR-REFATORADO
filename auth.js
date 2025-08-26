// auth.js - Sistema de Autenticação
// CLAUDE-CONTEXT: Sistema completo de login/senha com perfis pré-definidos

// CLAUDE-CAREFUL: Base de dados de usuários com senhas
// Em produção, use hash das senhas e autenticação server-side
const USERS_DATABASE = {
    // Administradores
    'admin': {
        password: 'admin0000',
        profile: 'admin',
        name: 'Administrador',
        description: 'Acesso completo ao sistema'
    },
    'supervisor': {
        password: 'super123',
        profile: 'admin',
        name: 'Supervisor',
        description: 'Acesso completo ao sistema'
    },
    
    // Usuários FOMENTAR
    'fomentar.basico': {
        password: 'fom123',
        profile: 'fomentarBasico',
        name: 'Usuário FOMENTAR Básico',
        description: 'Apenas FOMENTAR período único'
    },
    'fomentar.completo': {
        password: 'fomc123',
        profile: 'fomentarCompleto',
        name: 'Usuário FOMENTAR Completo',
        description: 'Todas as funcionalidades FOMENTAR'
    },
    
    // Usuários ProGoiás
    'progoias.basico': {
        password: 'pro123',
        profile: 'progoiasBasico',
        name: 'Usuário ProGoiás Básico',
        description: 'Apenas ProGoiás período único'
    },
    'progoias.completo': {
        password: 'proc123',
        profile: 'progoiasCompleto',
        name: 'Usuário ProGoiás Completo',
        description: 'Todas as funcionalidades ProGoiás'
    },
    
    // Usuário conversor
    'conversor': {
        password: 'conv123',
        profile: 'converterApenas',
        name: 'Usuário Conversor',
        description: 'Apenas conversão SPED para Excel'
    },
    
    // Usuários LogPRODUZIR
    'logproduzir.basico': {
        password: 'log123',
        profile: 'logproduzirBasico',
        name: 'Usuário LogPRODUZIR Básico',
        description: 'Apenas LogPRODUZIR período único'
    },
    'logproduzir.completo': {
        password: 'logc123',
        profile: 'logproduzirCompleto',
        name: 'Usuário LogPRODUZIR Completo',
        description: 'Todas as funcionalidades LogPRODUZIR'
    },
    
    // Usuários personalizados - ADICIONE AQUI NOVOS USUÁRIOS
    'contador1': {
        password: 'cont123',
        profile: 'fomentarBasico',
        name: 'João Silva',
        description: 'Contador - FOMENTAR Básico'
    },
    'contador2': {
        password: 'cont456',
        profile: 'progoiasCompleto',
        name: 'Maria Santos',
        description: 'Contadora - ProGoiás Completo'
    }
};

// Classe para gerenciar autenticação
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 4 * 60 * 60 * 1000; // 4 horas em millisegundos
        this.sessionTimer = null;
    }
    
    // Verificar se usuário está logado
    isLoggedIn() {
        const sessionData = localStorage.getItem('fomentar_session');
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            const now = Date.now();
            
            // Verificar se sessão não expirou
            if (now > session.expires) {
                this.logout();
                return false;
            }
            
            // Restaurar dados do usuário
            this.currentUser = session.user;
            this.startSessionTimer();
            return true;
        } catch (e) {
            this.logout();
            return false;
        }
    }
    
    // Fazer login
    login(username, password) {
        const user = USERS_DATABASE[username];
        
        if (!user) {
            return {
                success: false,
                message: 'Usuário não encontrado'
            };
        }
        
        if (user.password !== password) {
            return {
                success: false,
                message: 'Senha incorreta'
            };
        }
        
        // Criar sessão
        this.currentUser = {
            username: username,
            profile: user.profile,
            name: user.name,
            description: user.description
        };
        
        // Salvar sessão no localStorage
        const sessionData = {
            user: this.currentUser,
            expires: Date.now() + this.sessionTimeout,
            loginTime: Date.now()
        };
        
        localStorage.setItem('fomentar_session', JSON.stringify(sessionData));
        
        // Iniciar timer da sessão
        this.startSessionTimer();
        
        return {
            success: true,
            user: this.currentUser,
            message: `Bem-vindo, ${user.name}!`
        };
    }
    
    // Fazer logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem('fomentar_session');
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // Redirecionar para o início (tela de login)
        window.location.href = window.location.pathname;
    }
    
    // Iniciar temporizador da sessão
    startSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.sessionTimer = setTimeout(() => {
            alert('Sua sessão expirou. Você será redirecionado para a tela de login.');
            this.logout();
        }, this.sessionTimeout);
    }
    
    // Renovar sessão (quando usuário interage)
    renewSession() {
        if (!this.currentUser) return;
        
        const sessionData = {
            user: this.currentUser,
            expires: Date.now() + this.sessionTimeout,
            loginTime: Date.now()
        };
        
        localStorage.setItem('fomentar_session', JSON.stringify(sessionData));
        this.startSessionTimer();
    }
    
    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Obter perfil do usuário atual
    getCurrentProfile() {
        return this.currentUser ? this.currentUser.profile : null;
    }
    
    // Verificar se usuário tem perfil específico
    hasProfile(profile) {
        return this.currentUser && this.currentUser.profile === profile;
    }
    
    // Obter lista de usuários (apenas usernames para admin)
    getUsersList() {
        if (!this.currentUser || this.currentUser.profile !== 'admin') {
            return []; // Apenas admin pode ver lista
        }
        
        return Object.keys(USERS_DATABASE).map(username => ({
            username: username,
            name: USERS_DATABASE[username].name,
            profile: USERS_DATABASE[username].profile,
            description: USERS_DATABASE[username].description
        }));
    }
    
    // Alterar senha (funcionalidade futura)
    changePassword(currentPassword, newPassword) {
        if (!this.currentUser) return false;
        
        const user = USERS_DATABASE[this.currentUser.username];
        if (user.password !== currentPassword) {
            return { success: false, message: 'Senha atual incorreta' };
        }
        
        // CLAUDE-TODO: Em produção, implementar hash de senha
        user.password = newPassword;
        
        return { success: true, message: 'Senha alterada com sucesso' };
    }
    
    // Obter estatísticas de sessão
    getSessionInfo() {
        const sessionData = localStorage.getItem('fomentar_session');
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            const now = Date.now();
            const timeLeft = session.expires - now;
            const sessionDuration = now - session.loginTime;
            
            return {
                loginTime: new Date(session.loginTime),
                expiresAt: new Date(session.expires),
                timeLeft: Math.max(0, timeLeft),
                sessionDuration: sessionDuration,
                timeLeftFormatted: this.formatTime(timeLeft)
            };
        } catch (e) {
            return null;
        }
    }
    
    // Formatar tempo em texto legível
    formatTime(milliseconds) {
        if (milliseconds <= 0) return '0 minutos';
        
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes} minutos`;
        }
    }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Funções globais para compatibilidade
function isLoggedIn() {
    return authManager.isLoggedIn();
}

function login(username, password) {
    return authManager.login(username, password);
}

function logout() {
    return authManager.logout();
}

function getCurrentUser() {
    return authManager.getCurrentUser();
}

function getCurrentProfile() {
    return authManager.getCurrentProfile();
}

// Renovar sessão automaticamente em interações
document.addEventListener('click', () => {
    if (authManager.currentUser) {
        authManager.renewSession();
    }
});

document.addEventListener('keypress', () => {
    if (authManager.currentUser) {
        authManager.renewSession();
    }
});

// CLAUDE-CONTEXT: Inicialização automática do sistema de autenticação
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se usuário está logado ao carregar página
    if (!authManager.isLoggedIn()) {
        showLoginScreen();
    } else {
        // Usuário já logado, aplicar perfil
        const profile = authManager.getCurrentProfile();
        if (profile && typeof setUserProfile === 'function') {
            setUserProfile(profile);
        }
        showMainApplication();
    }
});

// Mostrar tela de login
function showLoginScreen() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    
    let loginScreen = document.getElementById('loginScreen');
    if (!loginScreen) {
        loginScreen = createLoginScreen();
        document.body.appendChild(loginScreen);
    }
    
    loginScreen.style.display = 'flex';
}

// Mostrar aplicação principal
function showMainApplication() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
    }
}

// Criar tela de login dinamicamente
function createLoginScreen() {
    const loginScreen = document.createElement('div');
    loginScreen.id = 'loginScreen';
    loginScreen.className = 'login-screen';
    
    loginScreen.innerHTML = `
        <div class="login-container">
            <div class="login-header">
                <img src="images/logo-expertzy.png" alt="Expertzy Logo" class="logo-expertzy-login">
                <h1>FOMENTAR - Sistema de Apuração</h1>
                <p class="login-subtitle">Expertzy Inteligência Tributária</p>
            </div>
            
            <div class="login-form">
                <h2>🔐 Acesso ao Sistema</h2>
                
                <div class="form-group">
                    <label for="loginUsername">Usuário:</label>
                    <input type="text" id="loginUsername" class="form-input" placeholder="Digite seu usuário" autocomplete="username">
                </div>
                
                <div class="form-group">
                    <label for="loginPassword">Senha:</label>
                    <input type="password" id="loginPassword" class="form-input" placeholder="Digite sua senha" autocomplete="current-password">
                </div>
                
                <button id="loginButton" class="btn-login">Entrar</button>
                
                <div id="loginMessage" class="login-message"></div>
                
                <!-- 
                <div class="login-help">
                    <details>
                        <summary>👥 Usuários Disponíveis para Teste</summary>
                        <div class="users-list">
                            <p><strong>Administradores:</strong></p>
                            <p>• admin / admin0000</p>
                            <p>• supervisor / super123</p>
                            
                            <p><strong>FOMENTAR:</strong></p>
                            <p>• fomentar.basico / fom123</p>
                            <p>• fomentar.completo / fomc123</p>
                            
                            <p><strong>ProGoiás:</strong></p>
                            <p>• progoias.basico / pro123</p>
                            <p>• progoias.completo / proc123</p>
                            
                            <p><strong>Conversor:</strong></p>
                            <p>• conversor / conv123</p>
                        </div>
                    </details>
                </div>
                -->
            </div>
        </div>
    `;
    
    // Adicionar eventos
    const loginButton = loginScreen.querySelector('#loginButton');
    const loginUsername = loginScreen.querySelector('#loginUsername');
    const loginPassword = loginScreen.querySelector('#loginPassword');
    const loginMessage = loginScreen.querySelector('#loginMessage');
    
    function attemptLogin() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        
        if (!username || !password) {
            showLoginMessage('Por favor, preencha usuário e senha.', 'error');
            return;
        }
        
        const result = authManager.login(username, password);
        
        if (result.success) {
            showLoginMessage(result.message, 'success');
            
            // Aplicar perfil do usuário
            if (typeof setUserProfile === 'function') {
                setUserProfile(result.user.profile);
            }
            
            // Mostrar aplicação após pequeno delay
            setTimeout(() => {
                showMainApplication();
            }, 1000);
            
        } else {
            showLoginMessage(result.message, 'error');
            loginPassword.value = ''; // Limpar senha
        }
    }
    
    function showLoginMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 2000);
        }
    }
    
    // Eventos
    loginButton.addEventListener('click', attemptLogin);
    
    loginUsername.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginPassword.focus();
        }
    });
    
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            attemptLogin();
        }
    });
    
    return loginScreen;
}

// Função para mostrar informações da sessão (para debug)
function showSessionInfo() {
    const info = authManager.getSessionInfo();
    if (info) {
        console.log('Sessão:', {
            usuário: authManager.getCurrentUser(),
            login: info.loginTime,
            expira: info.expiresAt,
            tempo_restante: info.timeLeftFormatted
        });
    }
}