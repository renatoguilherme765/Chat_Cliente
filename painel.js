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
        div.onclick = () => selectClient(chat.id, nome, telefone, chat.status, chat.especialista_id);
        clientList.appendChild(div);
        
        // Atualiza o cabeçalho se o cliente ativo teve o nome alterado
        if (activeClientId === chat.id) {
            const phoneDisplay = telefone !== 'Sem telefone' ? `<br><small style="font-weight: normal; font-size: 13px; color: #667781;">${telefone}</small>` : '';
            document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${nome}${phoneDisplay}</h2>`;
        }
    });
}

async function selectClient(id, nome, telefone, status = 'aguardando', ownerId = null) {
    activeClientId = id;
    
    // Se não for passado (caso do localStorage antigo), tenta pegar do chat
    if (!nome && !window.supabaseClient) {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        nome = chats[id]?.name || 'Cliente Anônimo';
        telefone = chats[id]?.telefone || chats[id]?.phone || 'Sem telefone';
    }

    const identifier = nome ? nome : 'Cliente Anônimo';
    const phoneDisplay = telefone !== 'Sem telefone' ? `<br><small style="font-weight: normal; font-size: 13px; color: #667781;">${telefone}</small>` : '';
    document.getElementById('chatHeader').innerHTML = `<h2>Processando: ${identifier}${phoneDisplay}</h2>`;
    
    const inputArea = document.getElementById('chatInputArea');
    const mySpecialistId = localStorage.getItem('specialist_id') || '00000000-0000-0000-0000-000000000000';
    
    // Se for live chat, verificar status no banco p/ garantir state mais recente
    if (window.supabaseClient) {
        let fetchChat = null;
        try {
            const res = await window.supabaseClient.from('chat_clients').select('status').eq('id', id).single();
            fetchChat = res.data;
        } catch (err) {
            console.warn("Erro ao buscar chat_clients em selectClient:", err);
        }
        if (fetchChat) {
            status = fetchChat.status;
        }
    }

    if (status === 'aguardando') {
        document.getElementById('chatHeader').innerHTML = `<h2>Visualizando: ${identifier}${phoneDisplay}</h2>`;
        inputArea.style.display = 'flex';
        inputArea.innerHTML = `
            <button id="btnAtenderChat" style="width:100%; padding:15px; background:#008069; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
                ASSUMIR ATENDIMENTO (Atender)
            </button>
        `;
        document.getElementById('btnAtenderChat').onclick = async () => {
            const updatePayload = {
                status: 'em_atendimento',
                especialista_id: mySpecialistId,
                assigned_at: new Date().toISOString()
            };

            const { data, error } = await window.supabaseClient
                .from('chat_clients')
                .update(updatePayload)
                .eq('id', id)
                .eq('status', 'aguardando')
                .select();
                
            if (error) {
                alert("Erro ao tentar atender cliente: " + error.message);
                return;
            }
            if (!data || data.length === 0) {
                alert("Este cliente já foi assumido por outro especialista.");
                renderClients();
                document.getElementById('chatInputArea').style.display = 'none';
                return;
            }
            // Sucesso
            restoreInputArea();
            document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${identifier}${phoneDisplay}</h2>`;
            renderClients();
        };
    } else if (status === 'em_atendimento') {
        if (ownerId && ownerId !== mySpecialistId) {
            document.getElementById('chatHeader').innerHTML = `<h2>Visualizando (Ocupado): ${identifier}${phoneDisplay}</h2>`;
            inputArea.style.display = 'flex';
            inputArea.innerHTML = `
                <div style="width:100%; text-align:center; padding:15px; color:#888;">
                    Este alerta está em atendimento por outro especialista.
                </div>
            `;
        } else {
            document.getElementById('chatHeader').innerHTML = `<h2>Atendendo: ${identifier}${phoneDisplay}</h2>`;
            restoreInputArea();
        }
    } else {
        restoreInputArea();
    }
    
    await renderMessages();
    renderClients();
}

function restoreInputArea() {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.style.display = 'flex';
    inputArea.innerHTML = `
        <input type="file" id="agentFileInput" style="display: none;">
        <button id="agentAttachBtn" onclick="document.getElementById('agentFileInput').click()" style="background: none; border: none; cursor: pointer; color: #008069; padding: 0 10px; font-size: 20px;">
            📎
        </button>
        <input type="text" id="agentInput" placeholder="Digite sua mensagem para o cliente..." autocomplete="off">
        <button id="agentSendBtn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
            Enviar
        </button>
    `;
    // Re-attach listeners based on the restored HTML
    setupInputListeners();
}

