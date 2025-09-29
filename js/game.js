let currentGame = {
    mode: null,
    subjects: [],
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctAnswers: 0,
    totalQuestions: 10,
    startTime: null,
    timeLeft: 90,
    timer: null,
    timeLimit: 90,
    selectedTimeLimit: 90,
    selectedQuestionCount: 10
};

function startGame(mode) {
    console.log('Iniciando jogo no modo:', mode);
    
    if (!checkAuthentication()) {
        alert('⚠️ Você precisa estar logado para jogar!');
        window.location.href = 'login.html';
        return;
    }
    
    currentGame.mode = mode;
    
    const timeLimitSelect = document.getElementById('timeLimit');
    const questionCountSelect = document.getElementById('questionCount');
    
    if (timeLimitSelect) {
        currentGame.selectedTimeLimit = parseInt(timeLimitSelect.value);
        currentGame.timeLimit = currentGame.selectedTimeLimit;
        currentGame.timeLeft = currentGame.selectedTimeLimit;
    }
    
    if (questionCountSelect) {
        currentGame.selectedQuestionCount = parseInt(questionCountSelect.value);
        currentGame.totalQuestions = currentGame.selectedQuestionCount;
    }
    
    if (mode === 'single') {
        const subject = document.getElementById('singleSubject').value;
        currentGame.subjects = [subject];
    } else if (mode === 'mixed') {
        currentGame.subjects = ['programacao', 'matematica', 'biologia', 'portugues', 'historia', 'outras'];
    } else if (mode === 'custom') {
        const selectedSubjects = Array.from(document.querySelectorAll('input[name="subject"]:checked'))
            .map(input => input.value);
        currentGame.subjects = selectedSubjects.length > 0 ? selectedSubjects : ['programacao'];
    }
    
    console.log('Configurações:', {
        timeLimit: currentGame.timeLimit,
        questionCount: currentGame.totalQuestions,
        subjects: currentGame.subjects
    });
    
    loadQuestions().then(() => {
        if (currentGame.questions.length === 0) {
            alert('Não há perguntas disponíveis para as matérias selecionadas.');
            return;
        }
        
        if (currentGame.questions.length > currentGame.totalQuestions) {
            currentGame.questions = shuffleArray(currentGame.questions).slice(0, currentGame.totalQuestions);
        }
        
        initializeGame();
    }).catch(error => {
        console.error('Erro ao carregar perguntas:', error);
        alert('Erro ao carregar as perguntas. Tente novamente.');
    });
}

function initializeGame() {
    currentGame.currentQuestionIndex = 0;
    currentGame.score = 0;
    currentGame.streak = 0;
    currentGame.maxStreak = 0;
    currentGame.correctAnswers = 0;
    currentGame.startTime = Date.now();
    currentGame.timeLeft = currentGame.timeLimit;
    
    document.getElementById('gameSelection').classList.remove('active');
    document.getElementById('gameArea').classList.add('active');
    document.getElementById('results').classList.remove('active');
    
    document.getElementById('score').textContent = '0';
    document.getElementById('streak').textContent = '0';
    document.getElementById('timeLeft').textContent = `⏱️ ${formatTime(currentGame.timeLeft)}`;
    
    showQuestion();
    startGlobalTimer();
}

async function loadQuestions() {
    currentGame.questions = [];
    
    for (const subject of currentGame.subjects) {
        try {
            const response = await fetch(`../data/${subject}.json`);
            if (!response.ok) continue;
            
            const questions = await response.json();
            const subjectQuestions = questions.map(q => ({
                ...q,
                subject: subject
            }));
            
            currentGame.questions.push(...subjectQuestions);
        } catch (error) {
            console.error(`Erro ao carregar perguntas de ${subject}:`, error);
        }
    }
    
    currentGame.questions = shuffleArray(currentGame.questions);
    console.log(`Total de perguntas carregadas: ${currentGame.questions.length}`);
    return currentGame.questions;
}

