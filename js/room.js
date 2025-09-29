// Sistema de salas

let currentRoom = null;
let roomGame = null;

// Criar sala
function createRoom(e) {
    e.preventDefault();
    
    const roomName = document.getElementById('roomName').value;
    const playersText = document.getElementById('roomPlayers').value;
    const selectedSubjects = Array.from(document.querySelectorAll('input[name="roomSubject"]:checked'))
        .map(input => input.value);
    const questionCount = parseInt(document.getElementById('roomQuestions').value);
    
    // Validar entrada
    if (!roomName.trim()) {
        alert('Por favor, insira um nome para a sala.');
        return;
    }
    
    if (!playersText.trim()) {
        alert('Por favor, insira pelo menos um jogador.');
        return;
    }
    
    if (selectedSubjects.length === 0) {
        alert('Por favor, selecione pelo menos uma matéria.');
        return;
    }
    
    // Processar lista de jogadores
    const players = playersText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .map((name, index) => ({
            id: `player-${index}`,
            name: name,
            score: 0,
            answered: false
        }));
    
    // Criar sala
    currentRoom = {
        id: generateId(),
        name: roomName,
        players: players,
        subjects: selectedSubjects,
        questionCount: questionCount,
        currentQuestionIndex: 0,
        status: 'selecting', // selecting, playing, results
        created: new Date().toISOString()
    };
    
    // Salvar sala
    saveRoom(currentRoom);
    
    // Mostrar área de jogo da sala
    document.getElementById('createRoom').style.display = 'none';
    document.getElementById('roomGame').style.display = 'block';
    document.getElementById('currentRoomName').textContent = roomName;
    
    // Iniciar seleção de jogador
    startPlayerSelection();
}

// Salvar sala
function saveRoom(room) {
    const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    
    // Remover sala existente com mesmo ID (se houver)
    const existingIndex = rooms.findIndex(r => r.id === room.id);
    if (existingIndex !== -1) {
        rooms[existingIndex] = room;
    } else {
        rooms.push(room);
    }
    
    localStorage.setItem('rooms', JSON.stringify(rooms));
}

// Carregar salas disponíveis
function loadAvailableRooms() {
    const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    const availableRooms = rooms.filter(room => room.status === 'selecting' || room.status === 'playing');
    
    const roomsList = document.getElementById('availableRooms');
    roomsList.innerHTML = '';
    
    if (availableRooms.length === 0) {
        roomsList.innerHTML = '<p>Nenhuma sala disponível no momento.</p>';
        return;
    }
    
    availableRooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.innerHTML = `
            <h3>${room.name}</h3>
            <p>Jogadores: ${room.players.length}</p>
            <p>Status: ${room.status === 'selecting' ? 'Selecionando' : 'Em andamento'}</p>
        `;
        
        roomItem.addEventListener('click', () => {
            joinRoom(room.id);
        });
        
        roomsList.appendChild(roomItem);
    });
}

// Entrar em sala
function joinRoom(roomId) {
    const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    currentRoom = rooms.find(room => room.id === roomId);
    
    if (!currentRoom) {
        alert('Sala não encontrada.');
        return;
    }
    
    // Mostrar área de jogo da sala
    document.getElementById('joinRoom').style.display = 'none';
    document.getElementById('roomGame').style.display = 'block';
    document.getElementById('currentRoomName').textContent = currentRoom.name;
    
    if (currentRoom.status === 'selecting') {
        startPlayerSelection();
    } else if (currentRoom.status === 'playing') {
        // Implementar entrada em jogo em andamento (se necessário)
        alert('O jogo já começou. Você pode observar, mas não participar.');
    }
}

// Iniciar seleção de jogador
function startPlayerSelection() {
    const playerSelection = document.getElementById('playerSelection');
    playerSelection.innerHTML = '';
    
    currentRoom.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.textContent = player.name;
        playerCard.setAttribute('data-player-id', player.id);
        
        playerCard.addEventListener('click', () => {
            // Selecionar/deselecionar jogador
            if (playerCard.classList.contains('selected')) {
                playerCard.classList.remove('selected');
            } else {
                playerCard.classList.add('selected');
            }
            
            // Verificar se há jogadores selecionados
            const selectedPlayers = document.querySelectorAll('.player-card.selected');
            document.getElementById('startRoomGame').disabled = selectedPlayers.length === 0;
        });
        
        playerSelection.appendChild(playerCard);
    });
    
    // Mostrar fase de seleção
    document.getElementById('roomSelection').style.display = 'block';
    document.getElementById('roomGameArea').style.display = 'none';
    document.getElementById('roomResults').style.display = 'none';
}

