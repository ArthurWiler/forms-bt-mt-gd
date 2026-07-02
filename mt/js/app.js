/* ============================================================
   CARDS DE SELEÇÃO (caixas robustas, sem ícones) — CONFIGURAÇÃO
   ------------------------------------------------------------
   REGRA DE OURO: textos, valores de estado e classes CSS de
   cada card ficam SOMENTE aqui. O motor de renderização (mais
   abaixo) só lê este objeto — para alterar texto/cor/valor de
   uma opção, edite apenas esta constante.
   ============================================================ */
const CAMPOS_CARDS_CONFIG = {
  // Classes CSS aplicadas pelo motor de renderização (ver css/formulario-mt.css).
  // Reaproveita o mesmo visual dos cards Sim/Não do formulário BT.
  classes: {
    grid: "toggle-group",
    card: "toggle-btn",
    active: "on",
    destaque: "toggle-btn-destaque",
  },
  // Campos com seleção simples (1 <select data-k> por campo).
  // gridId: id do container (já existente no HTML) onde os cards entram.
  campos: [
    {
      chave: "modalidadeObra",
      gridId: "cardsModalidadeObra",
      valorPadrao: "CEMIG",
      opcoes: [
        { valor: "CEMIG", texto: "CEMIG" },
        { valor: "PART", texto: "PART" },
      ],
    },
    {
      chave: "formaCorresp",
      gridId: "cardsFormaCorresp",
      opcoes: [
        { valor: "E-mail", texto: "E-mail" },
        { valor: "Endereço", texto: "Endereço" },
        { valor: "Agência Correios(Caixa Postal)", texto: "Agência dos Correios (Caixa Postal)" },
      ],
    },
    {
      chave: "localizacao",
      gridId: "cardsLocalizacao",
      opcoes: [
        { valor: "Urbana", texto: "Urbana" },
        { valor: "Rural", texto: "Rural" },
      ],
    },
    {
      chave: "fuso",
      gridId: "cardsFuso",
      valorPadrao: "23°",
      opcoes: [
        { valor: "22°", texto: "22°" },
        { valor: "23°", texto: "23°" },
        { valor: "24°", texto: "24°" },
      ],
    },
    {
      chave: "tensaoMT",
      gridId: "cardsTensaoMT",
      valorPadrao: "13.8",
      opcoes: [
        { valor: "13.8", texto: "13,8 kV" },
        { valor: "22", texto: "22 kV" },
        { valor: "34.5", texto: "34,5 kV" },
      ],
    },
    {
      chave: "modalidade",
      gridId: "cardsModalidade",
      valorPadrao: "Verde",
      opcoes: [
        { valor: "Verde", texto: "Verde" },
        { valor: "Azul", texto: "Azul" },
      ],
    },
  ],
  // Campo especial "Dia do vencimento": substitui a antiga pergunta
  // "Deseja escolher data de vencimento?" — escolher um dia define
  // desejaVenc='Sim'; o card de destaque "Não informar" define
  // desejaVenc='Não' e limpa o dia.
  diaVencimento: {
    chaveDia: "diaVenc",
    chaveDecisao: "desejaVenc",
    gridId: "cardsDiaVenc",
    dias: [
      { valor: "1", texto: "01" },
      { valor: "6", texto: "06" },
      { valor: "11", texto: "11" },
      { valor: "17", texto: "17" },
      { valor: "22", texto: "22" },
      { valor: "27", texto: "27" },
    ],
    naoInformar: { texto: "Não informar" },
  },
  // Dispositivo auxiliar de partida (Análise de Partida de Motores).
  // labelShort é o texto do botão (e o valor salvo); labelFull entra no
  // atributo title, exibindo a descrição completa ao passar o mouse.
  dispositivosPartida: [
    { labelShort: "Chave Estrela-Triângulo", labelFull: "Chave de partida estrela-triângulo (Y-Δ): reduz a tensão nos terminais do motor durante a partida." },
    { labelShort: "Chave Compensadora", labelFull: "Chave compensadora (autotransformador de partida): reduz a tensão de partida por meio de taps percentuais ajustáveis." },
    { labelShort: "Soft-Starter", labelFull: "Soft-starter: dispositivo eletrônico que controla a rampa de tensão na partida do motor." },
    { labelShort: "Inversor de Frequência", labelFull: "Inversor de frequência: controla a partida e a velocidade do motor variando frequência e tensão." },
  ],
};

/* ===== Estado global ===== */
const state = {};
let trafos = [];   // {potencia, quantidade, relacao}
let motores = [];  // {tipo, cv, fp, rend, volts, ipIn, tempo, dispositivo}
let cubiculos = []; // Anexo I — cubículos adicionais da subestação compartilhada
                     // {instalacao, trafos:[{potencia,quantidade,relacao}], modalidade, demanda, demandaPonta, demandaForaPonta}
let ramalSelecionado = null;
let mapaObra = null;     // instância Leaflet (lazy, criada ao entrar na Etapa 3)
let marcadorObra = null; // pino arrastável sincronizado com state.latitude/longitude
let _mapaObraDebounce = null;

/* ATIVIDADES e DISPOSITIVOS agora em dados.js */

/* ===== util ===== */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const fmt = (n,d=2)=> (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

/* ============================================================
   CARDS DE SELEÇÃO — motor de renderização
   Lê exclusivamente CAMPOS_CARDS_CONFIG (topo do arquivo). Mantém
   o <select data-k> original oculto como fonte da verdade: o
   clique no card define select.value e dispara input/change,
   preservando syncState(), renderPreview(), camposObrigatoriosFaltando()
   e toda a reatividade nativa (onCorresp, onLocalizacao, onModalidade...)
   sem precisar alterá-las.
   ============================================================ */
function _campoCardBotao(texto, titulo, ativo, destaque, onSelecionar){
  const cls=CAMPOS_CARDS_CONFIG.classes;
  const btn=document.createElement('button');
  btn.type='button';
  btn.setAttribute('role','radio');
  btn.setAttribute('aria-checked',ativo?'true':'false');
  btn.className=cls.card+(destaque?' '+cls.destaque:'')+(ativo?' '+cls.active:'');
  btn.textContent=texto;
  if(titulo) btn.title=titulo;
  btn.addEventListener('click',onSelecionar);
  return btn;
}
function _campoCardDispatch(select,valor){
  select.value=valor;
  state[select.dataset.k]=valor;
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
}
function _campoCardsMontar(campo){
  const select=$(`select[data-k="${campo.chave}"]`);
  const grid=document.getElementById(campo.gridId);
  if(!select||!grid||select.dataset.cardMontado) return;
  select.dataset.cardMontado='1';
  grid.className=CAMPOS_CARDS_CONFIG.classes.grid+' toggle-group--opcoes';
  grid.setAttribute('role','radiogroup');
  // Normaliza os dois formatos de opção aceitos: {valor,texto} (genérico)
  // ou {labelShort,labelFull} — labelFull também vira o atributo title do
  // botão, exibindo a descrição completa ao passar o mouse (hover).
  const norm=(op)=>({
    valor: op.valor ?? op.labelFull ?? op.labelShort,
    texto: op.texto ?? op.labelShort,
    titulo: op.labelFull ?? null,
  });
  if(campo.valorPadrao && !select.value) _campoCardDispatch(select,campo.valorPadrao);
  const render=()=>{
    grid.innerHTML='';
    campo.opcoes.map(norm).forEach(op=>{
      const ativo=select.value===op.valor;
      grid.appendChild(_campoCardBotao(op.texto,op.titulo,ativo,false,()=>{
        if(select.disabled) return;
        _campoCardDispatch(select,op.valor);
        render();
      }));
    });
  };
  render();
  select.style.display='none';
  select.setAttribute('aria-hidden','true');
}
function _diaVencimentoMontar(){
  const cfg=CAMPOS_CARDS_CONFIG.diaVencimento;
  const selDia=$(`select[data-k="${cfg.chaveDia}"]`);
  const selDecisao=$(`select[data-k="${cfg.chaveDecisao}"]`);
  const grid=document.getElementById(cfg.gridId);
  if(!selDia||!selDecisao||!grid||selDia.dataset.cardMontado) return;
  selDia.dataset.cardMontado='1';
  grid.className=CAMPOS_CARDS_CONFIG.classes.grid+' toggle-group--opcoes';
  grid.setAttribute('role','radiogroup');
  const aplicar=(diaValor,decisaoValor)=>{
    _campoCardDispatch(selDia,diaValor);
    _campoCardDispatch(selDecisao,decisaoValor);
    render();
  };
  const render=()=>{
    grid.innerHTML='';
    cfg.dias.forEach(d=>{
      const ativo=selDecisao.value==='Sim'&&selDia.value===d.valor;
      grid.appendChild(_campoCardBotao(d.texto,null,ativo,false,()=>aplicar(d.valor,'Sim')));
    });
    const ativoNao=selDecisao.value==='Não';
    grid.appendChild(_campoCardBotao(cfg.naoInformar.texto,null,ativoNao,true,()=>aplicar('','Não')));
  };
  render();
  selDia.style.display='none'; selDia.setAttribute('aria-hidden','true');
  selDecisao.style.display='none'; selDecisao.setAttribute('aria-hidden','true');
}
function inicializarCamposCards(){
  CAMPOS_CARDS_CONFIG.campos.forEach(_campoCardsMontar);
  _diaVencimentoMontar();
}

/* ===== Navegação ===== */
function goTo(n){
  // Trava de avanço: só valida quando avança (ou pula adiante). Volta é livre.
  const _atual=document.querySelector('.page.show');
  const _atualN=_atual?parseInt(_atual.id.replace('page-',''),10):-1;
  if(n>_atualN && _atual && window.CemigMarcadores){
    const r=window.CemigMarcadores.validar(_atual);
    if(!r.ok){ if(r.primeiro) r.primeiro.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  }
  $$('.page').forEach(p=>p.classList.remove('show'));
  $('#page-'+n).classList.add('show');
  const steps=$$('.vstep');
  steps.forEach((s,i)=>{s.classList.remove('active','done'); if(i<n)s.classList.add('done'); if(i===n)s.classList.add('active');});
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===3){ initMapaObra(); renderRestricaoAmbiental(); if(mapaObra) setTimeout(()=>mapaObra.invalidateSize(),50); }
  if(n===5) renderPreview();
}

/* ===== Bind genérico de campos (data-k) ===== */
function bindInputs(){
  $$('[data-k]').forEach(el=>{
    const k=el.dataset.k;
    if(state[k]!=null && el.value==='') el.value=state[k];
    el.addEventListener('input',()=>{state[k]=el.value;});
    el.addEventListener('change',()=>{state[k]=el.value;});
  });
}

/* ===== Etapa 1: finalidade ===== */
function onFinalidade(){
  const v=$('#f_finalidade').value; state.finalidade=v;
  const box=$('#instalBox'), lbl=$('#instalLabel');
  if(v && v!=='Conexão Nova'){
    box.style.display='block';
    const map={'Aumento de Demanda':'Para Aumento de Demanda, informe o número da instalação','Redução de Demanda':'Para Redução de Demanda, informe o número da instalação','Adequação de Subestação':'Para Adequação de Subestação, informe o número da instalação','Aderir a Tarifa Monômia':'Para Aderir a Tarifa Monômia, informe o número da instalação','Religação de Subestação':'Para Religação de Subestação, informe o número da instalação','Desconexão para encerramento contratual':'Para Desconexão, informe o número da instalação','Alteração da tensão de fornecimento BT→MT':'Para Alteração da tensão, informe o número da instalação'};
    lbl.innerHTML=(map[v]||'Para Migração Mercado livre, informe o número da instalação')+' <span class="req">*</span>';
  } else box.style.display='none';
  // mostra bloco conexão nova ou alteração na etapa técnica
  const ehNova=(v==='Conexão Nova');
  $('#blocoConexaoNova').style.display=ehNova?'block':'none';
  $('#blocoAlteracao').style.display=(v && !ehNova)?'block':'none';
  updateCoordHint(); updateDemandaLabels(); recalcTecnico();
  if(state.compartilhada==='Sim') renderCubiculos();
}

/* ===== Etapa 2: CPF/CNPJ, vencimento, correspondência ===== */
// Máscaras CPF/CNPJ (validação híbrida no blur — ver onCpfCnpj)
function mascararCPF(v){
  const d=String(v||'').replace(/\D/g,'').slice(0,11);
  if(d.length>9) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  if(d.length>6) return d.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
  if(d.length>3) return d.replace(/(\d{3})(\d{1,3})/,'$1.$2');
  return d;
}
function mascararCNPJ(v){
  const d=String(v||'').replace(/\D/g,'').slice(0,14);
  if(d.length>12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/,'$1.$2.$3/$4-$5');
  if(d.length>8) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/,'$1.$2.$3/$4');
  if(d.length>5) return d.replace(/(\d{2})(\d{3})(\d{1,3})/,'$1.$2.$3');
  if(d.length>2) return d.replace(/(\d{2})(\d{1,3})/,'$1.$2');
  return d;
}
// Validação híbrida: disparada no blur do campo único de CPF/CNPJ.
// Limpa os caracteres não numéricos e decide o tipo automaticamente
// pela quantidade de dígitos (<=11 → CPF; >11 → CNPJ).
async function onCpfCnpj(){
  const el=$('#f_cpfcnpj'), msg=$('#cpfMsg');
  const d=CalculoMT.soDigitos(el.value);
  if(!d){state.cpfCnpj='';el.classList.remove('invalid');msg.textContent='';msg.className='field-note';return;}
  const tipo = d.length<=11 ? 'CPF' : 'CNPJ';
  el.value = tipo==='CPF' ? mascararCPF(d) : mascararCNPJ(d);
  state.cpfCnpj=el.value;
  const valido = tipo==='CPF' ? CalculoMT.validarCPF(d) : CalculoMT.validarCNPJ(d);
  if(!valido){el.classList.add('invalid');msg.textContent=tipo+' inválido';msg.className='field-err';return;}
  el.classList.remove('invalid');
  if(tipo==='CNPJ'){
    msg.textContent='verificando empresa…';msg.className='field-note';
    try{
      const res=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
      if(res.ok){
        const dd=await res.json();
        const ativo=(dd.descricao_situacao_cadastral||'').toUpperCase()==='ATIVA';
        msg.textContent=`✓ ${dd.razao_social} — ${dd.descricao_situacao_cadastral}`;
        msg.className=ativo?'field-ok':'field-err';
        const nomeEl=$('[data-k="nome"]');
        if(nomeEl&&!nomeEl.value){nomeEl.value=dd.razao_social;nomeEl.dispatchEvent(new Event('input'));}
      } else {msg.textContent='CNPJ válido ✓';msg.className='field-ok';}
    }catch(_){msg.textContent='CNPJ válido ✓';msg.className='field-ok';}
  } else {
    msg.textContent='CPF válido ✓';msg.className='field-ok';
  }
}
function onCorresp(){const v=event.target.value;state.formaCorresp=v;
  $('#correspEmailBox').style.display=(v==='E-mail')?'flex':'none';
  $('#endCorrespBox').style.display=(v==='Endereço'||v==='Agência Correios(Caixa Postal)')?'block':'none';}

