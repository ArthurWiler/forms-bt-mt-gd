// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Views (seções do formulário)
// ============================================================

// ---------- Seção 1: Identificação ----------
function ViewIdentificacao({ ctx }) {
  const { d, set, cnpjStatus, buscarCnpj, cepStatus, buscarCep } = ctx;
  return (
    <Card eyebrow="Seção 1" title="Identificação da Unidade Consumidora">
      <div className="grid">
        <Field label="Número da instalação" req>
          <Inp value={d.instalacao} onChange={(e) => set({ instalacao: e.target.value.replace(/\D/g, "") })} placeholder="Nº da instalação CEMIG" />
        </Field>
        <Field label="Titular da Unidade Consumidora" req span={2}>
          <Inp value={d.titular} onChange={(e) => set({ titular: e.target.value })} />
        </Field>
        <Field label="Grupo" req>
          <Sel value={d.grupo} onChange={(e) => set({ grupo: e.target.value })}>
            {GD_GRUPOS.map((g) => (<option key={g} value={g}>{g}</option>))}
          </Sel>
        </Field>
        <Field label="Classe" req>
          <Sel value={d.classe} onChange={(e) => set({ classe: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_CLASSES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </Sel>
        </Field>
        <Field label="CPF/CNPJ" req hint={cnpjStatus}>
          <Inp value={d.cpfCnpj} onChange={(e) => {
            const v = mascararCpfCnpj(e.target.value); set({ cpfCnpj: v });
            if (ehCNPJ(v) && soDigitos(v).length === 14) buscarCnpj(v);
          }} placeholder="Somente números" />
        </Field>
        <Field label="Logradouro" req span={2}>
          <Inp value={d.logradouro} onChange={(e) => set({ logradouro: e.target.value })} />
        </Field>
        <Field label="Número" req>
          <Inp value={d.numero} onChange={(e) => set({ numero: e.target.value })} />
        </Field>
        <Field label="Complemento">
          <Inp value={d.complemento} onChange={(e) => set({ complemento: e.target.value })} />
        </Field>
        <Field label="Bairro" req>
          <Inp value={d.bairro} onChange={(e) => set({ bairro: e.target.value })} />
        </Field>
        <Field label="Município" req>
          <Inp value={d.municipio} onChange={(e) => set({ municipio: e.target.value })} />
        </Field>
        <Field label="Estado" req>
          <Sel value={d.estado} onChange={(e) => set({ estado: e.target.value })}><option value="MG">MG</option></Sel>
        </Field>
        <Field label="CEP" req hint={cepStatus}>
          <Inp value={d.cep} onChange={(e) => {
            const v = mascararCEP(e.target.value); set({ cep: v });
            if (soDigitos(v).length === 8) buscarCep(v);
          }} />
        </Field>
        <Field label="Telefone">
          <Inp value={d.telefone} onChange={(e) => set({ telefone: mascararFixo(e.target.value) })} />
        </Field>
        <Field label="Celular" req>
          <Inp value={d.celular} onChange={(e) => set({ celular: mascararCelular(e.target.value) })} />
        </Field>
        <Field label="E-mail" req>
          <Inp value={d.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

// ---------- Seção 2: Dados da UC ----------
function ViewDadosUC({ ctx }) {
  const { d, set } = ctx;
  const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
  const potTrafos = d.tipoSE ? GD_TRAFO_POR_SE[d.tipoSE] || [] : [];
  const setTrafo = (i, patch) => set({ trafos: d.trafos.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const addTrafo = () => set({ trafos: [...d.trafos, { se: d.tipoSE, qte: "", potencia: "" }] });
  const delTrafo = (i) => set({ trafos: d.trafos.filter((_, k) => k !== i) });
  return (
    <Card eyebrow="Seção 2" title="Dados da Unidade Consumidora">
      <div className="grid">
        <Field label="Fuso" req>
          <Sel value={d.fuso} onChange={(e) => set({ fuso: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_FUSOS.map((f) => (<option key={f} value={f}>{f}</option>))}
          </Sel>
        </Field>
        <Field label="E (Abscissa)" req hint={!utm.ok ? utm.msg : ""}>
          <Inp value={d.utmE} onChange={(e) => set({ utmE: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="N (Ordenada)" req hint={!utm.ok && d.utmN ? utm.msg : ""}>
          <Inp value={d.utmN} onChange={(e) => set({ utmN: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Tipo de Subestação (ND 5.3)">
          <Sel value={d.tipoSE} onChange={(e) => set({ tipoSE: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_TIPOS_SE.map((s) => (<option key={s} value={s}>{s}</option>))}
          </Sel>
        </Field>
        <Field label="Tipo de Ligação do Transformador">
          <Sel value={d.tipoLigTrafo} onChange={(e) => set({ tipoLigTrafo: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_TIPO_LIG_TRAFO.map((s) => (<option key={s} value={s}>{s}</option>))}
          </Sel>
        </Field>
        <Field label="Impedância Percentual do Transformador (%)" req>
          <Inp value={d.impedanciaTrafo} onChange={(e) => set({ impedanciaTrafo: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
      </div>

      {d.tipoSE && (
        <div className="subbox" style={{ marginTop: 12 }}>
          <div className="motores-head">
            <span className="subbox-title">Transformadores (Qte × Potência)</span>
            <Btn variant="primary" onClick={addTrafo}>+ Trafo</Btn>
          </div>
          <table className="motores-table">
            <thead><tr><th>Qte</th><th>Potência (kVA)</th><th></th></tr></thead>
            <tbody>
              {d.trafos.map((t, i) => (
                <tr key={i}>
                  <td><input type="number" min="0" value={t.qte} onChange={(e) => setTrafo(i, { qte: e.target.value })} style={{ width: 70 }} /></td>
                  <td>
                    <select value={t.potencia} onChange={(e) => setTrafo(i, { potencia: e.target.value })}>
                      <option value="">Selecionar</option>
                      {potTrafos.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </td>
                  <td>{d.trafos.length > 1 && (<button type="button" className="motor-del" onClick={() => delTrafo(i)}>✕</button>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid" style={{ marginTop: 12 }}>
        <Field label="Potência do Grupo Motor Gerador de Emergência em Paralelo (kVA)" span={2}>
          <Inp value={d.geradorPotencia} onChange={(e) => set({ geradorPotencia: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Tensão de Atendimento (V)">
          <Sel value={d.tensaoAtendimento} onChange={(e) => set({ tensaoAtendimento: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_TENSAO_A.map((t) => (<option key={t} value={t}>{t}</option>))}
          </Sel>
        </Field>
        <Field label="Entrada de Energia">
          <Sel value={d.entradaEnergia} onChange={(e) => set({ entradaEnergia: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_ENTRADA_ENERGIA.map((s) => (<option key={s} value={s}>{s}</option>))}
          </Sel>
        </Field>
        <Field label="Tipo de Solicitação" req span={3} hint="Para fonte diferente da original, deverá ser realizada solicitação de ligação nova.">
          <Sel value={d.solicitacao} onChange={(e) => set({ solicitacao: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_SOLICITACOES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </Sel>
        </Field>
        <Field label="Demanda a ser contratada de geração (kW)">
          <Inp value={d.demandaGeracao} onChange={(e) => set({ demandaGeracao: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Demanda a ser contratada de consumo (kW)" req hint="Não incluir potência de trafos, inversores ou placas">
          <Inp value={d.demandaConsumo} onChange={(e) => set({ demandaConsumo: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label='O empreendimento será "Grid Zero"?'>
          <Toggle value={d.gridZero} onChange={(v) => set({ gridZero: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
        <Field label="O telhado será arrendado para pessoa/empresa diferente do proprietário?" span={3}>
          <Toggle value={d.telhadoArrendado} onChange={(v) => set({ telhadoArrendado: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
        {d.telhadoArrendado === "Sim" && (
          <Field label="As 2 instalações foram representadas no DUB e memorial descritivo?" span={3}>
            <Toggle value={d.duasInstalacoesDUB} onChange={(v) => set({ duasInstalacoesDUB: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
          </Field>
        )}
        <Field label="Número da instalação existente no local" span={2}>
          <Inp value={d.instExistente} onChange={(e) => set({ instExistente: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="A instalação existente é atendida em BT ou MT?">
          <Sel value={d.instExistenteBTMT} onChange={(e) => set({ instExistenteBTMT: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_BT_MT.map((s) => (<option key={s} value={s}>{s}</option>))}
          </Sel>
        </Field>
      </div>
    </Card>
  );
}

// ---------- Seção 3: Documentação ----------
function ViewDocumentacao({ ctx }) {
  const { d, set } = ctx;
  const setDoc = (id, v) => set({ docs: { ...d.docs, [id]: v } });
  return (
    <Card eyebrow="Seção 3" title="Documentação da UC a anexar (Nova UC ou Alteração de Potência)">
      <p className="card-sub">Marque os documentos que serão anexados. Itens "Caso aplicável" só quando pertinentes.</p>
      <div className="doc-list">
        {GD_DOCUMENTOS.map((doc) => (
          <label key={doc.id} className="doc-item">
            <input type="checkbox" checked={!!d.docs[doc.id]} onChange={(e) => setDoc(doc.id, e.target.checked)} />
            <span className="doc-text"><strong>{doc.id}</strong> {doc.txt}{doc.req && <span className="doc-req"> (obrigatório)</span>}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

// ---------- Seção 4: Dados da Geração (múltiplas fontes) ----------
function ViewGeracao({ ctx }) {
  const { d, set } = ctx;
  const setFonte = (i, patch) => set({ fontes: d.fontes.map((f, k) => (k === i ? { ...f, ...patch } : f)) });
  const ajustarQtd = (q) => {
    q = parseInt(q) || 1;
    const arr = [...d.fontes];
    while (arr.length < q) arr.push(gdFontePadrao());
    while (arr.length > q) arr.pop();
    set({ qtdFontes: q, fontes: arr });
  };
  return (
    <Card eyebrow="Seção 4" title="Dados da Geração">
      <div className="grid">
        <Field label="Quantidade de fontes de geração" req>
          <Sel value={d.qtdFontes} onChange={(e) => ajustarQtd(e.target.value)}>
            {GD_QTD_FONTES.map((q) => (<option key={q} value={q}>{q}</option>))}
          </Sel>
        </Field>
        <Field label="Potência Ativa Instalada Total de Geração (kW)" req span={2}>
          <Inp value={d.potAtivaInstalada} onChange={(e) => set({ potAtivaInstalada: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Modalidade de compensação" req span={2}>
          <Sel value={d.modalidade} onChange={(e) => set({ modalidade: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_MODALIDADES.map((m) => (<option key={m} value={m}>{m}</option>))}
          </Sel>
        </Field>
        <Field label="Qtde. de Instalações a receber o crédito">
          <Inp value={d.qtdInstalacoesCredito} onChange={(e) => set({ qtdInstalacoesCredito: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Anexou contrato de constituição? (consórcio/cooperativa)" span={3}>
          <Toggle value={d.anexouContrato} onChange={(v) => set({ anexouContrato: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
      </div>

      {d.fontes.map((f, i) => {
        const ehFV = f.fontePrimaria === "Solar";
        const potMod = ((parseFloat(f.qtdModulos) || 0) * 0); // potência total informada manualmente abaixo
        return (
          <React.Fragment key={i}>
            <div className="gd-subhead">4.{i + 1} — Dados da Fonte de Geração {i + 1}</div>
            <div className="grid">
              <Field label="Tipo de Fonte Primária" req>
                <Sel value={f.fontePrimaria} onChange={(e) => setFonte(i, { fontePrimaria: e.target.value })}>
                  {GD_FONTES.map((o) => (<option key={o} value={o}>{o}</option>))}
                </Sel>
              </Field>
              <Field label="Potência Geração {i+1} (kW)" req>
                <Inp value={f.potencia} onChange={(e) => setFonte(i, { potencia: e.target.value.replace(/[^\d.]/g, "") })} />
              </Field>
              <Field label="Tipo de geração" req>
                <Sel value={f.tipoGeracao} onChange={(e) => setFonte(i, { tipoGeracao: e.target.value })}>
                  {GD_TIPO_GERACAO.map((t) => (<option key={t} value={t}>{t}</option>))}
                </Sel>
              </Field>
              {f.tipoGeracao === "Outra (especificar):" && (
                <Field label="Especificar" span={3}>
                  <Inp value={f.tipoGeracaoOutro} onChange={(e) => setFonte(i, { tipoGeracaoOutro: e.target.value })} />
                </Field>
              )}
            </div>
            {ehFV && (
              <div className="grid">
                <Field label="Potência Total Módulos (kW)">
                  <Inp value={f.potTotalModulos} onChange={(e) => setFonte(i, { potTotalModulos: e.target.value.replace(/[^\d.]/g, "") })} />
                </Field>
                <Field label="Potência Total Inversores (kW)">
                  <Inp value={f.potTotalInversores} onChange={(e) => setFonte(i, { potTotalInversores: e.target.value.replace(/[^\d.]/g, "") })} />
                </Field>
                <Field label="Área dos Arranjos (m²)">
                  <Inp value={f.areaArranjos} onChange={(e) => setFonte(i, { areaArranjos: e.target.value.replace(/[^\d.]/g, "") })} />
                </Field>
                <Field label="Quantidade de Módulos">
                  <Inp value={f.qtdModulos} onChange={(e) => setFonte(i, { qtdModulos: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Modelo dos Módulos">
                  <Inp value={f.modeloModulos} onChange={(e) => setFonte(i, { modeloModulos: e.target.value })} />
                </Field>
                <Field label="Fabricante dos Módulos">
                  <Inp value={f.fabricanteModulos} onChange={(e) => setFonte(i, { fabricanteModulos: e.target.value })} />
                </Field>
                <Field label="Quantidade de Inversores">
                  <Inp value={f.qtdInversores} onChange={(e) => setFonte(i, { qtdInversores: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Modelo dos Inversores" hint="Para mais de 1 modelo, separar com barra (/)">
                  <Inp value={f.modeloInversores} onChange={(e) => setFonte(i, { modeloInversores: e.target.value })} />
                </Field>
                <Field label="Fabricante dos Inversores">
                  <Inp value={f.fabricanteInversores} onChange={(e) => setFonte(i, { fabricanteInversores: e.target.value })} />
                </Field>
              </div>
            )}
            <div className="grid">
              <Field label="CEG do empreendimento (se houver outorga)" span={2}>
                <Inp value={f.ceg} onChange={(e) => setFonte(i, { ceg: e.target.value })} />
              </Field>
              <Field label="Nº do Ato de Outorga/Registro">
                <Inp value={f.numAtoOutorga} onChange={(e) => setFonte(i, { numAtoOutorga: e.target.value })} />
              </Field>
              <Field label="Nome da Usina" span={2}>
                <Inp value={f.nomeUsina} onChange={(e) => setFonte(i, { nomeUsina: e.target.value })} />
              </Field>
              <Field label="Ano do Ato">
                <Inp value={f.anoAtoOutorga} onChange={(e) => setFonte(i, { anoAtoOutorga: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="Tipo do Ato de Outorga/Registro" span={3}>
                <Inp value={f.tipoAtoOutorga} onChange={(e) => setFonte(i, { tipoAtoOutorga: e.target.value })} />
              </Field>
            </div>
          </React.Fragment>
        );
      })}
    </Card>
  );
}

// ---------- Seção 5: Armazenamento ----------
function ViewArmazenamento({ ctx }) {
  const { d, set } = ctx;
  const sim = d.possuiArmazenamento === "Sim";
  return (
    <Card eyebrow="Seção 5" title="Sistema de Armazenamento de Energia">
      <div className="grid">
        <Field label="Possui sistema de armazenamento de energia?" span={3}>
          <Toggle value={d.possuiArmazenamento} onChange={(v) => set({ possuiArmazenamento: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
        {sim && (
          <React.Fragment>
            <Field label="Operação ilhada?" span={3}>
              <Toggle value={d.armOperacaoIlhada} onChange={(v) => set({ armOperacaoIlhada: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
            </Field>
            {d.armOperacaoIlhada === "Sim" && (
              <React.Fragment>
                <Field label="Chave de desconexão física?"><Toggle value={d.armChaveDesconexao} onChange={(v) => set({ armChaveDesconexao: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} /></Field>
                <Field label="Reconexão automática?"><Toggle value={d.armReconexaoAuto} onChange={(v) => set({ armReconexaoAuto: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} /></Field>
              </React.Fragment>
            )}
            <Field label="Capacidade do banco (kWh)"><Inp value={d.armCapacidadeKwh} onChange={(e) => set({ armCapacidadeKwh: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
            <Field label="Potência total do banco (kW)"><Inp value={d.armPotenciaKw} onChange={(e) => set({ armPotenciaKw: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
            <Field label="Capacidade nominal (Ah)"><Inp value={d.armCapacidadeAh} onChange={(e) => set({ armCapacidadeAh: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
            <Field label="Tensão CC (V)"><Inp value={d.armTensaoCC} onChange={(e) => set({ armTensaoCC: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
            <Field label="Profundidade de descarga (%)"><Inp value={d.armProfundidadeDescarga} onChange={(e) => set({ armProfundidadeDescarga: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
            <Field label="Produção mensal (kWh)"><Inp value={d.armProducaoMensal} onChange={(e) => set({ armProducaoMensal: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
          </React.Fragment>
        )}
      </div>
    </Card>
  );
}

// ---------- Seções 6, 7, 8, 9 ----------
function ViewDeclaracoes({ ctx }) {
  const { d, set } = ctx;
  const setDocTec = (id, v) => set({ docsTec: { ...d.docsTec, [id]: v } });
  const exigeGFC = (parseFloat(d.potAtivaInstalada) || 0) > GD_GFC_LIMITE_KW;
  return (
    <Card eyebrow="Seções 6 a 9" title="Garantia, documentação técnica, declarações e solicitante">
      <div className="gd-subhead">6 — Garantia de Fiel Cumprimento</div>
      <div className="gd-info-box">
        Para minigeração com potência instalada superior a 500 kW, é necessário apresentar a garantia de fiel cumprimento (art. 655-C da REN nº 1.000/2021).
      </div>
      {exigeGFC && (
        <div className="grid" style={{ marginTop: 10 }}>
          <Field label="Garantia de Fiel Cumprimento (R$ ou descrição)" span={3}>
            <Inp value={d.gfcValor} onChange={(e) => set({ gfcValor: e.target.value })} />
          </Field>
        </div>
      )}

      <div className="gd-subhead">7 — Documentação Técnica (obrigatória)</div>
      <div className="doc-list">
        {GD_DOCS_TEC.map((dc) => (
          <label key={dc.id} className="doc-item">
            <input type="checkbox" checked={!!d.docsTec[dc.id]} onChange={(e) => setDocTec(dc.id, e.target.checked)} />
            <span className="doc-text"><strong>{dc.id}</strong> {dc.txt}{dc.req && <span className="doc-req"> (obrigatório)</span>}</span>
          </label>
        ))}
      </div>

      <div className="gd-subhead">8 — Contato na Distribuidora</div>
      <div className="gd-info-box">
        <div><strong>{GD_CONTATO_CEMIG.responsavel}</strong></div>
        <div>{GD_CONTATO_CEMIG.endereco}</div>
        <div>Telefone: {GD_CONTATO_CEMIG.telefone} · E-mail: {GD_CONTATO_CEMIG.email}</div>
      </div>

      <div className="gd-subhead">9 — Solicitações e Declarações</div>
      <div className="grid">
        <Field label="9.1 - O padrão está pronto para ser ligado e a usina está instalada?" span={3} hint="Se 'Não', solicite vistoria/ligação em até 120 dias após o orçamento de conexão.">
          <Toggle value={d.decl81} onChange={(v) => set({ decl81: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
      </div>
      <div className="doc-list" style={{ marginTop: 10 }}>
        <label className="doc-item"><input type="checkbox" checked={d.decl82} onChange={(e) => set({ decl82: e.target.checked })} /><span className="doc-text"><strong>9.2</strong> Renuncio ao direito de desistir do orçamento de conexão. (Opcional)</span></label>
        <label className="doc-item"><input type="checkbox" checked={d.decl83} onChange={(e) => set({ decl83: e.target.checked })} /><span className="doc-text"><strong>9.3</strong> Autorizo a entrega dos contratos e meio de pagamento junto ao orçamento. (Opcional)</span></label>
        <label className="doc-item"><input type="checkbox" checked={d.decl84} onChange={(e) => set({ decl84: e.target.checked })} /><span className="doc-text"><strong>9.4</strong> Declaro conformidade das instalações com normas da distribuidora, ABNT e órgãos oficiais. <span className="doc-req">(Obrigatório)</span></span></label>
        <label className="doc-item"><input type="checkbox" checked={d.decl86} onChange={(e) => set({ decl86: e.target.checked })} /><span className="doc-text"><strong>9.6</strong> Declaro que todas as informações são verdadeiras. <span className="doc-req">(Obrigatório)</span></span></label>
      </div>

      <div className="gd-subhead">10 — Solicitante</div>
      <div className="grid">
        <Field label="Nome do Consumidor ou Procurador Legal" req span={3}><Inp value={d.solicitanteNome} onChange={(e) => set({ solicitanteNome: e.target.value })} /></Field>
        <Field label="Endereço de Correspondência" req span={3}><Inp value={d.solicitanteEndereco} onChange={(e) => set({ solicitanteEndereco: e.target.value })} /></Field>
        <Field label="Telefone"><Inp value={d.solicitanteTelefone} onChange={(e) => set({ solicitanteTelefone: mascararFixo(e.target.value) })} /></Field>
        <Field label="Celular" req><Inp value={d.solicitanteCelular} onChange={(e) => set({ solicitanteCelular: mascararCelular(e.target.value) })} /></Field>
        <Field label="E-mail" req><Inp value={d.solicitanteEmail} onChange={(e) => set({ solicitanteEmail: e.target.value })} /></Field>
        <Field label="Observações" span={3}><textarea className="ta" value={d.obs} onChange={(e) => set({ obs: e.target.value })} rows={3} /></Field>
      </div>
    </Card>
  );
}

// ---------- Revisão ----------
function ViewRevisao({ ctx }) {
  const { d, validacao, gerarPdf } = ctx;
  const row = (label, val) => (<div className="rev-row"><span className="rev-label">{label}</span><span className="rev-val">{val || "—"}</span></div>);
  return (
    <Card eyebrow="Revisão" title="Prévia & PDF">
      {!validacao.ok ? (
        <div className="rev-faltas"><strong>Preencha os campos obrigatórios antes de exportar:</strong><ul>{validacao.faltas.map((f) => (<li key={f}>{f}</li>))}</ul></div>
      ) : (
        <div className="rev-ok">Todos os campos obrigatórios preenchidos. Pronto para exportar.</div>
      )}
      <div className="gd-subhead">1 — Identificação</div>
      {row("Instalação", d.instalacao)}
      {row("Titular", d.titular)}
      {row("Grupo / Classe", `${d.grupo} / ${d.classe}`)}
      {row("Endereço", `${d.logradouro}, ${d.numero} — ${d.bairro}, ${d.municipio}/${d.estado}`)}
      <div className="gd-subhead">2 — Dados da UC</div>
      {row("UTM", `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`)}
      {row("Solicitação", d.solicitacao)}
      {row("Trafo (ligação/impedância)", `${d.tipoLigTrafo || "—"} · ${d.impedanciaTrafo || "—"}%`)}
      {row("Demanda consumo / geração (kW)", `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`)}
      <div className="gd-subhead">4 — Geração</div>
      {row("Qtd. fontes", d.qtdFontes)}
      {row("Pot. Ativa Instalada (kW)", d.potAtivaInstalada)}
      {row("Modalidade", d.modalidade)}
      <div className="gd-subhead">10 — Solicitante</div>
      {row("Nome", d.solicitanteNome)}
      {row("Contato", `${d.solicitanteCelular || "—"} · ${d.solicitanteEmail || "—"}`)}
      <div style={{ marginTop: 16 }}>
        <Btn variant="dark" onClick={gerarPdf} disabled={!validacao.ok}>📄 Exportar PDF</Btn>
      </div>
    </Card>
  );
}
