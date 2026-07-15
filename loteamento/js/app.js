/* ===== Estado global ===== */
const state = {};

/* ===== util ===== */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const fmt = (n,d=0)=> (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

/* ===== Bind genérico de campos (data-k) ===== */
function bindInputs(){
  $$('[data-k]').forEach(el=>{
    if(el.type==='checkbox'){
      el.addEventListener('change',()=>{state[el.dataset.k]=el.checked;});
    } else {
      const k=el.dataset.k;
      el.addEventListener('input',()=>{state[k]=el.value;});
      el.addEventListener('change',()=>{state[k]=el.value;});
    }
  });
}

/* ===== Toggle sobre select oculto (mesmo seletor Urbana/Rural do BT;
   padrão do mt/js/toggle-cards.js: o select segue como fonte da verdade) ===== */
function montarToggle(k){
  const select=$(`select[data-k="${k}"]`);
  if(!select||select.dataset.toggleMontado) return;
  select.dataset.toggleMontado='1';
  const grupo=document.createElement('div');
  grupo.className='toggle-group toggle-group--opcoes';
  grupo.setAttribute('role','radiogroup');
  const render=()=>{
    grupo.innerHTML='';
    [...select.options].filter(o=>o.value!=='').forEach(o=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.setAttribute('role','radio');
      btn.setAttribute('aria-checked',select.value===o.value?'true':'false');
      btn.className='toggle-btn'+(select.value===o.value?' on':'');
      btn.textContent=o.textContent;
      btn.addEventListener('click',()=>{
        select.value=o.value;
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
        render();
      });
      grupo.appendChild(btn);
    });
  };
  render();
  select.style.display='none';
  select.setAttribute('aria-hidden','true');
  select.insertAdjacentElement('afterend',grupo);
}

