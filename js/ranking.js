// Sistema de Ranking - COMPLETO E CORRIGIDO

// Carregar ranking global
function loadGlobalRanking() {
    showLoading('rankingList', '📊 Carregando ranking global...');
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (users.length === 0) {
            document.getElementById('rankingList').innerHTML = `
                <div class="no-data">
                    <h3>📭 Nenhum dado local encontrado</h3>
                    <p>Os dados são carregados do Google Sheets</p>
                    <button onclick="loadSheetsRanking()" class="btn-primary">📊 Carregar do Google Sheets</button>
                </div>
            `;
            return;
        }
        
        // Ordenar por pontuação
        const sortedUsers = users.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Adicionar posições
        const rankedUsers = sortedUsers.map((user, index) => ({
            ...user,
            position: index + 1,
            source: 'local'
        }));
        
        displayRanking(rankedUsers, 'global');
        
    } catch (error) {
        console.error('Erro ao carregar ranking global:', error);
        document.getElementById('rankingList').innerHTML = `
            <div class="error-message">
                <h3>❌ Erro ao carregar ranking local</h3>
                <p>${error.message}</p>
                <button onclick="loadSheetsRanking()" class="btn-primary">📊 Tentar Google Sheets</button>
            </div>
        `;
    }
}

// Carregar ranking pessoal
function loadMyRanking() {
    showLoading('rankingList', '👤 Carregando seu ranking...');
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (!currentUser) {
            document.getElementById('rankingList').innerHTML = `
                <div class="no-data">
                    <h3>🔒 Acesso necessário</h3>
                    <p>Faça login para ver seu ranking pessoal.</p>
                    <button onclick="window.location.href='login.html'" class="btn-primary">🚪 Fazer Login</button>
                </div>
            `;
            return;
        }
        
        if (users.length === 0) {
            document.getElementById('rankingList').innerHTML = `
                <div class="no-data">
                    <h3>📭 Nenhum dado encontrado</h3>
                    <p>Jogue algumas partidas para aparecer no ranking!</p>
                    <button onclick="window.location.href='game.html'" class="btn-primary">🎯 Jogar Agora</button>
                </div>
            `;
            return;
        }
        
        // Ordenar por pontuação
        const sortedUsers = users.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Encontrar posição do usuário atual
        const userIndex = sortedUsers.findIndex(u => u.username === currentUser.username);
        
        if (userIndex === -1) {
            document.getElementById('rankingList').innerHTML = `
                <div class="no-data">
                    <h3>🎯 Você ainda não jogou</h3>
                    <p>Jogue sua primeira partida para entrar no ranking!</p>
                    <button onclick="window.location.href='game.html'" class="btn-primary">🎯 Começar a Jogar</button>
                </div>
            `;
            return;
        }
        
        const userPosition = userIndex + 1;
        
        // Mostrar usuário atual e os 2 acima e 2 abaixo
        const startIndex = Math.max(0, userIndex - 2);
        const endIndex = Math.min(sortedUsers.length, userIndex + 3);
        const rankedUsers = sortedUsers.slice(startIndex, endIndex).map((user, index) => ({
            ...user,
            position: startIndex + index + 1,
            source: 'local',
            isCurrentUser: user.username === currentUser.username
        }));
        
        displayRanking(rankedUsers, 'personal');
        
    } catch (error) {
        console.error('Erro ao carregar ranking pessoal:', error);
        document.getElementById('rankingList').innerHTML = `
            <div class="error-message">
                <h3>❌ Erro ao carregar ranking</h3>
                <p>${error.message}</p>
                <button onclick="loadGlobalRanking()" class="btn-primary">🌍 Voltar ao Ranking Global</button>
            </div>
        `;
    }
}

// Carregar ranking do Google Sheets - CORRIGIDA
async function loadSheetsRanking() {
    showLoading('rankingList', '📡 Conectando com Google Sheets...');
    
    try {
        console.log('Iniciando carga do ranking do Google Sheets...');
        const rankedUsers = await getRankingFromSheets();
        
        console.log('Ranking carregado do Google Sheets:', rankedUsers);
        
        if (!rankedUsers || rankedUsers.length === 0) {
            document.getElementById('rankingList').innerHTML = `
                <div class="no-data">
                    <h3>📭 Planilha vazia ou sem dados</h3>
                    <p>Nenhum dado de ranking encontrado na planilha do Google Sheets.</p>
                    <div class="action-buttons">
                        <button onclick="debugConnection()" class="btn-secondary">🐛 Debug da Conexão</button>
                        <button onclick="loadGlobalRanking()" class="btn-primary">💾 Usar Dados Locais</button>
                    </div>
                </div>
            `;
            return;
        }
        
        displayRanking(rankedUsers, 'sheets');
        document.getElementById('updateTime').textContent = new Date().toLocaleString();
        
        // Atualizar status da planilha
        updateSheetStatus(true, rankedUsers.length);
        
    } catch (error) {
        console.error('Erro ao carregar ranking do Google Sheets:', error);
        
        document.getElementById('rankingList').innerHTML = `
            <div class="error-message">
                <h3>🔌 Erro de Conexão com Google Sheets</h3>
                <p><strong>Detalhes:</strong> ${error.message}</p>
                <p>Verifique se a planilha está pública e acessível.</p>
                <div class="action-buttons">
                    <button onclick="loadSheetsRanking()" class="btn-primary">🔄 Tentar Novamente</button>
                    <button onclick="loadGlobalRanking()" class="btn-secondary">💾 Usar Dados Locais</button>
                    <button onclick="debugConnection()" class="btn-secondary">🐛 Debug da Conexão</button>
                </div>
            </div>
        `;
        
        updateSheetStatus(false, 0, error.message);
    }
}

