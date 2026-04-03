let activeClientId = null;
const specialistId = localStorage.getItem('specialist_id') || null;

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
            .from('chat_messages')
            .select('*')
            .eq('client_id', activeClientId)
            .order('created_at', { ascending: true });

        if (messages) {
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `message ${msg.sender === 'client' ? 'client-msg' : 'agent-msg'}`;
                
                let parsed = null;
                try {
                    parsed = JSON.parse(msg.text);
                } catch {
                    // Ignorar erro de parse
                }

                if (parsed && parsed.__isFile) {
                    if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        div.innerHTML = `<img src="${parsed.url}" style="max-width: 100%; border-radius: 8px;" />`;
                    } else {
                        div.innerHTML = `
                          <div style="
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                          ">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                              style="width:70px;height:70px;"
                            />
                            <div style="
                              font-size:12px;
                              margin-top:4px;
                              text-align:center;
                            ">
                              ${parsed.name}
                            </div>
                            <a href="${parsed.url}" download style="
                              margin-top:6px;
                              font-size:12px;
                              color:#2563eb;
                              text-decoration:none;
                              font-weight:500;
                            ">
                              ⬇️ Baixar PDF
                            </a>
                          </div>
                        `;
                    }
                } else if (msg.text.startsWith('http')) {
                    const isImage = msg.text.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
                    if (isImage) {
                        div.innerHTML = `<img src="${msg.text}" style="max-width: 100%; border-radius: 8px;" />`;
                    } else {
                        const fileName = msg.text.split('/').pop() || 'Documento';
                        div.innerHTML = `
                          <div style="
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                          ">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                              style="width:70px;height:70px;"
                            />
                            <div style="
                              font-size:12px;
                              margin-top:4px;
                              text-align:center;
                              word-break: break-all;
                            ">
                              ${fileName}
                            </div>
                            <a href="${msg.text}" download style="
                              margin-top:6px;
                              font-size:12px;
                              color:#2563eb;
                              text-decoration:none;
                              font-weight:500;
                            ">
                              ⬇️ Baixar PDF
                            </a>
                          </div>
                        `;
                    }
                } else {
                    // Se o texto parecer HTML, renderizamos como HTML, senão como texto puro
                    if (msg.text.trim().startsWith('<') && msg.text.trim().endsWith('>')) {
                        div.innerHTML = msg.text;
                    } else {
                        div.textContent = msg.text;
                    }
                }
                
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
                
                let parsed = null;
                try {
                    parsed = JSON.parse(msg.content);
                } catch {
                    // Ignorar erro de parse
                }

                if (msg.htmlContent) {
                    div.innerHTML = msg.htmlContent;
                } else if (parsed && parsed.__isFile) {
                    if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        div.innerHTML = `<img src="${parsed.url}" style="max-width: 100%; border-radius: 8px;" />`;
                    } else {
                        div.innerHTML = `
                          <div style="
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                          ">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                              style="width:70px;height:70px;"
                            />
                            <div style="
                              font-size:12px;
                              margin-top:4px;
                              text-align:center;
                            ">
                              ${parsed.name}
                            </div>
                            <a href="${parsed.url}" download style="
                              margin-top:6px;
                              font-size:12px;
                              color:#2563eb;
                              text-decoration:none;
                              font-weight:500;
                            ">
                              ⬇️ Baixar PDF
                            </a>
                          </div>
                        `;
                    }
                } else {
                    if (msg.content.startsWith('http')) {
                        const isImage = msg.content.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
                        if (isImage) {
                            div.innerHTML = `<img src="${msg.content}" style="max-width: 100%; border-radius: 8px;" />`;
                        } else {
                            const fileName = msg.content.split('/').pop() || 'Documento';
                            div.innerHTML = `
                              <div style="
                                display:flex;
                                flex-direction:column;
                                align-items:center;
                              ">
                                <img 
                                  src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                                  style="width:70px;height:70px;"
                                />
                                <div style="
                                  font-size:12px;
                                  margin-top:4px;
                                  text-align:center;
                                  word-break: break-all;
                                ">
                                  ${fileName}
                                </div>
                                <a href="${msg.content}" download style="
                                  margin-top:6px;
                                  font-size:12px;
                                  color:#2563eb;
                                  text-decoration:none;
                                  font-weight:500;
                                ">
                                  ⬇️ Baixar PDF
                                </a>
                              </div>
                            `;
                        }
                    } else {
                        div.textContent = msg.content;
                    }
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

    window.supabaseClient.channel('chat_messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages' 
        }, (payload) => {
            if (payload.new.client_id === activeClientId) {
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

// Envio de arquivo pelo agente
const agentFileInput = document.getElementById('agentFileInput');
if (agentFileInput) {
    agentFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !activeClientId) return;

        if (!window.supabaseClient) {
            alert("Supabase não configurado.");
            return;
        }

        const filePath = `${activeClientId}/${Date.now()}_${file.name}`;
        
        // Upload the file
        const { error } = await window.supabaseClient.storage
            .from('Chat_attachments')
            .upload(filePath, file);

        if (error) {
            console.error('Erro no upload:', error);
            alert('Erro ao enviar arquivo.');
            return;
        }

        // Get public URL
        const { data } = window.supabaseClient.storage
            .from('Chat_attachments')
            .getPublicUrl(filePath);

        if (data && data.publicUrl) {
            const tenantId = localStorage.getItem('tenant_id');
        await window.supabaseClient.from('chat_messages').insert({
            client_id: activeClientId,
            especialista_id: specialistId,
            sender: 'system',
            text: data.publicUrl,
            created_at: new Date()
        });
            await window.supabaseClient.from('chat_clients').update({ 
                status: 'em_atendimento',
                especialista_id: specialistId 
            }).eq('id', activeClientId);
            renderMessages();
        }
        
        agentFileInput.value = ''; // Reset input
    });
}

// Envio de mensagem pelo agente
document.getElementById('agentSendBtn').onclick = async () => {
    const input = document.getElementById('agentInput');
    const text = input.value.trim();
    if (!text || !activeClientId) return;

    if (window.supabaseClient) {
        const tenantId = localStorage.getItem('tenant_id');
        await window.supabaseClient.from('chat_messages').insert({
            client_id: activeClientId,
            especialista_id: specialistId,
            sender: 'system',
            text: text,
            created_at: new Date()
        });
        await window.supabaseClient.from('chat_clients').update({ 
            status: 'em_atendimento',
            especialista_id: specialistId
        }).eq('id', activeClientId);
    } else {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        if (chats[activeClientId]) {
            chats[activeClientId].messages.push({
                content: text,
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