/* ===== Navegação por etapas (mesmo padrão do formulário MT) ===== */
function goTo(n,livre){
  // Navegação pela sidebar é LIVRE (livre=true). O avanço pelo botão só ocorre
  // quando ele está habilitado; a validação aqui é rede de segurança. Voltar
  // é sempre livre.
  const _atual=document.querySelector('.page.show');
  const _atualN=_atual?parseInt(_atual.id.replace('page-',''),10):-1;
  if(!livre && n>_atualN && _atual && window.CemigMarcadores){
    const r=window.CemigMarcadores.validar(_atual);
    if(!r.ok){ if(r.primeiro) r.primeiro.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  }
  $$('.page').forEach(p=>p.classList.remove('show'));
  $('#page-'+n).classList.add('show');
  const steps=$$('.vstep');
  steps.forEach((s,i)=>{s.classList.remove('active','done'); if(i<n)s.classList.add('done'); if(i===n)s.classList.add('active');});
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===6) renderPreview();
  // Mapa vive numa .page oculta: inicia na primeira exibição e recalcula o
  // tamanho ao voltar (lição do bt-core: Leaflet não mede display:none).
  if($('#page-'+n+' #map')){
    initMapaObra();
    if(mapaObra) setTimeout(()=>mapaObra.invalidateSize(),150);
  }
  if(window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

/* ===== Coordenadas / UTM (mesma lógica do formulário MT) ===== */
const LIM = { LAT_MIN:-22.9, LAT_MAX:-14.23, LON_MIN:-51.04, LON_MAX:-39.85 };
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
function validarCoordenadas(latitude,longitude){
  const lat=parseFloat(latitude),lon=parseFloat(longitude);
  const erros=[];
  if(!isNaN(lat)&&(lat<LIM.LAT_MIN||lat>LIM.LAT_MAX)) erros.push('Latitude fora dos limites de Minas Gerais (−22,9 a −14,23).');
  if(!isNaN(lon)&&(lon<LIM.LON_MIN||lon>LIM.LON_MAX)) erros.push('Longitude fora dos limites de Minas Gerais (−51,04 a −39,85).');
  return erros.length ? {ok:false,msg:erros.join(' ')} : {ok:true,msg:''};
}
function onCoord(){
  state.latitude=$('[data-k=latitude]').value; state.longitude=$('[data-k=longitude]').value;
  const lat=parseFloat(state.latitude), lon=parseFloat(state.longitude);
  if(!isNaN(lat)&&!isNaN(lon)){
    const u=latLonParaUTM(lat,lon);
    $('[data-k=utm]').value=`${u.zona}${_utmBandLetter(lat)} E:${u.easting} N:${u.northing}`;
  }
  // Atribuição programática não dispara o bind genérico — sincroniza o estado
  // aqui para a UTM aparecer na prévia.
  state.utm=$('[data-k=utm]').value;
  const r=validarCoordenadas(state.latitude,state.longitude);
  $('#coordAlert').innerHTML = r.ok ? '' : alertHTML('err',r.msg);
  // Move o pino do mapa quando a coordenada digitada já tem precisão útil
  // (mesmo guarda de 5 dígitos do BT, para não pular enquanto digita).
  if(!isNaN(lat)&&!isNaN(lon)&&_nDig(state.latitude)>=5&&_nDig(state.longitude)>=5)
    sincronizarMapaComCoordenadas(lat,lon);
}

/* ===== Mapa de localização (porte compacto do bt-core.js: Leaflet com
   camadas Satélite/Ruas, clique e arraste do pino preenchem as
   coordenadas; sem geocodificação por endereço). ===== */
let mapaObra=null, marcadorObra=null, _mapaObraDebounce=null;

/* ===== Restrição ambiental (IDE-Sisema) — consulta compartilhada de
   shared/js/geo.js, como BT/MT: desenha o contorno das reservas e a
   legenda abaixo do mapa (some quando o pino sai da restrição). Aqui não
   há o bloco de documentos/aceite do BT/MT — só a sinalização no mapa. */
let restricaoLayer=null, _loteLastRestrKey='';
// Aviso fixo abaixo do mapa: a Licença Ambiental é documento obrigatório do
// loteamento (item migrado das Orientações). Quando o pino cai em restrição,
// o texto é TROCADO pela frase de localização + documentos da(s) respectiva(s)
// área(s) (mesmos textos compartilhados do BT/MT em shared/js/geo.js); ao
// sair da restrição, o aviso da licença volta.
function renderLicencaAmbiental(det){
  const box=$('#licencaAmbientalBox');
  if(!box) return;
  // Qualquer re-render (nova consulta/área) exige aceitar de novo — mesmo
  // comportamento do BT/MT (restricaoAceite=false a cada consulta).
  state.restricaoAceite=false;
  state.restricaoAmbiental=det&&det.length?'Sim':'Não';
  if(det&&det.length){
    const sentenca=typeof restricaoSentencaHTML==='function'?restricaoSentencaHTML(det):'';
    const docs=typeof restricaoDocsHTML==='function'?restricaoDocsHTML(det):'';
    const label=typeof RESTRICAO_ACEITE_LABEL!=='undefined'
      ?RESTRICAO_ACEITE_LABEL
      :'Declaro que li e estou de acordo com as informações acima.';
    box.innerHTML=alertHTML('warn',`<span>${sentenca}</span>`)+docs+
      `<label class="restricao-aceite"><input type="checkbox" id="restricaoAceite"> <span>${label}</span></label>`;
    // O 'change' nativo borbulha até o montarNavReativa (reavalia o gate do
    // botão Avançar); aqui só o estado.
    const chk=$('#restricaoAceite');
    if(chk) chk.onchange=e=>{state.restricaoAceite=e.target.checked;};
  } else {
    box.innerHTML=alertHTML('warn',
      '<span><strong>Documento obrigatório:</strong> Licença Ambiental ou declaração de não passível de licenciamento.</span>');
  }
  if(window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Gate do Avançar da etapa do mapa (data-gate="loteRestricaoOk") e da
// exportação: com restrição ambiental, o aceite é obrigatório.
window.loteRestricaoOk=function(){
  return state.restricaoAmbiental!=='Sim'||!!state.restricaoAceite;
};
function _limparRestricaoLayer(){
  if(mapaObra&&restricaoLayer) mapaObra.removeLayer(restricaoLayer);
  restricaoLayer=null;
  if(mapaObra&&typeof atualizarLegendaRestricoes==='function')
    atualizarLegendaRestricoes(mapaObra,null);
}
async function consultarRestricaoAmbientalLote(lat,lng){
  if(!window.turf||typeof consultarRestricoesObra!=='function') return;
  if(isNaN(lat)||isNaN(lng)) return;
  const key=lat.toFixed(5)+','+lng.toFixed(5);
  if(_loteLastRestrKey===key) return;
  _loteLastRestrKey=key;
  try{
    const res=await consultarRestricoesObra(lat,lng);
    if(res.length>0&&res.every(r=>r.erro)){
      _loteLastRestrKey='';
      _limparRestricaoLayer();
      renderLicencaAmbiental();
      return;
    }
    if(mapaObra&&typeof desenharRestricoesNoMapa==='function'){
      _limparRestricaoLayer();
      restricaoLayer=desenharRestricoesNoMapa(window.L,mapaObra,res);
    }
    renderLicencaAmbiental(typeof detalhesRestricoes==='function'?detalhesRestricoes(res):null);
  }catch(_){
    _loteLastRestrKey='';
  }
}
const _nDig=(s)=>(String(s||'').match(/\d/g)||[]).length;
function _aplicarCoordDoMapa(lat,lng){
  const la=$('[data-k=latitude]'), lo=$('[data-k=longitude]');
  if(la) la.value=String(lat);
  if(lo) lo.value=String(lng);
  // 'input' sintético mantém bind genérico, marcadores e onCoord na mesma
  // rota do preenchimento manual.
  if(la) la.dispatchEvent(new Event('input',{bubbles:true}));
  if(lo) lo.dispatchEvent(new Event('input',{bubbles:true}));
}
function initMapaObra(){
  const div=$('#map');
  if(!div||!window.L||mapaObra) return;
  mapaObra=window.L.map(div).setView([-19.9167,-43.9345],12);
  const ruas=window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19,attribution:'© OpenStreetMap'});
  const satelite=window.L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:19,attribution:'Tiles © Esri — Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'});
  satelite.addTo(mapaObra);
  window.L.control.layers({'Satélite':satelite,'Ruas':ruas}).addTo(mapaObra);
  mapaObra.on('click',e=>_aplicarCoordDoMapa(e.latlng.lat,e.latlng.lng));
  setTimeout(()=>mapaObra.invalidateSize(),200);
  const lat=parseFloat(String(state.latitude||'').replace(',','.')),
    lng=parseFloat(String(state.longitude||'').replace(',','.'));
  if(!isNaN(lat)&&!isNaN(lng)) sincronizarMapaComCoordenadas(lat,lng,true);
}
function sincronizarMapaComCoordenadas(lat,lng,imediato){
  if(isNaN(lat)||isNaN(lng)) return;
  clearTimeout(_mapaObraDebounce);
  const atualizar=()=>{
    if(!mapaObra) return;
    const ll=window.L.latLng(lat,lng);
    if(marcadorObra){
      marcadorObra.setLatLng([lat,lng]);
      if(!mapaObra.getBounds().contains(ll))
        mapaObra.setView(ll,Math.max(mapaObra.getZoom(),17));
    } else {
      marcadorObra=window.L.marker([lat,lng],{draggable:true}).addTo(mapaObra);
      marcadorObra.on('dragend',e=>{
        const p=e.target.getLatLng();
        _aplicarCoordDoMapa(p.lat,p.lng);
      });
      // Primeira aparição do pino: centraliza no ZOOM MÁXIMO dos tiles.
      const zMax=Number.isFinite(mapaObra.getMaxZoom())?mapaObra.getMaxZoom():19;
      mapaObra.setView(ll,zMax);
    }
    setTimeout(()=>mapaObra.invalidateSize(),100);
    // Toda coordenada nova (digitada, clique ou arraste) passa por aqui —
    // ponto único para a validação ambiental, como o onCoordBT do BT.
    consultarRestricaoAmbientalLote(lat,lng);
  };
  if(imediato) atualizar();
  else _mapaObraDebounce=setTimeout(atualizar,600);
}

