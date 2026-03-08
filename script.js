document.addEventListener('DOMContentLoaded', () => {
    // Redirecionamento amigável
    if (window.location.pathname.replace(/\/$/, '') === '/negociar') {
        window.location.replace('/?origem=whatsapp');
        return; // Para a execução do script atual
    }

    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');

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
            { client_id: clientId, sender: sender, text: messageText }
        ]);
    }

    // 5. Escutar mensagens em tempo real
    if (window.supabaseClient) {
        window.supabaseClient.channel('public:chat_messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages', 
                filter: `client_id=eq.${clientId}` 
            }, (payload) => {
                if (payload.new.sender === 'specialist') {
                    // Evita duplicar mensagens que o próprio sistema local enviou
                    if (!localMessages.has(payload.new.text)) {
                        addMessage(payload.new.text, 'system', null, false, payload.new.created_at);
                    }
                }
            })
            .subscribe();
    }

    // Função para adicionar mensagem ao chat
    function addMessage(text, type, htmlContent = null, save = true, createdAt = null) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        msgDiv.classList.add(type === 'system' ? 'system-msg' : 'user-msg');
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-text');
        
        if (htmlContent) {
            contentDiv.innerHTML = htmlContent;
        } else if (text) {
            if (type === 'system') {
                contentDiv.innerHTML = text;
            } else {
                contentDiv.textContent = text;
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
                const type = msg.sender === 'client' ? 'user' : 'system';
                // Adiciona a mensagem sem salvar novamente no banco
                addMessage(msg.text, type, null, false, msg.created_at);
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
                            <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Pessoa feliz" class="card-image" referrerPolicy="no-referrer">
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
                            <p>De: R$ 8.200,00</p>
                            <p>Por: <span class="highlight">R$ 5.000,00</span></p>
                        </div>
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('gerar_pix')">Gerar PIX</button>
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
        } else if (action === 'gerar_pix') {
            addMessage("Gerar PIX", 'user');
            setTimeout(() => {
                const content = `
                    <p>Aqui está o código PIX Copia e Cola:</p>
                    <div class="option-card" style="word-break: break-all; font-family: monospace; font-size: 12px; background: #f4f4f4;">
                        00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266554400005204000053039865406500.005802BR5913Empresa Teste6008SAO PAULO62070503***63041A2B
                    </div>
                    <p style="margin-top: 10px; font-size: 12px;">Válido por 24 horas.</p>
                `;
                addMessage(null, 'system', content);
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
                // Atualiza o nome do cliente no Supabase
                if (window.supabaseClient) {
                    await window.supabaseClient.from('chat_clients').update({ 
                        name: userName
                    }).eq('id', clientId);
                }
                
                if (currentStep === 'nome_whatsapp') {
                    setTimeout(async () => {
                        const msg = `Obrigado. Você está sendo conectado a um especialista.`;
                        addMessage(null, 'system', msg);
                        currentStep = 'done';
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
                                    <button class="chat-btn" style="text-align: left; font-size: 13px; padding: 10px;" onclick="handleAction('pagamento_total')">1️⃣ Pagamento total da(s) parcela(s)</button>
                                    <button class="chat-btn" style="text-align: left; font-size: 13px; padding: 10px;" onclick="handleAction('renegociacao_carencia')">2️⃣ Renegociação com carência de até 90 dias</button>
                                    <button class="chat-btn" style="text-align: left; font-size: 13px; padding: 10px;" onclick="handleAction('entrega_amigavel')">3️⃣ Entrega amigável do bem</button>
                                    <button class="chat-btn secondary" style="text-align: left; font-size: 13px; padding: 10px;" onclick="handleAction('falar_especialista')">4️⃣ Falar com um especialista</button>
                                </div>
                            `;
                            addMessage(null, 'system', options);
                            currentStep = 'done';
                        }, 1500);
                    }, 800);
                }
            } else {
                setTimeout(() => {
                    addMessage("Por favor, digite um nome válido.", 'system');
                }, 800);
            }
        }
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    initChat();
});
