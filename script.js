/**
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} slug
 * @property {string} [logo_url] - URL da logo da empresa (opcional)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // localStorage.clear() removido: apagava chat_client_id_* a cada F5,
  // forçando geração de um novo client_id e perda da conversa existente.
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
      const input = prompt("Por segurança, digite os 4 primeiros números do seu CPF ou CNPJ:");
      if (!input) return;

      const inputDigits = input.replace(/\D/g, "").substring(0, 4);
      if (inputDigits.length !== 4) {
        alert("Dados incorretos");
        return;
      }

      // 1. Simplificação: Usa window.userCpf ou fallback do localStorage
      const storedCpf = window.userCpf || localStorage.getItem(`user_cpf_${tenantId}`);

      if (!storedCpf) {
        alert("Não foi possível validar seus dados no momento.");
        return;
      }

      // 2. Lógica de Comparação
      const cleanStoredDoc = storedCpf.replace(/\D/g, "");
      const storedDigits = cleanStoredDoc.substring(0, 4);

      if (inputDigits !== storedDigits) {
        alert("Dados incorretos");
        return;
      }

      // 3. Execução do Download
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename || "arquivo.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro na validação de segurança do PDF:", error);
      window.open(url, "_blank");
    }
  };

  // ── URL Parser ───────────────────────────────────────────────────────────────
  // Rota canônica: /{tenantSlug}  ou  /{tenantSlug}/{carteiraSlug}
  // Exemplos: /ml-gomes  |  /ml-gomes/veiculos  |  /ml-gomes/credito-imobiliario
  const ROUTE_SEGMENTS = { TENANT: 0, CARTEIRA: 1 };

  const parseChatRoute = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    return {
      tenantSlug:   parts[ROUTE_SEGMENTS.TENANT]   ?? null,
      carteiraSlug: parts[ROUTE_SEGMENTS.CARTEIRA] ?? null,
    };
  };

  const { tenantSlug, carteiraSlug } = parseChatRoute(window.location.pathname);
  const isNegociarRoute = tenantSlug === 'negociar';
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Identificadores e resolução de contexto ──────────────────────────────────
  let tenantId = null;
  let carteiraId = null;
  let tenantData = null;
  let carteiraData = null;

  // Função auxiliar para formatar o nome a partir do slug (Title Case)
  const formatCompanyName = (slug) => {
    if (!slug || slug.toLowerCase() === 'index.html') return "Atendimento Digital";
    return slug
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // 1. RESOLUÇÃO DE TENANT E CARTEIRA (Sem mutações prematuras no DOM)
  if (tenantSlug && tenantSlug.toLowerCase() !== 'index.html') {
    const searchSlug = tenantSlug.toLowerCase();

    if (window.supabaseClient) {
      const { data: tData, error: tError } =
        await window.supabaseClient
          .from("tenants")
          .select("id, slug, nome_empresa, logo_url")
          .ilike("slug", searchSlug)
          .single();

      if (tError || !tData) {
        console.error("Erro ao buscar tenant:", tError?.message);
      } else {
        tenantData = tData;
        tenantId = tData.id;
        localStorage.setItem("tenant_id", tenantId);

        // Se houver slug de carteira na URL, resolve a carteira antecipadamente
        if (carteiraSlug) {
          const { data: cData, error: cError } = await window.supabaseClient
            .from("carteiras")
            .select("id, slug, nome")
            .eq("tenant_id", tenantId)
            .ilike("slug", carteiraSlug.toLowerCase())
            .single();

          if (!cError && cData) {
            carteiraData = cData;
            carteiraId = cData.id;
          } else {
            console.warn("Carteira não encontrada:", carteiraSlug, cError?.message);
          }
        }
      }
    }
  } else {
    // Fallback caso não tenha slug na URL, busca dados pelo tenantId salvo em localStorage
    const savedTenantId = localStorage.getItem("tenant_id");
    if (window.supabaseClient && savedTenantId && savedTenantId !== "00000000-0000-0000-0000-000000000000") {
      const { data: tData } = await window.supabaseClient
        .from("tenants")
        .select("id, slug, nome_empresa, logo_url")
        .eq("id", savedTenantId)
        .single();

      if (tData) {
        tenantData = tData;
        tenantId = tData.id;
      }
    }
  }

  if (!tenantId) {
    console.error("Tenant não encontrado. Chat não iniciado.");
  }

  const resolved = {
    tenant_id: tenantId,
    nome_empresa: tenantData?.nome_empresa || null,
    logo_url: tenantData?.logo_url || null,
    carteira_id: carteiraId,
    carteira_nome: carteiraData?.nome || null,
    fallbackNome: formatCompanyName(tenantSlug),
  };

  // 2. BUSCA DO FLUXO PUBLICADO (bot_flows)
  async function getBotConfig({ tenantId, carteiraId = null, carteiraSlug = null } = {}) {
    const cliente = typeof window !== "undefined" ? window.supabaseClient : null;
    if (!cliente || !tenantId) return null;

    try {
      if (carteiraSlug && !carteiraId) {
        console.warn(
          `[Bot] Carteira "${carteiraSlug}" não identificada na empresa. Usando fallback de identidade.`,
        );
        return null;
      }

      let consulta = cliente
        .from("bot_flows")
        .select("flow, is_default, published_version, updated_at")
        .eq("tenant_id", tenantId)
        .not("published_version", "is", null);

      consulta =
        carteiraId === null
          ? consulta.is("carteira_id", null)
          : consulta.eq("carteira_id", carteiraId);

      const { data, error } = await consulta
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.warn("[Bot] Não foi possível ler o fluxo publicado:", error.message);
        return null;
      }

      if (!data || !data.length || !data[0].flow) {
        console.warn("[Bot] Nenhum fluxo publicado encontrado para este contexto.");
        return null;
      }

      const flowObj = data[0].flow;
      const pubVer = data[0].published_version || flowObj.publishedVersion;
      const versionObj = Array.isArray(flowObj.versions)
        ? flowObj.versions.find((v) => v.version === pubVer)
        : null;

      const config = versionObj?.document || versionObj?.config || flowObj.document || flowObj.config || null;
      const identity = config?.identity || versionObj?.identity || flowObj.identity || {};

      return {
        version: pubVer,
        identity: {
          chatName: identity.chatName || null,
          profilePicUrl: identity.profilePicUrl || null,
        },
        theme: config?.theme || {},
        initialStep: config?.initialStep || "start",
        config,
      };
    } catch (err) {
      console.warn("[Bot] Falha ao consultar o fluxo publicado:", err);
      return null;
    }
  }

  // 3. RENDERIZAÇÃO ATÔMICA DA IDENTIDADE VISUAL (Executada UMA ÚNICA VEZ)
  function renderChatIdentity(botConfig, resolvedContext = {}) {
    const headerTitle = document.querySelector(".header-title h1");
    const profilePic = document.querySelector(".profile-pic");

    // Resolução estrita do nome de exibição:
    // Prioridade 1: chatName configurado no Builder / publicado
    // Prioridade 2: "Nome Empresa - Nome Carteira"
    // Prioridade 3: "Nome Empresa"
    // Prioridade 4: Fallback do slug
    // Prioridade 5: "Atendimento Digital"
    let finalName;
    if (
      botConfig?.identity?.chatName &&
      typeof botConfig.identity.chatName === "string" &&
      botConfig.identity.chatName.trim() !== ""
    ) {
      finalName = botConfig.identity.chatName.trim();
    } else if (resolvedContext.nome_empresa && resolvedContext.carteira_nome) {
      finalName = `${resolvedContext.nome_empresa} - ${resolvedContext.carteira_nome}`;
    } else if (resolvedContext.nome_empresa) {
      finalName = resolvedContext.nome_empresa;
    } else if (resolvedContext.fallbackNome) {
      finalName = resolvedContext.fallbackNome;
    } else {
      finalName = "Atendimento Digital";
    }

    if (headerTitle) {
      headerTitle.textContent = finalName;
    }

    // Resolução da imagem / logo:
    // Prioridade 1: profilePicUrl do Builder
    // Prioridade 2: logo_url da tabela tenants
    const finalLogo = botConfig?.identity?.profilePicUrl || resolvedContext.logo_url || null;
    if (finalLogo && profilePic) {
      profilePic.src = finalLogo;
      profilePic.className = "profile-pic w-10 h-10 rounded-full object-cover border border-white/20 bg-white";
      profilePic.style.backgroundColor = "white";
      profilePic.style.objectFit = "cover";
      profilePic.style.border = "1px solid rgba(255,255,255,0.2)";
      profilePic.style.borderRadius = "9999px";
      profilePic.style.width = "40px";
      profilePic.style.height = "40px";
    }
  }

  // Obter configuração do bot e renderizar identidade UMA ÚNICA VEZ
  const botConfig = await getBotConfig({ tenantId, carteiraId, carteiraSlug });
  renderChatIdentity(botConfig, resolved);

  const chatArea = document.getElementById("chatArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const fileInput = document.getElementById("fileInput");

  let currentStep = "start";
  let isLiveChat = false;
  let userName = "";
  let optionsDisplayed = false; // Trava para evitar repetição do menu

  // Capturar telefone da URL
  const urlParams = new URLSearchParams(window.location.search);
  const telefoneCliente =
    urlParams.get("tel") || urlParams.get("telefone") || "";
  const origem = urlParams.get("origem");

  // Uma conversa (atendimento) = um chat_clients.id novo. A identidade vive em
  // sessionStorage: sobrevive ao F5 na MESMA aba (não duplica a conversa em
  // andamento), mas NÃO é reutilizada entre visitas/pessoas diferentes. Não é
  // chaveada por tenant/carteira/telefone — cada nova conversa gera um novo UUID.
  const clientStorageKey = 'chat_client_id';

  // 1. Recuperar ou gerar client_id (persiste só na sessão da aba, p/ sobreviver ao F5)
  let clientId = sessionStorage.getItem(clientStorageKey);
  let isReturningClient = !!clientId;

  if (!clientId) {
    clientId = crypto.randomUUID();
    sessionStorage.setItem(clientStorageKey, clientId);
  }

  // 2. Garantir que a área de chat comece vazia
  if (chatArea) {
    chatArea.innerHTML = "";
  }

  const localMessages = new Set();
  let clientEnsured = false;

  // Função para exibir alertas na tela (já que window.alert não funciona bem no iframe)
  function customAlert(message) {
    console.error("ALERTA DE ERRO:", message);
    const alertDiv = document.createElement("div");
    alertDiv.style.position = "fixed";
    alertDiv.style.top = "20px";
    alertDiv.style.left = "50%";
    alertDiv.style.transform = "translateX(-50%)";
    alertDiv.style.backgroundColor = "#ff4444";
    alertDiv.style.color = "white";
    alertDiv.style.padding = "15px 20px";
    alertDiv.style.borderRadius = "8px";
    alertDiv.style.zIndex = "999999";
    alertDiv.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    alertDiv.style.fontFamily = "sans-serif";
    alertDiv.style.fontWeight = "bold";
    alertDiv.innerHTML = message;
    
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "X";
    closeBtn.style.marginLeft = "15px";
    closeBtn.style.background = "none";
    closeBtn.style.border = "none";
    closeBtn.style.color = "white";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => alertDiv.remove();
    
    alertDiv.appendChild(closeBtn);
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 10000);
  }

  // 3. Criar cliente na tabela chat_clients
  let clientCreated = false;
  let isProcessing = false; // Flag de controle para evitar múltiplos cliques
  let createClientPromise = null;

  async function createClientAndSaveHistory(name, cpfCnpj, status = "aguardando") {
    // Bloqueio definitivo: sem tenant resolvido via slug, nenhum chat_client é criado
    if (!tenantId) {
      console.error("Tenant não encontrado. Chat não iniciado.");
      return;
    }

    // 4. Garantir que o client_id seja gerado e validado ANTES de iniciar
    if (!clientId) {
      clientId = crypto.randomUUID();
      sessionStorage.setItem(clientStorageKey, clientId);
    }

    if (!window.supabaseClient || clientCreated || isProcessing) return;
    
    isProcessing = true; // Ativa a trava

    try {
      // 1. Cadastrar cliente com UPSERT robusto
      const insertData = {
        id: clientId,
        name: name || "Cliente",
        cpf_cnpj: cpfCnpj || "",
        status: status,
        created_at: new Date().toISOString()
      };

      const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
      if (tenantId && isValidUUID(tenantId) && tenantId !== "00000000-0000-0000-0000-000000000000") {
        insertData.tenant_id = tenantId;
      }

      if (telefoneCliente) {
        insertData.telefone = telefoneCliente;
      }

      if (carteiraId && isValidUUID(carteiraId)) {
        insertData.carteira_id = carteiraId;
      }

      console.log("Iniciando persistência... cadastrando cliente.");
      try {
        const { error: insertError } = await window.supabaseClient.from("chat_clients").upsert([insertData]);
        if (insertError) {
            console.error("Erro no upsert de chat_clients:", insertError);
            throw insertError;
        }
        console.log("Cliente upserted com sucesso:", clientId);
      } catch (err) {
        console.error("Erro fatal ao persistir histórico (inserção de cliente falhou):", err);
        return; // Retorna e não insere as mensagens se o cliente falhou
      }

      // 2. ENVIO EM SEQUÊNCIA (PROMISE CHAIN)
      const messageElements = chatArea.querySelectorAll('.message');
      
      for (const msgDiv of messageElements) {
        // innerHTML preserva cards/botões visuais; textContent perderia o layout ao restaurar após F5
        const text = msgDiv.querySelector('.message-text')?.innerHTML || "";
        const isUser = msgDiv.classList.contains('user-msg');
        
        const messagePayload = {
          client_id: clientId,
          text: text,
          sender: isUser ? "client" : "system",
          created_at: new Date().toISOString()
        };

        if (insertData.tenant_id) {
            messagePayload.tenant_id = insertData.tenant_id;
        }

        console.log("Inserindo mensagem no histórico:", messagePayload);
        try {
            const { error: msgError } = await window.supabaseClient.from("chat_messages").insert([messagePayload]);
            if (msgError) console.warn("Erro recebido no insert:", msgError);
        } catch (err) {
            console.warn("Retorno interceptado via try/catch:", err);
        }

        // 2. MARCAÇÃO DE TEMPO: Delay de 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      clientCreated = true;
      
    } catch (error) {
      console.error("Erro silencioso ao persistir histórico:", error);
    } finally {
      isProcessing = false; // Libera a trava
    }
  }

  // 2 e 4. Salvar mensagens no Supabase (apenas se já criado)
  async function saveMessageToSupabase(text, type, htmlContent, msgDiv = null) {
    if (!window.supabaseClient) return;

    // Se o cadastro do cliente (createClientAndSaveHistory) ainda estiver em
    // andamento, espera terminar antes de decidir se salva ou não. Sem isso,
    // mensagens digitadas rapidamente após o CPF (ex: o nome) nunca eram
    // persistidas, pois clientCreated ainda estava false nesse instante.
    if (!clientCreated && createClientPromise) {
      await createClientPromise;
    }

    if (!clientCreated) return;

    try {
      let sender = type === "user" ? "client" : "system";
      let messageText = text || htmlContent;

      localMessages.add(messageText);

      const messagePayload = {
          client_id: clientId,
          text: messageText,
          sender: sender
      };

      const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
      if (tenantId && isValidUUID(tenantId) && tenantId !== "00000000-0000-0000-0000-000000000000") {
        messagePayload.tenant_id = tenantId;
      }

      console.log("Inserindo mensagem no chat_messages:", messagePayload);
      try {
          const { data, error } = await window.supabaseClient.from("chat_messages").insert([messagePayload]).select();
          if (error) {
            console.warn("Aviso ao salvar mensagem:", error);
          } else if (data && data.length > 0 && msgDiv) {
            msgDiv.id = `msg-${data[0].id}`;
          }
      } catch (insertCatchErr) {
          console.warn("Erro capturado no trycatch do insert:", insertCatchErr);
      }
      
      if (msgDiv && msgDiv._statusSpan) {
        msgDiv._statusSpan.textContent = "✓";
        msgDiv._statusSpan.style.color = "#8696a0";
        msgDiv._statusSpan.style.opacity = "1";
      }
    } catch (err) {
      console.error("Erro silencioso ao salvar mensagem no Supabase:", err);
    }
  }

  // Confirmação de entrega/leitura das mensagens do especialista (para o painel)
  async function markSpecialistMessagesDelivered() {
    if (!window.supabaseClient || !clientId) return;
    try {
      await window.supabaseClient
        .from("chat_messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("sender", "specialist")
        .is("delivered_at", null);
    } catch (err) {
      console.warn("Erro silencioso ao marcar mensagens como delivered:", err);
    }
  }

  async function markSpecialistMessagesRead() {
    if (!window.supabaseClient || !clientId) return;
    if (document.visibilityState !== "visible") return; // nunca marca read em background
    const nowIso = new Date().toISOString();
    try {
      await window.supabaseClient
        .from("chat_messages")
        .update({ delivered_at: nowIso, read_at: nowIso })
        .eq("client_id", clientId)
        .eq("sender", "specialist")
        .is("read_at", null);
    } catch (err) {
      console.warn("Erro silencioso ao marcar mensagens como read:", err);
    }
  }

  async function markSpecialistMessageDeliveredById(messageId) {
    if (!window.supabaseClient || !messageId) return;
    try {
      await window.supabaseClient
        .from("chat_messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", messageId)
        .is("delivered_at", null);
    } catch (err) {
      console.warn("Erro silencioso ao marcar mensagem como delivered:", err);
    }
  }

  // Reavalia "read" sempre que a aba volta a ficar visível (nunca em background)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      markSpecialistMessagesRead();
    }
  });

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
          if (payload.new.sender !== "specialist") return;

          // Confirmação de entrega (e leitura, se a aba estiver visível) da mensagem que chegou agora
          markSpecialistMessageDeliveredById(payload.new.id);
          if (document.visibilityState === "visible") {
            markSpecialistMessagesRead();
          }

          const messageText = payload.new.text || payload.new.content || "";

          // Evita duplicar mensagens que o próprio sistema local enviou
          if (!localMessages.has(messageText)) {
            let parsed;

            try {
              parsed =
                typeof messageText === "string"
                  ? JSON.parse(messageText)
                  : messageText;
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
                messageText,
                "system",
                null,
                false,
                payload.new.created_at,
              );
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.sender !== "client") return;
          
          const msgDiv = document.getElementById(`msg-${updated.id}`);
          if (msgDiv && msgDiv._statusSpan) {
            const status = updated.read_at ? "read" : (updated.delivered_at ? "delivered" : "sent");
            msgDiv._statusSpan.textContent = (status === "delivered" || status === "read") ? "✓✓" : "✓";
            if (status === "read") {
              msgDiv._statusSpan.style.color = "#53bdeb";
            } else {
              msgDiv._statusSpan.style.color = "#8696a0";
            }
          }
        }
      )
      .subscribe();

    // Detecta a finalizacao DESTE atendimento (status -> 'finalizado', feita pelo
    // especialista/gestor) e descarta o clientId da sessão. Assim o próximo
    // atendimento nesta aba (novo carregamento) gera um NOVO chat_clients.id —
    // nunca reutiliza um atendimento encerrado nem mistura mensagens.
    window.supabaseClient
      .channel(`chat_client_status_${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_clients",
          filter: `id=eq.${clientId}`,
        },
        (payload) => {
          if (payload.new && payload.new.status === "finalizado") {
            sessionStorage.removeItem(clientStorageKey);
          }
        }
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
    status = "sent",
    messageId = null
  ) {
    const msgDiv = document.createElement("div");
    if (messageId) {
      msgDiv.id = `msg-${messageId}`;
    }
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
        // WhatsApp ticks behavior
        statusSpan.textContent = (status === "delivered" || status === "read") ? "✓✓" : "✓";
        if (status === "read") {
          statusSpan.style.color = "#53bdeb"; // blue
        } else {
          statusSpan.style.color = "#8696a0"; // grey
        }
        statusSpan.style.opacity = "1";
      }
      timeDiv.appendChild(statusSpan);
      msgDiv._statusSpan = statusSpan;
    }

    msgDiv.appendChild(timeDiv);

    chatArea.appendChild(msgDiv);
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: 'smooth'
    });

    if (save === true) {
      saveMessageToSupabase(text, type, htmlContent, msgDiv);
      return; // Garante que não execute renderização dupla se já foi impressa
    }
  }

  // Função para carregar histórico de mensagens
  async function loadExistingMessages() {
    if (!window.supabaseClient) return false;

    let _msgQ = window.supabaseClient
      .from("chat_messages")
      .select("*")
      .eq("client_id", clientId)
      .eq("tenant_id", tenantId);
    if (carteiraId) _msgQ = _msgQ.eq("carteira_id", carteiraId);
    const { data: messages, error } = await _msgQ.order("created_at", { ascending: true });

    if (messages && messages.length > 0) {
      messages.forEach((msg) => {
        const messageText = msg.text || msg.content;
        // Não mostra a mensagem oculta de solicitação de boleto para o cliente
        if (
          messageText ===
          "⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto."
        )
          return;
        if (
          messageText ===
          "⚠️ O cliente solicitou uma renegociação. Assuma o atendimento e envie as condições."
        )
          return;

        // Evita duplicar mensagens
        if (localMessages.has(messageText)) return;
        localMessages.add(messageText);

        const type = (msg.sender === "client" || msg.sender_type === "cliente") ? "user" : "system";
        // Adiciona a mensagem sem salvar novamente no banco
        let parsed;

        try {
          parsed =
            typeof messageText === "string" ? JSON.parse(messageText) : messageText;
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
            const msgStatus = msg.read_at ? "read" : (msg.delivered_at ? "delivered" : "sent");
            addMessage(null, type, imgHtml, false, msg.created_at, msgStatus, msg.id);
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
            const msgStatus = msg.read_at ? "read" : (msg.delivered_at ? "delivered" : "sent");
            addMessage(null, type, fileHtml, false, msg.created_at, msgStatus, msg.id);
          }
        } else if (/<[a-z][\s\S]*>/i.test(messageText)) {
          // Mensagem contém HTML preservado (card/botão): restaura via htmlContent
          const msgStatus = msg.read_at ? "read" : (msg.delivered_at ? "delivered" : "sent");
          addMessage(null, type, messageText, false, msg.created_at, msgStatus, msg.id);
        } else {
          const msgStatus = msg.read_at ? "read" : (msg.delivered_at ? "delivered" : "sent");
          addMessage(messageText, type, null, false, msg.created_at, msgStatus, msg.id);
        }
      });

      // Mensagens do especialista acabaram de ser renderizadas na tela: confirma entrega
      // (e leitura, se a aba estiver visível em primeiro plano agora).
      markSpecialistMessagesDelivered();
      markSpecialistMessagesRead();

      // Verifica o status do cliente para saber se já está em atendimento
      let _clientQ = window.supabaseClient
        .from("chat_clients")
        .select("status")
        .eq("id", clientId)
        .eq("tenant_id", tenantId);
      if (carteiraId) _clientQ = _clientQ.eq("carteira_id", carteiraId);
      const { data: clientData } = await _clientQ.single();

      if (
        clientData &&
        (clientData.status === "em_atendimento" ||
          clientData.status === "aguardando")
      ) {
        isLiveChat = true;
        currentStep = "done";
      } else {
        // Restaurar o currentStep baseado no histórico
        const isWhatsappOrigin = origem === "whatsapp";

        const reversedMessages = [...messages].reverse();
        for (const msg of reversedMessages) {
          if (msg.sender === "system" || msg.sender_type === "especialista" || msg.sender_type === "system") {
            const text = msg.text || msg.content || "";
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

  window.loadExistingMessages = loadExistingMessages;


  // Fluxo Inicial
  async function initChat() {
    const isWhatsappOrigin = origem === "whatsapp";

    // Se carteiraId não foi resolvido anteriormente, tenta lookup resiliente
    if (carteiraSlug && tenantId && !carteiraId && window.supabaseClient) {
      const { data: cData, error: cError } = await window.supabaseClient
        .from('carteiras')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .ilike('slug', carteiraSlug.toLowerCase())
        .single();

      if (!cError && cData) {
        carteiraId = cData.id;
      }
    }

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

    // Tentar carregar histórico se for cliente retornando (preserva client_id, currentStep e isLiveChat)
    const hasHistory = await loadExistingMessages();
    if (hasHistory) {
      // Cliente já cadastrado em chat_clients: habilita persistência de novas mensagens
      clientCreated = true;
      if (currentStep === "nome_recebido") {
        optionsDisplayed = true; // o menu já está no histórico restaurado, evita repetição
      }
      return; // Conversa restaurada: não reinicia boas-vindas, CPF ou menu
    }


    if (telefoneCliente || isNegociarRoute || isWhatsappOrigin) {
      // Fluxo Automático (WhatsApp ou /negociar)
      setTimeout(() => {
        const msg =
          "Olá 👋<br><br>Você está em um ambiente seguro para negociação do seu contrato.<br><br>Para continuar o atendimento, digite seu CPF ou CNPJ apenas com números.";
        addMessage(null, "system", msg, false);
        currentStep = "cpf_whatsapp";
      }, 500);
    } else {
      // Fluxo Normal
      setTimeout(() => {
        addMessage(
          "Olá 👋 Identificamos uma condição especial para regularização do seu contrato.",
          "system",
          null,
          false
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
          addMessage(null, "system", cardHtml, false);
        }, 1000);
      }, 500);
    }
  }

  // Manipulador de Ações de Botões
  window.handleAction = async (action) => {
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
        setTimeout(() => {
          addMessage("Você será redirecionado para um especialista.", "system");
          isLiveChat = true;

          if (window.supabaseClient) {
            // .catch() não existe no builder do supabase-js: precisa de try/await,
            // senão a chamada lança "catch is not a function" e o update nunca é enviado.
            (async () => {
              try {
                await window.supabaseClient
                  .from("chat_clients")
                  .update({ status: "aguardando", especialista_id: null, assigned_at: null })
                  .eq("id", clientId);
              } catch (err) {
                console.warn("Falha silenciosa ao atualizar status:", err);
              }
            })();
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
      
      isLiveChat = true;

      if (window.supabaseClient) {
        // save=true (padrão): sem isso a mensagem nunca seria persistida, pois
        // createClientAndSaveHistory não é mais chamado neste ponto do fluxo.
        addMessage("Aguarde, um especialista está sendo chamado...", "system");

        (async () => {
          try {
            await window.supabaseClient
              .from("chat_clients")
              .update({ status: "aguardando", especialista_id: null, assigned_at: null })
              .eq("id", clientId);
          } catch (err) {
            console.warn("Falha silenciosa ao chamar especialista:", err);
          }
        })();
      }
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

          setTimeout(() => {
            isLiveChat = true;
            if (window.supabaseClient) {
              (async () => {
                try {
                  await window.supabaseClient
                    .from("chat_clients")
                    .update({ status: "aguardando", especialista_id: null, assigned_at: null })
                    .eq("id", clientId);
                } catch (err) {
                  console.warn("Falha silenciosa ao atualizar status:", err);
                }
              })();
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
      // a mensagem já foi salva pelo addMessage
      return;
    }

    if (currentStep === "cpf" || currentStep === "cpf_whatsapp") {
      const cleanCPF = text.replace(/\D/g, "");
      if (cleanCPF.length >= 11) {
        const isCNPJ = cleanCPF.length >= 14;
        const confirmMsg = isCNPJ ? "CNPJ recebido ✓" : "CPF recebido ✓";
        
        // Salva o CPF/CNPJ globalmente e no localStorage para usar no próximo passo e fallback
        window.userCpf = cleanCPF;
        localStorage.setItem(`user_cpf_${tenantId}`, cleanCPF);

        setTimeout(() => {
          addMessage(confirmMsg, "system");

          setTimeout(() => {
            addMessage("Agora, por favor, digite seu primeiro NOME.", "system");
            currentStep =
              currentStep === "cpf_whatsapp" ? "nome_whatsapp" : "nome";
            
            // Registra o cliente imediatamente no Supabase com status 'novo' para evitar perda de dados no F5
            if (window.supabaseClient) {
              createClientPromise = createClientAndSaveHistory("Cliente", cleanCPF, "novo");
            }
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
        const isWhatsapp = currentStep === "nome_whatsapp";
        currentStep = "nome_recebido"; // Atualiza o passo imediatamente

        if (isWhatsapp) {
          setTimeout(async () => {
            const msg = `Obrigado. Você está sendo conectado a um especialista.`;
            addMessage(null, "system", msg);
            isLiveChat = true;
            if (window.supabaseClient) {
              await window.supabaseClient.from("chat_clients")
                .update({ name: userName, status: "aguardando", especialista_id: null, assigned_at: null })
                .eq("id", clientId);
            }
          }, 800);
        } else {
          if (window.supabaseClient) {
            window.supabaseClient.from("chat_clients")
              .update({ name: userName })
              .eq("id", clientId)
              .then(() => console.log("Name updated successfully in DB"))
              .catch(err => console.error("Error updating name:", err));
          }
          setTimeout(() => {
            addMessage(
              `Obrigado, ${userName}! Consultando condições disponíveis...`,
              "system",
            );

            setTimeout(() => {
              if (!optionsDisplayed) { // Trava de estado
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
                optionsDisplayed = true;
              }
            }, 1000); // 1 segundo de atraso conforme solicitado
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