/* ===== Validação de e-mail / telefone ===== */
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
  // Convenção compartilhada (form-marcadores): erro sinalizado com
  // .is-invalid no controle + mensagem no .field-hint do campo.
  const sp=$('#'+spanId);
  const limpa=()=>{el.classList.remove('is-invalid');if(sp){sp.textContent='';sp.style.color='';}};
  if(!el.value||valido){limpa();return;}
  el.classList.add('is-invalid');
  if(sp){sp.textContent=msgErr;sp.style.color='var(--cmg-danger-500)';}
}
function onEmail(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarEmail(el.value),'e-mail inválido');}
function onTel(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarTelefone(el.value),'telefone inválido');}
function maskCelular(el){
  const d=el.value.replace(/\D/g,'').slice(0,11);
  const ddd=d.slice(0,2), rest=d.slice(2);
  let out=d.length?'('+ddd:'';
  if(d.length>=2) out+=') ';
  if(rest.length<=4) out+=rest;
  else if(d.length<=10) out+=rest.slice(0,4)+'-'+rest.slice(4);
  else out+=rest.slice(0,5)+'-'+rest.slice(5,9);
  el.value=out;
}

/* ===== Lotes por área ===== */
function recalcLotes(){
  const a=parseInt($('[data-k=lote_400]').value)||0;
  const b=parseInt($('[data-k=lote_400_600]').value)||0;
  const c=parseInt($('[data-k=lote_600]').value)||0;
  state.lote_400=a; state.lote_400_600=b; state.lote_600=c;
  $('#loteTotal').textContent=fmt(a+b+c);
}