// Iniciar jogo da sala
function startRoomGame() {
    const selectedPlayerCards = document.querySelectorAll('.player-card.selected');
    const selectedPlayerIds = Array.from(selectedPlayerCards).map(card => card.getAttribute('data-player-id'));
    
    // Filtrar jogadores selecionados
    currentRoom.currentPlayers = currentRoom.players.filter(player => 
        selectedPlayerIds.includes(player.id)
    );
    
    // Resetar pontuações
    currentRoom.currentPlayers.forEach(player => {
        player.score = 0;
        player.answered = false;
    });
    
    // Carregar perguntas
    loadRoomQuestions().then(() => {
        if (currentRoom.questions.length === 0) {
            alert('Não há perguntas disponíveis para as matérias selecionadas.');
            return;
        }
        
        // Inicializar jogo
        currentRoom.currentQuestionIndex = 0;
        currentRoom.status = 'playing';
        saveRoom(currentRoom);
        
        // Mostrar área de jogo
        document.getElementById('roomSelection').style.display = 'none';
        document.getElementById('roomGameArea').style.display = 'block';
        
        // Mostrar primeira pergunta
        showRoomQuestion();
    });
}

// Carregar perguntas para a sala
async function loadRoomQuestions() {
    currentRoom.questions = [];
    
    for (const subject of currentRoom.subjects) {
        try {
            const response = await fetch(`data/${subject}.json`);
            const questions = await response.json();
            
            // Adicionar ID da matéria a cada pergunta
            const subjectQuestions = questions.map(q => ({
                ...q,
                subject: subject
            }));
            
            currentRoom.questions.push(...subjectQuestions);
        } catch (error) {
            console.error(`Erro ao carregar perguntas de ${subject}:`, error);
        }
    }
    
    // Embaralhar e limitar ao número de perguntas
    currentRoom.questions = shuffleArray(currentRoom.questions).slice(0, currentRoom.questionCount);
}

// Mostrar pergunta da sala
function showRoomQuestion() {
    const question = currentRoom.questions[currentRoom.currentQuestionIndex];
    
    // Atualizar número da pergunta
    document.getElementById('roomQuestionNumber').textContent = 
        `Pergunta ${currentRoom.currentQuestionIndex + 1} de ${currentRoom.questions.length}`;
    
    // Atualizar texto da pergunta
    document.getElementById('roomQuestionText').textContent = question.pergunta;
    
    // Embaralhar opções
    const options = [
        { letter: 'a', text: question.opcao_a },
        { letter: 'b', text: question.opcao_b },
        { letter: 'c', text: question.opcao_c },
        { letter: 'd', text: question.opcao_d },
        { letter: 'e', text: question.opcao_e }
    ];
    
    const shuffledOptions = shuffleArray(options);
    
    // Atualizar botões de opção
    document.getElementById('roomOptionA').textContent = shuffledOptions[0].text;
    document.getElementById('roomOptionB').textContent = shuffledOptions[1].text;
    document.getElementById('roomOptionC').textContent = shuffledOptions[2].text;
    document.getElementById('roomOptionD').textContent = shuffledOptions[3].text;
    document.getElementById('roomOptionE').textContent = shuffledOptions[4].text;
    
    // Armazenar mapeamento de opções embaralhadas
    currentRoom.currentQuestionMapping = {};
    shuffledOptions.forEach((option, index) => {
        currentRoom.currentQuestionMapping[String.fromCharCode(97 + index)] = option.letter;
    });
    
    // Reverter o mapeamento para verificar a resposta
    currentRoom.reverseMapping = {};
    Object.keys(currentRoom.currentQuestionMapping).forEach(key => {
        currentRoom.reverseMapping[currentRoom.currentQuestionMapping[key]] = key;
    });
    
    // Resetar botões
    const optionButtons = document.querySelectorAll('#roomGameArea .option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    
    // Desabilitar botão próxima
    document.getElementById('roomNextBtn').disabled = true;
    
    // Resetar estado dos jogadores
    currentRoom.currentPlayers.forEach(player => {
        player.answered = false;
    });
}

// Selecionar resposta na sala
function selectRoomAnswer(selectedOption) {
    // Desabilitar todos os botões
    const optionButtons = document.querySelectorAll('#roomGameArea .option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = true;
    });
    
    const question = currentRoom.questions[currentRoom.currentQuestionIndex];
    const correctLetter = currentRoom.reverseMapping[question.resposta];
    
    // Verificar resposta
    if (selectedOption === correctLetter) {
        // Resposta correta
        document.querySelector(`#roomGameArea .option-btn[data-option="${selectedOption}"]`).classList.add('correct');
        
        // Atribuir pontos (fixos para sala)
        const points = 10;
        
        // Atualizar pontuação do jogador atual (simulação)
        // Em um sistema real, isso seria baseado em quem está jogando
        if (currentRoom.currentPlayers.length > 0) {
            currentRoom.currentPlayers[0].score += points;
        }
    } else {
        // Resposta incorreta
        document.querySelector(`#roomGameArea .option-btn[data-option="${selectedOption}"]`).classList.add('incorrect');
        document.querySelector(`#roomGameArea .option-btn[data-option="${correctLetter}"]`).classList.add('correct');
    }
    
    // Habilitar botão próxima
    document.getElementById('roomNextBtn').disabled = false;
}