/* ===== Etapa 3: atividade, localização, coordenadas, ambiental ===== */
function fillAtividades(){const s=$('#f_atividade');ATIVIDADES.forEach(a=>{const o=document.createElement('option');o.textContent=a;s.appendChild(o);});}
// Detecta atividades de irrigação (e variantes, ex.: "Irrigação Noturna",
// "Agropecuária Rural Irrigação") para disparar os campos da Solicitação
// de Desconto para Irrigante/Aquicultor.
function ehAtividadeIrrigacao(){
  return /irriga[cç][aã]o/i.test(state.atividade||'');
}
function onAtividade(){
  const v=$('#f_atividade').value; state.atividade=v;
  const box=$('#irrigacaoAlert');
  const r=CalculoMT.alertaIrrigacao(v);
  box.innerHTML = r.nivel==='alerta' ? alertHTML('warn',r.msg) : '';
  if(!ehAtividadeIrrigacao()){
    // Atividade deixou de ser irrigação: limpa silenciosamente os dados
    // do bloco opcional (Aba 5) para não deixar dados fantasmas em
    // background numa solicitação que não precisa mais deles.
    state.irrigacaoHorarioInicio='';
    motores.forEach(m=>{ delete m.destinadoIrrigacao; });
  }
  renderMotores();
  recalcRamal();
}
// Máscara/validação no blur do campo opcional "Horário para Início do
// Desconto" (card da Aba 5): aceita digitação livre (ex.: "2130",
// "21h30") e normaliza para HH:MM; marca o input como inválido só
// visualmente (campo é opcional e nunca bloqueia a exportação).
function onIrrigacaoHorarioBlur(input){
  let v=String(input.value||'').trim();
  if(v && !/^\d{1,2}:\d{2}$/.test(v)){
    const digits=v.replace(/\D/g,'');
    if(digits.length===3) v=`0${digits[0]}:${digits.slice(1)}`;
    else if(digits.length===4) v=`${digits.slice(0,2)}:${digits.slice(2)}`;
  }
  const valido=/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if(valido){
    const [hh,mm]=v.split(':');
    v=`${hh.padStart(2,'0')}:${mm}`;
  }
  input.value=v;
  state.irrigacaoHorarioInicio=v;
  input.classList.toggle('invalid', !!v && !valido);
}
// Card opcional da Aba 5 (Prévia): só aparece para atividades de
// irrigação/aquicultura, fundo suave + borda tracejada, totalmente
// no-print (não entra no PDF principal) e não bloqueia a exportação.
function renderIrrigacaoOpcionalCard(){
  const box=$('#irrigacaoOpcionalCard');
  if(!box) return;
  if(!ehAtividadeIrrigacao()){ box.innerHTML=''; return; }
  const valor=state.irrigacaoHorarioInicio||'';
  const invalido=!!valor && !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
  box.innerHTML=`
    <div class="card no-print" style="background:var(--cemig-green-soft-2,#f3f8f6);border:1px dashed #ccc;margin-top:16px;padding:16px;border-radius:10px;box-shadow:none">
      <div class="subhead" style="margin-top:0">Solicitação de Desconto para Irrigante/Aquicultor <span class="opt">(opcional)</span></div>
      <div class="field" style="max-width:280px">
        <label>Horário para Início do Desconto</label>
        <input type="text" id="f_irrigacaoHorarioInicio" value="${valor}" placeholder="HH:MM (ex.: 21:30)" class="${invalido?'invalid':''}" oninput="state.irrigacaoHorarioInicio=this.value" onblur="onIrrigacaoHorarioBlur(this)">
        <span class="field-note">A distribuidora garante janela contínua de 8h30 entre 21h30 e 06h00. Este bloco é totalmente opcional e não bloqueia a exportação do formulário principal.</span>
      </div>
      <div class="form-nav no-print" style="margin-top:14px;justify-content:flex-start">
        <button type="button" class="btn btn-ghost" id="btnExportarIrrigante" onclick="exportarPDFIrrigante()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exportar Solicitação de Desconto</button>
      </div>
    </div>`;
}
function onLocalizacao(){
  const v=$('#f_localizacao').value; state.localizacao=v;
  $('#blocoUrbano').style.display=(v==='Urbana')?'block':'none';
  $('#blocoRural').style.display=(v==='Rural')?'block':'none';
  recalcRamal();
}
function updateCoordHint(){
  const ehNova=(state.finalidade==='Conexão Nova');
  $('#mudancaLocalBox').style.display=(state.finalidade && !ehNova)?'block':'none';
  if(ehNova){
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento.';
    $('#latLabel').innerHTML='Latitude <span class="req">*</span>';
    $('#lonLabel').innerHTML='Longitude <span class="req">*</span>';
    $('#coordNovaBox').style.display='none';
  } else if(state.finalidade){
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento atual. Caso haja mudança de local, informe também as novas coordenadas.';
    onMudancaLocal();
  } else {
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento.';
    $('#latLabel').innerHTML='Latitude <span class="req">*</span>';
    $('#lonLabel').innerHTML='Longitude <span class="req">*</span>';
    $('#coordNovaBox').style.display='none';
  }
}
function onMudancaLocal(){
  state.mudancaLocal=$('#f_mudancaLocal')?.value||'';
  const sim=(state.mudancaLocal==='Sim');
  $('#coordNovaBox').style.display=sim?'grid':'none';
  $('#latLabel').innerHTML=sim?'Latitude atual <span class="req">*</span>':'Latitude';
  $('#lonLabel').innerHTML=sim?'Longitude atual <span class="req">*</span>':'Longitude';
  onCoord();
}
function _utmBandLetter(lat){
  const B='CDEFGHJKLMNPQRSTUVWXX';
  return lat<-80?'C':lat>84?'X':B[Math.floor((lat+80)/8)];
}
function latLonParaUTM(lat,lon){
  const a=6378137,f=1/298.257223563,k0=0.9996;
  const b=a*(1-f),e2=1-(b*b)/(a*a);
  const latR=lat*Math.PI/180,lonR=lon*Math.PI/180;
  const zona=Math.floor((lon+180)/6)+1;
  const lonC=((zona-1)*6-180+3)*Math.PI/180;
  const sinL=Math.sin(latR),cosL=Math.cos(latR),tanL=Math.tan(latR);
  const N=a/Math.sqrt(1-e2*sinL**2);
  const T=tanL**2,C=e2/(1-e2)*cosL**2,A=cosL*(lonR-lonC);
  const e4=e2*e2,e6=e4*e2,ep2=e2/(1-e2);
  const M=a*((1-e2/4-3*e4/64-5*e6/256)*latR
    -(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*latR)
    +(15*e4/256+45*e6/1024)*Math.sin(4*latR)
    -(35*e6/3072)*Math.sin(6*latR));
  const E=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000;
  let Nort=k0*(M+N*tanL*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  if(lat<0) Nort+=10000000;
  return {zona,hemisferio:lat<0?'S':'N',easting:Math.round(E),northing:Math.round(Nort)};
}

function onCoord(imediato){
  state.latitude=$('[data-k=latitude]').value; state.longitude=$('[data-k=longitude]').value;
  state.latitudeNova=$('[data-k=latitudeNova]')?.value||'';
  state.longitudeNova=$('[data-k=longitudeNova]')?.value||'';
  const r=CalculoMT.validarCoordenadas(state.latitude,state.longitude);
  const lat=parseFloat(state.latitude),lon=parseFloat(state.longitude);
  if(!isNaN(lat)&&!isNaN(lon)){
    const u=latLonParaUTM(lat,lon);
    const utmEl=$('[data-k=utm]');
    if(utmEl) utmEl.value=`${u.zona}${_utmBandLetter(lat)} E:${u.easting} N:${u.northing}`;
    setFusoAuto(u.zona); // determina o fuso (zona UTM) automaticamente pela longitude
    // Validação ambiental automática a cada mudança de coordenada (como no BT):
    // clique/arraste no mapa aplicam de imediato; digitação usa debounce.
    clearTimeout(_mtRestrDebounce);
    _mtRestrDebounce=setTimeout(()=>consultarRestricaoAmbientalMT(lat,lon), imediato?150:700);
  }
  sincronizarMapaComCoordenadas(lat,lon,imediato);
  let erros=[];
  if(r.nivel==='erro') erros.push(r.msg);
  if($('#coordNovaBox').style.display!=='none'){
    const rNova=CalculoMT.validarCoordenadas(state.latitudeNova,state.longitudeNova);
    if(rNova.nivel==='erro') erros.push(rNova.msg);
    const latN=parseFloat(state.latitudeNova),lonN=parseFloat(state.longitudeNova);
    if(!isNaN(latN)&&!isNaN(lonN)){
      const uN=latLonParaUTM(latN,lonN);
      const utmNovaEl=$('[data-k=utmNova]');
      if(utmNovaEl) utmNovaEl.value=`${uN.zona}${_utmBandLetter(latN)} E:${uN.easting} N:${uN.northing}`;
    }
  }
  $('#coordAlert').innerHTML = erros.length ? alertHTML('err',erros.join(' ')) : '';
}

// Define automaticamente o "Fuso" (zona UTM) com base na zona calculada a
// partir da longitude. Só atua nas zonas suportadas pelos cards (22-24);
// fora dessa faixa a seleção manual é preservada. Atualiza o select oculto
// (fonte da verdade) e o destaque visual dos cards (#cardsFuso).
function setFusoAuto(zona){
  const valor=`${zona}°`;
  const sel=$('select[data-k="fuso"]');
  if(!sel) return;
  if(!['22°','23°','24°'].includes(valor)) return;
  if(sel.value===valor) return;
  sel.value=valor; state.fuso=valor;
  const grid=document.getElementById('cardsFuso');
  if(grid){
    [...grid.children].forEach(btn=>{
      btn.classList.toggle(CAMPOS_CARDS_CONFIG.classes.active, btn.textContent.trim()===valor);
    });
  }
}

/* ===== Geolocalização automática a partir do endereço (Etapa 3) =====
   Espelha o comportamento do formulário BT (bt/js/map.js): assim que o
   endereço urbano (logradouro + número + município) está preenchido, o
   ponto é geocodificado, o alfinete é reposicionado e a validação
   ambiental é executada automaticamente (Regra 7). */
let _mtGeoDebounce=null, _mtLastGeoKey='', _mtLastRestrKey='', _mtRestrDebounce=null;
const _nDig=(s)=>(String(s||'').match(/\d/g)||[]).length;
async function geocodificarEnderecoMT(){
  // Só geocodifica em zona urbana e quando ainda não há coordenada definida
  // manualmente (preserva coordenada digitada/clicada pelo usuário).
  if(state.localizacao!=='Urbana') return;
  if(_nDig(state.latitude)>=5 && _nDig(state.longitude)>=5) return;
  const endereco=[
    [state.urb_endereco, state.urb_num].filter(Boolean).join(', '),
    state.urb_bairro, state.uc_municipio, state.uc_estado, state.uc_cep, 'Brasil'
  ].filter(Boolean).join(', ');
  // Exige pelo menos logradouro + número + município para buscar
  if(!String(state.urb_endereco||'').trim() || !String(state.urb_num||'').trim() || !String(state.uc_municipio||'').trim()) return;
  const key=endereco.toLowerCase();
  if(_mtLastGeoKey===key) return;
  try{
    const resp=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(endereco),{headers:{'Accept-Language':'pt-BR'}});
    const data=await resp.json();
    if(!data||!data.length) return;
    _mtLastGeoKey=key;
    // _aplicarCoordDoMapa → onCoord dispara o reposicionamento do alfinete e a
    // validação ambiental automática (exatamente como no BT).
    _aplicarCoordDoMapa(parseFloat(data[0].lat), parseFloat(data[0].lon));
  }catch(_){}
}
// Disparado no blur dos campos de endereço urbano (debounce de 800 ms).
function onEnderecoUrbanoMT(){
  clearTimeout(_mtGeoDebounce);
  _mtGeoDebounce=setTimeout(geocodificarEnderecoMT,800);
}
// Bloco "Unidade consumidora em área de restrição ambiental?" — espelha
// exatamente os três estados do BT (bt/js/views/obra.js): orientação inicial,
// SIM (com a lista das camadas intersectadas) e NÃO.
function renderRestricaoAmbiental(){
  const box=$('#restricaoAmbientalConteudo');
  if(!box) return;
  const ra=state.restricaoAmbiental;
  if(ra==='Sim'){
    const det=state.restricoesTexto?`<div style="margin-top:6px">${state.restricoesTexto}</div>`:'';
    box.innerHTML=alertHTML('err',`<div class="restricao-destaque"><strong>⚠ SIM — em área de restrição ambiental.</strong>${det}</div>`);
  } else if(ra==='Não'){
    box.innerHTML=alertHTML('info','<div class="restricao-destaque"><strong>Não há restrição ambiental.</strong></div>');
  } else {
    box.innerHTML=alertHTML('info','Consulte a coordenada no mapa acima para verificar a restrição ambiental.');
  }
}
// Validação ambiental automática (IDE-Sisema), idêntica ao BT: usa a consulta
// compartilhada de shared/js/geo.js. Requer turf.js + geo.js; sem eles, o
// bloco mantém a orientação inicial e nada é preenchido automaticamente.
async function consultarRestricaoAmbientalMT(lat,lon){
  if(!window.turf || typeof consultarRestricoesObra!=='function') return;
  if(isNaN(lat)||isNaN(lon)) return;
  const key=lat.toFixed(5)+','+lon.toFixed(5);
  if(_mtLastRestrKey===key) return;
  _mtLastRestrKey=key;
  const box=$('#restricaoAmbientalConteudo');
  if(box) box.innerHTML=alertHTML('info','Consultando restrição ambiental (IDE-Sisema)…');
  try{
    const res=await consultarRestricoesObra(lat,lon);
    const resumo=resumirRestricoes(res);
    if(resumo.errosTodos){
      state.restricaoAmbiental=''; state.restricoesTexto='';
      _mtLastRestrKey='';
      if(box) box.innerHTML=alertHTML('warn','Não foi possível consultar a restrição ambiental (verifique conexão/camadas).');
      return;
    }
    state.restricaoAmbiental=resumo.restricaoAmbiental;
    state.restricoesTexto=resumo.restricoesTexto;
    renderRestricaoAmbiental();
  }catch(_){
    _mtLastRestrKey='';
    if(box) box.innerHTML=alertHTML('warn','Falha na consulta de restrição ambiental.');
  }
}
/* ===== Mapa interativo de localização (Etapa 3) =====
   Adaptado de bt/js/map.js (LocalizacaoObra) para o estado plano do
   MT: lê/escreve diretamente state.latitude/state.longitude (em vez
   do sub-objeto obra.lat/obra.lng usado em BT), via onCoord(). */