/* ===== Alerta (banner canônico .cmg-aviso do shared.css) ===== */
function alertHTML(tipo,msg){
  const mod = tipo==='err' ? ' cmg-aviso--error' : tipo==='warn' ? ' cmg-aviso--warn' : '';
  return `<div class="cmg-aviso${mod}"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">${msg}</p></div>`;
}

/* ===== Aviso contextual: solicitação pelo Poder Público =====
   Migrado da orientação "Ato administrativo municipal": quando o solicitante é
   o Poder Público (Prefeitura), é obrigatório anexar o ato administrativo. */
function onSolicitante(){
  const el=$('[data-k="tipoSolicitante"]');
  const box=$('#solicitanteAviso');
  if(!el||!box)return;
  const poderPublico=/Poder P[úu]blico/i.test(el.value||'');
  box.innerHTML=poderPublico?alertHTML('warn','Solicitação pelo Poder Público: anexe o ato administrativo municipal (lei, decreto ou instrumento equivalente) que autoriza o empreendimento.'):'';
  box.style.display=poderPublico?'':'none';
}

/* ===== Prévia — padrão Figma do BT (previa-* do shared.css): seções
   tituladas em verde, campos rótulo+valor em grade de 2 colunas e lápis
   que volta à etapa correspondente (mesmo markup dos componentes
   PreviaSecao/PreviaCampo do bt/js/components.js). ===== */