// Exibir ranking na tela
function displayRanking(users, type) {
    const rankingList = document.getElementById('rankingList');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!users || users.length === 0) {
        rankingList.innerHTML = `
            <div class="no-data">
                <h3>📭 Nenhum dado encontrado</h3>
                <p>${type === 'sheets' ? 'A planilha está vazia.' : 'Jogue algumas partidas para aparecer no ranking!'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    users.forEach((user, index) => {
        const isCurrentUser = user.isCurrentUser || 
                            (currentUser && user.username === currentUser.username);
        
        const medal = user.position === 1 ? '🥇' : 
                     user.position === 2 ? '🥈' : 
                     user.position === 3 ? '🥉' : '🔸';
        
        const userClass = isCurrentUser ? 'current-user' : '';
        const sourceIcon = user.source === 'sheets' ? '📊' : '💾';
        
        html += `
            <div class="ranking-item ${userClass}">
                <div class="ranking-position ${user.position <= 3 ? 'top-' + user.position : ''}">
                    ${medal} ${user.position}º
                </div>
                <div class="ranking-details">
                    <div class="ranking-username">
                        ${user.username} ${isCurrentUser ? ' <span class="you-badge">(Você)</span>' : ''}
                    </div>
                    <div class="ranking-score">
                        🏅 ${user.score || 0} pontos
                        <span class="source-badge">${sourceIcon}</span>
                    </div>
                </div>
                ${isCurrentUser ? '<div class="current-user-indicator">👤</div>' : ''}
            </div>
        `;
    });
    
    // Adicionar informações do tipo de ranking
    const typeInfo = type === 'sheets' ? 
        '<div class="ranking-source-info">📊 Dados carregados do Google Sheets</div>' :
        type === 'personal' ?
        '<div class="ranking-source-info">👤 Visualização pessoal - mostrando sua posição e jogadores próximos</div>' :
        '<div class="ranking-source-info">💾 Dados carregados localmente</div>';
    
    rankingList.innerHTML = typeInfo + html;
    
    // Adicionar estilos se necessário
    addRankingStyles();
}

// Atualizar status da planilha
function updateSheetStatus(connected, dataCount, error = '') {
    const sheetStatus = document.getElementById('sheetStatus');
    const sheetRecords = document.getElementById('sheetRecords');
    const sheetId = document.getElementById('sheetId');
    
    const config = JSON.parse(localStorage.getItem('sheetsConfig')) || {};
    const sheetIdValue = config.google_sheets?.sheet_id || '1MgEerxewyHEtj8ie7ojSAaECYmwHru7Cl2b6PuN_dIM';
    
    if (sheetId) {
        sheetId.textContent = sheetIdValue;
    }
    
    if (connected) {
        sheetStatus.innerHTML = '✅ Conectado';
        sheetRecords.textContent = dataCount;
    } else {
        sheetStatus.innerHTML = `❌ ${error || 'Conexão falhou'}`;
        sheetRecords.textContent = '0';
    }
}

// Função de debug
async function debugConnection() {
    showLoading('rankingList', '🐛 Debugando conexão...');
    
    try {
        const config = await loadSheetsConfig();
        const testResult = await testSheetConnection();
        const sheetData = await debugSheetsConnection();
        
        let debugInfo = `
            <div class="debug-info">
                <h3>🐛 Informações de Debug</h3>
                <div class="debug-section">
                    <h4>📋 Configuração</h4>
                    <p><strong>Planilha ID:</strong> ${config.google_sheets.sheet_id}</p>
                    <p><strong>URL do Apps Script:</strong> ${config.google_sheets.app_script_url || 'Não configurado'}</p>
                </div>
        `;
        
        if (testResult.success) {
            debugInfo += `
                <div class="debug-section success">
                    <h4>✅ Teste de Conexão CSV</h4>
                    <p><strong>Status:</strong> Sucesso</p>
                    <p><strong>Status HTTP:</strong> ${testResult.status}</p>
                    <p><strong>Preview:</strong> ${testResult.dataPreview}</p>
                </div>
            `;
        } else {
            debugInfo += `
                <div class="debug-section error">
                    <h4>❌ Teste de Conexão CSV</h4>
                    <p><strong>Erro:</strong> ${testResult.error}</p>
                </div>
            `;
        }
        
        if (sheetData && sheetData.length > 0) {
            debugInfo += `
                <div class="debug-section success">
                    <h4>✅ Dados da Planilha</h4>
                    <p><strong>Registros encontrados:</strong> ${sheetData.length}</p>
                    <div class="data-preview">
                        <strong>Primeiros 3 registros:</strong>
                        <pre>${JSON.stringify(sheetData.slice(0, 3), null, 2)}</pre>
                    </div>
                </div>
            `;
        } else {
            debugInfo += `
                <div class="debug-section error">
                    <h4>❌ Dados da Planilha</h4>
                    <p>Nenhum dado encontrado na planilha</p>
                </div>
            `;
        }
        
        debugInfo += `
                <div class="debug-actions">
                    <button onclick="loadSheetsRanking()" class="btn-primary">🔄 Tentar Carregar Ranking Novamente</button>
                    <button onclick="loadGlobalRanking()" class="btn-secondary">💾 Usar Dados Locais</button>
                    <button onclick="window.location.href='../pages/teste-rapido.html'" class="btn-secondary">🧪 Teste Completo</button>
                </div>
            </div>
        `;
        
        document.getElementById('rankingList').innerHTML = debugInfo;
        
    } catch (error) {
        document.getElementById('rankingList').innerHTML = `
            <div class="error-message">
                <h3>❌ Erro no Debug</h3>
                <p><strong>Detalhes:</strong> ${error.message}</p>
                <div class="action-buttons">
                    <button onclick="loadSheetsRanking()" class="btn-primary">🔄 Tentar Novamente</button>
                    <button onclick="loadGlobalRanking()" class="btn-secondary">💾 Usar Dados Locais</button>
                </div>
            </div>
        `;
    }
}

// Mostrar loading
function showLoading(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

// Adicionar estilos para o ranking
function addRankingStyles() {
    if (document.getElementById('ranking-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ranking-styles';
    style.textContent = `
        .ranking-item {
            display: flex;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
            transition: var(--transition);
            position: relative;
        }
        
        .ranking-item:hover {
            background: var(--bg-secondary);
        }
        
        .ranking-item:last-child {
            border-bottom: none;
        }
        
        .ranking-item.current-user {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            border-radius: var(--border-radius);
            margin: 0.5rem 0;
            border: 2px solid var(--primary-color);
        }
        
        .ranking-item.current-user .ranking-username,
        .ranking-item.current-user .ranking-score {
            color: white;
        }
        
        .ranking-position {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--bg-secondary);
            color: var(--text-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 1.5rem;
            flex-shrink: 0;
            font-size: 0.9rem;
            border: 2px solid var(--border-color);
        }
        
        .ranking-position.top-1 {
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #1e293b;
            border-color: #ffd700;
        }
        
        .ranking-position.top-2 {
            background: linear-gradient(135deg, #c0c0c0, #e5e5e5);
            color: #1e293b;
            border-color: #c0c0c0;
        }
        
        .ranking-position.top-3 {
            background: linear-gradient(135deg, #cd7f32, #e9b076);
            color: #1e293b;
            border-color: #cd7f32;
        }
        
        .ranking-details {
            flex: 1;
        }
        
        .ranking-username {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }
        
        .ranking-score {
            color: var(--text-secondary);
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .you-badge {
            background: rgba(255,255,255,0.2);
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }
        
        .source-badge {
            background: var(--bg-primary);
            padding: 0.2rem 0.5rem;
            border-radius: 8px;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }
        
        .current-user-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 1.2rem;
        }
        
        .ranking-source-info {
            background: var(--bg-secondary);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
            text-align: center;
            color: var(--text-secondary);
            border-left: 4px solid var(--primary-color);
        }
        
        .no-data, .error-message {
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-secondary);
        }
        
        .no-data h3, .error-message h3 {
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        .action-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        
        .debug-info {
            background: var(--bg-card);
            padding: 2rem;
            border-radius: var(--border-radius-lg);
        }
        
        .debug-section {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--border-radius);
            margin-bottom: 1.5rem;
            border-left: 4px solid var(--border-color);
        }
        
        .debug-section.success {
            border-left-color: var(--success-color);
        }
        
        .debug-section.error {
            border-left-color: var(--error-color);
        }
        
        .debug-section h4 {
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        .data-preview {
            margin-top: 1rem;
        }
        
        .data-preview pre {
            background: var(--bg-primary);
            padding: 1rem;
            border-radius: var(--border-radius);
            overflow-x: auto;
            font-size: 0.8rem;
            margin-top: 0.5rem;
        }
        
        .debug-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        
        .sheet-status {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .sheet-status p {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        @media (max-width: 768px) {
            .ranking-item {
                padding: 1rem;
            }
            
            .ranking-position {
                width: 50px;
                height: 50px;
                margin-right: 1rem;
                font-size: 0.8rem;
            }
            
            .ranking-username {
                font-size: 1rem;
            }
            
            .action-buttons, .debug-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Ranking.js carregado');
    
    // Adicionar estilos
    addRankingStyles();
});

console.log('🏆 Sistema de Ranking carregado com sucesso!');