function _aplicarCoordDoMapa(lat,lon){
  const latEl=$('[data-k=latitude]'), lonEl=$('[data-k=longitude]');
  if(latEl) latEl.value=lat;
  if(lonEl) lonEl.value=lon;
  onCoord(true); // clique/arraste no mapa é intencional: aplica na hora, sem debounce
}
function initMapaObra(){
  const div=$('#map');
  if(!div || !window.L || mapaObra) return;
  mapaObra=window.L.map(div).setView([-19.9167,-43.9345],12);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'© OpenStreetMap'
  }).addTo(mapaObra);
  mapaObra.on('click',(e)=>{ _aplicarCoordDoMapa(e.latlng.lat,e.latlng.lng); });
  setTimeout(()=>mapaObra.invalidateSize(),200);
  // Caso já existam coordenadas preenchidas (ex.: voltando de outra etapa)
  const lat=parseFloat(state.latitude),lon=parseFloat(state.longitude);
  if(!isNaN(lat)&&!isNaN(lon)) sincronizarMapaComCoordenadas(lat,lon,true);
}
function sincronizarMapaComCoordenadas(lat,lon,imediato){
  if(isNaN(lat)||isNaN(lon)) return;
  clearTimeout(_mapaObraDebounce);
  const atualizar=()=>{
    if(!mapaObra) return;
    const ll=window.L.latLng(lat,lon);
    if(!mapaObra.getBounds().contains(ll)) mapaObra.setView(ll,Math.max(mapaObra.getZoom(),17));
    if(marcadorObra) marcadorObra.setLatLng([lat,lon]);
    else{
      marcadorObra=window.L.marker([lat,lon],{draggable:true}).addTo(mapaObra);
      marcadorObra.on('dragend',(e)=>{
        const p=e.target.getLatLng();
        _aplicarCoordDoMapa(p.lat,p.lng);
      });
    }
    setTimeout(()=>mapaObra.invalidateSize(),100);
  };
  if(imediato) atualizar();
  else _mapaObraDebounce=setTimeout(atualizar,600);
}
function onSubPronta(){
  state.subPronta=event.target.value;
  const box=$('#subProntaAlert');
  if(state.subPronta==='Sim')box.innerHTML=alertHTML('info','O pedido de vistoria e ligação será disparado automaticamente após a conclusão das etapas do orçamento de conexão.');
  else if(state.subPronta==='Não')box.innerHTML=alertHTML('info','Você deve solicitar o pedido de vistoria e ligação em até 120 dias após a conclusão das etapas do orçamento de conexão.');
  else box.innerHTML='';
}

/* ===== Validação de e-mail e telefone ===== */
function _validarEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);}
function _validarTelefone(v){
  const d=v.replace(/\D/g,'');
  if(d.length<10||d.length>11) return false;
  const ddd=parseInt(d.substring(0,2),10);
  if(ddd<11||ddd>99) return false;
  if(d.length===11&&d[2]!=='9') return false;
  return true;
}
function _feedbackCampo(el,spanId,valido,msgErr){
  const sp=$('#'+spanId);
  if(!el||!el.value){if(el)el.classList.remove('invalid');if(sp){sp.textContent='';sp.className='cep-status';}return;}
  if(valido){el.classList.remove('invalid');if(sp){sp.textContent='';}}
  else{el.classList.add('invalid');if(sp){sp.textContent=msgErr;sp.className='cep-status err';}}
}
function onEmail(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarEmail(el.value),'e-mail inválido');}
function onTel(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarTelefone(el.value),'telefone inválido');}

/* ===== Etapa 4: compartilhada, trafos, motores ===== */
function onCompartilhada(){
  state.compartilhada=$('#f_compartilhada').value;
  const compart=(state.compartilhada==='Sim');
  $('#qtdCubiculosBox').style.display=compart?'flex':'none';
  $('#cubiculosBox').style.display=compart?'block':'none';
  $('#blocoTrafosIndividual').style.display=compart?'none':'block';
  $('#blocoMotoresIndividual').style.display=compart?'none':'block';
  $('#blocoTarifacaoDemanda').style.display=compart?'none':'block';
  $('#blocoTotaisConsolidados').style.display=compart?'block':'none';
  $('#compartilhadaAlert').innerHTML = compart
    ? alertHTML('info','Preencha os dados de cada cubículo abaixo. Após o orçamento e assinatura do CUSD, deverá ser solicitada a análise de projeto de cada UC de forma individualizada.') : '';
  sincronizarCubiculos();
  recalcTecnico();
}