// Próxima pergunta na sala
function nextRoomQuestion() {
    currentRoom.currentQuestionIndex++;
    
    if (currentRoom.currentQuestionIndex < currentRoom.questions.length) {
        showRoomQuestion();
    } else {
        endRoomGame();
    }
}

// Finalizar jogo da sala
function endRoomGame() {
    currentRoom.status = 'results';
    saveRoom(currentRoom);
    
    // Mostrar resultados
    document.getElementById('roomGameArea').style.display = 'none';
    document.getElementById('roomResults').style.display = 'block';
    
    // Ordenar jogadores por pontuação
    const sortedPlayers = [...currentRoom.currentPlayers].sort((a, b) => b.score - a.score);
    
    // Exibir ranking
    const roomRanking = document.getElementById('roomRanking');
    roomRanking.innerHTML = '';
    
    sortedPlayers.forEach((player, index) => {
        const rankingItem = document.createElement('div');
        rankingItem.className = 'ranking-item';
        
        if (index === 0) rankingItem.classList.add('first');
        if (index === 1) rankingItem.classList.add('second');
        if (index === 2) rankingItem.classList.add('third');
        
        rankingItem.innerHTML = `
            <div class="ranking-position">${index + 1}º</div>
            <div class="ranking-name">${player.name}</div>
            <div class="ranking-score">${player.score} pts</div>
        `;
        
        roomRanking.appendChild(rankingItem);
    });
}

// Reiniciar jogo da sala
function restartRoomGame() {
    // Voltar para seleção de jogadores
    document.getElementById('roomResults').style.display = 'none';
    document.getElementById('roomSelection').style.display = 'block';
    
    // Resetar seleção
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    document.getElementById('startRoomGame').disabled = true;
}

// Fechar sala
function closeRoom() {
    if (confirm('Tem certeza que deseja fechar a sala?')) {
        // Remover sala
        const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
        const updatedRooms = rooms.filter(room => room.id !== currentRoom.id);
        localStorage.setItem('rooms', JSON.stringify(updatedRooms));
        
        // Voltar ao início
        window.location.href = 'index.html';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Botão iniciar jogo da sala
    const startRoomGameBtn = document.getElementById('startRoomGame');
    if (startRoomGameBtn) {
        startRoomGameBtn.addEventListener('click', startRoomGame);
    }
    
    // Botão próxima pergunta da sala
    const roomNextBtn = document.getElementById('roomNextBtn');
    if (roomNextBtn) {
        roomNextBtn.addEventListener('click', nextRoomQuestion);
    }
    
    // Botões de opção da sala
    const roomOptionButtons = document.querySelectorAll('#roomGameArea .option-btn');
    roomOptionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedOption = this.getAttribute('data-option');
            selectRoomAnswer(selectedOption);
        });
    });
});

// Exportar funções para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createRoom,
        joinRoom,
        startRoomGame,
        nextRoomQuestion,
        endRoomGame,
        restartRoomGame,
        closeRoom
    };
}