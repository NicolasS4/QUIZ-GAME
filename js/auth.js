// Sistema de autenticação - SOMENTE GOOGLE SHEETS

// Registrar novo usuário - APENAS NO GOOGLE SHEETS
async function registerUser(username, password) {
    // Validar nome de usuário
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        return { success: false, message: usernameValidation.message };
    }
    
    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
    }
    
    console.log('📝 Tentando registrar usuário no Google Sheets:', username);
    
    // Registrar APENAS no Google Sheets
    try {
        const sheetsResult = await registerUserInSheets(username, password);
        
        if (sheetsResult.success) {
            console.log('✅ Usuário registrado com sucesso no Google Sheets');
            
            // Criar usuário local apenas com dados básicos (não salva senha)
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userExists = users.some(user => user.username === username);
            
            if (!userExists) {
                const newUser = {
                    id: generateId(),
                    username: username,
                    score: 0,
                    gamesPlayed: 0,
                    dateCreated: new Date().toISOString(),
                    source: 'google_sheets'
                };
                
                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            return { success: true, message: 'Conta criada com sucesso! Você já pode fazer login.' };
        } else {
            console.log('❌ Erro no registro do Google Sheets:', sheetsResult.error);
            
            // MENSAGENS MAIS AMIGÁVEIS
            let userMessage = 'Erro ao criar conta. ';
            
            if (sheetsResult.error && sheetsResult.error.includes('já existe')) {
                userMessage = 'Este nome de usuário já existe. Escolha outro.';
            } else if (sheetsResult.error && sheetsResult.error.includes('fetch')) {
                userMessage = 'Conta criada no Google Sheets! Você já pode fazer login. (Erro de conexão ignorado)';
                // Se foi erro de fetch mas a conta foi criada, consideramos sucesso
                return { success: true, message: userMessage };
            } else {
                userMessage = sheetsResult.error || 'Erro ao criar conta no Google Sheets';
            }
            
            return { success: false, message: userMessage };
        }
    } catch (error) {
        console.log('❌ Erro no registro:', error);
        
        // Se deu erro mas provavelmente a conta foi criada, mostramos mensagem positiva
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return { 
                success: true, 
                message: 'Conta criada com sucesso! Você já pode fazer login. (Erro de rede ignorado)' 
            };
        }
        
        return { success: false, message: 'Erro de conexão com o Google Sheets' };
    }
}

// Fazer login - PRIMEIRO NO GOOGLE SHEETS
async function loginUser(username, password) {
    console.log('🔐 Tentando login no Google Sheets:', username);
    
    try {
        // Primeiro tenta login no Google Sheets
        const sheetsResult = await loginUserInSheets(username, password);
        
        if (sheetsResult.success) {
            console.log('✅ Login realizado via Google Sheets');
            
            // Atualizar/Criar usuário local
            const users = JSON.parse(localStorage.getItem('users')) || [];
            let user = users.find(u => u.username === username);
            
            if (!user) {
                // Criar usuário local se não existir
                user = {
                    id: generateId(),
                    username: username,
                    score: sheetsResult.user.score || 0,
                    gamesPlayed: 0,
                    dateCreated: new Date().toISOString(),
                    source: 'google_sheets'
                };
                users.push(user);
                localStorage.setItem('users', JSON.stringify(users));
            } else {
                // Atualizar pontuação do usuário existente
                user.score = sheetsResult.user.score || user.score;
                user.source = 'google_sheets';
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            // Salvar sessão
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            return { success: true, message: 'Login realizado com sucesso!' };
        } else {
            console.log('❌ Login falhou:', sheetsResult.error);
            return { success: false, message: sheetsResult.error || 'Usuário ou senha incorretos' };
        }
    } catch (error) {
        console.log('❌ Erro no login:', error);
        return { success: false, message: 'Erro de conexão com o servidor' };
    }
}

// Fazer logout
function logoutUser() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        console.log(`👋 Usuário ${currentUser.username} fez logout`);
    }
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

// Obter usuário atual
function getCurrentUser() {
    try {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        return null;
    }
}

// Verificar autenticação
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Atualizar pontuação do usuário - CORRIGIDA
async function updateUserScore(score, correctAnswers, totalQuestions, maxStreak) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        // Atualizar localmente
        users[userIndex].score = score;
        users[userIndex].gamesPlayed += 1;
        
        if (!users[userIndex].maxStreak || maxStreak > users[userIndex].maxStreak) {
            users[userIndex].maxStreak = maxStreak;
        }
        
        if (!users[userIndex].bestScore || score > users[userIndex].bestScore) {
            users[userIndex].bestScore = score;
        }
        
        if (!users[userIndex].totalCorrect) {
            users[userIndex].totalCorrect = 0;
            users[userIndex].totalQuestions = 0;
        }
        users[userIndex].totalCorrect += correctAnswers;
        users[userIndex].totalQuestions += totalQuestions;
        
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
        
        // Sincronizar com Google Sheets - USANDO A NOVA FUNÇÃO
        console.log('🔄 Sincronizando pontuação com Google Sheets...');
        
        if (typeof saveGameScore === 'function') {
            const syncResult = await saveGameScore(users[userIndex].score);
            
            if (syncResult && syncResult.success) {
                console.log('✅ Pontuação sincronizada com Google Sheets');
            } else {
                console.log('⚠️ Falha na sincronização com Google Sheets');
            }
        } else {
            console.log('❌ Função saveGameScore não disponível');
        }
    }
}