/* --- Transformadores --- */
function addTrafo(){ trafos.push({potencia:'',quantidade:'',relacao:'8'}); renderTrafos(); }
function delTrafo(i){ trafos.splice(i,1); renderTrafos(); recalcTecnico(); }
function renderTrafos(){
  const tb=$('#trafoBody'); tb.innerHTML='';
  trafos.forEach((t,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>TRF${String(i+1).padStart(2,'0')}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="trafos[${i}].potencia=this.value;recalcTecnico()"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="trafos[${i}].quantidade=this.value;recalcTecnico()"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="trafos[${i}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafo(${i})">×</button></td>`;
    tb.appendChild(tr);
  });
}

/* --- Cubículos adicionais (Anexo I) --- */
function sincronizarCubiculos(){
  const qtd=parseInt($('[data-k="qtdCubiculos"]')?.value)||0;
  const n=(state.compartilhada==='Sim') ? Math.max(1,qtd) : 0;
  while(cubiculos.length<n) cubiculos.push({instalacao:'',trafos:[{potencia:'',quantidade:'',relacao:'8'}],modalidade:'',demanda:'',demandaPonta:'',demandaForaPonta:''});
  cubiculos.length=n;
  renderCubiculos();
}
function addTrafoCub(i){ cubiculos[i].trafos.push({potencia:'',quantidade:'',relacao:'8'}); renderCubiculos(); }
function delTrafoCub(i,j){ cubiculos[i].trafos.splice(j,1); renderCubiculos(); }
function recalcCubiculo(i){
  const rt=CalculoMT.calcularTrafos(cubiculos[i].trafos);
  const elPot=$('#cubTrafoPot'+i), elQtd=$('#cubTrafoQtd'+i);
  if(elPot) elPot.textContent=fmt(rt.potenciaTotal);
  if(elQtd) elQtd.textContent=rt.quantidadeTotal;
  validarDemandaCubiculo(i);
  recalcTecnico();
}
function demandaRepresentativaCubiculo(c){
  if(c.modalidade==='Azul'){
    const p=parseFloat(c.demandaPonta)||0, f=parseFloat(c.demandaForaPonta)||0;
    return Math.max(p,f);
  }
  return parseFloat(c.demanda)||0;
}
function validarDemandaCubiculo(i){
  const c=cubiculos[i]; if(!c) return;
  const el=$('#cubDemandaAlert'+i); if(!el) return;
  const potCub=CalculoMT.calcularTrafos(c.trafos).potenciaTotal;
  const demCub=demandaRepresentativaCubiculo(c);
  el.innerHTML = (demCub>0 && potCub>0 && demCub>potCub)
    ? alertHTML('err',`A demanda do cubículo não pode ser superior à potência total dos seus transformadores (${fmt(potCub)} kVA).`)
    : '';
}
function totaisCubiculos(){
  let potenciaTotal=0, quantidadeTotal=0, demandaTotal=0;
  cubiculos.forEach(c=>{
    const rt=CalculoMT.calcularTrafos(c.trafos);
    potenciaTotal+=rt.potenciaTotal;
    quantidadeTotal+=rt.quantidadeTotal;
    demandaTotal+=demandaRepresentativaCubiculo(c);
  });
  return {potenciaTotal,quantidadeTotal,demandaTotal};
}
// Cards de Modalidade tarifária horária dentro de cada cubículo — mesmo
// estilo (CAMPOS_CARDS_CONFIG.classes) dos demais cards do formulário.
function _cubiculoModalidadeCardsHTML(i,atual){
  const cls=CAMPOS_CARDS_CONFIG.classes;
  return `<div class="${cls.grid}">`+['Verde','Azul'].map(valor=>
    `<button type="button" class="${cls.card}${atual===valor?' '+cls.active:''}" onclick="setCubiculoModalidade(${i},'${valor}')">${valor}</button>`
  ).join('')+`</div>`;
}
function setCubiculoModalidade(i,valor){
  cubiculos[i].modalidade=valor;
  renderCubiculos();
}
function renderCubiculos(){
  const box=$('#cubiculosCards'); if(!box) return;
  box.innerHTML = cubiculos.map((c,i)=>{
    const rt=CalculoMT.calcularTrafos(c.trafos);
    const trafoRows=c.trafos.map((t,j)=>`<tr>
      <td>TRF${String(j+1).padStart(2,'0')}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="cubiculos[${i}].trafos[${j}].potencia=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="cubiculos[${i}].trafos[${j}].quantidade=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="cubiculos[${i}].trafos[${j}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafoCub(${i},${j})">×</button></td>
    </tr>`).join('');
    const azul=(c.modalidade==='Azul');
    const demandaFields = azul
      ? `<div class="field"><label>Demanda Ponta (kW)</label><input type="number" step="any" value="${c.demandaPonta}" oninput="cubiculos[${i}].demandaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>
         <div class="field"><label>Demanda Fora de Ponta (kW)</label><input type="number" step="any" value="${c.demandaForaPonta}" oninput="cubiculos[${i}].demandaForaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`
      : `<div class="field"><label>Demanda (kW)</label><input type="number" step="any" value="${c.demanda}" oninput="cubiculos[${i}].demanda=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`;
    return `<div class="conditional" style="margin-top:14px">
      <div class="conditional-tag">Cubículo ${i+1}</div>
      ${state.finalidade!=='Conexão Nova' ? `<div class="field"><label>N° Instalação</label><input type="text" value="${c.instalacao}" placeholder="Nº da instalação" oninput="cubiculos[${i}].instalacao=this.value"></div>` : ''}
      <div class="tbl-scroll">
        <table class="tbl">
          <thead><tr><th style="width:70px">Trafo</th><th>Potência (kVA)</th><th>Qtde</th><th>Relação I mag / I nominal</th><th style="width:46px"></th></tr></thead>
          <tbody>${trafoRows}</tbody>
          <tfoot><tr><td>Σ</td><td class="calc" id="cubTrafoPot${i}">${fmt(rt.potenciaTotal)}</td><td class="calc" id="cubTrafoQtd${i}">${rt.quantidadeTotal}</td><td colspan="2"></td></tr></tfoot>
        </table>
      </div>
      <button class="btn-add" onclick="addTrafoCub(${i})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Adicionar transformador</button>
      <div class="grid cols-2" style="margin-top:14px">
        <div class="field"><label>Modalidade tarifária horária</label>${_cubiculoModalidadeCardsHTML(i,c.modalidade)}</div>
        ${demandaFields}
      </div>
      <div id="cubDemandaAlert${i}"></div>
    </div>`;
  }).join('');
  cubiculos.forEach((c,i)=>validarDemandaCubiculo(i));
  recalcTecnico();
}

/* --- Motores --- */
function addMotor(){ motores.push({tipo:'Motor',fases:'Trifásico',cv:'',fp:'',rend:'',volts:'',ipIn:'',tempo:'',dispositivo:'',tap:''}); renderMotores(); }
function delMotor(i){ motores.splice(i,1); renderMotores(); }
// Faixa de resultados calculados, no rodapé do card — sumário leve, não
// uma caixa pesada separada.
function _motorCardCalcHTML(c){
  return `<div class="motor-card-calc">
    <div class="item"><span class="lbl">Pot (kVA)</span><span class="val" data-campo="potkVA">${fmt(c.potkVA)}</span></div>
    <div class="item"><span class="lbl">Pot (kW)</span><span class="val" data-campo="potkW">${fmt(c.potkW)}</span></div>
    <div class="item"><span class="lbl">I nom (A)</span><span class="val" data-campo="iNominal">${fmt(c.iNominal)}</span></div>
    <div class="item"><span class="lbl">I part (A)</span><span class="val" data-campo="iPartida">${fmt(c.iPartida)}</span></div>
    <div class="item"><span class="lbl">Ip prim (A)</span><span class="val" data-campo="ipPrimario">${c.ipPrimario==null?'—':fmt(c.ipPrimario)}</span></div>
  </div>`;
}
function renderMotores(){
  const box=$('#motoresCardsContainer'); if(!box) return;
  box.innerHTML='';
  const tMT=parseFloat(state.tensaoMT);
  motores.forEach((m,i)=>{
    const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},tMT);
    const dispOpts=DISPOSITIVOS.map(d=>`<option ${m.dispositivo===d?'selected':''}>${d}</option>`).join('');
    const compensadora=m.dispositivo==='Chave Compensadora';
    const card=document.createElement('div');
    card.className='motor-card';
    card.dataset.motorRow=i;
    card.innerHTML=`
      <div class="motor-card-head">
        <span class="motor-titulo">Motor #${String(i+1).padStart(2,'0')}</span>
        <button type="button" class="motor-del" onclick="delMotor(${i})" title="Remover motor">×</button>
      </div>
      <div class="motor-card-grid">
        <div class="field"><label>Tipo</label><input type="text" value="${m.tipo}" placeholder="Ex.: Motor" oninput="motores[${i}].tipo=this.value"></div>
        <div class="field"><label>Fases</label><select onchange="motores[${i}].fases=this.value"><option ${m.fases==='Monofásico'?'selected':''}>Monofásico</option><option ${m.fases!=='Monofásico'?'selected':''}>Trifásico</option></select></div>
        <div class="field"><label>CV</label><input type="number" step="any" value="${m.cv}" placeholder="150" oninput="motores[${i}].cv=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field"><label>FP</label><input type="number" step="any" value="${m.fp}" placeholder="0,88" oninput="motores[${i}].fp=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field"><label>Rendimento</label><input type="number" step="any" value="${m.rend}" placeholder="0,92" oninput="motores[${i}].rend=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field"><label>Tensao(V)</label><input type="number" step="any" value="${m.volts}" placeholder="380" oninput="motores[${i}].volts=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field"><label>Ip/In</label><input type="number" step="any" value="${m.ipIn}" placeholder="6" oninput="motores[${i}].ipIn=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field"><label>Tempo Ip (s)</label><input type="number" step="any" value="${m.tempo}" placeholder="10" oninput="motores[${i}].tempo=this.value"></div>
        <div class="field"><label>Disp. partida</label><select onchange="onDispositivoMotorChange(this,${i})"><option value="">—</option>${dispOpts}</select></div>
        <div class="field motor-tap-field" style="display:${compensadora?'':'none'}"><label>Tap (%)</label><input type="number" step="any" value="${m.tap||''}" placeholder="65" oninput="motores[${i}].tap=this.value"></div>
      </div>
      ${ehAtividadeIrrigacao()?`<label class="motor-irrigacao-check"><input type="checkbox" ${m.destinadoIrrigacao?'checked':''} onchange="motores[${i}].destinadoIrrigacao=this.checked"> Destinado à Irrigação</label>`:''}
      ${_motorCardCalcHTML(c)}`;
    box.appendChild(card);
  });
}
// Recalcula só os valores elétricos de UM motor (change/blur dos inputs
// numéricos) e atualiza pontualmente os itens .val do card — isolado via
// this.closest('.motor-card'), sem reconstruir o contêiner geral, o que
// manteria o foco instável e travaria a digitação a cada caractere.
function atualizarCalculosMotor(inputEl){
  const card=inputEl.closest('.motor-card');
  if(!card) return;
  const i=parseInt(card.dataset.motorRow,10);
  const m=motores[i];
  if(!m) return;
  const tMT=parseFloat(state.tensaoMT);
  const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},tMT);
  const setCalc=(campo,val)=>{ const el=card.querySelector(`.val[data-campo="${campo}"]`); if(el) el.textContent=val; };
  setCalc('potkVA',fmt(c.potkVA));
  setCalc('potkW',fmt(c.potkW));
  setCalc('iNominal',fmt(c.iNominal));
  setCalc('iPartida',fmt(c.iPartida));
  setCalc('ipPrimario',c.ipPrimario==null?'—':fmt(c.ipPrimario));
}
// Mostra/oculta o sub-campo Tap (%) isolado no card do motor alterado,
// sem reconstruir o contêiner geral.
function onDispositivoMotorChange(selectEl,i){
  motores[i].dispositivo=selectEl.value;
  const compensadora=selectEl.value==='Chave Compensadora';
  if(!compensadora) motores[i].tap='';
  const card=selectEl.closest('.motor-card');
  if(!card) return;
  const tapField=card.querySelector('.motor-tap-field');
  if(!tapField) return;
  tapField.style.display=compensadora?'':'none';
  const tapInput=tapField.querySelector('input');
  if(tapInput && !compensadora) tapInput.value='';
}

