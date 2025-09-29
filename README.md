# QuizGame

Um jogo de perguntas e respostas educacional com múltiplas funcionalidades.

## Funcionalidades

- **Sistema de Autenticação**: Registro e login de usuários com validação
- **Múltiplos Modos de Jogo**: Modo único, misto e personalizado
- **Diversas Matérias**: Programação, Matemática, Biologia, Português, História e outras
- **Sistema de Ranking**: Ranking global e pessoal com animações para empates
- **Salas de Jogo**: Criação de salas para mini torneios
- **Temas**: Modo claro e escuro
- **Proteção contra DDoS**: Limitação de tentativas de login
- **Pontuação com Bônus**: Bônus por tempo e sequência de acertos

## Como Usar

1. **Registro/Login**: Crie uma conta ou faça login
2. **Selecionar Modo**: Escolha entre modo único, misto ou personalizado
3. **Jogar**: Responda perguntas dentro do tempo limite
4. **Ver Ranking**: Confira sua posição no ranking global
5. **Criar Salas**: Crie salas para jogar com amigos

## Estrutura de Arquivos

- `index.html` - Página inicial
- `login.html` - Página de autenticação
- `game.html` - Página do jogo
- `ranking.html` - Página de ranking
- `room.html` - Página de salas
- `css/` - Arquivos de estilo
- `js/` - Scripts JavaScript
- `data/` - Banco de dados de perguntas em JSON

## Tecnologias Utilizadas

- HTML5
- CSS3 (com variáveis para temas)
- JavaScript (ES6+)
- LocalStorage para persistência de dados

## Personalização

### Adicionar Novas Perguntas

Edite os arquivos JSON na pasta `data/` seguindo o formato:

```json
{
  "id": "mat0001",
  "pergunta": "Qual é a pergunta?",
  "opcao_a": "Opção 1",
  "opcao_b": "Opção 2",
  "opcao_c": "Opção 3",
  "opcao_d": "Opção 4",
  "opcao_e": "Opção 5",
  "resposta": "2"
}