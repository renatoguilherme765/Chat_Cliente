import{createClient as O}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const h=document.createElement("link").relList;if(h&&h.supports&&h.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))_(u);new MutationObserver(u=>{for(const p of u)if(p.type==="childList")for(const w of p.addedNodes)w.tagName==="LINK"&&w.rel==="modulepreload"&&_(w)}).observe(document,{childList:!0,subtree:!0});function c(u){const p={};return u.integrity&&(p.integrity=u.integrity),u.referrerPolicy&&(p.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?p.credentials="include":u.crossOrigin==="anonymous"?p.credentials="omit":p.credentials="same-origin",p}function _(u){if(u.ep)return;u.ep=!0;const p=c(u);fetch(u.href,p)}})();const F="https://pjnauygynuakdurokkew.supabase.co",q="sb_publishable_5ksGaNp4pNRKpJA8X8SAGA_SmmCAiX2";console.log("Inicializando Supabase com chaves fixas...");window.supabaseClient=O(F,q),console.log("Supabase inicializado com sucesso!");document.addEventListener("DOMContentLoaded",async()=>{localStorage.clear(),window.downloadImage=async function(t,e){try{const a=await fetch(t);if(!a.ok)throw new Error("Network response was not ok");const o=await a.blob(),i=window.URL.createObjectURL(o),r=document.createElement("a");r.style.display="none",r.href=i,r.download=e||"download.jpg",document.body.appendChild(r),r.click(),window.URL.revokeObjectURL(i),document.body.removeChild(r)}catch(a){console.error("Erro ao baixar a imagem via fetch, tentando fallback:",a);let o=t;try{const r=new URL(t);r.searchParams.set("download",e||"true"),o=r.toString()}catch{}const i=document.createElement("a");i.style.display="none",i.href=o,i.download=e||"download.jpg",i.target="_blank",document.body.appendChild(i),i.click(),document.body.removeChild(i)}},window.downloadPdf=async function(t,e){try{const a=prompt("Por segurança, digite os 4 primeiros números do seu CPF ou CNPJ:");if(!a)return;const o=a.replace(/\D/g,"").substring(0,4);if(o.length!==4){alert("Dados incorretos");return}const i=window.userCpf||localStorage.getItem(`user_cpf_${c}`);if(!i){alert("Não foi possível validar seus dados no momento.");return}const s=i.replace(/\D/g,"").substring(0,4);if(o!==s){alert("Dados incorretos");return}const l=await fetch(t);if(!l.ok)throw new Error("Falha ao baixar arquivo");const g=await l.blob(),b=window.URL.createObjectURL(g),d=document.createElement("a");d.style.display="none",d.href=b,d.download=e||"arquivo.pdf",document.body.appendChild(d),d.click(),d.remove(),window.URL.revokeObjectURL(b)}catch(a){console.error("Erro na validação de segurança do PDF:",a),window.open(t,"_blank")}};const x=window.location.pathname.split("/").filter(Boolean),h=x.length>0?x[x.length-1]:null;let c=null;const _=t=>!t||t.toLowerCase()==="index.html"?"Atendimento Digital":t.split(/[-_]/).map(e=>e.charAt(0).toUpperCase()+e.slice(1).toLowerCase()).join(" "),u=document.querySelector(".header-title h1");if(u&&(u.textContent=_(h)),console.log("Slug capturado da URL:",h),h&&h.toLowerCase()!=="index.html"){const t=h.toLowerCase();if(console.log("Buscando no banco o slug:",t),window.supabaseClient){const{data:e,error:a}=await window.supabaseClient.from("tenants").select("id, slug, logo_url").ilike("slug",t).single();if(a||!e)console.error("Erro ao buscar tenant:",a==null?void 0:a.message);else if(c=e.id,localStorage.setItem("tenant_id",c),e.logo_url){const o=document.querySelector(".profile-pic");o&&(o.src=e.logo_url,o.className="profile-pic w-10 h-10 rounded-full object-cover border border-white/20 bg-white",o.style.backgroundColor="white",o.style.objectFit="cover",o.style.border="1px solid rgba(255,255,255,0.2)",o.style.borderRadius="9999px",o.style.width="40px",o.style.height="40px")}}}else if(window.supabaseClient&&c&&c!=="00000000-0000-0000-0000-000000000000"){const{data:t}=await window.supabaseClient.from("tenants").select("logo_url").eq("id",c).single();if(t&&t.logo_url){const e=document.querySelector(".profile-pic");e&&(e.src=t.logo_url,e.className="profile-pic w-10 h-10 rounded-full object-cover border border-white/20 bg-white",e.style.backgroundColor="white",e.style.objectFit="cover",e.style.border="1px solid rgba(255,255,255,0.2)",e.style.borderRadius="9999px",e.style.width="40px",e.style.height="40px")}}c||console.error("Tenant não encontrado. Chat não iniciado.");const p=document.getElementById("chatArea"),w=document.getElementById("userInput"),A=document.getElementById("sendBtn"),P=document.getElementById("fileInput");let m="start",y=!1,v="",I=!1;const L=new URLSearchParams(window.location.search),S=L.get("tel")||L.get("telefone")||"",D=L.get("origem");let f=localStorage.getItem(`chat_client_id_${c}`);f||(f=crypto.randomUUID(),localStorage.setItem(`chat_client_id_${c}`,f)),p&&(p.innerHTML="");const C=new Set;let E=!1,T=!1;async function k(t,e){var a;if(!c){console.error("Tenant não encontrado. Chat não iniciado.");return}if(f||(f=crypto.randomUUID(),localStorage.setItem(`chat_client_id_${c}`,f)),!(!window.supabaseClient||E||T)){T=!0;try{const o={id:f,name:t||"Cliente",cpf_cnpj:e||"",status:"aguardando",created_at:new Date().toISOString()};c&&(s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))(c)&&c!=="00000000-0000-0000-0000-000000000000"&&(o.tenant_id=c),S&&(o.telefone=S),console.log("Iniciando persistência... cadastrando cliente.");try{const{error:s}=await window.supabaseClient.from("chat_clients").upsert([o]);if(s)throw console.error("Erro no upsert de chat_clients:",s),s;console.log("Cliente upserted com sucesso:",f)}catch(s){console.error("Erro fatal ao persistir histórico (inserção de cliente falhou):",s);return}const r=p.querySelectorAll(".message");for(const s of r){const l=((a=s.querySelector(".message-text"))==null?void 0:a.textContent)||"",g=s.classList.contains("user-msg"),b={client_id:f,text:l,sender:g?"client":"system",created_at:new Date().toISOString()};o.tenant_id&&(b.tenant_id=o.tenant_id),console.log("Inserindo mensagem no histórico:",b);try{const{error:d}=await window.supabaseClient.from("chat_messages").insert([b]);d&&console.warn("Erro recebido no insert:",d)}catch(d){console.warn("Retorno interceptado via try/catch:",d)}await new Promise(d=>setTimeout(d,100))}E=!0}catch(o){console.error("Erro silencioso ao persistir histórico:",o)}finally{T=!1}}}async function M(t,e,a,o=null){if(!(!window.supabaseClient||!E))try{let i=e==="user"?"client":"system",r=t||a;C.add(r);const s={client_id:f,text:r,sender:i};c&&(g=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(g))(c)&&c!=="00000000-0000-0000-0000-000000000000"&&(s.tenant_id=c),console.log("Inserindo mensagem no chat_messages:",s);try{const{error:g}=await window.supabaseClient.from("chat_messages").insert([s]);g&&console.warn("Aviso ao salvar mensagem:",g)}catch(g){console.warn("Erro capturado no trycatch do insert:",g)}o&&o._statusSpan&&(o._statusSpan.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>',o._statusSpan.style.opacity="1")}catch(i){console.error("Erro silencioso ao salvar mensagem no Supabase:",i)}}window.supabaseClient&&window.supabaseClient.channel(`chat_messages_${f}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:`client_id=eq.${f}`},t=>{if(t.new.sender!=="specialist")return;const e=t.new.text||t.new.content||"";if(!C.has(e)){let a;try{a=typeof e=="string"?JSON.parse(e):e}catch{a=null}if(a&&a.__isFile)if(a.url&&a.url.match(/\.(jpg|jpeg|png|gif)$/i)){const o=`
                                    <div style="position: relative; display: inline-block; max-width: 100%;">
                                        <img src="${a.url}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
                                        <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${a.url}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                            </svg>
                                        </a>
                                    </div>
                                `;n(null,"system",o,!1,t.new.created_at)}else{const o=`
                                  <div 
                                    onclick="window.downloadPdf('${a.url}', '${a.name}')"
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
                                      ${a.name}
                                    </div>
                                    <div style="
                                      font-size: 13px;
                                      color: #6b7280;
                                      font-weight: 500;
                                    ">
                                      Toque para baixar ➜
                                    </div>
                                  </div>
                                `;n(null,"system",o,!1,t.new.created_at)}else n(e,"system",null,!1,t.new.created_at)}}).subscribe();function n(t,e,a=null,o=!0,i=null){const r=document.createElement("div");!a||!a.includes("pdf-clean")?(r.classList.add("message"),r.classList.add(e==="system"?"system-msg":"user-msg")):(r.style.alignSelf=e==="system"?"flex-start":"flex-end",r.style.animation="fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",r.style.margin="4px 0");const s=document.createElement("div");if(s.classList.add("message-text"),a)s.innerHTML=a;else if(t)if(t.startsWith("http"))if(t.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i))s.innerHTML=`
                        <div style="position: relative; display: inline-block; max-width: 100%;">
                            <img src="${t}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
                            <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${t}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                            </a>
                        </div>
                    `;else{const U=t.split("/").pop()||"Documento";s.innerHTML=`
                      <div 
                        onclick="window.downloadPdf('${t}', '${U}')"
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
                          ${U}
                        </div>
                        <div style="
                          font-size: 13px;
                          color: #6b7280;
                          font-weight: 500;
                        ">
                          Toque para baixar ➜
                        </div>
                      </div>
                    `}else e==="system"?s.innerHTML=t:s.textContent=t;r.appendChild(s);const l=document.createElement("div");l.classList.add("message-time"),l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="flex-end",l.style.gap="4px";const g=document.createElement("span"),b=i?new Date(i):new Date;if(g.textContent=b.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),l.appendChild(g),e==="user"){const d=document.createElement("span");d.classList.add("message-status"),o?(d.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>',d.style.opacity="0.5"):(d.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>',d.style.opacity="1"),l.appendChild(d),r._statusSpan=d}if(r.appendChild(l),p.appendChild(r),p.scrollTo({top:p.scrollHeight,behavior:"smooth"}),o===!0){M(t,e,a,r);return}}async function $(){if(!window.supabaseClient)return!1;const{data:t,error:e}=await window.supabaseClient.from("chat_messages").select("*").eq("client_id",f).eq("tenant_id",c).order("created_at",{ascending:!0});if(t&&t.length>0){t.forEach(o=>{const i=o.text||o.content;if(i==="⚠️ O cliente solicitou a geração do boleto com desconto. Assuma o atendimento para enviar os valores e o boleto."||i==="⚠️ O cliente solicitou uma renegociação. Assuma o atendimento e envie as condições."||C.has(i))return;C.add(i);const r=o.sender==="client"||o.sender_type==="cliente"?"user":"system";let s;try{s=typeof i=="string"?JSON.parse(i):i}catch{s=null}if(s&&s.__isFile)if(s.url&&s.url.match(/\.(jpg|jpeg|png|gif)$/i)){const l=`
                            <div style="position: relative; display: inline-block; max-width: 100%;">
                                <img src="${s.url}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
                                <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.downloadImage('${s.url}', 'imagem.jpg');" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                    </svg>
                                </a>
                            </div>
                        `;n(null,r,l,!1,o.created_at)}else{const l=`
                          <div 
                            onclick="window.downloadPdf('${s.url}', '${s.name}')"
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
                              ${s.name}
                            </div>
                            <div style="
                              font-size: 13px;
                              color: #6b7280;
                              font-weight: 500;
                            ">
                              Toque para baixar ➜
                            </div>
                          </div>
                        `;n(null,r,l,!1,o.created_at)}else n(i,r,null,!1,o.created_at)});const{data:a}=await window.supabaseClient.from("chat_clients").select("status").eq("id",f).eq("tenant_id",c).single();if(a&&(a.status==="em_atendimento"||a.status==="aguardando"))y=!0,m="done";else{const o=window.location.pathname.replace(/\/$/,"")==="/negociar",i=D==="whatsapp",r=[...t].reverse();for(const s of r)if(s.sender==="system"||s.sender_type==="especialista"||s.sender_type==="system"){const l=s.text||s.content||"";if(l.includes("Gerando boleto")||l.includes("conectado a um especialista")){y=!0,m="done";break}else if(l.includes("informe seu CPF")||l.includes("digite seu CPF")||l.includes("CPF/CNPJ inválido")||l.includes("CPF inválido")){m=i||o?"cpf_whatsapp":"cpf";break}else if(l.includes("digite seu primeiro NOME")||l.includes("nome válido")){m=i||o?"nome_whatsapp":"nome";break}else if(l.includes("Opções disponíveis")||l.includes("Pagamento à Vista")||l.includes("Parcelamento")||l.includes("Entrega amigável")||l.includes("escolha uma das opções")){m="nome_recebido";break}else if(l.includes("Zere sua dívida hoje!")){m="start";break}}}return!0}return!1}window.loadExistingMessages=$;async function N(){const t=window.location.pathname.replace(/\/$/,"")==="/negociar",e=D==="whatsapp",a=document.querySelector(".footer");a&&(a.style.display="block",a.style.visibility="visible",a.style.opacity="1"),w.placeholder="Digite sua mensagem...",w.disabled=!1,A.disabled=!1,setTimeout(S||t||e?()=>{n(null,"system","Olá 👋<br><br>Você está em um ambiente seguro para negociação do seu contrato.<br><br>Para continuar o atendimento, digite seu CPF ou CNPJ apenas com números.",!1),m="cpf_whatsapp"}:()=>{n("Olá 👋 Identificamos uma condição especial para regularização do seu contrato.","system",null,!1),setTimeout(()=>{n(null,"system",`
                        <div class="welcome-card">
                            <img src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Mulher feliz olhando para o celular" class="card-image" style="width: 100%; height: 200px; object-fit: cover; object-position: center 30%; border-radius: 10px 10px 0 0; background-color: #e0e0e0; display: block;" referrerpolicy="no-referrer">
                            <div class="card-content">
                                <h3>Zere sua dívida hoje!</h3>
                                <p>Aproveite descontos exclusivos e volte a ter crédito no mercado.</p>
                                <button class="chat-btn" onclick="handleAction('ver_condicoes')">Ver condições</button>
                            </div>
                        </div>
                    `,!1)},1e3)},500)}window.handleAction=async t=>{t==="ver_condicoes"?(n("Ver condições","user"),m="cpf",setTimeout(()=>{n("Por favor, informe seu CPF ou CNPJ para consultarmos seu contrato.","system")},800)):t==="pagamento_total"?(n("1️⃣ Pagamento total da(s) parcela(s)","user"),setTimeout(()=>{n("Aguarde um instante, estamos analisando a melhor condição para o seu contrato.","system"),setTimeout(()=>{n(null,"system",`
                        <div class="option-card">
                            <h4>Pagamento à Vista</h4>
                            <p>De: 20% de desconto</p>
                            <p>Por: <span class="highlight">até 80% de desconto</span></p>
                        </div>
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('gerar_boleto')">Gerar boleto com desconto</button>
                            <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `)},1500)},800)):t==="renegociacao_carencia"?(n("2️⃣ Renegociação com carência de até 90 dias","user"),setTimeout(()=>{n("Estamos analisando a proposta de renegociação com carência de até 90 dias. Aguarde um instante enquanto verificamos as condições disponíveis.","system"),setTimeout(()=>{n("Você será redirecionado para um especialista.","system"),y=!0,window.supabaseClient&&k(v,window.userCpf).then(()=>window.supabaseClient.from("chat_clients").update({status:"aguardando"}).eq("id",f)).catch(e=>{console.warn("Falha silenciosa ao atualizar status:",e)})},1500)},800)):t==="entrega_amigavel"?(n("3️⃣ Entrega amigável do bem","user"),setTimeout(()=>{n(null,"system","A entrega amigável é quitativa, ou seja, quitação Total do financiamento.<br><br>Caso existam débitos no DETRAN, iremos regularizar e retirar essas pendências.<br><br>Após a conclusão, você poderá verificar a possibilidade de financiar outro veículo com parcelas que caibam no seu bolso.<br><br>Todas as informações estão sujeitas à análise."),setTimeout(()=>{n(null,"system",`
                        <div class="btn-container">
                            <button class="chat-btn" onclick="handleAction('falar_especialista')">Falar com especialista</button>
                        </div>
                    `)},1500)},800)):t==="falar_especialista"?(n("4️⃣ Falar com um especialista","user"),y=!0,window.supabaseClient&&(n("Aguarde, um especialista está sendo chamado...","system",null,!1),k(v,window.userCpf).then(()=>window.supabaseClient.from("chat_clients").update({status:"aguardando"}).eq("id",f)).catch(e=>{console.warn("Falha silenciosa ao chamar especialista:",e)}))):t==="gerar_boleto"&&(n("Gerar boleto com desconto","user"),setTimeout(()=>{n("Só um instante, estamos gerando o boleto com os descontos, mostraremos o valor de pagamento e vencimento do boleto.","system"),setTimeout(()=>{n(null,"system",`
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
                    `),setTimeout(()=>{y=!0,window.supabaseClient&&k(v,window.userCpf).then(()=>window.supabaseClient.from("chat_clients").update({status:"aguardando"}).eq("id",f)).catch(a=>{console.warn("Falha silenciosa ao atualizar status:",a)})},1e3)},1e3)},800))};async function j(){const t=w.value.trim();if(t&&(n(t,"user"),w.value="",!y)){if(m==="cpf"||m==="cpf_whatsapp"){const e=t.replace(/\D/g,"");if(e.length>=11){const o=e.length>=14?"CNPJ recebido ✓":"CPF recebido ✓";window.userCpf=e,localStorage.setItem(`user_cpf_${c}`,e),setTimeout(()=>{n(o,"system"),setTimeout(()=>{n("Agora, por favor, digite seu primeiro NOME.","system"),m=m==="cpf_whatsapp"?"nome_whatsapp":"nome"},800)},800)}else setTimeout(()=>{n(m==="cpf_whatsapp"?"CPF/CNPJ inválido. Por favor, digite apenas números.":"CPF inválido. Por favor, digite os 11 números do seu CPF.","system")},800)}else if(m==="nome"||m==="nome_whatsapp")v=t.trim(),v.length>=2?(m="nome_recebido",setTimeout(m==="nome_whatsapp"?async()=>{n(null,"system","Obrigado. Você está sendo conectado a um especialista."),y=!0,await k(v,window.userCpf)}:()=>{n(`Obrigado, ${v}! Consultando condições disponíveis...`,"system"),setTimeout(()=>{I||(n(null,"system",`
                                <p>Opções disponíveis:</p>
                                <div class="btn-container">
                                    <button class="chat-btn" onclick="handleAction('pagamento_total')">1️⃣ Pagamento total da(s) parcela(s)</button>
                                    <button class="chat-btn" onclick="handleAction('renegociacao_carencia')">2️⃣ Renegociação com carência de até 90 dias</button>
                                    <button class="chat-btn" onclick="handleAction('entrega_amigavel')">3️⃣ Entrega amigável do Veículo</button>
                                    <button class="chat-btn secondary" onclick="handleAction('falar_especialista')">4️⃣ Falar com um especialista</button>
                                </div>
                            `),I=!0)},1e3)},800)):setTimeout(()=>{n("Por favor, digite um nome válido.","system")},800);else if(m==="nome_recebido"){const e=t.trim();e==="1"?handleAction("pagamento_total"):e==="2"?handleAction("renegociacao_carencia"):e==="3"?handleAction("entrega_amigavel"):e==="4"?handleAction("falar_especialista"):setTimeout(()=>{n("Por favor, escolha uma das opções acima clicando nos botões ou digitando o número correspondente (1, 2, 3 ou 4).","system")},800)}}}P&&P.addEventListener("change",async t=>{const e=t.target.files[0];if(!e)return;if(!window.supabaseClient){alert("Supabase não configurado.");return}const a=`${f}/${Date.now()}_${e.name}`,{error:o}=await window.supabaseClient.storage.from("Chat_attachments").upload(a,e);if(o){console.error("Erro no upload:",o),alert("Erro ao enviar arquivo.");return}const{data:i}=window.supabaseClient.storage.from("Chat_attachments").getPublicUrl(a);i&&i.publicUrl&&n(i.publicUrl,"user"),P.value=""}),A.addEventListener("click",j),w.addEventListener("keypress",t=>{t.key==="Enter"&&j()}),N()});