/* ============================================================
   ANÁLISE DE PARTIDA DE MOTORES PESADOS
   Critério Cemig: trifásico > 50 CV OU monofásico > 15 CV.
   Cada motor pesado recebe uma ficha própria em motores[i].analisePartida.
   ============================================================ */
function motorPesado(m){
  const cv=parseFloat(m.cv)||0;
  if(!cv) return false;
  return m.fases==='Monofásico' ? cv>15 : cv>50; // Trifásico é o padrão
}
function motoresPesadosIdx(){
  return motores.map((m,i)=>i).filter(i=>motorPesado(motores[i]));
}
function ensureAnalisePartida(m){
  if(!m.analisePartida){
    m.analisePartida={
      fpPartida:'',dispositivo:'',tap:'',numPartidas:'',ordemPartida:'',
      cargaOperanteKVA:'',cargaOperanteFP:'',cargaSensivelTipo:'',cargaSensivelPercentual:'',
      simultaneidade:'',impedanciaZ:'',
    };
  }
  return m.analisePartida;
}
function _dispositivoPartidaCardsHTML(i,atual){
  const cls=CAMPOS_CARDS_CONFIG.classes;
  return `<div class="${cls.grid} toggle-group--opcoes" role="radiogroup">`+CAMPOS_CARDS_CONFIG.dispositivosPartida.map(op=>{
    const ativo=atual===op.labelShort;
    return `<button type="button" role="radio" aria-checked="${ativo?'true':'false'}" class="${cls.card}${ativo?' '+cls.active:''}" title="${op.labelFull}" onclick='setDispositivoPartida(${i},${JSON.stringify(op.labelShort)})'>${op.labelShort}</button>`;
  }).join('')+`</div>`;
}
function setDispositivoPartida(i,valor){
  const ap=ensureAnalisePartida(motores[i]);
  ap.dispositivo=valor;
  if(valor!=='Chave Compensadora') ap.tap='';
  renderAnaliseMotores();
}
function renderAnaliseMotores(){
  const box=$('#analiseMotoresCards');
  if(!box) return;
  const idxs=motoresPesadosIdx();
  const tMT=parseFloat(state.tensaoMT);
  if(!idxs.length){
    box.innerHTML='<div class="field-note">Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).</div>';
    return;
  }
  box.innerHTML=idxs.map(i=>{
    const m=motores[i];
    const ap=ensureAnalisePartida(m);
    const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},tMT);
    return `<div class="conditional motor-pesado-card" style="margin-top:14px">
      <div class="conditional-tag">Motor ${i+1} — ${m.tipo||'Motor'} (${m.fases||'Trifásico'}, ${m.cv||'—'} CV)</div>
      <div class="grid cols-3">
        <div class="field"><label>Potência do transformador (kVA)</label><input type="text" value="${fmt(state.potTotalTrafos)}" readonly></div>
        <div class="field"><label>Corrente de partida (A)</label><input type="text" value="${c.iPartida==null?'—':fmt(c.iPartida)}" readonly></div>
        <div class="field"><label>Fator de potência na partida</label><input type="number" step="any" value="${ap.fpPartida}" placeholder="Ex.: 0,35" oninput="motores[${i}].analisePartida.fpPartida=this.value"></div>
      </div>
      <div class="subhead">Dispositivo auxiliar de partida</div>
      ${_dispositivoPartidaCardsHTML(i,ap.dispositivo)}
      ${ap.dispositivo==='Chave Compensadora'?`<div class="grid cols-3" style="margin-top:12px">
        <div class="field"><label>Tap (%)</label><input type="number" step="any" value="${ap.tap}" placeholder="Ex.: 65" oninput="motores[${i}].analisePartida.tap=this.value"></div>
      </div>`:''}
      <div class="grid cols-4" style="margin-top:16px">
        <div class="field"><label>Número de partidas</label><input type="number" value="${ap.numPartidas}" oninput="motores[${i}].analisePartida.numPartidas=this.value"></div>
        <div class="field"><label>Ordem de partida</label><input type="number" value="${ap.ordemPartida}" oninput="motores[${i}].analisePartida.ordemPartida=this.value"></div>
        <div class="field"><label>Carga operando (kVA)</label><input type="number" step="any" value="${ap.cargaOperanteKVA}" oninput="motores[${i}].analisePartida.cargaOperanteKVA=this.value"></div>
        <div class="field"><label>Carga operando (FP)</label><input type="number" step="any" value="${ap.cargaOperanteFP}" oninput="motores[${i}].analisePartida.cargaOperanteFP=this.value"></div>
      </div>
      <div class="grid cols-4" style="margin-top:16px">
        <div class="field"><label>Carga sensível — Tipo</label><input type="text" value="${ap.cargaSensivelTipo}" placeholder="Ex.: CLP, iluminação" oninput="motores[${i}].analisePartida.cargaSensivelTipo=this.value"></div>
        <div class="field"><label>Carga sensível — % admissível</label><input type="number" step="any" value="${ap.cargaSensivelPercentual}" oninput="motores[${i}].analisePartida.cargaSensivelPercentual=this.value"></div>
        <div class="field"><label>Simultaneidade</label>
          <select onchange="motores[${i}].analisePartida.simultaneidade=this.value">
            <option value="">Selecione…</option>
            <option ${ap.simultaneidade==='Sim'?'selected':''}>Sim</option>
            <option ${ap.simultaneidade==='Não'?'selected':''}>Não</option>
          </select></div>
        <div class="field"><label>Impedância do transformador — %Z</label><input type="number" step="any" value="${ap.impedanciaZ}" oninput="motores[${i}].analisePartida.impedanciaZ=this.value"></div>
      </div>
    </div>`;
  }).join('');
}
function abrirAnaliseMotores(){
  renderAnaliseMotores();
  $$('.page').forEach(p=>p.classList.remove('show'));
  $('#page-analise-motores').classList.add('show');
  window.scrollTo({top:0,behavior:'smooth'});
}
function voltarDaAnalise(){
  goTo(5);
}

/* ============================================================
   RELATÓRIO DE MOTORES — impressão dedicada (folha oficial Cemig)
   "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES": bloco de
   Identificação (só "Cliente:", sem NS), dados do motor com texto
   direto (sem checkbox) e Notas 1/2 originais no rodapé. Campos
   vazios saem com sublinhado para preenchimento manual.
   ============================================================ */
function _campoImpresso(valor,unidade){
  const v=String(valor??'').trim();
  if(!v) return `<span class="linha-vazia"></span>`;
  return `${v}${unidade?(' '+unidade):''}`;
}
function renderDocumentoMotoresImpressao(){
  syncState();
  const box=$('#documentoMotoresImpressao');
  if(!box) return;
  const idxs=motoresPesadosIdx();
  const tMT=parseFloat(state.tensaoMT);
  const hoje=new Date();
  const dataExtenso=`${String(hoje.getDate()).padStart(2,'0')} de ${hoje.toLocaleDateString('pt-BR',{month:'long'})} de ${hoje.getFullYear()}`;
  const notas=`<div class="doc-notas">
    <p>1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.</p>
    <p>2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.</p>
  </div>`;
  const assinatura=`<div class="doc-assinatura">
    <div class="linha"></div>
    <div>Responsável pelas informações</div>
  </div>`;
  if(!idxs.length){
    box.innerHTML=`<div class="folha-motor">
      <div class="doc-titulo">FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES</div>
      <div class="doc-sec">IDENTIFICAÇÃO</div>
      <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>
      <div class="doc-kv" style="margin-top:10px"><b>&nbsp;</b><span>Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).</span></div>
      <div class="doc-sec">NOTAS</div>
      ${notas}
      <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
      ${assinatura}
    </div>`;
    return;
  }
  box.innerHTML=idxs.map(i=>{
    const m=motores[i];
    const ap=ensureAnalisePartida(m);
    const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},tMT);
    const dispositivoTexto = ap.dispositivo
      ? ap.dispositivo + (ap.dispositivo==='Chave Compensadora' ? ` — Tap: ${_campoImpresso(ap.tap,'%')}` : '')
      : `<span class="linha-vazia"></span>`;
    return `<div class="folha-motor">
      <div class="doc-titulo">FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES</div>

      <div class="doc-sec">IDENTIFICAÇÃO</div>
      <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>

      <div class="doc-sec">TIPO DO MOTOR / NÚMERO DE FASES</div>
      <div class="doc-kv"><b>Tipo do motor:</b><span>${_campoImpresso(m.tipo)}</span></div>
      <div class="doc-kv"><b>Número de fases:</b><span>${_campoImpresso(m.fases||'Trifásico')}</span></div>

      <div class="doc-sec">DADOS ELÉTRICOS</div>
      <div class="doc-kv"><b>Potência do motor:</b><span>${_campoImpresso(m.cv,'CV')}</span></div>
      <div class="doc-kv"><b>Tensão no motor:</b><span>${_campoImpresso(m.volts,'V')}</span></div>
      <div class="doc-kv"><b>Corrente de partida (sem dispositivo de partida):</b><span>${_campoImpresso(c.iPartida==null?'':fmt(c.iPartida),'A')}</span></div>
      <div class="doc-kv"><b>Corrente nominal:</b><span>${_campoImpresso(c.iNominal==null?'':fmt(c.iNominal),'A')}</span></div>
      <div class="doc-kv"><b>Relação Ip/In:</b><span>${_campoImpresso(m.ipIn)}</span></div>
      <div class="doc-kv"><b>Fator de potência em regime:</b><span>${_campoImpresso(m.fp)}</span></div>
      <div class="doc-kv"><b>Fator de potência na partida:</b><span>${_campoImpresso(ap.fpPartida)}</span></div>

      <div class="doc-sec">NÚMERO DE PARTIDAS</div>
      <div class="doc-kv"><b>Número de partidas:</b><span>${_campoImpresso(ap.numPartidas)}</span></div>

      <div class="doc-sec">DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)</div>
      <div class="doc-kv"><b>Dispositivo:</b><span>${dispositivoTexto}</span></div>

      <div class="doc-sec">ORDEM DE PARTIDA DO MOTOR (CASOS DE DOIS OU MAIS MOTORES)</div>
      <div class="doc-kv"><b>Ordem de partida:</b><span>${_campoImpresso(ap.ordemPartida)}</span></div>

      <div class="doc-sec">CARGAS OPERANDO ENQUANTO O MOTOR PARTE (QUANDO HOUVER)</div>
      <div class="doc-kv"><b>Potência:</b><span>${_campoImpresso(ap.cargaOperanteKVA,'kVA')}</span></div>
      <div class="doc-kv"><b>Fator de potência:</b><span>${_campoImpresso(ap.cargaOperanteFP)}</span></div>

      <div class="doc-sec">CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO</div>
      <div class="doc-kv"><b>Tipo:</b><span>${_campoImpresso(ap.cargaSensivelTipo)}</span></div>
      <div class="doc-kv"><b>Flutuação admissível:</b><span>${_campoImpresso(ap.cargaSensivelPercentual,'%')}</span></div>

      <div class="doc-sec">SIMULTANEIDADE DE PARTIDA</div>
      <div class="doc-kv"><b>Em caso de simultaneidade, relacionar os motores e suas características elétricas:</b><span>${_campoImpresso(ap.simultaneidade)}</span></div>

      <div class="doc-sec">TRANSFORMADOR DO CONSUMIDOR</div>
      <div class="doc-kv"><b>Potência do transformador:</b><span>${_campoImpresso(fmt(state.potTotalTrafos),'kVA')}</span></div>
      <div class="doc-kv"><b>Impedância percentual do transformador:</b><span>${_campoImpresso(ap.impedanciaZ,'%')}</span></div>

      <div class="doc-sec">NOTAS</div>
      ${notas}

      <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
      ${assinatura}
    </div>`;
  }).join('');
}
// Nomeia o PDF dinamicamente: como a exportação é via impressão do
// navegador (Salvar como PDF), o nome sugerido no diálogo de impressão
// segue o document.title — por isso ele é trocado temporariamente.
function exportarPDFPartida(){
  renderDocumentoMotoresImpressao();
  const tituloOriginal=document.title;
  const nomeCliente=(state.nome||'Cliente').trim().replace(/\s+/g,'_');
  document.title=`Analise_Partida_Motores_${nomeCliente}`;
  document.body.classList.add('print-motores-only');
  window.print();
  document.title=tituloOriginal;
}
window.addEventListener('afterprint',()=>{
  document.body.classList.remove('print-motores-only');
});

