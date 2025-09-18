document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages-container');
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
    const toggleChannelsBtn = document.getElementById('toggle-channels-btn');

    // --- App State ---
    let currentServerKey = 'server-icon-1';
    let currentChannelName = 'geral';
    const messageHistory = JSON.parse(localStorage.getItem('connectaChatHistory')) || {};
    
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
    
    // --- Utility Functions ---
    function escapeHTML(str) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    function showToast(message, type = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<i class="fa-solid fa-check-circle"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-exclamation-circle"></i>';

        toast.innerHTML = `${icon} ${message}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function getChannelKey() {
        return `${currentServerKey}/${currentChannelName}`;
    }

    // --- Message Persistence ---
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
    
    // --- Message Rendering & UI ---
    function createMessageElement({ content, user, timestamp }) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const botTag = user.isBot ? `<span class="bot-tag">BOT</span>` : '';

        let messageBody = '';
        if (content.text) {
            let formattedText = escapeHTML(content.text)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
                .replace(/`(.*?)`/g, '<code>$1</code>')      // Inline code
                .replace(/\n/g, '<br>');
            messageBody += `<p>${formattedText}</p>`;
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

    function renderMessagesForChannel() {
        messagesContainer.innerHTML = '';
        messagesContainer.classList.add('loading');

        setTimeout(() => { // Simulate loading
            const channelKey = getChannelKey();
            const messages = messageHistory[channelKey] || [];

            if (messages.length === 0) {
                const welcomeMessageData = { 
                    content: { text: `Bem-vindo ao canal #${currentChannelName}! Este é o início deste canal.\n\nApresento a você o nosso **AI Assistant**. Ele foi aprimorado para ser mais estável e preciso. Experimente mencioná-lo digitando \`@AI ajuda\` para ver seus novos recursos.` },
                    user: users.connectaBot,
                    timestamp: new Date().toISOString()
                };
                const welcomeMessage = createMessageElement(welcomeMessageData);
                messagesContainer.appendChild(welcomeMessage);
            } else {
                messages.forEach(msg => {
                    const messageElement = createMessageElement(msg);
                    messagesContainer.appendChild(messageElement);
                    // Highlight code blocks
                    messageElement.querySelectorAll('pre code').forEach(hljs.highlightElement);
                });
            }
            messagesContainer.classList.remove('loading');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 250);
    }
    
    function showTypingIndicator() {
        if (audioContext && audioContext.state === 'running') playSound(thinkingBuffer);
        
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
        if (typingIndicator) typingIndicator.remove();
    }
    
    // --- AI Logic ---
    function getAIResponse(prompt) {
        hideTypingIndicator();
        const responseContent = generateAIResponse(prompt);
        const responseData = addMessageToHistory(responseContent, users.aiAssistant);
        const messageElement = createMessageElement(responseData);
        messagesContainer.appendChild(messageElement);
        
        const codeBlock = messageElement.querySelector('pre code');
        if (codeBlock) hljs.highlightElement(codeBlock);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function generateAIResponse(prompt) {
        const lowerCasePrompt = prompt.toLowerCase().replace('@ai', '').trim();
        
        const commands = [
            {
                match: /^(crie|gere|desenhe|faça) uma imagem/,
                handler: (p) => {
                    let subject = p.replace(/^(crie|gere|desenhe|faça) uma imagem de\s*/, '').replace(/\s/g, ',');
                    if (!subject || subject.length < 3) subject = "cute,cat,programming";
                    return {
                        text: `Com certeza! Gerei uma imagem com base na sua descrição: *"${subject.replace(/,/g, ' ')}"*.`,
                        image: `https://source.unsplash.com/random/400x300?${subject}`
                    };
                }
            },
            {
                match: /código|função|script/,
                handler: () => ({
                    text: 'Claro! Aqui está um exemplo de código em JavaScript para calcular o fatorial de um número:',
                    code: `function factorial(n) {\n  if (n === 0 || n === 1) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}\n\nconsole.log(factorial(5)); // Output: 120`
                })
            },
            {
                match: /^(traduza|traduzir)/,
                handler: (p) => {
                    const textToTranslate = prompt.replace(/^(traduza|traduzir)\s*/i, '').replace('@ai', '').trim();
                    return { text: `A tradução simulada para *"${textToTranslate}"* é: **"This is a simulated translation."** Minhas capacidades de tradução são avançadas e suportam múltiplos idiomas.` };
                }
            },
            {
                match: /^(resuma|resumir)/,
                handler: () => ({ text: 'Entendido! Aqui está um resumo simulado: **"A inteligência artificial está transformando a forma como interagimos com a tecnologia, oferecendo novas possibilidades e otimizando processos."** Minhas capacidades de resumo podem extrair as ideias principais de textos longos.' })
            },
             {
                match: /^(pesquise por|procure por)/,
                handler: (p) => {
                     const query = p.replace(/^(pesquise por|procure por)\s*/, '');
                    return { text: `Realizei uma busca na web por *"${query}"*.\n\nResultados simulados indicam que é um tópico amplamente discutido, com foco em **[Tópico Principal 1]** e **[Tópico Principal 2]**. A fonte mais relevante parece ser a [Fonte Confiável Fictícia].` };
                }
            },
            {
                match: /ajuda/,
                handler: () => ({ text: 'Eu posso ajudar de várias maneiras! Experimente me pedir para:\n• `criar uma imagem de um dragão azul`\n• `escrever um código em python`\n• `traduzir "bom dia"`\n• `pesquise por computação quântica`\nEstou sempre aprendendo coisas novas!' })
            },
            {
                match: /^(olá|oi|e aí)/,
                handler: () => ({ text: 'Olá! Sou um assistente de IA avançado. Estou aqui para ajudar com código, imagens, traduções, resumos e muito mais. Como posso te ajudar hoje?' })
            }
        ];

        for (const command of commands) {
            if (lowerCasePrompt.match(command.match)) {
                return command.handler(lowerCasePrompt);
            }
        }
        
        return { text: 'Desculpe, não entendi completamente. Sou um modelo de IA sofisticado, mas ainda estou em desenvolvimento. Você pode digitar `@ai ajuda` para ver algumas das coisas que posso fazer.' };
    }
    
    // --- Message Sending Logic ---
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
        if (currentChannelName === channelName) return; // Don't reload if it's the same channel
        document.querySelectorAll('.channel-list .channel').forEach(c => c.classList.remove('active'));
        clickedElement.classList.add('active');
        currentChannelName = channelName;
        updateChatHeader(channelName, channelIcon);
        renderMessagesForChannel();

        if (window.innerWidth <= 768) appContainer.classList.remove('channels-visible');
    }
    
    function updateChatHeader(channelName, iconClass) {
        chatHeaderName.textContent = channelName;
        document.querySelector('.chat-header .channel-name i').className = `fa-solid ${iconClass}`;
        messageInput.placeholder = `Conversar em #${channelName}`;
    }
    
    function switchServer(icon) {
        serverIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        const newServerKey = icon.querySelector('img').alt.includes('1') ? 'server-icon-1' : 'server-icon-2';
        if (currentServerKey !== newServerKey) {
            currentServerKey = newServerKey;
            renderChannels(currentServerKey);
        }
    }

    // --- Event Listeners ---
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
    
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    }, { once: true });
    
    toggleChannelsBtn.addEventListener('click', () => {
        appContainer.classList.toggle('channels-visible');
    });

    mainViewWrapper.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && appContainer.classList.contains('channels-visible')) {
            if (!e.target.closest('.channels-bar')) {
                 appContainer.classList.remove('channels-visible');
            }
        }
    });

    serverIcons.forEach(icon => {
        icon.addEventListener('click', () => switchServer(icon));
    });

    exportChatBtn.addEventListener('click', () => {
        const channelKey = getChannelKey();
        const history = messageHistory[channelKey];
        if (!history || history.length === 0) {
            showToast('Não há mensagens para exportar.', 'error');
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
        showToast('Histórico do chat exportado com sucesso!', 'success');
    });

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
        if (e.target === imageModal) closeModal();
    });

    toggleUserListBtn.addEventListener('click', () => {
        chatLayout.classList.toggle('user-list-hidden');
        toggleUserListBtn.classList.toggle('active');
    });

    // --- Responsive Adjustments ---
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
    function init() {
        renderChannels('server-icon-1');
        checkAndSetUserList();
        setupAudio();
    }

    init();
});