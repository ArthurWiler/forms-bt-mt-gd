// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Views (seções do formulário)
// Cada seção recebe um ctx único com estado e setters.
// ============================================================

// ---------- Seção 1: Identificação da UC (schema-driven) ----------
// Schema = fonte única: renderização, validação de obrigatórios e PDF derivam daqui.
const GD_SCHEMA_IDENTIFICACAO = [
  {
    k: "instalacao",
    label: "Número da instalação",
    req: true,
    placeholder: "Nº da instalação CEMIG",
    // dígitos apenas (equivale a replace(/\D/g,""))
    mask: "soDigitos",
  },
  {
    k: "fastTrack",
    label: 'Enquadramento no inciso III do art. 73-A ("FAST TRACK")?',
    type: "toggle",
    options: GD_SN,
    pdf: false,
  },
  {
    k: "fastRegra",
    label: "Regra de enquadramento (art. 73-A)",
    type: "select",
    span: 3,
    options: GD_FAST_REGRAS,
    show: (d) => d.fastTrack === "Sim",
  },
  {
    k: "gridZero",
    label: 'O empreendimento será "Grid Zero"?',
    type: "toggle",
    options: GD_SN,
    pdf: false,
  },
  { k: "titular", label: "Titular da Unidade Consumidora", req: true, span: 3 },
  {
    k: "grupo",
    label: "Grupo",
    req: true,
    type: "select",
    placeholder: false,
    options: GD_GRUPOS,
  },
  { k: "classe", label: "Classe", req: true, type: "select", options: GD_CLASSES },
  {
    k: "cpfCnpj",
    label: "CPF/CNPJ",
    req: true,
    hintKey: "cnpjStatus",
    placeholder: "Somente números",
    mask: "mascararCpfCnpj",
    onInput: (v, ctx) => {
      if (ehCNPJ(v) && soDigitos(v).length === 14) ctx.buscarCnpj(v);
    },
  },
  { k: "logradouro", label: "Logradouro", req: true, span: 2 },
  { k: "numero", label: "Número", req: true },
  { k: "complemento", label: "Complemento" },
  { k: "bairro", label: "Bairro", req: true },
  { k: "municipio", label: "Município", req: true },
  {
    k: "estado",
    label: "Estado",
    req: true,
    type: "select",
    placeholder: false,
    options: ["MG"],
  },
  {
    k: "cep",
    label: "CEP",
    req: true,
    hintKey: "cepStatus",
    mask: "mascararCEP",
    onInput: (v, ctx) => {
      if (soDigitos(v).length === 8) ctx.buscarCep(v);
    },
  },
  { k: "telefone", label: "Telefone", mask: "mascararFixo" },
  { k: "celular", label: "Celular", req: true, mask: "mascararCelular" },
  { k: "email", label: "E-mail", req: true },
];

function ViewIdentificacao({ ctx }) {
  return (
    <Card eyebrow="Seção 1" title="Identificação da Unidade Consumidora">
      <div className="grid">
        <CamposSchema schema={GD_SCHEMA_IDENTIFICACAO} ctx={ctx} />
      </div>
    </Card>
  );
}