/* ============================================================
   Solicitação de Desconto para Irrigante/Aquicultor (Versão D) —
   folha única A4, dados do cliente vindos da Aba 2/3, tabela de
   cargas só com motores destinadoIrrigacao===true (CV convertido
   para kW a 0,7355) e Notas/assinatura no rodapé.
   ============================================================ */
function renderDocumentoIrrigacaoImpressao(){
  syncState();
  const box=$('#documentoIrrigacaoImpressao');
  if(!box) return;
  const hoje=new Date();
  const dataExtenso=`${String(hoje.getDate()).padStart(2,'0')} de ${hoje.toLocaleDateString('pt-BR',{month:'long'})} de ${hoje.getFullYear()}`;
  const motoresIrrigacao=motores.filter(m=>m.destinadoIrrigacao===true);
  const linhasMotores=motoresIrrigacao.length
    ? motoresIrrigacao.map(m=>{
        const cv=parseFloat(m.cv);
        const kw=isNaN(cv)?null:cv*0.7355;
        const potenciaTexto=kw==null?`<span class="linha-vazia"></span>`:`${fmt(kw)} kW (${fmt(cv)} CV)`;
        return `<tr><td>${_campoImpresso(m.tipo||'Motor')}</td><td>${_campoImpresso(m.fases||'Trifásico')}</td><td>${potenciaTexto}</td></tr>`;
      }).join('')
    : `<tr><td colspan="3">Nenhum motor destinado à irrigação foi marcado.</td></tr>`;
  box.innerHTML=`<div class="folha-motor">
    <div class="doc-titulo">SOLICITAÇÃO DE DESCONTO PARA IRRIGANTE / AQUICULTOR</div>

    <div class="doc-sec">IDENTIFICAÇÃO DO CLIENTE</div>
    <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>
    <div class="doc-kv"><b>Município:</b><span>${_campoImpresso(state.uc_municipio)}</span></div>
    <div class="doc-kv"><b>Nº da Instalação:</b><span>${_campoImpresso(state.numInstalacao)}</span></div>
    <div class="doc-kv"><b>CPF/CNPJ:</b><span>${_campoImpresso(state.cpfCnpj)}</span></div>
    <div class="doc-kv"><b>E-mail:</b><span>${_campoImpresso(state.emailCliente)}</span></div>
    <div class="doc-kv"><b>Telefone:</b><span>${_campoImpresso(state.telCliente)}</span></div>

    <div class="doc-sec">HORÁRIO PARA INÍCIO DO DESCONTO</div>
    <div class="doc-kv"><b>Horário:</b><span>${_campoImpresso(state.irrigacaoHorarioInicio)}</span></div>
    <div class="doc-kv"><b>&nbsp;</b><span>A distribuidora garante janela contínua de 8h30 entre 21h30 e 06h00.</span></div>

    <div class="doc-sec">CARGAS DESTINADAS À IRRIGAÇÃO</div>
    <table class="doc-tabela">
      <thead><tr><th>Tipo</th><th>Fases</th><th>Potência</th></tr></thead>
      <tbody>${linhasMotores}</tbody>
    </table>

    <div class="doc-notas">
      <p>1 - O desconto na tarifa de energia elétrica para irrigantes e aquicultores está condicionado à comprovação de licença ambiental e outorga de uso de recursos hídricos vigentes (REN nº 1.000/2021, §7º; Lei nº 12.787/2013, arts. 22 e 23).</p>
      <p>2 - A distribuidora garante a janela contínua de 8h30 (oito horas e trinta minutos) entre 21h30 e 06h00 para o horário reduzido, conforme horário de início informado pelo cliente.</p>
    </div>

    <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
    <div class="doc-assinatura">
      <div class="linha"></div>
      <div>Responsável pelas informações</div>
    </div>
  </div>`;
}
function exportarPDFIrrigante(){
  renderDocumentoIrrigacaoImpressao();
  const tituloOriginal=document.title;
  const nomeCliente=(state.nome||'Cliente').trim().replace(/\s+/g,'_');
  document.title=`Solicitacao_Desconto_Irrigante_${nomeCliente}`;
  document.body.classList.add('print-irrigante-only');
  window.print();
  document.title=tituloOriginal;
}
window.addEventListener('afterprint',()=>{
  document.body.classList.remove('print-irrigante-only');
});

/* ===== Recalcular bloco técnico (trafos, tipo SE, demanda) ===== */
function recalcTecnico(){
  state.tensaoMT=$('#f_tensaoMT')?.value||state.tensaoMT;
  // trafos (ou totais consolidados dos cubículos, se compartilhada)
  const rt=(state.compartilhada==='Sim')
    ? totaisCubiculos()
    : CalculoMT.calcularTrafos(trafos.map(t=>({potencia:t.potencia,quantidade:t.quantidade})));
  state.potTotalTrafos=rt.potenciaTotal; state.qtdTotalTrafos=rt.quantidadeTotal;
  $('#trafoPotTotal').textContent=fmt(rt.potenciaTotal);
  $('#trafoQtdTotal').textContent=rt.quantidadeTotal;
  // conexão nova: replica pot/qtde
  if($('#cn_pot')){$('#cn_pot').value=fmt(rt.potenciaTotal);state.cn_pot=rt.potenciaTotal;}
  if($('#cn_qtd')){$('#cn_qtd').value=rt.quantidadeTotal;state.cn_qtd=rt.quantidadeTotal;}
  if($('#alt_potFutura')){$('#alt_potFutura').value=fmt(rt.potenciaTotal);state.alt_potFutura=rt.potenciaTotal;}
  if($('#alt_qtdFutura')){$('#alt_qtdFutura').value=rt.quantidadeTotal;state.alt_qtdFutura=rt.quantidadeTotal;}
  if(state.compartilhada==='Sim'){
    state.demandaTotalCubiculos=rt.demandaTotal;
    if($('#totConsolidadoTrafos'))$('#totConsolidadoTrafos').value=fmt(rt.potenciaTotal);
    if($('#totConsolidadoDemanda'))$('#totConsolidadoDemanda').value=fmt(rt.demandaTotal);
  }
  renderMotores();
  // tipo de subestação automático
  preencherTiposSE();
  // tarifa monômia
  const rm=CalculoMT.validarTarifaMonomia($('#f_monomia')?.value,rt.potenciaTotal);
  $('#monomiaAlert').innerHTML = rm.nivel==='erro' ? alertHTML('err',rm.msg) : '';
  // demanda
  validarDemandas();
  recalcRamal();
}

function preencherTiposSE(){
  const ehNova=(state.finalidade==='Conexão Nova');
  const potBase = ehNova ? state.potTotalTrafos : state.potTotalTrafos; // futura = soma trafos
  const lista=CalculoMT.tiposSubestacaoPermitidos({tensaoMTkV:state.tensaoMT,compartilhada:state.compartilhada,potencia:potBase});
  // popula dropdown da conexão nova
  const selNova=$('#cn_tipoSE');
  if(selNova){
    const atual=selNova.value;
    selNova.innerHTML='<option value="">Selecione…</option>'+lista.map(s=>`<option ${atual===s?'selected':''}>${s}</option>`).join('');
    if(lista.length===1){selNova.value=lista[0];state.cn_tipoSE=lista[0];}
  }
  // popula dropdown "Tipo de Subestação atual" da alteração
  const selAtual=$('#alt_tipoAtual');
  if(selAtual){
    const baseAtual=['Subestação Nº 1','Subestação Nº 2','Subestação Nº 4','Subestação Nº 5','Subestação Nº 6','Subestação Nº 8'];
    const potAtual=parseFloat($('[data-k=alt_potAtual]')?.value)||0;
    const listaAtual=CalculoMT.filtrarTiposPorPotencia(baseAtual,potAtual);
    const atual=selAtual.value;
    const manter=listaAtual.includes(atual);
    selAtual.innerHTML='<option value="">Selecione…</option>'+listaAtual.map(s=>`<option ${manter&&atual===s?'selected':''}>${s}</option>`).join('');
    if(!manter){selAtual.value='';state.alt_tipoAtual='';}
  }
  // popula dropdown "Para" da alteração
  const selPara=$('#alt_tipoPara');
  if(selPara){
    const atual=selPara.value;
    const listaPara=CalculoMT.filtrarTiposPorPotencia(lista,state.potTotalTrafos);
    selPara.innerHTML='<option value="">Selecione…</option>'+listaPara.map(s=>`<option ${atual===s?'selected':''}>${s}</option>`).join('');
  }
  renderGaleriaSE('seGallery_nova','cn_tipoSE');
  renderGaleriaSE('seGallery_atual','alt_tipoAtual');
  renderGaleriaSE('seGallery_para','alt_tipoPara');
}

/* ===== Galeria visual de tipos de subestação ===== */
const SE_GALLERY_MAP={cn_tipoSE:'seGallery_nova',alt_tipoAtual:'seGallery_atual',alt_tipoPara:'seGallery_para'};
function renderGaleriaSE(containerId,selectId){
  const cont=$('#'+containerId), sel=$('#'+selectId);
  if(!cont||!sel) return;
  const opts=[...sel.options].filter(o=>o.value!=='');
  cont.innerHTML=opts.map(o=>{
    const m=o.value.match(/(\d+)/);
    const img=m&&SUBESTACAO_IMGS[m[1]];
    const info=m&&SUBESTACAO_INFO[m[1]];
    const sel_=(o.value===sel.value)?'selected':'';
    return `<div class="se-card ${sel_}" onclick="selecionarSE('${selectId}','${o.value}')">
      ${info?`<span class="se-info">i<span class="se-tooltip">${info}</span></span>`:''}
      ${img?`<img src="${img}" alt="${o.value}">`:''}
      <div class="lbl">${o.value}</div>
    </div>`;
  }).join('');
}
function selecionarSE(selectId,value){
  const sel=$('#'+selectId);
  if(!sel) return;
  sel.value=value;
  if(typeof sel.onchange==='function') sel.onchange();
  renderGaleriaSE(SE_GALLERY_MAP[selectId],selectId);
}

