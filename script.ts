document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chatArea') as HTMLElement;
    const userInput = document.getElementById('userInput') as HTMLInputElement;
    const sendBtn = document.getElementById('sendBtn') as HTMLElement;

    let currentStep = 'start';

    // Interface para estender o objeto window
    interface CustomWindow extends Window {
        handleAction: (action: string) => void;
    }

    // Função para adicionar mensagem ao chat
    function addMessage(text: string | null, type: 'system' | 'user', htmlContent: string | null = null) {
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
    }

    // Fluxo Inicial
    function initChat() {
        setTimeout(() => {
            addMessage("Olá 👋 Identificamos uma condição especial para regularização do seu contrato.", 'system');
            
            setTimeout(() => {
                const buttons = `
                    <p>Deseja verificar as opções disponíveis?</p>
                    <div class="btn-container">
                        <button class="chat-btn" onclick="handleAction('ver_condicoes')">Ver condições</button>
                    </div>
                `;
                addMessage(null, 'system', buttons);
            }, 1000);
        }, 500);
    }

    // Manipulador de Ações de Botões
    (window as unknown as CustomWindow).handleAction = (action: string) => {
        if (action === 'ver_condicoes') {
            addMessage("Ver condições", 'user');
            currentStep = 'cpf';
            setTimeout(() => {
                addMessage("Por favor, informe seu CPF (apenas os 11 números) para consultarmos seu contrato.", 'system');
            }, 800);
        } else if (action === 'escolher_avista') {
            addMessage("Escolhi pagamento à vista", 'user');
            setTimeout(() => {
                const content = `
                    <p>Excelente escolha! Aqui está sua oferta:</p>
                    <div class="option-card">
                        <h4>Pagamento à Vista</h4>
                        <p>De: R$ 8.200,00</p>
                        <p>Por: <span class="highlight">R$ 5.000,00</span></p>
                        <p>Economia de R$ 3.200,00!</p>
                    </div>
                    <div class="btn-container">
                        <a href="https://wa.me/5511999999999" target="_blank" class="chat-btn">Falar com Especialista</a>
                    </div>
                `;
                addMessage(null, 'system', content);
            }, 800);
        } else if (action === 'escolher_parcelado') {
            addMessage("Escolhi parcelamento", 'user');
            setTimeout(() => {
                const content = `
                    <p>Temos uma ótima opção de parcelamento:</p>
                    <div class="option-card">
                        <h4>Parcelamento Facilitado</h4>
                        <p>Valor total: R$ 5.000,00</p>
                        <p>Condição: <span class="highlight">5x de R$ 1.000,00</span></p>
                    </div>
                    <div class="btn-container">
                        <a href="https://wa.me/5511995271952" target="_blank" class="chat-btn">Falar com Especialista</a>
                    </div>
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

        if (currentStep === 'cpf') {
            const cleanCPF = text.replace(/\D/g, '');
            if (cleanCPF.length === 11) {
                setTimeout(() => {
                    addMessage("CPF recebido ✔ Consultando condições disponíveis...", 'system');
                    
                    setTimeout(() => {
                        const options = `
                            <p>Encontramos as seguintes opções para você:</p>
                            <div class="btn-container">
                                <button class="chat-btn" onclick="handleAction('escolher_avista')">À vista com desconto</button>
                                <button class="chat-btn secondary" onclick="handleAction('escolher_parcelado')">Parcelamento</button>
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
    userInput.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    });

    initChat();
});
