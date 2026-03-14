let activeClientId = null;

async function renderClients() {
    if (window.supabaseClient) {
        // Busca do Supabase
        const { data: liveClients, error } = await window.supabaseClient
            .from('chat_clients')
            .select('*')
            .in('status', ['aguardando', 'em_atendimento'])
            .order('created_at', { ascending: false });
            
        updateClientListUI(liveClients || []);
    } else {
        // Busca do localStorage
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        const liveClients = Object.values(chats).filter(chat => chat.isLive);
        updateClientListUI(liveClients);
    }
}

function updateClientListUI(liveClients) {
    const clientList = document.getElementById('clientList');
    
    if (liveClients.length === 0) {
        clientList.innerHTML = '<div class="empty-state">Nenhum cliente conectado no momento.</div>';
        return;
    }

    clientList.innerHTML = '';

    liveClients.forEach(chat => {
        const div = document.createElement('div');
        div.className = `client-item ${activeClientId === chat.id ? 'active' : ''}`;
        
        const nome = chat.name ? chat.name : 'Cliente Anônimo';
        const telefone = chat.telefone || chat.phone ? (chat.telefone || chat.phone) : 'Sem telefone';
        
        div.innerHTML = `<strong>${nome}</strong><br><small>${telefone}</small>`;
        div.onclick = () => selectClient(chat.id, nome, telefone);
        clientList.appendChild(div);
        
        // Atualiza o cabeçalho se o cliente ativo teve o nome alterado
        if (activeClientId === chat.id) {
            const phoneDisplay = telefone !== 'Sem telefone' ? `<br><small style="font-weight: normal; font-size: 13px; color: #667781;">${telefone}</small>` : '';
            document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${nome}${phoneDisplay}</h2>`;
        }
    });
}

async function selectClient(id, nome, telefone) {
    activeClientId = id;
    document.getElementById('chatInputArea').style.display = 'flex';
    
    // Se não for passado (caso do localStorage antigo), tenta pegar do chat
    if (!nome && !window.supabaseClient) {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        nome = chats[id]?.name || 'Cliente Anônimo';
        telefone = chats[id]?.telefone || chats[id]?.phone || 'Sem telefone';
    }

    const identifier = nome ? nome : 'Cliente Anônimo';
    const phoneDisplay = telefone !== 'Sem telefone' ? `<br><small style="font-weight: normal; font-size: 13px; color: #667781;">${telefone}</small>` : '';
    document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${identifier}${phoneDisplay}</h2>`;
    
    await renderMessages();
    renderClients();
}

async function renderMessages() {
    if (!activeClientId) return;

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    if (window.supabaseClient) {
        const { data: messages, error } = await window.supabaseClient
            .from('messages')
            .select('*')
            .eq('client_id', activeClientId)
            .order('created_at', { ascending: true });

        if (messages) {
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `message ${msg.sender === 'client' ? 'client-msg' : 'agent-msg'}`;
                div.innerHTML = msg.text;
                chatMessages.appendChild(div);
            });
        }
    } else {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        let chat = chats[activeClientId];
        if (chat && chat.messages) {
            chat.messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `message ${msg.type === 'user' ? 'client-msg' : 'agent-msg'}`;
                if (msg.htmlContent) {
                    div.innerHTML = msg.htmlContent;
                } else {
                    div.textContent = msg.text;
                }
                chatMessages.appendChild(div);
            });
        }
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escuta mudanças
if (window.supabaseClient) {
    window.supabaseClient.channel('panel-clients')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_clients' }, () => {
            renderClients();
        })
        .subscribe();

    window.supabaseClient.channel('messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.eventType === 'INSERT' && payload.new.client_id === activeClientId) {
                renderMessages();
            }
        })
        .subscribe();
} else {
    window.addEventListener('storage', (e) => {
        if (e.key === 'acordo_certo_chats') {
            renderClients();
            renderMessages();
        }
    });
    setInterval(() => {
        renderClients();
        renderMessages();
    }, 2000);
}

// Envio de mensagem pelo agente
document.getElementById('agentSendBtn').onclick = async () => {
    const input = document.getElementById('agentInput');
    const text = input.value.trim();
    if (!text || !activeClientId) return;

    if (window.supabaseClient) {
        await window.supabaseClient.from('messages').insert([
            { client_id: activeClientId, sender: 'specialist', text: text }
        ]);
        await window.supabaseClient.from('chat_clients').update({ status: 'em_atendimento' }).eq('id', activeClientId);
    } else {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        if (chats[activeClientId]) {
            chats[activeClientId].messages.push({
                text: text,
                type: 'specialist',
                htmlContent: null
            });
            localStorage.setItem('acordo_certo_chats', JSON.stringify(chats));
        }
    }
    
    input.value = '';
    renderMessages();
};

// Enviar com Enter
document.getElementById('agentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('agentSendBtn').click();
});

// Inicialização
renderClients();