function onMonomia(){
  state.monomia=$('#f_monomia').value;
  const isMonomia=(state.monomia==='Sim');
  const boxModalidade=$('#boxModalidade'),boxEscalonada=$('#boxEscalonada'),demandaBox=$('#demandaBox');
  if(boxModalidade)boxModalidade.style.display=isMonomia?'none':'';
  if(boxEscalonada)boxEscalonada.style.display=isMonomia?'none':'';
  if(demandaBox)demandaBox.style.display=isMonomia?'none':'';
  if(isMonomia){
    const escBox=$('#escalonadaBox'); if(escBox)escBox.style.display='none';
    $('#demandaAlert').innerHTML='';
  }
  recalcTecnico();
}
function onModalidade(){state.modalidade=$('#f_modalidade').value;updateDemandaLabels();validarDemandas();}
function onEscalonada(){
  state.escalonada=$('#f_escalonada').value;
  $('#escalonadaBox').style.display=(state.escalonada==='Sim')?'block':'none';
  if(state.escalonada==='Sim') renderEscalonada();
}
function updateDemandaLabels(){
  const azul=(state.modalidade==='Azul');
  const ehAlteracao=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
  ['dem_atual','dem_futura','dem_ponta_atual','dem_ponta_futura','dem_foraponta_atual','dem_foraponta_futura']
    .forEach(k=>{const b=$(`#box_${k}`);if(b)b.style.display='none';});
  function show(k,lbl){const b=$(`#box_${k}`);const l=$(`#lbl_${k}`);if(b)b.style.display='';if(l&&lbl)l.innerHTML=lbl;}
  if(ehAlteracao && !azul){
    show('dem_atual','Demanda Atual (kW) <span class="req">*</span>');
    show('dem_futura','Demanda Futura (kW) <span class="req">*</span>');
  } else if(ehAlteracao && azul){
    show('dem_ponta_atual','Demanda Ponta Atual (kW) <span class="req">*</span>');
    show('dem_ponta_futura','Ponta Futura (kW) <span class="req">*</span>');
    show('dem_foraponta_atual','Fora de Ponta Atual (kW) <span class="req">*</span>');
    show('dem_foraponta_futura','Fora de Ponta Futura (kW) <span class="req">*</span>');
  } else if(!ehAlteracao && !azul){
    show('dem_atual','Informar demanda em kW <span class="req">*</span>');
  } else {
    show('dem_ponta_atual','Demanda Ponta (kW) <span class="req">*</span>');
    show('dem_foraponta_atual','Demanda Fora de Ponta (kW) <span class="req">*</span>');
  }
}
function validarDemandas(){
  if(state.monomia==='Sim'){ $('#demandaAlert').innerHTML=''; return []; }
  const azul=(state.modalidade==='Azul');
  const ehAlteracao=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
  const out=[];
  let dAtual, dFutura;
  if(azul){
    const pa=parseFloat($('[data-k=dem_ponta_atual]')?.value)||0;
    const fa=parseFloat($('[data-k=dem_foraponta_atual]')?.value)||0;
    const pf=parseFloat($('[data-k=dem_ponta_futura]')?.value)||0;
    const ff=parseFloat($('[data-k=dem_foraponta_futura]')?.value)||0;
    dAtual=(pa||fa)?String(pa+fa):'';
    dFutura=(pf||ff)?String(pf+ff):'';
  } else {
    dAtual=$('[data-k=dem_atual]')?.value||'';
    dFutura=$('[data-k=dem_futura]')?.value||'';
  }
  if(!ehAlteracao){
    const rNova=CalculoMT.validarDemandaConexaoNova(dAtual,state.finalidade);
    if(rNova.nivel)out.push(rNova);
  }
  const rPot=CalculoMT.validarDemandaVsPotencia(dAtual,state.potTotalTrafos);
  if(rPot.nivel)out.push(rPot);
  if(ehAlteracao&&dFutura){
    const rPotFut=CalculoMT.validarDemandaVsPotencia(dFutura,state.potTotalTrafos);
    if(rPotFut.nivel)out.push(rPotFut);
  }
  if(ehAlteracao&&dAtual&&dFutura){
    const rFut=CalculoMT.validarDemandaFuturaVsAtual(state.finalidade,dAtual,dFutura);
    if(rFut.nivel)out.push(rFut);
  }
  $('#demandaAlert').innerHTML=out.map(r=>alertHTML('err',r.msg)).join('');
  return out;
}

/* ===== Demanda Escalonada ===== */
let escalonada=[];
function addEscalonada(){escalonada.push({demanda:'',ponta:'',foraponta:'',inicio:''});renderEscalonada();}
function delEscalonada(i){escalonada.splice(i,1);renderEscalonada();}
function renderEscalonada(){
  const azul=(state.modalidade==='Azul');
  const head=$('#escalonadaHead'),body=$('#escalonadaBody');
  if(!head||!body) return;
  head.innerHTML=azul
    ?'<tr><th>Ponta (kW)</th><th>Fora de Ponta (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>'
    :'<tr><th>Demanda Futura (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>';
  body.innerHTML='';
  escalonada.forEach((e,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=azul
      ?`<td><input type="number" step="any" value="${e.ponta}" placeholder="kW" oninput="escalonada[${i}].ponta=this.value"></td>
         <td><input type="number" step="any" value="${e.foraponta}" placeholder="kW" oninput="escalonada[${i}].foraponta=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`
      :`<td><input type="number" step="any" value="${e.demanda}" placeholder="kW" oninput="escalonada[${i}].demanda=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`;
    body.appendChild(tr);
  });
}

/* ===== Alteração: troca de SE ===== */
function onTrocaSE(){
  state.alt_troca=$('#alt_troca').value;
  $('#alt_tipoParaBox').style.display=(state.alt_troca==='Sim')?'flex':'none';
  $('#seGalleryBox_para').style.display=(state.alt_troca==='Sim')?'block':'none';
  $('#alt_tipoAtualLbl').innerHTML=(state.alt_troca==='Sim')?'Tipo de Subestação (De) <span class="req">*</span>':'Tipo de Subestação atual <span class="req">*</span>';
  recalcRamal();
}

/* ===== Geração ===== */
function onGeracao(t){
  if(t==='mom'){state.gerMomentaneo=event.target.value;$('#gerMomPotBox').style.display=(state.gerMomentaneo==='Sim')?'flex':'none';}
  if(t==='grid'){state.gridZero=event.target.value;$('#gridZeroPotBox').style.display=(state.gridZero==='Sim')?'flex':'none';}
}

