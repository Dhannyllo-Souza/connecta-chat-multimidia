document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.querySelector('.messages-container');
    const serverIcons = document.querySelectorAll('.servers-bar .server-icon:not(.logo):not(.add-server)');
    const serverNameEl = document.getElementById('server-name');
    const channelListContainer = document.getElementById('channel-list-container');
    const chatHeaderName = document.querySelector('.chat-header .channel-name h2');
    const chatLayout = document.getElementById('chat-layout');
    const toggleUserListBtn = document.getElementById('toggle-user-list');
    const mainViewWrapper = document.getElementById('main-view-wrapper');
    const imageModal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModalBtn = document.querySelector('.close-modal');
    const exportChatBtn = document.getElementById('export-chat-btn');

    let currentServerKey = 'server-icon-1';
    let currentChannelName = 'geral';

    // --- Audio Context for Sound Effects ---
    let audioContext;
    let thinkingBuffer;

    async function setupAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch('ai_thinking.mp3');
            const arrayBuffer = await response.arrayBuffer();
            thinkingBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("Failed to load or decode audio:", e);
        }
    }

    function playSound(buffer) {
        if (!audioContext || !buffer || audioContext.state === 'suspended') return;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
    
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });

    // --- Mobile Navigation ---
    const toggleChannelsBtn = document.getElementById('toggle-channels-btn');
    
    toggleChannelsBtn.addEventListener('click', () => {
        appContainer.classList.toggle('channels-visible');
    });

    mainViewWrapper.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && appContainer.classList.contains('channels-visible')) {
            // Check if the click is on the main content area itself, not the overlaid channel list
            if (!e.target.closest('.channels-bar')) {
                 appContainer.classList.remove('channels-visible');
            }
        }
    });

    // --- Message Persistence ---
    const messageHistory = JSON.parse(localStorage.getItem('connectaChatHistory')) || {};

    function getChannelKey() {
        return `${currentServerKey}/${currentChannelName}`;
    }

    function saveMessages() {
        localStorage.setItem('connectaChatHistory', JSON.stringify(messageHistory));
    }

    function addMessageToHistory(content, user) {
        const channelKey = getChannelKey();
        if (!messageHistory[channelKey]) {
            messageHistory[channelKey] = [];
        }
        
        const timestamp = new Date().toISOString();
        const messageData = { content, user, timestamp };
        messageHistory[channelKey].push(messageData);
        saveMessages();
        return messageData;
    }

    function renderMessagesForChannel() {
        messagesContainer.innerHTML = '';
        const channelKey = getChannelKey();
        const messages = messageHistory[channelKey] || [];

        if (messages.length === 0) {
            // No history, show welcome message
            const welcomeMessageData = { 
                content: { text: `Bem-vindo ao canal #${currentChannelName}! Este é o início deste canal.\n\nApresento a você o nosso **AI Assistant**. Ele foi aprimorado para ser mais estável e preciso. Experimente mencioná-lo digitando \`@AI ajuda\` para ver seus novos recursos.` },
                user: users.connectaBot
            };
            const welcomeMessage = createMessageElement(welcomeMessageData);
            messagesContainer.appendChild(welcomeMessage);
        } else {
            messages.forEach(msg => {
                const messageElement = createMessageElement(msg);
                messagesContainer.appendChild(messageElement);
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // --- Mock Data ---
    const users = {
        currentUser: { id: 'currentUser', name: 'Usuário', avatar: 'user-avatar-1.png' },
        aiAssistant: { id: 'aiAssistant', name: 'AI Assistant', avatar: 'ai-avatar.png', isBot: true },
        connectaBot: { id: 'connectaBot', name: 'Connecta Bot', avatar: 'user-avatar-3.png', isBot: true },
    };

    const serverData = {
        'server-icon-1': {
            name: 'Comunidade de Jogos',
            categories: [
                {
                    name: 'CANAIS DE TEXTO',
                    channels: [
                        { name: 'geral', icon: 'fa-hashtag', active: true },
                        { name: 'memes', icon: 'fa-hashtag' },
                        { name: 'clips', icon: 'fa-hashtag' },
                    ]
                },
                {
                    name: 'CANAIS DE VOZ',
                    channels: [
                        { name: 'Lobby', icon: 'fa-volume-high' },
                        { name: 'Jogatina', icon: 'fa-volume-high' },
                    ]
                }
            ]
        },
        'server-icon-2': {
            name: 'Grupo de Estudos',
            categories: [
                {
                    name: 'CANAIS DE TEXTO',
                    channels: [
                        { name: 'avisos', icon: 'fa-hashtag', active: true },
                        { name: 'discussão-dev', icon: 'fa-hashtag' },
                        { name: 'dúvidas', icon: 'fa-hashtag' },
                    ]
                },
                {
                    name: 'CANAIS DE VOZ',
                    channels: [
                        { name: 'Sala de Foco', icon: 'fa-volume-high' },
                        { name: 'Bate-papo', icon: 'fa-volume-high' },
                    ]
                }
            ]
        }
    };
    
    // --- Message Sending Logic ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        const messageData = addMessageToHistory({ text: messageText }, users.currentUser);
        const messageElement = createMessageElement(messageData);
        messagesContainer.appendChild(messageElement);

        messageInput.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (messageText.toLowerCase().startsWith('@ai')) {
            showTypingIndicator();
            setTimeout(() => getAIResponse(messageText), 1500 + Math.random() * 1000);
        }
    }
    
    function getAIResponse(prompt) {
        hideTypingIndicator();
        const responseContent = generateAIResponse(prompt);
        const responseData = addMessageToHistory(responseContent, users.aiAssistant);
        const messageElement = createMessageElement(responseData);
        messagesContainer.appendChild(messageElement);
        // Highlight code if present
        const codeBlock = messageElement.querySelector('pre code');
        if (codeBlock) {
            hljs.highlightElement(codeBlock);
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function generateAIResponse(prompt) {
        const lowerCasePrompt = prompt.toLowerCase().replace('@ai', '').trim();
        
        // Image generation request
        if (lowerCasePrompt.match(/^(crie|gere|desenhe|faça) uma imagem/)) {
            let subject = lowerCasePrompt.replace(/^(crie|gere|desenhe|faça) uma imagem de\s*/, '');
            if (subject === lowerCasePrompt) subject = "um gato fofo programando";
            return {
                text: `Com certeza! Aqui está uma imagem que gerei para você com base na descrição: "${subject}".`,
                image: 'ai-generated-image.png'
            };
        }
        
        // Code generation request
        if (lowerCasePrompt.match(/código|função|script/)) {
             return {
                text: 'Claro! Aqui está um exemplo de código em JavaScript. Note que adicionei realce de sintaxe para melhor legibilidade:',
                code: `// Simple function to greet a user\nfunction greet(name) {\n  return \`Hello, \${name}! Welcome to Connecta.\`;\n}\n\nconst user = "Usuário";\nconsole.log(greet(user));`
            };
        }

        // Translation request
        if (lowerCasePrompt.match(/^(traduza|traduzir)/)) {
            const textToTranslate = prompt.replace(/^(traduza|traduzir)\s*/i, '').replace('@ai', '').trim();
             return {
                text: `A tradução simulada para "${textToTranslate}" é: "This is a simulated translation." Eu sou capaz de entender e processar solicitações em vários idiomas.`
            };
        }

        // Summarization request
        if (lowerCasePrompt.match(/^(resuma|resumir)/)) {
             return {
                text: 'Entendido! Aqui está um resumo simulado do texto fornecido: "A inteligência artificial está transformando a maneira como interagimos com a tecnologia, oferecendo novas possibilidades e otimizando processos." Minhas capacidades de resumo podem ajudar a extrair as ideias principais de textos longos.'
            };
        }

        // General knowledge
        if (lowerCasePrompt.match(/^o que é|quem é/)) {
             return {
                text: 'Essa é uma ótima pergunta! Com base em meu vasto conhecimento, posso dizer que a resposta é complexa e fascinante. No entanto, para uma resposta precisa, eu precisaria de um pouco mais de contexto. Em geral, posso fornecer informações detalhadas sobre uma ampla variedade de tópicos.'
             };
        }

        // Conversational responses
        if (lowerCasePrompt.match(/^(olá|oi|e aí)/)) {
            return { text: 'Olá! Sou um assistente de IA avançado. Estou aqui para ajudar com código, imagens, traduções, resumos e muito mais. O que você precisa?' };
        }
        if (lowerCasePrompt.includes('ajuda')) {
            return { text: 'Eu posso ajudar de várias maneiras! Experimente me pedir para:\n• `criar uma imagem de um dragão azul`\n• `escrever um código em python`\n• `traduzir "bom dia"`\n• `resumir um texto longo`\n• `O que é a teoria da relatividade?`\nEstou sempre aprendendo coisas novas!' };
        }
        if (lowerCasePrompt.includes('piada')) {
            return { text: 'Qual é o prato preferido do programador? Arroz com `hash`!' };
        }
        if (lowerCasePrompt.includes('sentido da vida')) {
             return { text: 'A resposta para a grande questão da vida, do universo e tudo mais é... 42! Pelo menos, é o que dizem os supercomputadores. 😉' };
        }
        if (lowerCasePrompt.includes('obrigado') || lowerCasePrompt.includes('valeu')) {
            return { text: 'De nada! Fico feliz em ajudar. Se precisar de mais alguma coisa, é só me chamar.' };
        }
        if (lowerCasePrompt.includes('como você funciona')) {
             return { text: 'Eu opero com base em modelos de linguagem avançados. Analiso sua solicitação para entender a intenção e, em seguida, gero a resposta mais precisa e relevante possível, seja texto, código ou uma imagem.' };
        }

        return { text: 'Desculpe, não entendi completamente. Sou um modelo de IA sofisticado, mas ainda estou em desenvolvimento. Você pode pedir "ajuda" para ver algumas das coisas que posso fazer.' };
    }

    function createMessageElement({ content, user, timestamp }) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const botTag = user.isBot ? `<span class="bot-tag">BOT</span>` : '';

        let messageBody = '';
        if (content.text) {
            messageBody += `<p>${escapeHTML(content.text).replace(/\n/g, '<br>')}</p>`;
        }
        if (content.code) {
            messageBody += `<pre><code class="language-javascript">${escapeHTML(content.code)}</code></pre>`;
        }
        if (content.image) {
            messageBody += `<img src="${content.image}" alt="AI Generated Image" class="message-image">`;
        }

        messageDiv.innerHTML = `
            <img src="${user.avatar}" alt="Avatar" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="username">${user.name}</span>
                    ${botTag}
                    <span class="timestamp">Hoje às ${timeString}</span>
                </div>
                ${messageBody}
            </div>
        `;
        return messageDiv;
    }

    function escapeHTML(str) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    function showTypingIndicator() {
        if (audioContext && audioContext.state === 'running') {
            playSound(thinkingBuffer);
        }
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.classList.add('message');
        typingIndicator.innerHTML = `
            <img src="${users.aiAssistant.avatar}" alt="Avatar" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="username">${users.aiAssistant.name}</span>
                </div>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // --- Channel and Server Switching Logic ---

    function renderChannels(serverKey) {
        const server = serverData[serverKey];
        if (!server) return;

        serverNameEl.textContent = server.name;
        channelListContainer.innerHTML = '';

        server.categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'channel-category';
            categoryDiv.innerHTML = `
                <div class="category-header">
                    <h5><i class="fa-solid fa-chevron-down"></i> ${category.name}</h5>
                    <i class="fa-solid fa-plus"></i>
                </div>
                <ul></ul>
            `;
            const ul = categoryDiv.querySelector('ul');
            category.channels.forEach(channel => {
                const li = document.createElement('li');
                li.className = 'channel';
                if (channel.active) {
                    li.classList.add('active');
                    updateChatHeader(channel.name, channel.icon);
                }
                li.innerHTML = `<i class="fa-solid ${channel.icon}"></i> ${channel.name}`;
                li.addEventListener('click', () => switchChannel(li, channel.name, channel.icon));
                ul.appendChild(li);
            });
            channelListContainer.appendChild(categoryDiv);
        });

        const firstActiveChannel = server.categories.flatMap(c => c.channels).find(ch => ch.active);
        if (firstActiveChannel) {
             currentChannelName = firstActiveChannel.name;
             renderMessagesForChannel();
        }
    }

    function switchChannel(clickedElement, channelName, channelIcon) {
        document.querySelectorAll('.channel-list .channel').forEach(c => c.classList.remove('active'));
        clickedElement.classList.add('active');
        currentChannelName = channelName;
        updateChatHeader(channelName, channelIcon);
        renderMessagesForChannel();

        // --- Hide channel list on mobile after selection ---
        if (window.innerWidth <= 768) {
            appContainer.classList.remove('channels-visible');
        }
    }
    
    function updateChatHeader(channelName, iconClass) {
        chatHeaderName.textContent = channelName;
        document.querySelector('.chat-header .channel-name i').className = `fa-solid ${iconClass}`;
        messageInput.placeholder = `Conversar em #${channelName}`;
    }

    function showWelcomeMessage(channelName) {
        messagesContainer.innerHTML = ''; // Clear previous messages
        const welcomeMessageData = {
            content: { text: `Bem-vindo ao canal #${channelName}! Este é o início deste canal.\n\nApresento a você o nosso **AI Assistant**. Ele foi aprimorado para ser mais estável e preciso. Experimente mencioná-lo digitando \`@AI ajuda\` para ver seus novos recursos.` },
            user: users.connectaBot,
            timestamp: new Date().toISOString()
        }
        const welcomeMessage = createMessageElement(welcomeMessageData);
        messagesContainer.appendChild(welcomeMessage);
    }
    
    serverIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            serverIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            currentServerKey = icon.querySelector('img').alt.includes('1') ? 'server-icon-1' : 'server-icon-2';
            renderChannels(currentServerKey);
        });
    });

    // --- Export Chat Logic ---
    exportChatBtn.addEventListener('click', () => {
        const channelKey = getChannelKey();
        const history = messageHistory[channelKey];
        if (!history || history.length === 0) {
            alert('Não há mensagens para exportar neste canal.');
            return;
        }

        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        const safeChannelName = currentChannelName.replace(/[^a-z0-9]/gi, '_');
        a.download = `connecta_chat_${safeChannelName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Image Modal Logic ---
    messagesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('message-image')) {
            imageModal.style.display = 'flex';
            modalImage.src = e.target.src;
        }
    });

    function closeModal() {
        imageModal.style.display = 'none';
    }

    closeModalBtn.addEventListener('click', closeModal);
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            closeModal();
        }
    });

    // --- UI Toggles ---
    toggleUserListBtn.addEventListener('click', () => {
        const isHidden = chatLayout.classList.toggle('user-list-hidden');
        
        if (window.innerWidth > 1024) {
            // Desktop behavior
            toggleUserListBtn.classList.toggle('active');
        } else {
             // Tablet/Mobile behavior (overlay)
            if (isHidden) {
                toggleUserListBtn.classList.remove('active');
            } else {
                toggleUserListBtn.classList.add('active');
            }
        }
    });

    // Hide user list by default on smaller screens
    function checkAndSetUserList() {
        if (window.innerWidth <= 1024) {
            chatLayout.classList.add('user-list-hidden');
            toggleUserListBtn.classList.remove('active');
        } else {
            chatLayout.classList.remove('user-list-hidden');
            toggleUserListBtn.classList.add('active');
        }
    }

    window.addEventListener('resize', checkAndSetUserList);

    // --- Initial Load ---
    renderChannels('server-icon-1'); // Load default server
    checkAndSetUserList(); // Set initial state of user list
    setupAudio(); // Prepare sound effects
});