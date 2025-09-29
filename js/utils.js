function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (!body.classList.contains('light-theme') && !body.classList.contains('dark-theme')) {
        body.classList.add('light-theme');
    }
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (themeToggle) themeToggle.textContent = '☀️ Modo Claro';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        if (themeToggle) themeToggle.textContent = '🌙 Modo Escuro';
        localStorage.setItem('theme', 'light');
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    
    document.body.classList.remove('light-theme', 'dark-theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.textContent = '☀️ Modo Claro';
    } else {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.textContent = '🌙 Modo Escuro';
    }
}

function logoutUser() {
    console.log('Fazendo logout...');
    const currentUser = getCurrentUser();
    
    if (currentUser) {
        console.log(`Usuário ${currentUser.username} fez logout`);
    }
    
    localStorage.removeItem('currentUser');
    
    window.location.href = '../index.html';
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        return null;
    }
}

function checkAuthentication() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function validateUsername(username) {
    if (username.length < 4) {
        return { valid: false, message: 'O nome de usuário deve ter pelo menos 4 caracteres' };
    }
    
    const validChars = /^[a-zA-Z0-9_]+$/;
    if (!validChars.test(username)) {
        return { valid: false, message: 'O nome de usuário só pode conter letras, números e underscore' };
    }
    
    const offensiveWords = ['idiota', 'estupido', 'imbecil', 'retardado', 'burro'];
    const lowerUsername = username.toLowerCase();
    
    for (const word of offensiveWords) {
        if (lowerUsername.includes(word)) {
            return { valid: false, message: 'Nome de usuário contém palavras ofensivas' };
        }
    }
    
    return { valid: true, message: '' };
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        letters: (password.match(/[a-zA-Z]/g) || []).length >= 2,
        numbers: (password.match(/[0-9]/g) || []).length >= 2,
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    if (document.getElementById('reqLength')) {
        document.getElementById('reqLength').className = requirements.length ? 'valid' : 'invalid';
        document.getElementById('reqLetters').className = requirements.letters ? 'valid' : 'invalid';
        document.getElementById('reqNumbers').className = requirements.numbers ? 'valid' : 'invalid';
        document.getElementById('reqSpecial').className = requirements.special ? 'valid' : 'invalid';
    }
    
    const allValid = Object.values(requirements).every(req => req);
    
    return {
        valid: allValid,
        requirements: requirements,
        message: allValid ? '' : 'A senha não atende a todos os requisitos'
    };
}

function setupDDoSProtection() {
    const maxAttempts = 5;
    const timeWindow = 15 * 60 * 1000;
    
    let loginAttempts = JSON.parse(localStorage.getItem('loginAttempts')) || [];
    const now = Date.now();
    
    loginAttempts = loginAttempts.filter(time => now - time < timeWindow);
    
    if (loginAttempts.length >= maxAttempts) {
        const timeLeft = Math.ceil((loginAttempts[0] + timeWindow - now) / 1000 / 60);
        return {
            allowed: false,
            message: `Muitas tentativas de login. Tente novamente em ${timeLeft} minutos.`
        };
    }
    
    loginAttempts.push(now);
    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
    
    return { allowed: true, message: '' };
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showLoading(container) {
    if (container && container.innerHTML !== undefined) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Carregando...</p>
            </div>
        `;
    }
}

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

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

document.addEventListener('DOMContentLoaded', function() {
    applySavedTheme();
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    console.log('✅ Utils.js carregado corretamente');
    console.log('🎨 Tema atual:', localStorage.getItem('theme'));
    console.log('👤 Usuário logado:', getCurrentUser());
});

function logout() {
    logoutUser();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleTheme,
        applySavedTheme,
        validateUsername,
        validatePassword,
        setupDDoSProtection,
        shuffleArray,
        formatTime,
        generateId,
        getCurrentUser,
        checkAuthentication,
        logout,
        logoutUser,
        showLoading,
        showNotification,
        validateEmail,
        debounce,
        formatNumber
    };
}

window.QuizGameUtils = {
    toggleTheme,
    applySavedTheme,
    validateUsername,
    validatePassword,
    setupDDoSProtection,
    shuffleArray,
    formatTime,
    generateId,
    getCurrentUser,
    checkAuthentication,
    logout,
    logoutUser,
    showLoading,
    showNotification,
    validateEmail,
    debounce,
    formatNumber
};