/* ===== RAMAL — galeria visual ===== */
function tipoSEefetivo(){
  if(state.finalidade==='Conexão Nova') return state.cn_tipoSE;
  if(state.alt_troca==='Sim') return $('#alt_tipoPara')?.value;
  return $('#alt_tipoAtual')?.value;
}
function recalcRamal(){
  state.cn_tipoSE=$('#cn_tipoSE')?.value||state.cn_tipoSE;
  const tipoSE=tipoSEefetivo();
  const g=CalculoMT.grupoRamal({finalidade:state.finalidade,localizacao:state.localizacao,trocaSE:state.alt_troca,tipoSE});
  const gallery=$('#ramalGallery'), empty=$('#ramalEmpty');
  if(!g.indices.length){gallery.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  gallery.innerHTML=g.indices.map(idx=>{
    const sel=(ramalSelecionado===idx)?'selected':'';
    return `<div class="ramal-card ${sel}" onclick="selectRamal(${idx})">
      <div class="imgwrap"><img src="${RAMAL_IMGS[idx]||''}" alt="Ramal ${idx}"><span class="check">✓</span></div>
      <div class="desc">${CalculoMT.textoRamal(idx).replace(/·/g,'<br>·')}</div></div>`;
  }).join('');
}
function selectRamal(idx){ramalSelecionado=idx;state.ramalIndice=idx;recalcRamal();}

/* ===== Helpers de alerta ===== */
function alertHTML(tipo,msg){
  const icon = tipo==='err'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : tipo==='warn'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  return `<div class="alert ${tipo}">${icon}<div>${msg}</div></div>`;
}

/* ===== Validação de campos obrigatórios (gate de exportação) ===== */
// Considera "irrelevante" um elemento dentro de um bloco condicional oculto via
// style.display (ex.: blocoRural quando Urbana). Ignora a troca de página (.page),
// que usa classe CSS, não style inline, para não excluir campos de outras etapas.
function elementoRelevante(el){
  let node=el;
  while(node && !(node.classList && node.classList.contains('page'))){
    if(node.style && node.style.display==='none') return false;
    node=node.parentElement;
  }
  return true;
}
function camposObrigatoriosFaltando(){
  syncState();
  const faltando=[];
  $$('.field').forEach(field=>{
    if(!field.querySelector('.req')) return;
    if(!elementoRelevante(field)) return;
    const ctrl=field.querySelector('[data-k]');
    if(!ctrl) return;
    const v=String(state[ctrl.dataset.k]??'').trim();
    if(!v){
      const label=field.querySelector('label');
      faltando.push(label?label.textContent.replace('*','').trim():ctrl.dataset.k);
    }
  });
  const blocoTrafos=$('#blocoTrafosIndividual');
  if(blocoTrafos && elementoRelevante(blocoTrafos)){
    const ok=trafos.length>0 && trafos.every(t=>String(t.potencia).trim()!=='' && String(t.quantidade).trim()!=='');
    if(!ok) faltando.push('Transformador(es)');
  }
  if(state.compartilhada==='Sim'){
    const ok=cubiculos.length>0 && cubiculos.every(c=>c.trafos.length>0 && c.trafos.every(t=>String(t.potencia).trim()!=='' && String(t.quantidade).trim()!==''));
    if(!ok) faltando.push('Transformadores dos cubículos da subestação compartilhada');
  }
  if(state.ramalIndice==null) faltando.push('Ramal de Entrada');
  return [...new Set(faltando)];
}
function atualizarGateExportacao(){
  const faltando=camposObrigatoriosFaltando();
  // Regra 3: validações bloqueantes (ex.: demanda contratada/futura > potência
  // total instalada dos transformadores) impedem a geração do PDF e o envio do
  // formulário — não apenas exibem alerta na etapa de dados.
  const errosValidacao=(validarDemandas()||[]).filter(r=>r.nivel==='erro');
  const box=$('#exportAlert');
  const mini=$('#exportProgressMini');
  const partes=[];
  if(faltando.length) partes.push('Preencha os campos obrigatórios antes de exportar: '+faltando.join(', ')+'.');
  errosValidacao.forEach(e=>partes.push(e.msg));
  if(box) box.innerHTML = partes.length ? partes.map(m=>alertHTML('err',m)).join('') : '';
  const bloqueado = faltando.length>0 || errosValidacao.length>0;
  if(mini) mini.textContent = bloqueado
    ? (faltando.length ? 'Faltam campos obrigatórios' : 'Há erros de validação')
    : 'Pronto para exportar';
  ['#btnExportarPDF','#btnCartaMonomia'].forEach(sel=>{
    const b=$(sel);
    if(b) b.disabled = bloqueado;
  });
  return [...faltando, ...errosValidacao.map(e=>e.msg)];
}

/* ===== Prévia ===== */
function pvRow(k,v){const empty=(v==null||v==='');return `<div class="pv-row"><div class="k">${k}</div><div class="v ${empty?'empty':''}">${empty?'—':v}</div></div>`;}
function renderPreview(){
  syncState();
  const tipoSE=tipoSEefetivo();
  let h=`<div class="pv-title">FORMULÁRIO — ORÇAMENTO DE CONEXÃO / ALTERAÇÃO DE CARGA EM MÉDIA TENSÃO</div><div class="pv-section">`;
  h+=`<h4>1. Classificação do Atendimento</h4>`;
  h+=pvRow('Opção de Atendimento',state.opcaoAtend)+pvRow('Finalidade',state.finalidade);
  if(state.finalidade && state.finalidade!=='Conexão Nova')h+=pvRow('Nº da Instalação',state.numInstalacao);
  h+=pvRow('Nº ART/TRT',state.artTrt)+pvRow('Tel. RT (cel/fixo)',[state.rtCelular,state.rtFixo].filter(Boolean).join(' / '));
  h+=`<h4>2. Dados do Proprietário</h4>`;
  h+=pvRow('Nome / Razão Social',state.nome)+pvRow('CPF/CNPJ',state.cpfCnpj);
  h+=pvRow('Telefone do cliente',state.telCliente)+pvRow('E-mail do cliente',state.emailCliente);
  h+=pvRow('Telefone do solicitante',state.telSolicitante)+pvRow('E-mail do solicitante',state.emailSolicitante);
  h+=`<h4>3. Correspondência</h4>`;
  h+=pvRow('Vencimento escolhido',state.desejaVenc==='Sim'?('Sim — dia '+(state.diaVenc||'—')):state.desejaVenc);
  h+=pvRow('Modalidade da obra',state.modalidadeObra)+pvRow('Forma de correspondência',state.formaCorresp);
  if(state.formaCorresp==='E-mail')h+=pvRow('E-mail correspondência',state.emailCorresp);
  if(state.formaCorresp==='Endereço'||state.formaCorresp==='Agência Correios(Caixa Postal)')
    h+=pvRow('Endereço correspondência',[state.ec_rua,state.ec_num,state.ec_bairro,state.ec_municipio,state.ec_estado,state.ec_cep].filter(Boolean).join(', '));
  h+=`<h4>4. Unidade Consumidora</h4>`;
  h+=pvRow('Atividade',state.atividade)+pvRow('Ramo',state.ramoAtividade);
  h+=pvRow('CEP',state.uc_cep)+pvRow('Localização',state.localizacao)+pvRow('Município / Estado',[state.uc_municipio,state.uc_estado].filter(Boolean).join(' / '));
  h+=pvRow('Coordenadas',[state.latitude,state.longitude].filter(Boolean).join(' , '));
  if(state.finalidade && state.finalidade!=='Conexão Nova')h+=pvRow('Coordenadas novas',[state.latitudeNova,state.longitudeNova].filter(Boolean).join(' , '));
  if(state.localizacao==='Urbana')h+=pvRow('Endereço',[state.urb_endereco,state.urb_num,state.urb_bairro,state.urb_compl].filter(Boolean).join(', '));
  if(state.localizacao==='Rural')h+=pvRow('Distrito / Propriedade',[state.rur_distrito,state.rur_propriedade].filter(Boolean).join(' / '));
  h+=pvRow('Área de restrição ambiental?',state.restricaoAmbiental||'Não consultada');
  if(state.restricaoAmbiental==='Sim'&&state.restricoesTexto)h+=pvRow('Restrições identificadas',state.restricoesTexto);
  h+=pvRow('Subestação pronta?',state.subPronta);
  h+=`<h4>5. Dados Técnicos</h4>`;
  h+=pvRow('Nível de tensão MT',state.tensaoMT?state.tensaoMT.replace('.',',')+' kV':'')+pvRow('Compartilhada?',state.compartilhada);
  if(state.compartilhada==='Sim'){
    h+=pvRow('Soma dos transformadores (kVA)',fmt(state.potTotalTrafos));
    h+=pvRow('Soma das demandas (kW)',fmt(state.demandaTotalCubiculos));
    h+=pvRow('Tipo de Subestação',tipoSE);
  } else {
    // tabela trafos
    if(trafos.length){let tt='<table class="tbl"><thead><tr><th>Trafo</th><th>Pot (kVA)</th><th>Qtde</th><th>Rel. Imag/In</th></tr></thead><tbody>';
      trafos.forEach((t,i)=>{tt+=`<tr><td>TRF${String(i+1).padStart(2,'0')}</td><td>${t.potencia||'—'}</td><td>${t.quantidade||'—'}</td><td>${t.relacao||'—'}</td></tr>`;});
      tt+=`</tbody><tfoot><tr><td>Σ</td><td>${fmt(state.potTotalTrafos)}</td><td>${state.qtdTotalTrafos||0}</td><td></td></tr></tfoot></table>`;
      h+=`<div class="pv-row"><div class="k">Transformadores</div><div class="v">${tt}</div></div>`;}
    if(motores.length){let mt='<table class="tbl"><thead><tr><th>Tipo</th><th>CV</th><th>FP</th><th>η</th><th>V</th><th>Ip/In</th><th>I nom</th><th>I part</th></tr></thead><tbody>';
      motores.forEach(m=>{const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},parseFloat(state.tensaoMT));
        mt+=`<tr><td>${m.tipo||'—'}</td><td>${m.cv||'—'}</td><td>${m.fp||'—'}</td><td>${m.rend||'—'}</td><td>${m.volts||'—'}</td><td>${m.ipIn||'—'}</td><td>${fmt(c.iNominal)}</td><td>${fmt(c.iPartida)}</td></tr>`;});
      mt+='</tbody></table>';
      h+=`<div class="pv-row"><div class="k">Motores</div><div class="v">${mt}</div></div>`;}
    h+=pvRow('Tipo de Subestação',tipoSE);
    if(state.finalidade!=='Conexão Nova')h+=pvRow('Troca de Subestação?',state.alt_troca);
    h+=pvRow('Tarifa monômia?',state.monomia)+pvRow('Modalidade tarifária',state.modalidade)+pvRow('Demanda escalonada?',state.escalonada);
    const azulPv=(state.modalidade==='Azul');
    const ehAltPv=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
    if(azulPv){
      h+=pvRow('Demanda Ponta Atual (kW)',state.dem_ponta_atual);
      if(ehAltPv)h+=pvRow('Ponta Futura (kW)',state.dem_ponta_futura);
      h+=pvRow('Fora de Ponta Atual (kW)',state.dem_foraponta_atual);
      if(ehAltPv)h+=pvRow('Fora de Ponta Futura (kW)',state.dem_foraponta_futura);
    } else {
      h+=pvRow(ehAltPv?'Demanda Atual (kW)':'Demanda (kW)',state.dem_atual);
      if(ehAltPv)h+=pvRow('Demanda Futura (kW)',state.dem_futura);
    }
    if(escalonada.length){
      let et=azulPv?'<table class="tbl"><thead><tr><th>Ponta (kW)</th><th>Fora-ponta (kW)</th><th>Início de Uso</th></tr></thead><tbody>'
                   :'<table class="tbl"><thead><tr><th>Demanda Futura (kW)</th><th>Início de Uso</th></tr></thead><tbody>';
      escalonada.forEach(e=>{et+=azulPv?`<tr><td>${e.ponta||'—'}</td><td>${e.foraponta||'—'}</td><td>${e.inicio||'—'}</td></tr>`
                                       :`<tr><td>${e.demanda||'—'}</td><td>${e.inicio||'—'}</td></tr>`;});
      et+='</tbody></table>';
      h+=`<div class="pv-row"><div class="k">Demanda Escalonada</div><div class="v">${et}</div></div>`;
    }
  }
  if(cubiculos.length){
    h+=`<h4>Cubículos da Subestação Compartilhada</h4>`;
    cubiculos.forEach((c,i)=>{
      const rt=CalculoMT.calcularTrafos(c.trafos);
      h+=pvRow(`Cubículo ${i+1} — Nº Instalação`,c.instalacao);
      h+=pvRow(`Cubículo ${i+1} — Transformadores`,`${fmt(rt.potenciaTotal)} kVA / ${rt.quantidadeTotal} un.`);
      h+=pvRow(`Cubículo ${i+1} — Modalidade tarifária`,c.modalidade);
      if(c.modalidade==='Azul'){
        h+=pvRow(`Cubículo ${i+1} — Demanda Ponta (kW)`,c.demandaPonta);
        h+=pvRow(`Cubículo ${i+1} — Demanda Fora de Ponta (kW)`,c.demandaForaPonta);
      } else {
        h+=pvRow(`Cubículo ${i+1} — Demanda (kW)`,c.demanda);
      }
    });
  }
  h+=pvRow('Geração paralelismo momentâneo',state.gerMomentaneo)+pvRow('GRID ZERO',state.gridZero)+pvRow('BT na mesma propriedade',state.btMesmaProp);
  // ramal selecionado
  if(state.ramalIndice!=null){
    h+=`<div class="pv-row"><div class="k">Ramal de Entrada selecionado</div><div class="v"><img src="${RAMAL_IMGS[state.ramalIndice]}" style="max-width:100%;border:1px solid #ddd;border-radius:6px;margin-bottom:6px"><br>${CalculoMT.textoRamal(state.ramalIndice)}</div></div>`;
  } else h+=pvRow('Ramal de Entrada','(não selecionado)');
  if(state.observacoes)h+=pvRow('Observações',state.observacoes);
  h+='</div>';
  $('#previewContent').innerHTML=h;
  const btnMonomia=$('#btnCartaMonomia');
  if(btnMonomia)btnMonomia.style.display=(state.monomia==='Sim')?'':'none';
  renderIrrigacaoOpcionalCard();
  const alertaMotores=$('#alertaMotoresPesados');
  if(alertaMotores){
    const idxs=motoresPesadosIdx();
    alertaMotores.innerHTML = idxs.length
      ? alertHTML('warn',`A solicitação possui ${idxs.length} motor(es) pesado(s) que exige(m) mais informações, favor preencher o formulário: <button type="button" class="btn btn-primary no-print" style="margin-left:8px" onclick="abrirAnaliseMotores()">Preencher Análise de Partida</button>`)
      : '';
  }
  atualizarGateExportacao();
}
function syncState(){$$('[data-k]').forEach(el=>{state[el.dataset.k]=el.value;});}

/* ===== CEP autopreenchimento ===== */
async function buscarCEP(cep){
  cep=cep.replace(/\D/g,'');
  if(cep.length!==8) return null;
  try{
    const r=await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if(r.ok){
      const d=await r.json();
      const coords=d.location?.coordinates;
      return {logradouro:d.street||'',bairro:d.neighborhood||'',cidade:d.city||'',uf:d.state||'',
              latitude:coords?.latitude??null,longitude:coords?.longitude??null};
    }
  }catch(_){}
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if(r.ok){const d=await r.json();if(d.erro) return null;
      return {logradouro:d.logradouro||'',bairro:d.bairro||'',cidade:d.localidade||'',uf:d.uf||'',
              latitude:null,longitude:null};}
  }catch(_){}
  return null;
}
function _setField(k,v){const el=$(`[data-k="${k}"]`);if(!el||v==null)return;el.value=v;el.dispatchEvent(new Event('input'));}
async function onCEP(prefixo){
  const st=$(`#cep-status-${prefixo}`);
  if(st){st.textContent='buscando…';st.className='cep-status';}
  const cepEl=$(`[data-k="${prefixo==='uc'?'uc_cep':'ec_cep'}"]`);
  const d=await buscarCEP(cepEl?.value||'');
  if(!d){if(st){st.textContent='CEP não encontrado';st.className='cep-status err';}return;}
  if(st) st.textContent='';
  if(prefixo==='uc'){
    _setField('uc_municipio',d.cidade);_setField('uc_estado',d.uf);
    if(state.localizacao==='Urbana'){_setField('urb_endereco',d.logradouro);_setField('urb_bairro',d.bairro);}
    if(d.latitude!=null) _setField('latitude',d.latitude);
    if(d.longitude!=null) _setField('longitude',d.longitude);
  } else {
    _setField('ec_rua',d.logradouro);_setField('ec_bairro',d.bairro);
    _setField('ec_municipio',d.cidade);_setField('ec_estado',d.uf);
  }
}

/* ===== Exportar PDF ===== */
function exportarPDF(){
  if(atualizarGateExportacao().length){ goTo(5); return; }
  window.print();
}

/* ===== Modal Anexo II ===== */
function abrirAnexoII(){$('#modalAnexo').classList.add('show');}
function fecharAnexoII(){$('#modalAnexo').classList.remove('show');}

/* ===== Init ===== */
function aplicarAtividadeDaURL(){
  const v=new URLSearchParams(location.search).get('atividade');
  if(!v || !ATIVIDADES.includes(v)) return;
  const sel=$('#f_atividade');
  sel.value=v;
  sel.dispatchEvent(new Event('change'));
}
document.addEventListener('DOMContentLoaded',()=>{
  fillAtividades(); bindInputs();
  inicializarCamposCards();
  addTrafo(); // começa com 1 linha de trafo
  aplicarAtividadeDaURL();
  // stepper clicável
  $$('.vstep').forEach((s,i)=>s.addEventListener('click',()=>goTo(i)));
  // reaplica a convenção de marcadores nos campos montados dinamicamente
  if(window.CemigMarcadores) window.CemigMarcadores.aplicar();
});
