document.addEventListener("DOMContentLoaded", async () => {
  // Função para forçar o download de imagens
  window.downloadImage = async function (url, filename) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename || "download.jpg";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error(
        "Erro ao baixar a imagem via fetch, tentando fallback:",
        error,
      );

      // Fallback: Adiciona parâmetro download na URL
      let finalUrl = url;
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set("download", filename || "true");
        finalUrl = urlObj.toString();
      } catch (e) {
        // Ignore invalid URLs
      }

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = finalUrl;
      a.download = filename || "download.jpg";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Função para forçar o download de PDFs com validação de segurança
  window.downloadPdf = async function (url, filename) {
    try {
      // 1. Solicitar os 4 primeiros dígitos
      const input = prompt(
        "Por segurança, digite os 4 primeiros números do seu CPF ou CNPJ:",
      );

      if (!input) {
        return; // Usuário cancelou
      }

      const digits = input.replace(/\D/g, "").substring(0, 4);

      if (digits.length !== 4) {
        alert("Dados incorretos");
        return;
      }

      // 2. Buscar o CPF/CNPJ do cliente no banco
      let storedDoc = null;

      if (window.supabaseClient) {
        // Tenta buscar da tabela chat_clients (pode ser cpf ou documento)
        const { data, error } = await window.supabaseClient
          .from("chat_clients")
          .select("cpf, documento")
          .eq("id", clientId)
          .eq("tenant_id", tenantId)
          .single();

        if (data && !error) {
          storedDoc = data.cpf || data.documento;
        }

        // Se não encontrou na tabela, tenta buscar nas mensagens do cliente
        if (!storedDoc) {
          const { data: msgs } = await window.supabaseClient
            .from("chat_messages")
            .select("content")
            .eq("client_id", clientId)
            .eq("tenant_id", tenantId)
            .eq("sender_type", "cliente")
            .order("created_at", { ascending: true });

          if (msgs && msgs.length > 0) {
            // Procura a primeira mensagem que parece um CPF/CNPJ (apenas números, length >= 11)
            for (const msg of msgs) {
              const cleanText = msg.content.replace(/\D/g, "");
              if (cleanText.length >= 11 && cleanText.length <= 14) {
                storedDoc = cleanText;
                break;
              }
            }
          }
        }
      }

      if (!storedDoc) {
        alert("Não foi possível validar seus dados no momento.");
        return;
      }

      const cleanStoredDoc = storedDoc.replace(/\D/g, "");
      const storedDigits = cleanStoredDoc.substring(0, 4);

      // 3. Validar
      if (digits !== storedDigits) {
        alert("Dados incorretos");
        return;
      }

      // 4. Se passou, faz o download
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = blobUrl;
          a.download = filename || "arquivo.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
        })
        .catch((err) => {
          console.error("Erro ao baixar PDF:", err);
          window.open(url, "_blank");
        });
    } catch (error) {
      console.error("Erro na validação de segurança do PDF:", error);
      alert("Ocorreu um erro ao tentar baixar o arquivo.");
    }
  };

  // Lógica de Slug Dinâmico
  const slug_da_url = window.location.pathname.split('/').filter(Boolean).pop();
  let tenantId = null;

  // Função para formatar o nome da empresa (Title Case e tratamento de hífens/sublinhados)
  const formatCompanyName = (slug) => {
    if (!slug) return "Atendimento Digital";
    return slug
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Atualizar o nome da empresa no cabeçalho IMEDIATAMENTE via URL
  const headerTitle = document.querySelector(".header-title h1");
  if (headerTitle && slug_da_url && slug_da_url.toLowerCase() !== 'index.html') {
    headerTitle.textContent = formatCompanyName(slug_da_url);
  }

  console.log("Slug capturado da URL:", slug_da_url);

  if (!slug_da_url || slug_da_url.toLowerCase() === 'index.html') {
    document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#333;background:#f5f5f5;text-align:center;padding:20px;">
                <h1 style="font-size:24px;margin-bottom:10px;">Bem-vindo ao Sistema</h1>
                <p style="font-size:16px;">Por favor, acesse através do link específico da sua empresa.</p>
            </div>
        `;
    return;
  }

  if (slug_da_url) {
    const searchSlug = slug_da_url.toLowerCase();
    console.log("Buscando no banco o slug:", searchSlug);

    if (window.supabaseClient) {
      const { data: tenantData, error: tenantError } =
        await window.supabaseClient
          .from("tenants")
          .select("*")
          .ilike("slug", searchSlug)
          .single();

      if (tenantError) {
        console.error("Erro ao buscar tenant:", tenantError.message);
      }

      if (tenantError || !tenantData) {
        document.body.innerHTML = `
                    <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;font-size:20px;color:#333;background:#f5f5f5;">
                        Empresa não encontrada
                    </div>
                `;
        return;
      }
      tenantId = tenantData.id;
      localStorage.setItem("tenant_id", tenantId);
    }
  }

  const chatArea = document.getElementById("chatArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const fileInput = document.getElementById("fileInput");

  let currentStep = "start";
  let isLiveChat = false;
  let userName = "";

  // Capturar telefone da URL
  const urlParams = new URLSearchParams(window.location.search);
  const telefoneCliente =
    urlParams.get("tel") || urlParams.get("telefone") || "";
  const origem = urlParams.get("origem");

  // 1. Limpar histórico anterior e gerar um novo client_id a cada acesso
  localStorage.removeItem(`chat_client_id_${tenantId}`);
  let clientId = crypto.randomUUID();
  localStorage.setItem(`chat_client_id_${tenantId}`, clientId);
  let isReturningClient = false;

  // 2. Garantir que a área de chat comece vazia
  if (chatArea) {
    chatArea.innerHTML = "";
  }

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
          .from("chat_clients")
          .select("id")
          .eq("id", clientId)
          .eq("tenant_id", tenantId);

        if (!data || data.length === 0) {
          const insertData = {
            id: clientId,
            name: "Cliente",
            status: "bot",
            tenant_id: tenantId,
          };

          if (telefoneCliente) {
            insertData.telefone = telefoneCliente;
          }

          await window.supabaseClient.from("chat_clients").insert([insertData]);
        }
        clientCreated = true;
      })();
    }
    await createClientPromise;
  }

  // Inicializa a verificação do cliente assim que abre o chat
  createClientIfNotExists();

  // 2 e 4. Salvar mensagens no Supabase
  async function saveMessageToSupabase(text, type, htmlContent, msgDiv = null) {
    if (!window.supabaseClient) return;
    await createClientIfNotExists();

    // Busca o especialista_id atual do cliente
    let especialista_id = null;
    try {
      const { data: clientData } = await window.supabaseClient
        .from("chat_clients")
        .select("especialista_id")
        .eq("id", clientId)
        .single();
      if (clientData) especialista_id = clientData.especialista_id;
    } catch (e) {
      console.warn("Não foi possível buscar especialista_id:", e);
    }

    let sender = type === "user" ? "cliente" : "especialista";
    let messageText = text || htmlContent;

    localMessages.add(messageText);

    try {
      const { error } = await window.supabaseClient.from("chat_messages").insert([
        {
          client_id: clientId,
          especialista_id: especialista_id,
          content: messageText,
          sender_type: sender,
          created_at: new Date(),
          tenant_id: tenantId,
        },
      ]);

      if (!error && msgDiv && msgDiv._statusSpan) {
        // Ícone de check (enviado)
        msgDiv._statusSpan.innerHTML = '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
        msgDiv._statusSpan.style.opacity = "1";
        msgDiv._statusSpan.title = "Enviada";
      }
    } catch (err) {
      console.error("Erro ao salvar mensagem no Supabase:", err);
    }
  }

  // 5. Escutar mensagens em tempo real
  if (window.supabaseClient) {
    window.supabaseClient
      .channel(`chat_messages_${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          if (payload.new.sender_type === "especialista") {
            // Evita duplicar mensagens que o próprio sistema local enviou
            if (!localMessages.has(payload.new.content)) {
              let parsed;

              try {
                parsed =
                  typeof payload.new.content === "string"
                    ? JSON.parse(payload.new.content)
                    : payload.new.content;
              } catch {
                parsed = null;
              }

              if (parsed && parsed.__isFile) {
                if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                  const imgHtml = `
                                    <div style="position: relative; display: inline-block; max-width: 100%;">
                                        <img src="${parsed.url}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
                                        <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${parsed.url}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                            </svg>
                                        </a>
                                    </div>
                                `;
                  addMessage(
                    null,
                    "system",
                    imgHtml,
                    false,
                    payload.new.created_at,
                  );
                } else {
                  const fileHtml = `
                                  <div 
                                    onclick="window.downloadPdf('${parsed.url}', '${parsed.name}')"
                                    style="
                                      background: #ffffff;
                                      border-radius: 12px;
                                      padding: 16px;
                                      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                                      display: flex;
                                      flex-direction: column;
                                      align-items: center;
                                      gap: 12px;
                                      cursor: pointer;
                                      margin: 4px 0;
                                      min-width: 180px;
                                      max-width: 240px;
                                      border: 1px solid #f0f0f0;
                                  ">
                                    <img 
                                      src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                                      style="width: 64px; height: 64px;"
                                    />
                                    <div style="
                                      font-size: 15px;
                                      font-weight: 600;
                                      color: #1f2937;
                                      text-align: center;
                                      word-break: break-word;
                                      line-height: 1.3;
                                    ">
                                      ${parsed.name}
                                    </div>
                                    <div style="
                                      font-size: 13px;
                                      color: #6b7280;
                                      font-weight: 500;
                                    ">
                                      Toque para baixar ➜
                                    </div>
                                  </div>
                                `;
                  addMessage(
                    null,
                    "system",
                    fileHtml,
                    false,
                    payload.new.created_at,
                  );
                }
              } else {
                addMessage(
                  payload.new.content,
                  "system",
                  null,
                  false,
                  payload.new.created_at,
                );
              }
            }
          }
        },
      )
      .subscribe();
  }

  // Função para adicionar mensagem ao chat
  function addMessage(
    text,
    type,
    htmlContent = null,
    save = true,
    createdAt = null,
  ) {
    const msgDiv = document.createElement("div");
    if (!htmlContent || !htmlContent.includes("pdf-clean")) {
      msgDiv.classList.add("message");
      msgDiv.classList.add(type === "system" ? "system-msg" : "user-msg");
    } else {
      msgDiv.style.alignSelf = type === "system" ? "flex-start" : "flex-end";
      msgDiv.style.animation =
        "fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      msgDiv.style.margin = "4px 0";
    }

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-text");

    if (htmlContent) {
      contentDiv.innerHTML = htmlContent;
    } else if (text) {
      if (text.startsWith("http")) {
        const isImage = text.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i);
        if (isImage) {
          contentDiv.innerHTML = `
                        <div style="position: relative; display: inline-block; max-width: 100%;">
                            <img src="${text}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
                            <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${text}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                            </a>
                        </div>
                    `;
        } else {
          const fileName = text.split("/").pop() || "Documento";
          contentDiv.innerHTML = `
                      <div 
                        onclick="window.downloadPdf('${text}', '${fileName}')"
                        style="
                          background: #ffffff;
                          border-radius: 12px;
                          padding: 16px;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          gap: 12px;
                          cursor: pointer;
                          margin: 4px 0;
                          min-width: 180px;
                          max-width: 240px;
                          border: 1px solid #f0f0f0;
                      ">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                          style="width: 64px; height: 64px;"
                        />
                        <div style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #1f2937;
                          text-align: center;
                          word-break: break-word;
                          line-height: 1.3;
                        ">
                          ${fileName}
                        </div>
                        <div style="
                          font-size: 13px;
                          color: #6b7280;
                          font-weight: 500;
                        ">
                          Toque para baixar ➜
                        </div>
                      </div>
                    `;
        }
      } else {
        if (type === "system") {
          contentDiv.innerHTML = text;
        } else {
          contentDiv.textContent = text;
        }
      }
    }

    msgDiv.appendChild(contentDiv);

    const timeDiv = document.createElement("div");
    timeDiv.classList.add("message-time");
    timeDiv.style.display = "flex";
    timeDiv.style.alignItems = "center";
    timeDiv.style.justifyContent = "flex-end";
    timeDiv.style.gap = "4px";

    const timeSpan = document.createElement("span");
    const dateObj = createdAt ? new Date(createdAt) : new Date();
    timeSpan.textContent = dateObj.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    timeDiv.appendChild(timeSpan);

    if (type === "user") {
      const statusSpan = document.createElement("span");
      statusSpan.classList.add("message-status");
      if (save) {
        // Ícone de relógio (enviando)
        statusSpan.innerHTML =
          '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>';
        statusSpan.style.opacity = "0.5";
      } else {
        // Ícone de check (já enviado/histórico)
        statusSpan.innerHTML =
          '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
        statusSpan.style.opacity = "1";
      }
      timeDiv.appendChild(statusSpan);
      msgDiv._statusSpan = statusSpan;
    }

    msgDiv.appendChild(timeDiv);

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    if (save) {
      saveMessageToSupabase(text, type, htmlContent, msgDiv);
    }
  }

  // Função para carregar histórico de mensagens
  async function loadExistingMessages() {
    if (!window.supabaseClient) return false;

    const { data: messages, error } = await window.supabaseClient
      .from("chat_messages")
      .select("*")
      .eq("client_id", clientId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (messages && messages.length > 0) {
      messages.forEach((msg) => {
        // Não mostra a mensagem oculta de solicitação de boleto para o cliente
        if (
          msg.content ===
          "⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto."
        )
          return;
        if (
          msg.content ===
          "⚠️ O cliente solicitou uma renegociação. Assuma o atendimento e envie as condições."
        )
          return;

        const type = msg.sender_type === "cliente" ? "user" : "system";
        // Adiciona a mensagem sem salvar novamente no banco
        let parsed;

        try {
          parsed =
            typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
        } catch {
          parsed = null;
        }

        if (parsed && parsed.__isFile) {
          if (parsed.url && parsed.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            const imgHtml = `
                            <div style="position: relative; display: inline-block; max-width: 100%;">
                                <img src="${parsed.url}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
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
                          <div 
                            onclick="window.downloadPdf('${parsed.url}', '${parsed.name}')"
                            style="
                              background: #ffffff;
                              border-radius: 12px;
                              padding: 16px;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              gap: 12px;
                              cursor: pointer;
                              margin: 4px 0;
                              min-width: 180px;
                              max-width: 240px;
                              border: 1px solid #f0f0f0;
                          ">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                              style="width: 64px; height: 64px;"
                            />
                            <div style="
                              font-size: 15px;
                              font-weight: 600;
                              color: #1f2937;
                              text-align: center;
                              word-break: break-word;
                              line-height: 1.3;
                            ">
                              ${parsed.name}
                            </div>
                            <div style="
                              font-size: 13px;
                              color: #6b7280;
                              font-weight: 500;
                            ">
                              Toque para baixar ➜
                            </div>
                          </div>
                        `;
            addMessage(null, type, fileHtml, false, msg.created_at);
          }
        } else {
          addMessage(msg.content, type, null, false, msg.created_at);
        }
      });

      // Verifica o status do cliente para saber se já está em atendimento
      const { data: clientData } = await window.supabaseClient
        .from("chat_clients")
        .select("status")
        .eq("id", clientId)
        .eq("tenant_id", tenantId)
        .single();

      if (
        clientData &&
        (clientData.status === "em_atendimento" ||
          clientData.status === "aguardando")
      ) {
        isLiveChat = true;
        currentStep = "done";
      } else {
        // Restaurar o currentStep baseado no histórico
        const isNegociarRoute =
          window.location.pathname.replace(/\/$/, "") === "/negociar";
        const isWhatsappOrigin = origem === "whatsapp";

        const reversedMessages = [...messages].reverse();
        for (const msg of reversedMessages) {
          if (msg.sender_type === "especialista" || msg.sender_type === "system") {
            const text = msg.content || "";
            if (
              text.includes("Gerando boleto") ||
              text.includes("conectado a um especialista")
            ) {
              isLiveChat = true;
              currentStep = "done";
              break;
            } else if (
              text.includes("informe seu CPF") ||
              text.includes("digite seu CPF") ||
              text.includes("CPF/CNPJ inválido") ||
              text.includes("CPF inválido")
            ) {
              currentStep =
                isWhatsappOrigin || isNegociarRoute ? "cpf_whatsapp" : "cpf";
              break;
            } else if (
              text.includes("digite seu primeiro NOME") ||
              text.includes("nome válido")
            ) {
              currentStep =
                isWhatsappOrigin || isNegociarRoute ? "nome_whatsapp" : "nome";
              break;
            } else if (
              text.includes("Opções disponíveis") ||
              text.includes("Pagamento à Vista") ||
              text.includes("Parcelamento") ||
              text.includes("Entrega amigável") ||
              text.includes("escolha uma das opções")
            ) {
              currentStep = "nome_recebido";
              break;
            } else if (text.includes("Zere sua dívida hoje!")) {
              currentStep = "start";
              break;
            }
          }
        }
      }
      return true;
    }
    return false;
  }

  // Fluxo Inicial
  async function initChat() {
    const isNegociarRoute =
      window.location.pathname.replace(/\/$/, "") === "/negociar";
    const isWhatsappOrigin = origem === "whatsapp";

    // Garantir que o campo de digitação esteja visível e ativo
    const footer = document.querySelector(".footer");
    if (footer) {
      footer.style.display = "block";
      footer.style.visibility = "visible";
      footer.style.opacity = "1";
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
        const msg =
          "Olá 👋<br><br>Você está em um ambiente seguro para negociação do seu contrato.<br><br>Para continuar o atendimento, digite seu CPF ou CNPJ apenas com números.";
        addMessage(null, "system", msg);
        currentStep = "cpf_whatsapp";
      }, 500);
    } else {
      // Fluxo Normal
      setTimeout(() => {
        addMessage(
          "Olá 👋 Identificamos uma condição especial para regularização do seu contrato.",
          "system",
        );

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
          addMessage(null, "system", cardHtml);
        }, 1000);
      }, 500);
    }
  }

  // Manipulador de Ações de Botões
  window.handleAction = (action) => {
    if (action === "ver_condicoes") {
      addMessage("Ver condições", "user");
      currentStep = "cpf";
      setTimeout(() => {
        addMessage(
          "Por favor, informe seu CPF ou CNPJ para consultarmos seu contrato.",
          "system",
        );
      }, 800);
    } else if (action === "pagamento_total") {
      addMessage("1️⃣ Pagamento total da(s) parcela(s)", "user");
      setTimeout(() => {
        addMessage(
          "Aguarde um instante, estamos analisando a melhor condição para o seu contrato.",
          "system",
        );
        setTimeout(() => {
          const content = `
                        <div class="option-card">
                            <h4>Pagamento à Vista</h4>
                            <p>De: 20% de desconto</p>
                            <p>Por: <span class="highlight">até 80% de desconto</span></p>
                        </div>
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('gerar_boleto')">Gerar boleto com desconto</button>
                            <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `;
          addMessage(null, "system", content);
        }, 1500);
      }, 800);
    } else if (action === "renegociacao_carencia") {
      addMessage("2️⃣ Renegociação com carência de até 90 dias", "user");
      setTimeout(() => {
        addMessage(
          "Estamos analisando a proposta de renegociação com carência de até 90 dias. Aguarde um instante enquanto verificamos as condições disponíveis.",
          "system",
        );
        setTimeout(async () => {
          addMessage("Você será redirecionado para um especialista.", "system");
          isLiveChat = true;

          if (window.supabaseClient) {
            await createClientIfNotExists();
            await window.supabaseClient.from("chat_messages").insert([
              {
                client_id: clientId,
                especialista_id: null,
                content: "⚠️ O cliente solicitou uma renegociação. Assuma o atendimento e envie as condições.",
                sender_type: "cliente",
                created_at: new Date(),
                tenant_id: tenantId,
              },
            ]);
            await window.supabaseClient
              .from("chat_clients")
              .update({ status: "aguardando" })
              .eq("id", clientId);
          }
        }, 1500);
      }, 800);
    } else if (action === "entrega_amigavel") {
      addMessage("3️⃣ Entrega amigável do bem", "user");
      setTimeout(() => {
        const msg =
          "A entrega amigável é quitativa, ou seja, quitação Total do financiamento.<br><br>Caso existam débitos no DETRAN, iremos regularizar e retirar essas pendências.<br><br>Após a conclusão, você poderá verificar a possibilidade de financiar outro veículo com parcelas que caibam no seu bolso.<br><br>Todas as informações estão sujeitas à análise.";
        addMessage(null, "system", msg);
        setTimeout(() => {
          const btn = `
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `;
          addMessage(null, "system", btn);
        }, 1500);
      }, 800);
    } else if (action === "falar_especialista") {
      addMessage("4️⃣ Falar com um especialista", "user");
      setTimeout(async () => {
        addMessage(
          "Aguarde um instante, você será conectado a um especialista.",
          "system",
        );
        isLiveChat = true;

        if (window.supabaseClient) {
          await createClientIfNotExists();
          await window.supabaseClient
            .from("chat_clients")
            .update({ status: "aguardando" })
            .eq("id", clientId);
        }
      }, 800);
    } else if (action === "gerar_boleto") {
      addMessage("Gerar boleto com desconto", "user");
      setTimeout(() => {
        addMessage(
          "Só um instante, estamos gerando o boleto com os descontos, mostraremos o valor de pagamento e vencimento do boleto.",
          "system",
        );
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
          addMessage(null, "system", content);

          setTimeout(async () => {
            isLiveChat = true;
            if (window.supabaseClient) {
              await createClientIfNotExists();
              // Envia uma mensagem para o especialista (aparecerá no painel como se fosse do cliente)
              await window.supabaseClient.from("chat_messages").insert([
                {
                  client_id: clientId,
                  especialista_id: null,
                  content: "⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto.",
                  sender_type: "cliente",
                  created_at: new Date(),
                  tenant_id: tenantId,
                },
              ]);
              await window.supabaseClient
                .from("chat_clients")
                .update({ status: "aguardando" })
                .eq("id", clientId);
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

    addMessage(text, "user");
    userInput.value = "";

    if (isLiveChat) {
      // Se estiver no chat ao vivo, o bot não responde mais,
      // apenas salva a mensagem para o especialista ver
      await saveMessageToSupabase(text, "user");
      return;
    }

    if (currentStep === "cpf" || currentStep === "cpf_whatsapp") {
      const cleanCPF = text.replace(/\D/g, "");
      if (cleanCPF.length >= 11) {
        const isCNPJ = cleanCPF.length >= 14;
        const confirmMsg = isCNPJ ? "CNPJ recebido ✓" : "CPF recebido ✓";

        setTimeout(() => {
          addMessage(confirmMsg, "system");

          setTimeout(() => {
            addMessage("Agora, por favor, digite seu primeiro NOME.", "system");
            currentStep =
              currentStep === "cpf_whatsapp" ? "nome_whatsapp" : "nome";
          }, 800);
        }, 800);
      } else {
        setTimeout(() => {
          if (currentStep === "cpf_whatsapp") {
            addMessage(
              "CPF/CNPJ inválido. Por favor, digite apenas números.",
              "system",
            );
          } else {
            addMessage(
              "CPF inválido. Por favor, digite os 11 números do seu CPF.",
              "system",
            );
          }
        }, 800);
      }
    } else if (currentStep === "nome" || currentStep === "nome_whatsapp") {
      userName = text.trim();
      if (userName.length >= 2) {
        // Atualiza o nome do cliente no Supabase sem bloquear o fluxo
        if (window.supabaseClient) {
          window.supabaseClient
            .from("chat_clients")
            .update({
              name: userName,
            })
            .eq("id", clientId)
            .then();
        }

        if (currentStep === "nome_whatsapp") {
          setTimeout(async () => {
            const msg = `Obrigado. Você está sendo conectado a um especialista.`;
            addMessage(null, "system", msg);
            currentStep = "nome_recebido";
            isLiveChat = true;

            if (window.supabaseClient) {
              await createClientIfNotExists();
              await window.supabaseClient
                .from("chat_clients")
                .update({ status: "em_atendimento" })
                .eq("id", clientId);
            }
          }, 800);
        } else {
          setTimeout(() => {
            addMessage(
              `Obrigado, ${userName}! Consultando condições disponíveis...`,
              "system",
            );

            setTimeout(() => {
              const options = `
                                <p>Opções disponíveis:</p>
                                <div class="btn-container">
                                    <button class="chat-btn" onclick="handleAction('pagamento_total')">1️⃣ Pagamento total da(s) parcela(s)</button>
                                    <button class="chat-btn" onclick="handleAction('renegociacao_carencia')">2️⃣ Renegociação com carência de até 90 dias</button>
                                    <button class="chat-btn" onclick="handleAction('entrega_amigavel')">3️⃣ Entrega amigável do Veículo</button>
                                    <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">4️⃣ Falar com um especialista</button>
                                </div>
                            `;
              addMessage(null, "system", options);
              currentStep = "nome_recebido";
            }, 1500);
          }, 800);
        }
      } else {
        setTimeout(() => {
          addMessage("Por favor, digite um nome válido.", "system");
        }, 800);
      }
    } else if (currentStep === "nome_recebido") {
      const option = text.trim();
      if (option === "1") {
        handleAction("pagamento_total");
      } else if (option === "2") {
        handleAction("renegociacao_carencia");
      } else if (option === "3") {
        handleAction("entrega_amigavel");
      } else if (option === "4") {
        handleAction("falar_especialista");
      } else {
        setTimeout(() => {
          addMessage(
            "Por favor, escolha uma das opções acima clicando nos botões ou digitando o número correspondente (1, 2, 3 ou 4).",
            "system",
          );
        }, 800);
      }
    }
  }

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!window.supabaseClient) {
        alert("Supabase não configurado.");
        return;
      }

      const filePath = `${clientId}/${Date.now()}_${file.name}`;

      // Upload the file
      const { error } = await window.supabaseClient.storage
        .from("Chat_attachments")
        .upload(filePath, file);

      if (error) {
        console.error("Erro no upload:", error);
        alert("Erro ao enviar arquivo.");
        return;
      }

      // Get public URL
      const { data } = window.supabaseClient.storage
        .from("Chat_attachments")
        .getPublicUrl(filePath);

      if (data && data.publicUrl) {
        addMessage(data.publicUrl, "user");
      }

      fileInput.value = ""; // Reset input
    });
  }

  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSend();
  });

  initChat();
});