// Criar a função setupInputListeners para recasar os eventos
function setupInputListeners() {
    const agentFileInput = document.getElementById('agentFileInput');
    const agentSendBtn = document.getElementById('agentSendBtn');
    const agentInput = document.getElementById('agentInput');
    
    // Anexar anexo
    if (agentFileInput) {
        agentFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !activeClientId) return;

            if (!window.supabaseClient) {
                alert("Upload indisponível no modo local/fallback (sem Supabase).");
                return;
            }

            const specialistId = localStorage.getItem('specialist_id') || '00000000-0000-0000-0000-000000000000';
            const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000000';
            const filePath = `${activeClientId}/${Date.now()}_${file.name}`;

            const { error } = await window.supabaseClient.storage
                .from('Chat_attachments')
                .upload(filePath, file);

            if (error) {
                console.error("Erro no upload:", error);
                alert("Erro ao enviar arquivo.");
                return;
            }

            const { data } = window.supabaseClient.storage
                .from('Chat_attachments')
                .getPublicUrl(filePath);

            const msgPayload = {
                client_id: activeClientId,
                sender: 'system',
                text: data.publicUrl,
                created_at: new Date()
            };
            
            const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
            if (tenantId && isValidUUID(tenantId) && tenantId !== '00000000-0000-0000-0000-000000000000') {
                msgPayload.tenant_id = tenantId;
            }

            console.log("Inserindo anexo em chat_messages:", msgPayload);
            if (data && data.publicUrl) {
                try {
                    await window.supabaseClient.from('chat_messages').insert([msgPayload]);
                } catch (err) {
                    console.warn("Erro no trycatch do insert anexo:", err);
                }
                renderMessages();
            }
            
            agentFileInput.value = ''; // Reset input
        });
    }

    if (agentSendBtn && agentInput) {
        agentSendBtn.onclick = async () => {
            const text = agentInput.value.trim();
            if (!text || !activeClientId) return;
            const specialistId = localStorage.getItem('specialist_id') || '00000000-0000-0000-0000-000000000000';
            if (window.supabaseClient) {
                const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000000';
                
                const msgPayload = {
                    client_id: activeClientId,
                    sender: 'system',
                    text: text,
                    created_at: new Date()
                };
                
                const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
                if (tenantId && isValidUUID(tenantId) && tenantId !== '00000000-0000-0000-0000-000000000000') {
                    msgPayload.tenant_id = tenantId;
                }

                console.log("Inserindo mensagem em chat_messages (especialista):", msgPayload);
                try {
                    await window.supabaseClient.from('chat_messages').insert([msgPayload]);
                } catch (err) {
                    console.warn("Erro no trycatch do insert msgs especialista:", err);
                }
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
            agentInput.value = '';
            renderMessages();
        };

        agentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                agentSendBtn.click();
            }
        });
    }
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

        if (error) {
            console.error("Erro ao buscar mensagens:", error);
        }

        if (messages) {
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `message ${msg.sender === 'client' ? 'client-msg' : 'agent-msg'}`;
                
                const messageText = msg.text || msg.content || '';
                let parsed = null;
                try {
                    parsed = JSON.parse(messageText);
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
                } else if (messageText.startsWith('http')) {
                    const isImage = messageText.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
                    if (isImage) {
                        div.innerHTML = `<img src="${messageText}" style="max-width: 100%; border-radius: 8px;" />`;
                    } else {
                        const fileName = messageText.split('/').pop() || 'Documento';
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
                            <a href="${messageText}" download style="
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
                    if (messageText.trim().startsWith('<') && messageText.trim().endsWith('>')) {
                        div.innerHTML = messageText;
                    } else {
                        div.textContent = messageText;
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
                
                const messageText = msg.content || msg.text || '';
                let parsed = null;
                try {
                    parsed = JSON.parse(messageText);
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
                    if (messageText.startsWith('http')) {
                        const isImage = messageText.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
                        if (isImage) {
                            div.innerHTML = `<img src="${messageText}" style="max-width: 100%; border-radius: 8px;" />`;
                        } else {
                            const fileName = messageText.split('/').pop() || 'Documento';
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
                                <a href="${messageText}" download style="
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
                        div.textContent = messageText;
                    }
                }
                chatMessages.appendChild(div);
            });
        }
    }
    
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
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
}

// Sempre faz polling por segurança (caso o Realtime não esteja ativado no Supabase)
setInterval(() => {
    renderClients();
    renderMessages();
}, 3000);

// Inicialização
renderClients();