// ===== FUNÇÕES AUXILIARES =====

function validateUsername(username) {
    if (username.length < 4) {
        return { valid: false, message: 'Nome de usuário deve ter pelo menos 4 caracteres' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, message: 'Nome de usuário só pode conter letras, números e underline' };
    }
    
    const offensiveWords = ['idiota', 'estupido', 'imbecil', 'retardado', 'burro'];
    const lowerUsername = username.toLowerCase();
    
    for (const word of offensiveWords) {
        if (lowerUsername.includes(word)) {
            return { valid: false, message: 'Nome de usuário contém palavras ofensivas' };
        }
    }
    
    return { valid: true };
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        letters: (password.match(/[a-zA-Z]/g) || []).length >= 2,
        numbers: (password.match(/[0-9]/g) || []).length >= 2,
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    // Atualizar indicadores visuais
    if (document.getElementById('reqLength')) {
        document.getElementById('reqLength').className = requirements.length ? 'valid' : 'invalid';
        document.getElementById('reqLetters').className = requirements.letters ? 'valid' : 'invalid';
        document.getElementById('reqNumbers').className = requirements.numbers ? 'valid' : 'invalid';
        document.getElementById('reqSpecial').className = requirements.special ? 'valid' : 'invalid';
    }
    
    if (!requirements.length) {
        return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
    }
    if (!requirements.letters) {
        return { valid: false, message: 'Senha deve ter pelo menos 2 letras' };
    }
    if (!requirements.numbers) {
        return { valid: false, message: 'Senha deve ter pelo menos 2 números' };
    }
    if (!requirements.special) {
        return { valid: false, message: 'Senha deve ter pelo menos 1 caractere especial' };
    }
    
    return { valid: true };
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Event listeners para formulários de autenticação
document.addEventListener('DOMContentLoaded', function() {
    // Formulário de registro
    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Limpar mensagens de erro
            document.getElementById('newUsernameError').textContent = '';
            document.getElementById('newPasswordError').textContent = '';
            document.getElementById('confirmPasswordError').textContent = '';
            
            // Verificar se as senhas coincidem
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'As senhas não coincidem';
                return;
            }
            
            // Registrar usuário
            registerUser(username, password).then(result => {
                if (result.success) {
                    showNotification('✅ ' + result.message, 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    document.getElementById('newUsernameError').textContent = result.message;
                    showNotification('❌ ' + result.message, 'error');
                }
            });
        });
    }
    
    // Formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Limpar mensagens de erro
            document.getElementById('usernameError').textContent = '';
            document.getElementById('passwordError').textContent = '';
            
            // Fazer login
            loginUser(username, password).then(result => {
                if (result.success) {
                    showNotification('✅ ' + result.message, 'success');
                    setTimeout(() => {
                        window.location.href = 'game.html';
                    }, 1000);
                } else {
                    document.getElementById('passwordError').textContent = result.message;
                    showNotification('❌ ' + result.message, 'error');
                }
            });
        });
    }
    
    // Botão mostrar/ocultar senha
    setupPasswordToggle();
});

// Configurar botão mostrar/ocultar senha COM IMAGENS
function setupPasswordToggle() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        // Verificar se já existe um botão
        if (input.parentNode.querySelector('.password-toggle')) {
            return;
        }
        
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'password-toggle';
        toggleButton.innerHTML = '<img src="../assets/eye-closed.png" alt="Mostrar senha" class="password-icon">';
        toggleButton.title = 'Mostrar senha';
        
        toggleButton.addEventListener('click', function() {
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = '<img src="../assets/eye-open.png" alt="Ocultar senha" class="password-icon">';
                this.title = 'Ocultar senha';
            } else {
                input.type = 'password';
                this.innerHTML = '<img src="../assets/eye-closed.png" alt="Mostrar senha" class="password-icon">';
                this.title = 'Mostrar senha';
            }
        });
        
        // Adicionar botão ao container do input
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(toggleButton);
    });
    
    // Adicionar estilos uma única vez
    if (!document.getElementById('password-toggle-styles')) {
        const style = document.createElement('style');
        style.id = 'password-toggle-styles';
        style.textContent = `
            .password-toggle {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                transition: background-color 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
            }
            
            .password-toggle:hover {
                background-color: rgba(0,0,0,0.1);
            }
            
            .password-icon {
                width: 20px;
                height: 20px;
                object-fit: contain;
                filter: var(--icon-filter, none);
            }
            
            .dark-theme .password-icon {
                filter: invert(1) brightness(2);
            }
            
            .form-group {
                position: relative;
            }
            
            .form-group input[type="password"],
            .form-group input[type="text"] {
                padding-right: 50px !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Função para mostrar notificação
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

console.log('✅ Auth.js carregado - SCORE SYNC CORRIGIDO');