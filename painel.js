let activeClientId = null;

function renderClients() {
    let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
    const clientList = document.getElementById('clientList');
    
    // Filtra apenas os clientes que pediram para falar com especialista
    const liveClients = Object.values(chats).filter(chat => chat.isLive);
    
    if (liveClients.length === 0) {
        clientList.innerHTML = '<div class="empty-state">Nenhum cliente conectado no momento.</div>';
        return;
    }

    clientList.innerHTML = '';

    liveClients.forEach(chat => {
        const div = document.createElement('div');
        div.className = `client-item ${activeClientId === chat.id ? 'active' : ''}`;
        
        // Exibe o CPF ou um identificador genérico
        const identifier = chat.cpf !== 'Não informado' ? `CPF: ${chat.cpf}` : 'Cliente Anônimo';
        
        div.innerHTML = `<strong>${identifier}</strong><br><small>Sessão: ${chat.id.substring(0, 12)}</small>`;
        div.onclick = () => selectClient(chat.id);
        clientList.appendChild(div);
    });
}

function selectClient(id) {
    activeClientId = id;
    document.getElementById('chatInputArea').style.display = 'flex';
    
    let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
    let chat = chats[id];
    const identifier = chat.cpf !== 'Não informado' ? `CPF: ${chat.cpf}` : 'Cliente Anônimo';
    
    document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${identifier}</h2>`;
    
    renderMessages();
    renderClients(); // Atualiza a classe 'active' na lista
}

function renderMessages() {
    if (!activeClientId) return;
    let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
    let chat = chats[activeClientId];
    if (!chat) return;

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    chat.messages.forEach(msg => {
        const div = document.createElement('div');
        
        // Se a mensagem for do usuário, aparece na esquerda (client-msg)
        // Se for do sistema ou do agente, aparece na direita (agent-msg)
        div.className = `message ${msg.type === 'user' ? 'client-msg' : 'agent-msg'}`;
        
        if (msg.htmlContent) {
            div.innerHTML = msg.htmlContent;
        } else {
            div.textContent = msg.text;
        }
        chatMessages.appendChild(div);
    });
    
    // Rola para o final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escuta as mudanças no localStorage (quando o cliente envia mensagem)
window.addEventListener('storage', (e) => {
    if (e.key === 'acordo_certo_chats') {
        renderClients();
        renderMessages();
    }
});

// Envio de mensagem pelo agente
document.getElementById('agentSendBtn').onclick = () => {
    const input = document.getElementById('agentInput');
    const text = input.value.trim();
    if (!text || !activeClientId) return;

    let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
    if (chats[activeClientId]) {
        // Adiciona a mensagem do agente ao histórico do cliente
        chats[activeClientId].messages.push({
            text: text,
            type: 'agent',
            htmlContent: null
        });
        
        // Salva no localStorage (isso dispara o evento na aba do cliente)
        localStorage.setItem('acordo_certo_chats', JSON.stringify(chats));
        
        input.value = '';
        renderMessages();
    }
};

// Enviar com Enter
document.getElementById('agentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('agentSendBtn').click();
});

// Inicialização
renderClients();

// Polling de segurança a cada 2 segundos (caso a aba perca algum evento de storage)
setInterval(() => {
    renderClients();
    renderMessages();
}, 2000);