function pvCampo(label,valor,opts){
  opts=opts||{};
  const vazio=(valor==null||valor==='');
  const lapis=opts.step!=null
    ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="goTo(${opts.step})"></button>`
    : '';
  return `<div class="previa-campo${opts.full?' previa-campo--full':''}">`+
    `<div class="previa-campo-label">${label}</div>`+
    `<div class="previa-campo-valor">${vazio?'—':valor}${lapis}</div></div>`;
}
function pvSecao(titulo,campos){
  return `<div class="previa-secao"><h4 class="previa-secao-titulo">${titulo}</h4>`+
    `<div class="previa-grid">${campos}</div></div>`;
}
const PV_DIVISOR='<hr class="previa-divider"/>';
function fmtData(iso){
  if(!iso) return '';
  const [a,m,d]=String(iso).split('-');
  return (a&&m&&d)?`${d}/${m}/${a}`:iso;
}
function renderPreview(){
  const totalLotes=(parseInt(state.lote_400)||0)+(parseInt(state.lote_400_600)||0)+(parseInt(state.lote_600)||0);
  const secoes=[
    pvSecao('Dados para contato',
      pvCampo('Nome completo',state.nome,{full:true,step:1})+
      pvCampo('E-mail',state.email,{step:1})+
      pvCampo('Celular',state.celular,{step:1})),
    pvSecao('Dados do Empreendimento',
      pvCampo('Cliente / Razão Social do empreendimento',state.cliente,{full:true,step:2})+
      pvCampo('Município',state.municipio,{step:2})+
      pvCampo('Estado',state.estado,{step:2})+
      pvCampo('Área do empreendimento',state.area,{step:2})+
      pvCampo('Tipo de solicitante',state.tipoSolicitante,{step:2})+
      pvCampo('Tipo de empreendimento',state.tipo,{step:2})+
      pvCampo('Data de entrada de carga ou inauguração',fmtData(state.dataEntrada),{step:2})),
    pvSecao('Localização',
      pvCampo('Coordenadas',[state.latitude,state.longitude].filter(Boolean).join(' , '),{step:2})+
      pvCampo('Coordenada UTM',state.utm,{step:2})),
    pvSecao('Quantidade de lotes por área',
      pvCampo('Até 400m²',state.lote_400,{step:3})+
      pvCampo('De 401 a 600m²',state.lote_400_600,{step:3})+
      pvCampo('Acima de 600m²',state.lote_600,{step:3})+
      pvCampo('Total de lotes',totalLotes)),
    pvSecao('Declaração',
      pvCampo('Declaração firmada',state.declaracao?'Sim':'Não',{step:4})),
    pvSecao('Observações',
      pvCampo('Observações',state.observacoes,{full:true,step:5})),
  ];
  $('#previewContent').innerHTML=secoes.join(PV_DIVISOR);
}
function exportarPDF(){
  // Trava: só exporta quando os obrigatórios visíveis estão preenchidos.
  if(window.CemigMarcadores){
    const r=window.CemigMarcadores.validar(document);
    if(!r.ok){ if(r.primeiro) r.primeiro.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  }
  // Restrição ambiental sem aceite: volta à etapa do mapa e destaca o checkbox.
  if(!window.loteRestricaoOk()){
    goTo(2,true);
    const chk=$('#restricaoAceite');
    if(chk) setTimeout(()=>chk.scrollIntoView({behavior:'smooth',block:'center'}),150);
    return;
  }
  renderPreview(); window.print();
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded',()=>{
  bindInputs();
  montarToggle('area');
  renderLicencaAmbiental(); // aviso da licença sempre visível abaixo do mapa
  // Semeia o estado com os valores pré-preenchidos no HTML (ex.: Estado=MG,
  // Área=Urbana), para que apareçam na prévia mesmo sem edição do usuário.
  $$('[data-k]').forEach(el=>{
    if(el.type!=='checkbox' && el.value) state[el.dataset.k]=el.value;
  });
  // Stepper lateral clicável: navegação LIVRE (não bloqueia por obrigatórios).
  $$('.vstep').forEach((s,i)=>s.addEventListener('click',()=>goTo(i,true)));
  if(window.CemigMarcadores) window.CemigMarcadores.montarNavReativa();
});
