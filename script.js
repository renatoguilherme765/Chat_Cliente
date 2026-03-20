document.addEventListener('DOMContentLoaded', () => {
    // Função para forçar o download de imagens
    window.downloadImage = async function(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename || 'download.jpg';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Erro ao baixar a imagem via fetch, tentando fallback:', error);
            
            // Fallback: Adiciona parâmetro download na URL
            let finalUrl = url;
            try {
                const urlObj = new URL(url);
                urlObj.searchParams.set('download', filename || 'true');
                finalUrl = urlObj.toString();
            } catch (e) {
                // Ignore invalid URLs
            }
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = finalUrl;
            a.download = filename || 'download.jpg';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // Redirecionamento amigável
    if (window.location.pathname.replace(/\/$/, '') === '/negociar') {
        window.location.replace('/?origem=whatsapp');
        return; // Para a execução do script atual
    }

    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');

    let currentStep = 'start';
    let isLiveChat = false;
    let userName = '';
    
    // Capturar telefone da URL
    const urlParams = new URLSearchParams(window.location.search);
    const telefoneCliente = urlParams.get("tel") || urlParams.get("telefone") || '';
    const origem = urlParams.get("origem");
    
    // 1. Gerar novo client_id a cada carregamento
    let clientId = crypto.randomUUID();
    let isReturningClient = false;
    
    // Remover qualquer client_id salvo anteriormente para garantir o reset
    localStorage.removeItem("chat_client_id");

    const localMessages = new Set();
    let clientEnsured = false;

    // 3. Criar cliente na tabela chat_clients
    let clientCreated = false;
    let createClientPromise = null;
    
    async function createClientIfNotExists() {
        if (!window.supabaseClient || clientCreated) return;
        
        if (!createClientPromise) {
            createClientPromise = (async () => {
                const { data } = await window.supabaseClient
                    .from('chat_clients')
                    .select('id')
                    .eq('id', clientId);
                    
                if (!data || data.length === 0) {
                    const insertData = {
                        id: clientId,
                        name: "Cliente",
                        status: "bot"
                    };
                    
                    if (telefoneCliente) {
                        insertData.telefone = telefoneCliente;
                    }
                    
                    await window.supabaseClient
                        .from('chat_clients')
                        .insert([insertData]);
                }
                clientCreated = true;
            })();
        }
        await createClientPromise;
    }

    // Inicializa a verificação do cliente assim que abre o chat
    createClientIfNotExists();

    // 2 e 4. Salvar mensagens no Supabase
    async function saveMessageToSupabase(text, type, htmlContent) {
        if (!window.supabaseClient) return;
        await createClientIfNotExists();
        
        let sender = type === 'user' ? 'client' : 'specialist';
        let messageText = text || htmlContent;
        
        localMessages.add(messageText);
        
        await window.supabaseClient.from('chat_messages').insert([
            {
                client_id: clientId,
                text: messageText,
                sender: sender,
                created_at: new Date()
            }
        ]);
    }

    // 5. Escutar mensagens em tempo real
    if (window.supabaseClient) {
        window.supabaseClient.channel('chat_messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages'
            }, (payload) => {
                if (payload.new.client_id === clientId && payload.new.sender === 'specialist') {
                    // Evita duplicar mensagens que o próprio sistema local enviou
                    if (!localMessages.has(payload.new.text)) {
                        let parsed;

                        try {
                            parsed = typeof payload.new.text === 'string' ? JSON.parse(payload.new.text) : payload.new.text;
                        } catch {
                            parsed = null;
                        }

                        if (parsed && parsed.__isFile) {
                            if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                                const imgHtml = `
                                    <div style="position: relative; display: inline-block;">
                                        <img src="${parsed.url}" style="max-width:200px; border-radius:8px; display: block;" />
                                        <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${parsed.url}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                            </svg>
                                        </a>
                                    </div>
                                `;
                                addMessage(null, 'system', imgHtml, false, payload.new.created_at);
                            } else {
                                const fileHtml = `
                                  <div style="
                                    display:flex;
                                    flex-direction:column;
                                    align-items:center;
                                    cursor:pointer;
                                  " onclick="window.open('${parsed.url}', '_blank')">
                                    <img 
                                      src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                                      class="pdf-clean"
                                      style="
                                        width:80px;
                                        height:80px;
                                      "
                                    />
                                    <div style="
                                      font-size:12px;
                                      margin-top:4px;
                                      color:#000;
                                      text-align:center;
                                    ">
                                      ${parsed.name}
                                    </div>
                                  </div>
                                `;
                                addMessage(null, 'system', fileHtml, false, payload.new.created_at);
                            }
                        } else {
                            addMessage(payload.new.text, 'system', null, false, payload.new.created_at);
                        }
                    }
                }
            })
            .subscribe();
    }

    // Função para adicionar mensagem ao chat
    function addMessage(text, type, htmlContent = null, save = true, createdAt = null) {
        const msgDiv = document.createElement('div');
        if (!htmlContent || !htmlContent.includes('pdf-clean')) {
            msgDiv.classList.add('message');
            msgDiv.classList.add(type === 'system' ? 'system-msg' : 'user-msg');
        } else {
            msgDiv.style.alignSelf = type === 'system' ? 'flex-start' : 'flex-end';
            msgDiv.style.animation = 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            msgDiv.style.margin = '4px 0';
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-text');
        
        if (htmlContent) {
            contentDiv.innerHTML = htmlContent;
        } else if (text) {
            if (text.startsWith('http')) {
                const isImage = text.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
                if (isImage) {
                    contentDiv.innerHTML = `
                        <div style="position: relative; display: inline-block;">
                            <img src="${text}" class="max-w-xs rounded-lg" style="display: block;" />
                            <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${text}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                            </a>
                        </div>
                    `;
                } else {
                    contentDiv.innerHTML = `<a href="${text}" target="_blank" class="text-blue-600 underline">Abrir arquivo</a>`;
                }
            } else {
                if (type === 'system') {
                    contentDiv.innerHTML = text;
                } else {
                    contentDiv.textContent = text;
                }
            }
        }
        
        msgDiv.appendChild(contentDiv);
        
        const timeDiv = document.createElement('div');
        timeDiv.classList.add('message-time');
        
        const dateObj = createdAt ? new Date(createdAt) : new Date();
        timeDiv.textContent = dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        msgDiv.appendChild(timeDiv);

        chatArea.appendChild(msgDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        if (save) {
            saveMessageToSupabase(text, type, htmlContent);
        }
    }

    // Função para carregar histórico de mensagens
    async function loadExistingMessages() {
        if (!window.supabaseClient) return false;
        
        const { data: messages, error } = await window.supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });
            
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                // Não mostra a mensagem oculta de solicitação de boleto para o cliente
                if (msg.text === "⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto.") return;
                
                const type = msg.sender === 'client' ? 'user' : 'system';
                // Adiciona a mensagem sem salvar novamente no banco
                let parsed;

                try {
                    parsed = typeof msg.text === 'string' ? JSON.parse(msg.text) : msg.text;
                } catch {
                    parsed = null;
                }

                if (parsed && parsed.__isFile) {
                    if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        const imgHtml = `
                            <div style="position: relative; display: inline-block;">
                                <img src="${parsed.url}" style="max-width:200px; border-radius:8px; display: block;" />
                                <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${parsed.url}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                    </svg>
                                </a>
                            </div>
                        `;
                        addMessage(null, type, imgHtml, false, msg.created_at);
                    } else {
                        const fileHtml = `
                          <div style="
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            cursor:pointer;
                          " onclick="window.open('${parsed.url}', '_blank')">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                              class="pdf-clean"
                              style="
                                width:80px;
                                height:80px;
                              "
                            />
                            <div style="
                              font-size:12px;
                              margin-top:4px;
                              color:#000;
                              text-align:center;
                            ">
                              ${parsed.name}
                            </div>
                          </div>
                        `;
                        addMessage(null, type, fileHtml, false, msg.created_at);
                    }
                } else {
                    addMessage(msg.text, type, null, false, msg.created_at);
                }
            });
            
            // Verifica o status do cliente para saber se já está em atendimento
            const { data: clientData } = await window.supabaseClient
                .from('chat_clients')
                .select('status')
                .eq('id', clientId)
                .single();
                
            if (clientData && (clientData.status === 'em_atendimento' || clientData.status === 'aguardando')) {
                isLiveChat = true;
                currentStep = 'done';
            }
            return true;
        }
        return false;
    }

    // Fluxo Inicial
    async function initChat() {
        const isNegociarRoute = window.location.pathname.replace(/\/$/, '') === '/negociar';
        const isWhatsappOrigin = origem === 'whatsapp';
        
        // Garantir que o campo de digitação esteja visível e ativo
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
        }
        userInput.placeholder = "Digite sua mensagem...";
        userInput.disabled = false;
        sendBtn.disabled = false;
        
        // Tentar carregar histórico se for cliente retornando
        if (isReturningClient) {
            const hasHistory = await loadExistingMessages();
            if (hasHistory) {
                return; // Se já tem histórico, não roda o fluxo inicial de boas vindas
            }
        }
        
        if (telefoneCliente || isNegociarRoute || isWhatsappOrigin) {
            // Fluxo Automático (WhatsApp ou /negociar)
            setTimeout(() => {
                const msg = "Olá 👋<br><br>Você está em um ambiente seguro para negociação do seu contrato.<br><br>Para continuar o atendimento, digite seu CPF ou CNPJ apenas com números.";
                addMessage(null, 'system', msg);
                currentStep = 'cpf_whatsapp';
            }, 500);
        } else {
            // Fluxo Normal
            setTimeout(() => {
                addMessage("Olá 👋 Identificamos uma condição especial para regularização do seu contrato.", 'system');
                
                setTimeout(() => {
                    const cardHtml = `
                        <div class="welcome-card">
                            <img src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Mulher feliz olhando para o celular" class="card-image" style="width: 100%; height: 200px; object-fit: cover; object-position: center 30%; border-radius: 10px 10px 0 0; background-color: #e0e0e0; display: block;" referrerpolicy="no-referrer">
                            <div class="card-content">
                                <h3>Zere sua dívida hoje!</h3>
                                <p>Aproveite descontos exclusivos e volte a ter crédito no mercado.</p>
                                <button class="chat-btn" onclick="handleAction('ver_condicoes')">Ver condições</button>
                            </div>
                        </div>
                    `;
                    addMessage(null, 'system', cardHtml);
                }, 1000);
            }, 500);
        }
    }

    // Manipulador de Ações de Botões
    window.handleAction = (action) => {
        if (action === 'ver_condicoes') {
            addMessage("Ver condições", 'user');
            currentStep = 'cpf';
            setTimeout(() => {
                addMessage("Por favor, informe seu CPF (apenas os 11 números) para consultarmos seu contrato.", 'system');
            }, 800);
        } else if (action === 'pagamento_total') {
            addMessage("1️⃣ Pagamento total da(s) parcela(s)", 'user');
            setTimeout(() => {
                addMessage("Aguarde um instante, estamos analisando a melhor condição para pagamento total do seu contrato.", 'system');
                setTimeout(() => {
                    const content = `
                        <div class="option-card">
                            <h4>Pagamento à Vista</h4>
                            <p>De: 20% de desconto</p>
                            <p>Por: <span class="highlight">até 70% de desconto</span></p>
                        </div>
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('gerar_boleto')">Gerar boleto com desconto</button>
                            <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `;
                    addMessage(null, 'system', content);
                }, 1500);
            }, 800);
        } else if (action === 'renegociacao_carencia') {
            addMessage("2️⃣ Renegociação com carência de até 90 dias", 'user');
            setTimeout(() => {
                addMessage("Estamos analisando a proposta de renegociação com carência. Aguarde um instante enquanto verificamos as condições disponíveis.", 'system');
                setTimeout(() => {
                    const content = `
                        <div class="option-card">
                            <h4>Parcelamento</h4>
                            <p><span class="highlight">5x de R$ 1.000,00</span></p>
                        </div>
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `;
                    addMessage(null, 'system', content);
                }, 1500);
            }, 800);
        } else if (action === 'entrega_amigavel') {
            addMessage("3️⃣ Entrega amigável do bem", 'user');
            setTimeout(() => {
                const msg = "A entrega amigável é quitativa, ou seja, realiza a liquidação total do financiamento.<br><br>Caso existam débitos no DETRAN, iremos regularizar e retirar essas pendências.<br><br>Após a conclusão, você poderá verificar a possibilidade de financiar outro veículo com parcelas que caibam no seu bolso.<br><br>Todas as informações estão sujeitas à análise.";
                addMessage(null, 'system', msg);
                setTimeout(() => {
                    const btn = `
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `;
                    addMessage(null, 'system', btn);
                }, 1500);
            }, 800);
        } else if (action === 'falar_especialista') {
            addMessage("4️⃣ Falar com um especialista", 'user');
            setTimeout(async () => {
                addMessage("Aguarde um instante, você será conectado a um especialista.", 'system');
                isLiveChat = true;
                
                if (window.supabaseClient) {
                    await createClientIfNotExists();
                    await window.supabaseClient.from('chat_clients').update({ status: 'aguardando' }).eq('id', clientId);
                }
            }, 800);
        } else if (action === 'gerar_boleto') {
            addMessage("Gerar boleto com desconto", 'user');
            setTimeout(() => {
                addMessage("Só um instante, estamos gerando o boleto com os descontos, mostraremos o valor de pagamento e vencimento do boleto.", 'system');
                setTimeout(() => {
                    const content = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 15px 0;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: pulse 1.5s infinite;">
                                <rect x="3" y="4" width="18" height="16" rx="2" stroke="#008069" stroke-width="2"/>
                                <path d="M7 8H17" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <path d="M7 12H17" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <path d="M7 16H13" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <line x1="6" y1="2" x2="6" y2="4" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <line x1="10" y1="2" x2="10" y2="4" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <line x1="14" y1="2" x2="14" y2="4" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                                <line x1="18" y1="2" x2="18" y2="4" stroke="#008069" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <p style="margin-top: 12px; font-size: 13px; color: #666; font-weight: 500;">Gerando boleto...</p>
                        </div>
                    `;
                    addMessage(null, 'system', content);
                    
                    setTimeout(async () => {
                        isLiveChat = true;
                        if (window.supabaseClient) {
                            await createClientIfNotExists();
                            // Envia uma mensagem para o especialista (aparecerá no painel como se fosse do cliente)
                            await window.supabaseClient.from('chat_messages').insert([
                                {
                                    client_id: clientId,
                                    text: "⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto.",
                                    sender: 'client',
                                    created_at: new Date()
                                }
                            ]);
                            await window.supabaseClient.from('chat_clients').update({ status: 'aguardando' }).eq('id', clientId);
                        }
                    }, 1000);
                }, 1000);
            }, 800);
        }
    };

    // Lógica de Envio de Mensagem
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';

        if (isLiveChat) {
            // Se estiver no chat ao vivo, o bot não responde mais, 
            // apenas salva a mensagem para o especialista ver
            return;
        }

        if (currentStep === 'cpf' || currentStep === 'cpf_whatsapp') {
            const cleanCPF = text.replace(/\D/g, '');
            if (cleanCPF.length >= 11) {
                const isCNPJ = cleanCPF.length >= 14;
                const confirmMsg = isCNPJ ? "CNPJ recebido ✓" : "CPF recebido ✓";
                
                setTimeout(() => {
                    addMessage(confirmMsg, 'system');
                    
                    setTimeout(() => {
                        addMessage("Agora, por favor, digite seu primeiro nome.", 'system');
                        currentStep = currentStep === 'cpf_whatsapp' ? 'nome_whatsapp' : 'nome';
                    }, 800);
                }, 800);
            } else {
                setTimeout(() => {
                    if (currentStep === 'cpf_whatsapp') {
                        addMessage("CPF/CNPJ inválido. Por favor, digite apenas números.", 'system');
                    } else {
                        addMessage("CPF inválido. Por favor, digite os 11 números do seu CPF.", 'system');
                    }
                }, 800);
            }
        } else if (currentStep === 'nome' || currentStep === 'nome_whatsapp') {
            userName = text.trim();
            if (userName.length >= 2) {
                // Atualiza o nome do cliente no Supabase sem bloquear o fluxo
                if (window.supabaseClient) {
                    window.supabaseClient.from('chat_clients').update({ 
                        name: userName
                    }).eq('id', clientId).then();
                }
                
                if (currentStep === 'nome_whatsapp') {
                    setTimeout(async () => {
                        const msg = `Obrigado. Você está sendo conectado a um especialista.`;
                        addMessage(null, 'system', msg);
                        currentStep = 'nome_recebido';
                        isLiveChat = true;
                        
                        if (window.supabaseClient) {
                            await createClientIfNotExists();
                            await window.supabaseClient.from('chat_clients').update({ status: 'em_atendimento' }).eq('id', clientId);
                        }
                    }, 800);
                } else {
                    setTimeout(() => {
                        addMessage(`Obrigado, ${userName}! Consultando condições disponíveis...`, 'system');
                        
                        setTimeout(() => {
                            const options = `
                                <p>Opções disponíveis:</p>
                                <div class="btn-container">
                                    <button class="chat-btn" onclick="handleAction('pagamento_total')">1️⃣ Pagamento total da(s) parcela(s)</button>
                                    <button class="chat-btn" onclick="handleAction('renegociacao_carencia')">2️⃣ Renegociação com carência de até 90 dias</button>
                                    <button class="chat-btn" onclick="handleAction('entrega_amigavel')">3️⃣ Entrega amigável do bem</button>
                                    <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">4️⃣ Falar com um especialista</button>
                                </div>
                            `;
                            addMessage(null, 'system', options);
                            currentStep = 'nome_recebido';
                        }, 1500);
                    }, 800);
                }
            } else {
                setTimeout(() => {
                    addMessage("Por favor, digite um nome válido.", 'system');
                }, 800);
            }
        } else if (currentStep === 'nome_recebido') {
            const option = text.trim();
            if (option === '1') {
                handleAction('pagamento_total');
            } else if (option === '2') {
                handleAction('renegociacao_carencia');
            } else if (option === '3') {
                handleAction('entrega_amigavel');
            } else if (option === '4') {
                handleAction('falar_especialista');
            } else {
                setTimeout(() => {
                    addMessage("Por favor, escolha uma das opções acima clicando nos botões ou digitando o número correspondente (1, 2, 3 ou 4).", 'system');
                }, 800);
            }
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!window.supabaseClient) {
                alert("Supabase não configurado.");
                return;
            }

            const filePath = `${clientId}/${Date.now()}_${file.name}`;
            
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
                addMessage(data.publicUrl, 'user');
            }
            
            fileInput.value = ''; // Reset input
        });
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    initChat();
});
