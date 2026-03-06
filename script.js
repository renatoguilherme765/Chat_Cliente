document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');

    let currentStep = 'start';
    const clientId = 'cliente_' + Math.random().toString(36).substr(2, 9);
    let isLiveChat = false;
    let userCpf = 'Não informado';
    let chatHistory = [];

    // Integração com Supabase
    let ensurePromise = null;
    let clientEnsured = false;

    async function ensureClientExists() {
        if (!window.supabaseClient) return;
        
        if (!ensurePromise) {
            ensurePromise = (async () => {
                // 1. Verificar se existe cliente na tabela chat_clients
                const { data } = await window.supabaseClient
                    .from('chat_clients')
                    .select('id')
                    .eq('id', clientId);
                    
                // 2. Se não existir, criar automaticamente um novo cliente
                if (data && data.length === 0) {
                    await window.supabaseClient.from('chat_clients').insert([
                        { id: clientId, cpf: userCpf, status: isLiveChat ? 'live' : 'bot' }
                    ]);
                }
            })();
        }
        
        await ensurePromise;
        
        // Atualiza os dados caso o CPF ou status tenham mudado
        if (clientEnsured) {
            await window.supabaseClient.from('chat_clients').update({
                cpf: userCpf,
                status: isLiveChat ? 'live' : 'bot'
            }).eq('id', clientId);
        }
        clientEnsured = true;
    }

    async function saveMessageToSupabase(text, type, htmlContent) {
        if (!window.supabaseClient) return;
        
        await ensureClientExists();
        
        // 3. Garantir que o campo sender seja "client" para mensagens do usuário
        let sender = type === 'user' ? 'client' : 'bot';
        let messageText = text || htmlContent;
        
        // 4. O client_id da mensagem deve ser o id criado na tabela chat_clients
        await window.supabaseClient.from('chat_messages').insert([
            { client_id: clientId, sender: sender, text: messageText }
        ]);
    }

    // Escuta mensagens do especialista em tempo real via Supabase
    if (window.supabaseClient) {
        window.supabaseClient.channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `client_id=eq.${clientId}` }, (payload) => {
                if (payload.new.sender === 'agent') {
                    addMessage(payload.new.text, 'system', null, false);
                }
            })
            .subscribe();
    }

    // Sincroniza o chat com o localStorage para o painel do especialista
    function syncStorage() {
        let chats = JSON.parse(localStorage.getItem('acordo_certo_chats') || '{}');
        chats[clientId] = {
            id: clientId,
            cpf: userCpf,
            messages: chatHistory,
            isLive: isLiveChat,
            lastUpdate: Date.now()
        };
        localStorage.setItem('acordo_certo_chats', JSON.stringify(chats));
    }

    // Escuta mensagens vindas do painel do especialista
    window.addEventListener('storage', (e) => {
        if (e.key === 'acordo_certo_chats') {
            let chats = JSON.parse(e.newValue || '{}');
            let myChat = chats[clientId];
            
            // Se o histórico do painel for maior que o local, recebemos mensagem nova
            if (myChat && myChat.messages.length > chatHistory.length) {
                let newMsgs = myChat.messages.slice(chatHistory.length);
                newMsgs.forEach(msg => {
                    if (msg.type === 'agent') {
                        // Adiciona a mensagem do agente na tela do cliente sem salvar de volta (loop)
                        addMessage(msg.text, 'system', msg.htmlContent, false);
                        chatHistory.push(msg); // Atualiza o histórico local
                    }
                });
            }
        }
    });

    // Função para adicionar mensagem ao chat
    function addMessage(text, type, htmlContent = null, save = true) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        msgDiv.classList.add(type === 'system' ? 'system-msg' : 'user-msg');
        
        if (htmlContent) {
            msgDiv.innerHTML = htmlContent;
        } else if (text) {
            msgDiv.textContent = text;
        }

        chatArea.appendChild(msgDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        if (save) {
            chatHistory.push({ text, type, htmlContent });
            syncStorage(); // Mantém o fallback local
            saveMessageToSupabase(text, type, htmlContent); // Envia para o Supabase
        }
    }

    // Fluxo Inicial
    function initChat() {
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
            setTimeout(() => {
                addMessage("Aguarde um instante, você será conectado a um especialista.", 'system');
                isLiveChat = true;
                syncStorage();
                ensureClientExists(); // Atualiza o status para 'live' no Supabase
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
    function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';

        if (isLiveChat) {
            // Se estiver no chat ao vivo, o bot não responde mais, 
            // apenas salva a mensagem para o especialista ver
            return;
        }

        if (currentStep === 'cpf') {
            const cleanCPF = text.replace(/\D/g, '');
            if (cleanCPF.length === 11) {
                userCpf = cleanCPF; // Salva o CPF para o painel do especialista
                syncStorage();
                ensureClientExists(); // Atualiza o CPF no Supabase
                
                setTimeout(() => {
                    addMessage("CPF recebido ✔ Consultando condições disponíveis...", 'system');
                    
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
            } else {
                setTimeout(() => {
                    addMessage("CPF inválido. Por favor, digite os 11 números do seu CPF.", 'system');
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