// ---------- Placeholders das próximas seções (preenchidas incrementalmente) ----------
function ViewDadosUC({ ctx }) {
  const { d, set } = ctx;
  const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
  const potTrafos = d.tipoSE ? GD_TRAFO_POR_SE[d.tipoSE] || [] : [];
  const setTrafo = (i, patch) =>
    set({ trafos: d.trafos.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const addTrafo = () => set({ trafos: [...d.trafos, { se: d.tipoSE, qte: "", potencia: "" }] });
  const delTrafo = (i) => set({ trafos: d.trafos.filter((_, k) => k !== i) });
  const semAlteracao = d.solicitacao && d.solicitacao.indexOf("SEM Alteração") >= 0;
  const fasesDisj = semAlteracao ? GD_DISJ_FASES_ALT : GD_DISJ_FASES;
  const correntesDisj = d.disjGeralFase
    ? GD_DISJ_REVISADA.filter((x) => x.tipo === d.disjGeralFase).map((x) => x.a)
    : [];
  const limiteInj = gdLimiteInjecao(d.disjGeralFase, d.disjGeralA, false);

  return (
    <Card eyebrow="Seção 2" title="Dados da Unidade Consumidora">
      <div className="grid">
        {/* Coordenadas UTM */}
        <Field label="Fuso" req hint="Faixa de coordenadas conforme o fuso">
          <Sel value={d.fuso} onChange={(e) => set({ fuso: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_FUSOS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Sel>
        </Field>
        <Field label="E (Abscissa)" req hint={!utm.ok ? utm.msg : ""}>
          <Inp value={d.utmE} onChange={(e) => set({ utmE: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Coordenada Leste" />
        </Field>
        <Field label="N (Ordenada)" req hint={!utm.ok && d.utmN ? utm.msg : ""}>
          <Inp value={d.utmN} onChange={(e) => set({ utmN: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Coordenada Norte" />
        </Field>

        {/* Gerador de emergência */}
        <Field label="Possui Grupo Motor Gerador de Emergência em Paralelo com a Cemig (Diesel/Gás)?" span={d.geradorEmergencia === "Sim" ? 2 : 3}>
          <Toggle value={d.geradorEmergencia} onChange={(v) => set({ geradorEmergencia: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
        {d.geradorEmergencia === "Sim" && (
          <Field label="Potência (kVA)" req>
            <Inp value={d.geradorPotencia} onChange={(e) => set({ geradorPotencia: e.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
        )}

        {/* Tipo de SE + trafos */}
        <Field label="Tipo de Subestação (Conforme ND 5.3)">
          <Sel value={d.tipoSE} onChange={(e) => set({ tipoSE: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_TIPOS_SE.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>
      </div>

      {d.tipoSE && (
        <div className="subbox" style={{ marginTop: 12 }}>
          <div className="motores-head">
            <span className="subbox-title">Transformadores (Qte × Potência)</span>
            <Btn variant="primary" onClick={addTrafo}>+ Trafo</Btn>
          </div>
          <table className="motores-table">
            <thead>
              <tr><th>Qte</th><th>Potência (kVA)</th><th></th></tr>
            </thead>
            <tbody>
              {d.trafos.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input type="number" min="0" value={t.qte}
                      onChange={(e) => setTrafo(i, { qte: e.target.value })} style={{ width: 70 }} />
                  </td>
                  <td>
                    <select value={t.potencia} onChange={(e) => setTrafo(i, { potencia: e.target.value })}>
                      <option value="">Selecionar</option>
                      {potTrafos.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {d.trafos.length > 1 && (
                      <button type="button" className="motor-del" onClick={() => delTrafo(i)}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid" style={{ marginTop: 12 }}>
        {/* Tipo de solicitação / edificação */}
        <Field label="Tipo de Solicitação" req span={3}>
          <Sel value={d.solicitacao} onChange={(e) => set({ solicitacao: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_SOLICITACOES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Tipo de edificação" req span={3}>
          <Sel value={d.edificacao} onChange={(e) => set({ edificacao: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_EDIFICACOES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>

        {/* Padrão de entrada */}
        <Field label="Tipo de Padrão de Entrada">
          <Sel value={d.edifTipo} onChange={(e) => set({ edifTipo: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_EDIF_TIPO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Tipo de Ramal">
          <Sel value={d.ramal} onChange={(e) => set({ ramal: e.target.value })}>
            {GD_RAMAL.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Disjuntor Individual Atual (A)">
          <Inp value={d.disjAtualA} onChange={(e) => set({ disjAtualA: e.target.value.replace(/\D/g, "") })} />
        </Field>

        {/* Disjuntor geral */}
        <Field label="Disjuntor Geral — Fase">
          <Sel value={d.disjGeralFase} onChange={(e) => set({ disjGeralFase: e.target.value, disjGeralA: "" })}>
            <option value="">Selecionar</option>
            {fasesDisj.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Disjuntor Geral — Corrente (A)" hint={limiteInj != null ? `Limite injeção: ${fmt2(limiteInj)} kW` : ""}>
          <Sel value={d.disjGeralA} onChange={(e) => set({ disjGeralA: e.target.value })}>
            <option value="">Selecionar</option>
            {correntesDisj.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Qte Disjuntor Geral">
          <Inp value={d.qteDisjGeral} onChange={(e) => set({ qteDisjGeral: e.target.value.replace(/\D/g, "") })} />
        </Field>

        <Field label="Tensão de Atendimento (V)">
          <Sel value={d.tensaoAtendimento} onChange={(e) => set({ tensaoAtendimento: e.target.value })}>
            <option value="">Selecionar</option>
            {(d.grupo === "A" ? GD_TENSAO_A : GD_TENSAO_B).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Haverá Mudança de Local do Padrão de Entrada?" span={2}>
          <Toggle value={d.mudancaLocal} onChange={(v) => set({ mudancaLocal: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>

        <Field label="O padrão a ser ligado está a menos de 30 m do poste da CEMIG?" span={3}>
          <Toggle value={d.distMenor30} onChange={(v) => set({ distMenor30: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>

        {/* Telhado arrendado */}
        <Field label="O telhado será arrendado para pessoa/empresa diferente do proprietário?" span={3}>
          <Toggle value={d.telhadoArrendado} onChange={(v) => set({ telhadoArrendado: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
        {d.telhadoArrendado === "Sim" && (
          <Field label="As 2 instalações (existente + telhado) foram representadas no DUB e memorial descritivo?" span={3} hint="É necessário representar as 2 instalações no DUB e memorial descritivo">
            <Toggle value={d.duasInstalacoesDUB} onChange={(v) => set({ duasInstalacoesDUB: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
          </Field>
        )}

        {/* Instalação existente */}
        <Field label="Número da instalação existente no local" span={2}>
          <Inp value={d.instExistente} onChange={(e) => set({ instExistente: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="A instalação existente é atendida em BT ou MT?">
          <Sel value={d.instExistenteBTMT} onChange={(e) => set({ instExistenteBTMT: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_BT_MT.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Sel>
        </Field>

        {/* Demandas */}
        <Field label="Demanda contratada de consumo (kW)" req hint="Potência em relação ao consumo da UC (não incluir trafos/inversores/placas)">
          <Inp value={d.demandaConsumo} onChange={(e) => set({ demandaConsumo: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Demanda contratada de geração (kW)">
          <Inp value={d.demandaGeracao} onChange={(e) => set({ demandaGeracao: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
      </div>
    </Card>
  );
}
function ViewDocumentacao({ ctx }) {
  const { d, set } = ctx;
  const setDoc = (id, v) => set({ docs: { ...d.docs, [id]: v } });
  return (
    <Card eyebrow="Seção 3" title="Documentação a anexar (Nova UC ou Alteração de Potência)">
      <p className="card-sub">
        Marque os documentos que serão anexados à solicitação. Itens "Caso aplicável" só quando pertinentes.
      </p>
      <div className="doc-list">
        {GD_DOCUMENTOS.map((doc) => (
          <label key={doc.id} className="doc-item">
            <input
              type="checkbox"
              checked={!!d.docs[doc.id]}
              onChange={(e) => setDoc(doc.id, e.target.checked)}
            />
            <span className="doc-text">
              <strong>{doc.id}</strong> {doc.txt}
              {doc.req && <span className="doc-req"> (obrigatório)</span>}
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
function ViewGeracao({ ctx }) {
  const { d, set } = ctx;
  const ehFV = d.fontePrimaria === "Solar";
  // potências totais automáticas (qtd × nominal)
  const potModulosCalc =
    (parseFloat(d.qtdModulos) || 0) * (parseFloat(d.potNominalModulo) || 0) / 1000; // W -> kW
  const potInversoresCalc =
    (parseFloat(d.qtdInversores) || 0) * (parseFloat(d.potNominalInversor) || 0); // kW

  return (
    <Card eyebrow="Seção 4" title="Dados da Geração">
      <div className="grid">
        <Field label="Tipo de Fonte Primária" req>
          <Sel value={d.fontePrimaria} onChange={(e) => set({ fontePrimaria: e.target.value })}>
            {GD_FONTES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Potência Ativa Instalada Total de Geração da Usina (kW)" req span={2}>
          <Inp value={d.potAtivaInstalada} onChange={(e) => set({ potAtivaInstalada: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>

        <Field label="Tipo de geração" req span={d.tipoGeracao === "Outra (especificar):" ? 1 : 2}>
          <Sel value={d.tipoGeracao} onChange={(e) => set({ tipoGeracao: e.target.value })}>
            {GD_TIPO_GERACAO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Sel>
        </Field>
        {d.tipoGeracao === "Outra (especificar):" && (
          <Field label="Especificar">
            <Inp value={d.tipoGeracaoOutro} onChange={(e) => set({ tipoGeracaoOutro: e.target.value })} />
          </Field>
        )}

        <Field label="Modalidade de compensação" req span={2}>
          <Sel value={d.modalidade} onChange={(e) => set({ modalidade: e.target.value })}>
            <option value="">Selecionar</option>
            {GD_MODALIDADES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Qtde. de Instalações a receber o crédito">
          <Inp value={d.qtdInstalacoesCredito} onChange={(e) => set({ qtdInstalacoesCredito: e.target.value.replace(/\D/g, "") })} />
        </Field>
      </div>

      {ehFV && (
        <React.Fragment>
          <div className="gd-subhead">Central Geradora Fotovoltaica — Módulos</div>
          <div className="grid">
            <Field label="Modelo dos Módulos">
              <Inp value={d.modeloModulos} onChange={(e) => set({ modeloModulos: e.target.value })} />
            </Field>
            <Field label="Fabricante dos Módulos">
              <Inp value={d.fabricanteModulos} onChange={(e) => set({ fabricanteModulos: e.target.value })} />
            </Field>
            <Field label="Potência Nominal Módulo (W)">
              <Inp value={d.potNominalModulo} onChange={(e) => set({ potNominalModulo: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Quantidade de Módulos">
              <Inp value={d.qtdModulos} onChange={(e) => set({ qtdModulos: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Potência Total Módulos (kW)" hint="Calculado: qtd × nominal">
              <Inp value={fmt2(potModulosCalc)} onChange={() => {}} />
            </Field>
            <Field label="Área dos Arranjos (m²)">
              <Inp value={d.areaArranjos} onChange={(e) => set({ areaArranjos: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
          </div>

          <div className="gd-subhead">Central Geradora Fotovoltaica — Inversores</div>
          <div className="grid">
            <Field label="Modelo dos Inversores" hint="Para mais de 1 modelo, separar com barra (/)">
              <Inp value={d.modeloInversores} onChange={(e) => set({ modeloInversores: e.target.value })} />
            </Field>
            <Field label="Fabricante dos Inversores">
              <Inp value={d.fabricanteInversores} onChange={(e) => set({ fabricanteInversores: e.target.value })} />
            </Field>
            <Field label="Potência Nominal Inversor (kW)">
              <Inp value={d.potNominalInversor} onChange={(e) => set({ potNominalInversor: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Quantidade de Inversores">
              <Inp value={d.qtdInversores} onChange={(e) => set({ qtdInversores: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Potência Total dos Inversores (kW)" hint="Calculado: qtd × nominal">
              <Inp value={fmt2(potInversoresCalc)} onChange={() => {}} />
            </Field>
            <Field label="Tensão de Conexão do Inversor (V)">
              <Inp value={d.tensaoConexaoInversor} onChange={(e) => set({ tensaoConexaoInversor: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
          </div>
        </React.Fragment>
      )}

      <div className="gd-subhead">Outorga ou Registro (preencher somente se aplicável)</div>
      <div className="grid">
        <Field label="CEG do empreendimento" span={2}>
          <Inp value={d.ceg} onChange={(e) => set({ ceg: e.target.value })} />
        </Field>
        <Field label="Número do Ato de Outorga ou Registro">
          <Inp value={d.numAtoOutorga} onChange={(e) => set({ numAtoOutorga: e.target.value })} />
        </Field>
        <Field label="Nome da Usina" span={2}>
          <Inp value={d.nomeUsina} onChange={(e) => set({ nomeUsina: e.target.value })} />
        </Field>
        <Field label="Ano do Ato de Outorga ou Registro">
          <Inp value={d.anoAtoOutorga} onChange={(e) => set({ anoAtoOutorga: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Tipo do Ato de Outorga ou Registro" span={3}>
          <Inp value={d.tipoAtoOutorga} onChange={(e) => set({ tipoAtoOutorga: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}
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
            <Field label="Sistema com possibilidade de operação ilhada?" span={3}>
              <Toggle value={d.armOperacaoIlhada} onChange={(v) => set({ armOperacaoIlhada: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
            </Field>
            {d.armOperacaoIlhada === "Sim" && (
              <React.Fragment>
                <Field label="Chave de desconexão física?">
                  <Toggle value={d.armChaveDesconexao} onChange={(v) => set({ armChaveDesconexao: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
                </Field>
                <Field label="Reconexão automática?">
                  <Toggle value={d.armReconexaoAuto} onChange={(v) => set({ armReconexaoAuto: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
                </Field>
              </React.Fragment>
            )}
            <Field label="Capacidade do banco de baterias (kWh)">
              <Inp value={d.armCapacidadeKwh} onChange={(e) => set({ armCapacidadeKwh: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Potência total do banco de baterias (kW)">
              <Inp value={d.armPotenciaKw} onChange={(e) => set({ armPotenciaKw: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Capacidade nominal do banco (Ah)">
              <Inp value={d.armCapacidadeAh} onChange={(e) => set({ armCapacidadeAh: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Tensão do banco em CC (V)">
              <Inp value={d.armTensaoCC} onChange={(e) => set({ armTensaoCC: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Profundidade de descarga (%)">
              <Inp value={d.armProfundidadeDescarga} onChange={(e) => set({ armProfundidadeDescarga: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
            <Field label="Produção mensal da central geradora (kWh)">
              <Inp value={d.armProducaoMensal} onChange={(e) => set({ armProducaoMensal: e.target.value.replace(/[^\d.]/g, "") })} />
            </Field>
          </React.Fragment>
        )}
      </div>
    </Card>
  );
}

// ---------- Seções 6, 7, 8, 9: Documentação técnica, contato, declarações, solicitante ----------
function ViewDeclaracoes({ ctx }) {
  const { d, set } = ctx;
  const setDocTec = (id, v) => set({ docsTec: { ...d.docsTec, [id]: v } });
  return (
    <Card eyebrow="Seções 6 a 9" title="Documentação técnica, declarações e solicitante">
      <div className="gd-subhead">6 — Documentação Técnica (obrigatória)</div>
      <div className="doc-list">
        {GD_DOCS_TEC.map((dc) => (
          <label key={dc.id} className="doc-item">
            <input type="checkbox" checked={!!d.docsTec[dc.id]} onChange={(e) => setDocTec(dc.id, e.target.checked)} />
            <span className="doc-text">
              <strong>{dc.id}</strong> {dc.txt}
              {dc.req && <span className="doc-req"> (obrigatório)</span>}
            </span>
          </label>
        ))}
      </div>

      <div className="gd-subhead">7 — Contato na Distribuidora</div>
      <div className="gd-info-box">
        <div><strong>{GD_CONTATO_CEMIG.responsavel}</strong></div>
        <div>{GD_CONTATO_CEMIG.endereco}</div>
        <div>Telefone: {GD_CONTATO_CEMIG.telefone} · E-mail: {GD_CONTATO_CEMIG.email}</div>
      </div>

      <div className="gd-subhead">8 — Solicitações e Declarações</div>
      <div className="grid">
        <Field label="8.1 - O padrão está pronto para ser ligado e a usina está instalada?" span={3} hint="Se 'Não', solicite vistoria/ligação em até 120 dias após o orçamento de conexão.">
          <Toggle value={d.decl81} onChange={(v) => set({ decl81: v })} options={GD_SN.map((o) => ({ v: o, l: o }))} />
        </Field>
      </div>
      <div className="doc-list" style={{ marginTop: 10 }}>
        <label className="doc-item">
          <input type="checkbox" checked={d.decl82} onChange={(e) => set({ decl82: e.target.checked })} />
          <span className="doc-text"><strong>8.2</strong> Renuncio ao direito de desistir do orçamento de conexão nos termos da resolução ANEEL vigente. (Opcional)</span>
        </label>
        <label className="doc-item">
          <input type="checkbox" checked={d.decl83} onChange={(e) => set({ decl83: e.target.checked })} />
          <span className="doc-text"><strong>8.3</strong> Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o meio para pagamento de custos de minha responsabilidade. (Opcional)</span>
        </label>
        <label className="doc-item">
          <input type="checkbox" checked={d.decl84} onChange={(e) => set({ decl84: e.target.checked })} />
          <span className="doc-text"><strong>8.4</strong> Declaro que as instalações internas, incluindo a GD, atendem às normas da distribuidora, ABNT, órgãos oficiais e ao art. 8º da Lei nº 9.074/1995. <span className="doc-req">(Obrigatório)</span></span>
        </label>
        <label className="doc-item">
          <input type="checkbox" checked={d.decl86} onChange={(e) => set({ decl86: e.target.checked })} />
          <span className="doc-text"><strong>8.6</strong> Declaro que todas as informações prestadas neste documento são verdadeiras. <span className="doc-req">(Obrigatório)</span></span>
        </label>
      </div>
      <div className="grid" style={{ marginTop: 10 }}>
        <Field label="8.5 - Dispensa da análise de inversão de fluxo (art. 73-A) — selecione 1 (opcional)" span={3}>
          <Sel value={d.decl85Regra} onChange={(e) => set({ decl85Regra: e.target.value })}>
            <option value="">Nenhuma</option>
            {GD_DECL_85.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Sel>
        </Field>
      </div>

      <div className="gd-subhead">9 — Solicitante</div>
      <div className="grid">
        <Field label="Nome do Consumidor ou Procurador Legal" req span={3}>
          <Inp value={d.solicitanteNome} onChange={(e) => set({ solicitanteNome: e.target.value })} />
        </Field>
        <Field label="Endereço de Correspondência" req span={3}>
          <Inp value={d.solicitanteEndereco} onChange={(e) => set({ solicitanteEndereco: e.target.value })} />
        </Field>
        <Field label="Telefone">
          <Inp value={d.solicitanteTelefone} onChange={(e) => set({ solicitanteTelefone: mascararFixo(e.target.value) })} />
        </Field>
        <Field label="Celular" req>
          <Inp value={d.solicitanteCelular} onChange={(e) => set({ solicitanteCelular: mascararCelular(e.target.value) })} />
        </Field>
        <Field label="E-mail" req>
          <Inp value={d.solicitanteEmail} onChange={(e) => set({ solicitanteEmail: e.target.value })} />
        </Field>
        <Field label="Observações" span={3}>
          <textarea className="ta" value={d.obs} onChange={(e) => set({ obs: e.target.value })} rows={3} />
        </Field>
      </div>
    </Card>
  );
}
function ViewRevisao({ ctx }) {
  const { d, validacao, gerarPdf } = ctx;
  const row = (label, val) => (
    <div className="rev-row">
      <span className="rev-label">{label}</span>
      <span className="rev-val">{val || "—"}</span>
    </div>
  );
  return (
    <Card eyebrow="Revisão" title="Prévia & PDF">
      {!validacao.ok ? (
        <div className="rev-faltas">
          <strong>Preencha os campos obrigatórios antes de exportar:</strong>
          <ul>
            {validacao.faltas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rev-ok">Todos os campos obrigatórios preenchidos. Pronto para exportar.</div>
      )}

      <div className="gd-subhead">1 — Identificação</div>
      {row("Instalação", d.instalacao)}
      {row("Titular", d.titular)}
      {row("Grupo / Classe", `${d.grupo} / ${d.classe}`)}
      {row("CPF/CNPJ", d.cpfCnpj)}
      {row("Endereço", `${d.logradouro}, ${d.numero} ${d.complemento} — ${d.bairro}, ${d.municipio}/${d.estado}`)}
      {row("Fast Track / Grid Zero", `${d.fastTrack} / ${d.gridZero}`)}

      <div className="gd-subhead">2 — Dados da UC</div>
      {row("UTM", `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`)}
      {row("Solicitação", d.solicitacao)}
      {row("Edificação", d.edificacao)}
      {row("Disjuntor Geral", `${d.disjGeralFase || "—"} ${d.disjGeralA || ""}`)}
      {row("Demanda consumo / geração (kW)", `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`)}

      <div className="gd-subhead">4 — Geração</div>
      {row("Fonte", d.fontePrimaria)}
      {row("Pot. Ativa Instalada (kW)", d.potAtivaInstalada)}
      {row("Modalidade", d.modalidade)}
      {d.fontePrimaria === "Solar" && row("Módulos / Inversores (kW)", `${d.potTotalModulos || "—"} / ${d.potTotalInversores || "—"}`)}

      <div className="gd-subhead">5 — Armazenamento</div>
      {row("Possui", d.possuiArmazenamento)}

      <div className="gd-subhead">9 — Solicitante</div>
      {row("Nome", d.solicitanteNome)}
      {row("Contato", `${d.solicitanteCelular || "—"} · ${d.solicitanteEmail || "—"}`)}

      <div style={{ marginTop: 16 }}>
        <Btn variant="dark" onClick={gerarPdf} disabled={!validacao.ok}>📄 Exportar PDF</Btn>
      </div>
    </Card>
  );
}