function showQuestion() {
    const question = currentGame.questions[currentGame.currentQuestionIndex];
    if (!question) return;
    
    document.getElementById('questionNumber').textContent = 
        `Pergunta ${currentGame.currentQuestionIndex + 1} de ${currentGame.totalQuestions}`;
    
    document.getElementById('questionText').textContent = question.pergunta;
    
    const options = [
        { number: '1', text: question.opcao_1 },
        { number: '2', text: question.opcao_2 },
        { number: '3', text: question.opcao_3 },
        { number: '4', text: question.opcao_4 },
        { number: '5', text: question.opcao_5 }
    ];
    
    const shuffledOptions = shuffleArray(options);
    
    document.getElementById('optionA').textContent = shuffledOptions[0].text;
    document.getElementById('optionB').textContent = shuffledOptions[1].text;
    document.getElementById('optionC').textContent = shuffledOptions[2].text;
    document.getElementById('optionD').textContent = shuffledOptions[3].text;
    document.getElementById('optionE').textContent = shuffledOptions[4].text;
    
    currentGame.currentQuestionMapping = {
        'a': shuffledOptions[0].number,
        'b': shuffledOptions[1].number,
        'c': shuffledOptions[2].number,
        'd': shuffledOptions[3].number,
        'e': shuffledOptions[4].number
    };
    
    currentGame.reverseMapping = {};
    Object.keys(currentGame.currentQuestionMapping).forEach(letter => {
        currentGame.reverseMapping[currentGame.currentQuestionMapping[letter]] = letter;
    });
    
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    
    document.getElementById('nextBtn').disabled = true;
    
    console.log('Resposta correta (número):', question.resposta);
    console.log('Mapeamento:', currentGame.currentQuestionMapping);
}

function startGlobalTimer() {
    clearInterval(currentGame.timer);
    
    currentGame.timer = setInterval(() => {
        currentGame.timeLeft--;
        document.getElementById('timeLeft').textContent = `⏱️ ${formatTime(currentGame.timeLeft)}`;
        
        if (currentGame.timeLeft <= 0) {
            clearInterval(currentGame.timer);
            endGame();
        }
    }, 1000);
}

function selectAnswer(selectedLetter) {
    console.log('Resposta selecionada (letra):', selectedLetter);
    
    clearInterval(currentGame.timer);
    
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => btn.disabled = true);
    
    const question = currentGame.questions[currentGame.currentQuestionIndex];
    const correctNumber = question.resposta;
    const correctLetter = currentGame.reverseMapping[correctNumber];
    
    console.log('Resposta correta (número):', correctNumber);
    console.log('Resposta correta (letra):', correctLetter);
    
    if (selectedLetter === correctLetter) {
        document.querySelector(`.option-btn[data-option="${selectedLetter}"]`).classList.add('correct');
        
        const basePoints = 10;
        const timeBonus = Math.max(1, Math.floor((currentGame.timeLeft / currentGame.timeLimit) * 10));
        const streakBonus = Math.min(currentGame.streak * 2, 10);
        const questionPoints = basePoints + timeBonus + streakBonus;
        
        currentGame.score += questionPoints;
        currentGame.correctAnswers++;
        currentGame.streak++;
        
        if (currentGame.streak > currentGame.maxStreak) {
            currentGame.maxStreak = currentGame.streak;
        }
        
        console.log(`✅ Resposta correta! +${questionPoints} pontos`, {
            base: basePoints,
            tempo: timeBonus,
            streak: streakBonus,
            streakAtual: currentGame.streak
        });
    } else {
        document.querySelector(`.option-btn[data-option="${selectedLetter}"]`).classList.add('incorrect');
        document.querySelector(`.option-btn[data-option="${correctLetter}"]`).classList.add('correct');
        currentGame.streak = 0;
        console.log('❌ Resposta incorreta! Streak resetado.');
    }
    
    document.getElementById('score').textContent = currentGame.score;
    document.getElementById('streak').textContent = currentGame.streak;
    document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
    currentGame.currentQuestionIndex++;
    
    if (currentGame.currentQuestionIndex < currentGame.totalQuestions) {
        showQuestion();
        startGlobalTimer();
    } else {
        endGame();
    }
}

function endGame() {
    clearInterval(currentGame.timer);
    
    const totalTime = Math.floor((Date.now() - currentGame.startTime) / 1000);
    const timeRemaining = currentGame.timeLeft;
    
    updateUserScore(currentGame.score, currentGame.correctAnswers, currentGame.totalQuestions, currentGame.maxStreak);
    
    document.getElementById('gameArea').classList.remove('active');
    document.getElementById('results').classList.add('active');
    
    document.getElementById('finalScore').textContent = currentGame.score;
    document.getElementById('correctAnswers').textContent = currentGame.correctAnswers;
    document.getElementById('totalQuestions').textContent = currentGame.totalQuestions;
    document.getElementById('maxStreak').textContent = currentGame.maxStreak;
    document.getElementById('totalTime').textContent = `${formatTime(totalTime)}`;
    document.getElementById('timeRemaining').textContent = `${formatTime(timeRemaining)}`;
    
    console.log('Jogo finalizado!', {
        score: currentGame.score,
        correctAnswers: currentGame.correctAnswers,
        totalQuestions: currentGame.totalQuestions,
        maxStreak: currentGame.maxStreak,
        totalTime: totalTime,
        timeRemaining: timeRemaining
    });
}

