let APP_SCRIPT_URL = '';
let sheetsConfig = null;

async function loadSheetsConfig() {
    if (sheetsConfig) return sheetsConfig;
    
    try {
        const response = await fetch('../locker/config.json');
        sheetsConfig = await response.json();
        
        if (sheetsConfig.google_sheets && sheetsConfig.google_sheets.app_script_url) {
            APP_SCRIPT_URL = sheetsConfig.google_sheets.app_script_url;
            console.log('✅ URL do Apps Script configurada:', APP_SCRIPT_URL);
        }
        
        return sheetsConfig;
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return {
            google_sheets: {
                sheet_id: '1MgEerxewyHEtj8ie7ojSAaECYmwHru7Cl2b6PuN_dIM',
                sheet_name: 'Página1',
                app_script_url: ''
            }
        };
    }
}

async function callGoogleAppsScript(action, data = {}) {
    try {
        await loadSheetsConfig();
        
        if (!APP_SCRIPT_URL) {
            console.log('⚠️ URL do Apps Script não configurada');
            return { success: false, error: 'URL do Apps Script não configurada' };
        }

        const params = new URLSearchParams({
            action: action,
            ...data,
            timestamp: Date.now()
        });

        console.log(`📤 Chamando Apps Script: ${APP_SCRIPT_URL}?${params}`);
        
        const response = await fetch(`${APP_SCRIPT_URL}?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Resposta do Apps Script (${action}):`, result);
        
        return { success: true, data: result };
        
    } catch (error) {
        console.error(`❌ Erro na chamada do Apps Script (${action}):`, error);
        return { success: false, error: error.message };
    }
}

async function registerUserInSheets(username, password) {
    const result = await callGoogleAppsScript('register', {
        username: username,
        password: password
    });
    
    if (result.success && result.data && result.data.success !== false) {
        return { success: true, message: 'Usuário registrado com sucesso no Google Sheets' };
    } else {
        const errorMsg = result.data?.error || result.error || 'Erro desconhecido';
        return { success: false, error: errorMsg };
    }
}

async function loginUserInSheets(username, password) {
    const result = await callGoogleAppsScript('login', {
        username: username,
        password: password
    });
    
    if (result.success && result.data && result.data.success) {
        return {
            success: true,
            user: result.data.user,
            message: 'Login realizado com sucesso'
        };
    } else {
        console.log('⚠️ Login via Apps Script falhou, tentando CSV...');
        return await loginUserViaCSV(username, password);
    }
}

