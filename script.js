document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');

    let currentStep = 'start';

    // Função para adicionar mensagem ao chat
    function addMessage(text, type, htmlContent = null) {
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
                    <div class="btn-container">
                        <button class="chat-btn" onclick="handleAction('ver_condicoes')">Ver condições</button>
                    </div>
                `;
                addMessage(null, 'system', buttons);
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
        } else if (action === 'escolher_avista') {
            addMessage("Pagamento à vista com desconto", 'user');
            setTimeout(() => {
                const content = `
                    <div class="option-card">
                        <h4>Pagamento à Vista</h4>
                        <p>De: R$ 8.200,00</p>
                        <p>Por: <span class="highlight">R$ 5.000,00</span></p>
                    </div>
                    <div class="btn-container">
                        <button class="chat-btn" onclick="handleAction('gerar_pix')">Gerar PIX</button>
                        <a href="https://wa.me/5511999999999" target="_blank" class="chat-btn secondary">Falar com especialista</a>
                    </div>
                `;
                addMessage(null, 'system', content);
            }, 800);
        } else if (action === 'escolher_parcelado') {
            addMessage("Parcelamento", 'user');
            setTimeout(() => {
                const content = `
                    <div class="option-card">
                        <h4>Parcelamento</h4>
                        <p><span class="highlight">5x de R$ 1.000,00</span></p>
                    </div>
                    <div class="btn-container">
                        <a href="https://wa.me/5511999999999" target="_blank" class="chat-btn">Falar com especialista</a>
                    </div>
                `;
                addMessage(null, 'system', content);
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

        if (currentStep === 'cpf') {
            const cleanCPF = text.replace(/\D/g, '');
            if (cleanCPF.length === 11) {
                setTimeout(() => {
                    addMessage("CPF recebido ✔ Consultando condições disponíveis...", 'system');
                    
                    setTimeout(() => {
                        const options = `
                            <p>Opções disponíveis:</p>
                            <div class="btn-container">
                                <button class="chat-btn" onclick="handleAction('escolher_avista')">Pagamento à vista com desconto</button>
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
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    initChat();
});