async function updateUserScore(newScore, correctAnswers, totalQuestions, maxStreak) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (!currentUser) {
            console.log('⚠️ Nenhum usuário logado para atualizar pontuação');
            showSyncNotification('❌ Erro: Usuário não está logado', 'error');
            return;
        }
        
        const currentRecord = currentUser.recordScore || 0;
        const isNewRecord = newScore > currentRecord;
        
        console.log('🔄 Verificando pontuação:', {
            username: currentUser.username,
            pontuacaoPartida: newScore,
            recordeAtual: currentRecord,
            superouRecorde: isNewRecord
        });
        
        currentUser.correctAnswers = correctAnswers;
        currentUser.totalQuestions = totalQuestions;
        currentUser.maxStreak = maxStreak;
        currentUser.lastPlayed = new Date().toISOString();
        
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].correctAnswers = correctAnswers;
            users[userIndex].totalQuestions = totalQuestions;
            users[userIndex].maxStreak = maxStreak;
            users[userIndex].lastPlayed = new Date().toISOString();
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('✅ Estatísticas atualizadas localmente');
        
        console.log('🔄 Verificando se deve sincronizar com Google Sheets...');
        
        if (!isNewRecord) {
            console.log(`📊 Pontuação ${newScore} não superou o recorde ${currentRecord}. Não sincronizando.`);
            showSyncNotification(`📊 Pontuação: ${newScore} pontos (Seu recorde: ${currentRecord})`, 'info');
            return;
        }
        
        if (typeof saveGameScore === 'function') {
            console.log('🎯 Usando saveGameScore para salvar NOVO RECORDE...');
            const result = await saveGameScore(newScore);
            
            if (result.success) {
                if (result.isNewRecord) {
                    console.log('✅ NOVO RECORDE sincronizado com Google Sheets!');
                    showSyncNotification(`🎉 NOVO RECORDE! ${newScore} pontos!`, 'success');
                } else {
                    console.log('📊 Pontuação normal salva localmente');
                    showSyncNotification(`📊 Pontuação: ${newScore} pontos (Seu recorde: ${result.currentRecord})`, 'info');
                }
            } else {
                console.log('⚠️ Erro ao salvar pontuação:', result.error);
                showSyncNotification('⚠️ Erro ao salvar pontuação', 'warning');
            }
        } 
        else if (typeof updateScoreInSheets === 'function') {
            console.log('🎯 Usando updateScoreInSheets diretamente...');
            const result = await updateScoreInSheets(currentUser.username, newScore);
            
            if (result.success) {
                console.log('✅ Pontuação sincronizada com Google Sheets');
                showSyncNotification(`🎉 NOVO RECORDE! ${newScore} pontos!`, 'success');
                
                currentUser.recordScore = newScore;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } else {
                console.log('⚠️ Pontuação não sincronizada:', result.error);
                showSyncNotification('⚠️ Pontuação salva localmente apenas', 'warning');
            }
        }
        else {
            console.log('❌ Nenhuma função de sincronização disponível');
            showSyncNotification('⚠️ Pontuação salva apenas localmente', 'warning');
        }
        
    } catch (error) {
        console.error('💥 Erro crítico ao atualizar pontuação:', error);
        showSyncNotification('❌ Erro ao salvar pontuação', 'error');
    }
}

function showSyncNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        border-left: 5px solid;
    `;
    
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.borderLeftColor = '#2E7D32';
        notification.classList.add('celebrate');
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#FF9800';
        notification.style.borderLeftColor = '#E65100';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
        notification.style.borderLeftColor = '#B71C1C';
    } else {
        notification.style.backgroundColor = '#2196F3';
        notification.style.borderLeftColor = '#0D47A1';
    }
    
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes celebrate {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .celebrate {
        animation: celebrate 0.5s ease-in-out 3;
    }
`;
document.head.appendChild(notificationStyle);

function playAgain() {
    document.getElementById('results').classList.remove('active');
    document.getElementById('gameSelection').classList.add('active');
}

function goHome() {
    window.location.href = '../index.html';
}

function quitGame() {
    if (confirm('Tem certeza que deseja sair? Seu progresso será perdido.')) {
        window.location.href = '../index.html';
    }
}

function checkAuthentication() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    return !!user;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const gameStyle = document.createElement('style');
gameStyle.textContent = `
    .game-section {
        display: none;
    }
    .game-section.active {
        display: block;
    }
    
    .option-btn.correct {
        background-color: #4CAF50 !important;
        color: white !important;
        border-color: #4CAF50 !important;
    }
    
    .option-btn.incorrect {
        background-color: #f44336 !important;
        color: white !important;
        border-color: #f44336 !important;
    }
    
    .option-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(gameStyle);