async function loginUserViaCSV(username, password) {
    try {
        const sheetData = await fetchSheetData();
        const user = sheetData.find(u => u.Use === username && u.Password === password);
        
        if (user) {
            return {
                success: true,
                user: {
                    username: user.Use,
                    score: user.Score || 0,
                    position: user.position || 0
                }
            };
        }
        return { success: false, error: 'Usuário ou senha inválidos' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateScoreInSheets(username, score) {
    console.log('🎯 Atualizando pontuação no Sheets:', { username, score });
    
    const result = await callGoogleAppsScript('updateScore', {
        username: username,
        score: score.toString()
    });
    
    if (result.success && result.data && result.data.success !== false) {
        console.log('✅ Pontuação atualizada via Apps Script');
        return { success: true, message: 'Pontuação atualizada com sucesso' };
    }
    
    console.log('⚠️ Apps Script falhou, usando método alternativo...');
    return { 
        success: false, 
        error: 'Não foi possível atualizar a pontuação no momento. Tente novamente mais tarde.' 
    };
}

async function getRankingFromSheets() {
    try {
        const result = await callGoogleAppsScript('getRanking');
        
        if (result.success && result.data && result.data.ranking) {
            console.log('🏆 Ranking carregado via Apps Script:', result.data.ranking);
            return result.data.ranking;
        }
        
        console.log('⚠️ Ranking via Apps Script falhou, usando CSV...');
        const sheetData = await fetchSheetData();
        
        if (sheetData.length === 0) {
            throw new Error('Planilha está vazia ou formato incorreto');
        }
        
        const sortedData = sheetData.sort((a, b) => (b.Score || 0) - (a.Score || 0));
        
        const rankedData = [];
        let currentRank = 1;
        let currentScore = sortedData[0] ? (sortedData[0].Score || 0) : 0;
        
        sortedData.forEach((user, index) => {
            if ((user.Score || 0) < currentScore) {
                currentRank = index + 1;
                currentScore = user.Score || 0;
            }
            
            rankedData.push({
                username: user.Use,
                score: user.Score || 0,
                position: currentRank,
                source: 'google_sheets'
            });
        });
        
        return rankedData;
        
    } catch (error) {
        console.error('💥 Erro ao buscar ranking:', error);
        throw error;
    }
}

async function fetchSheetData() {
    try {
        const config = await loadSheetsConfig();
        const sheetId = config.google_sheets.sheet_id;
        
        console.log('🔄 Buscando dados da planilha via CSV:', sheetId);
        
        const csvData = await fetchCSVData(sheetId);
        const parsedData = parseCSV(csvData);
        
        console.log('✅ Dados CSV carregados:', parsedData);
        return parsedData;
        
    } catch (error) {
        console.error('❌ Erro ao buscar dados CSV:', error);
        return [];
    }
}

async function fetchCSVData(sheetId) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&timestamp=${Date.now()}`;
    
    console.log('📤 Fazendo requisição CSV para:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    if (csvText.includes('</html>') || csvText.includes('<html>')) {
        throw new Error('Planilha não está pública ou acesso negado');
    }
    
    return csvText;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const result = [];
    
    console.log('📝 Linhas CSV encontradas:', lines.length);
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        
        if (cells.length >= 3) {
            const userData = {
                Use: cells[0] || '',
                Password: cells[1] || '',
                Score: parseInt(cells[2]) || 0,
                position: cells[3] ? parseInt(cells[3]) : (i)
            };
            
            if (userData.Use && userData.Use !== 'Use' && userData.Use !== 'Nome') {
                result.push(userData);
            }
        }
    }
    
    return result;
}

async function syncWithGoogleSheets() {
    try {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.log('⚠️ Nenhum usuário logado para sincronizar');
            return { success: false, error: 'Nenhum usuário logado' };
        }
        
        console.log('🔄 Sincronizando pontuação com Google Sheets:', {
            username: currentUser.username,
            score: currentUser.score
        });
        
        const result = await updateScoreInSheets(currentUser.username, currentUser.score);
        
        if (result.success) {
            console.log('✅ Dados sincronizados com Google Sheets');
            localStorage.setItem('lastSheetSync', JSON.stringify({
                timestamp: new Date().toISOString(),
                data: currentUser
            }));
            return { success: true, message: 'Dados sincronizados com sucesso' };
        } else {
            console.log('⚠️ Sincronização falhou:', result.error);
            return { success: false, error: result.error };
        }
        
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        return { success: false, error: error.message };
    }
}

async function checkSheetStatus() {
    try {
        const config = await loadSheetsConfig();
        const data = await fetchSheetData();
        
        return {
            connected: true,
            sheetId: config.google_sheets.sheet_id,
            dataCount: data.length,
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message,
            lastUpdate: new Date().toISOString()
        };
    }
}

async function testSheetConnection() {
    try {
        const config = await loadSheetsConfig();
        const testUrl = `https://docs.google.com/spreadsheets/d/${config.google_sheets.sheet_id}/export?format=csv`;
        
        const response = await fetch(testUrl);
        const text = await response.text();
        
        return {
            success: true,
            url: testUrl,
            status: response.status,
            dataPreview: text.substring(0, 200) + '...'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function initializeGoogleSheets() {
    console.log('🚀 Inicializando Google Sheets...');
    
    loadSheetsConfig().then(() => {
        console.log('✅ Configuração do Google Sheets carregada');
    });
    
    checkSheetStatus().then(status => {
        console.log('📊 Status da planilha:', status);
    });
}

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

async function debugSheetsConnection() {
    try {
        const data = await fetchSheetData();
        return data;
    } catch (error) {
        throw error;
    }
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

async function saveGameScore(score) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'Usuário não logado' };
        }
        
        console.log('💾 Salvando pontuação do jogo:', { username: currentUser.username, score });
        
        currentUser.score = score;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].score = score;
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        const syncResult = await updateScoreInSheets(currentUser.username, score);
        
        if (syncResult.success) {
            console.log('✅ Pontuação salva e sincronizada com sucesso');
            return { success: true, message: 'Pontuação salva com sucesso' };
        } else {
            console.log('⚠️ Pontuação salva localmente, mas falhou no Google Sheets:', syncResult.error);
            return { 
                success: true, 
                message: 'Pontuação salva localmente',
                warning: 'Falha na sincronização com Google Sheets' 
            };
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar pontuação:', error);
        return { success: false, error: error.message };
    }
}