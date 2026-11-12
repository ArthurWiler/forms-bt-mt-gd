/* ============================================================
   CEMIG GD — Perfis de carga na micro e na minigeração
   ------------------------------------------------------------
   A etapa de cargas da GD usa os MESMOS cards de perfil, o editor
   "Personalizar perfil" e os modais do BT individual
   (bt/js/perfis-carga.js). Este arquivo só liga os perfis ao estado
   da GD:
     • gdInstalarHostPerfis(cfg) registra window.PERFIS_CARGA_HOST
       (rede mono/bifásica, ilha de cargas do editor e, no mini,
       motores declarados fora dos perfis);
     • gdRenderPerfisUC(box, opts) monta a grade da UC única do fluxo
       individual — a "UC" dos perfis é o próprio `state` (state.cargas,
       state.perfil, state.perfilPers…), então PDF, prévia e validação
       continuam lendo state.cargas como antes;
     • gdDisjDoPerfil(u) dá o disjuntor que o perfil escolhido define.

   Requer: shared/js/carga-bt.js (montarCargaAcordeao, tipoPropriedadeDe,
   infoTipoPropriedade) e bt/js/perfis-carga.js.
   ============================================================ */

// Chave do editor da UC única (o coletivo usa "c<índice da UC>").
const GD_CHAVE_PERFIL_UC = "uc";

function gdInstalarHostPerfis(cfg) {
  window.PERFIS_CARGA_HOST = {
    redeMono: cfg.redeMono,
    semMotores: !!cfg.semMotores,
    // Ilha de cargas do editor "Personalizar perfil": a mesma do BT
    // (montarCargasBT faz o mesmo sobre o bt-core).
    montarCargas(box, u, chave, aoMudar) {
      u.cargas = u.cargas || {};
      return montarCargaAcordeao(box, {
        data: u.cargas,
        abertos: (u._acc = u._acc || {}),
        redeMono: cfg.redeMono,
        atividade: () => u.atividade || "",
        categoria: () => infoTipoPropriedade(tipoPropriedadeDe(u)).catA,
        semMotores: !!cfg.semMotores,
        aoMudar: () => {
          if (aoMudar) aoMudar();
        },
      });
    },
  };
}

// Disjuntor da UC pelo perfil: o escolhido em "Mais opções" (perfil
// personalizado) ou, num perfil pronto, o menor adequado às cargas. Sem
// perfil, vazio.
function gdDisjDoPerfil(u) {
  const lista = (u.cargas && u.cargas._disjuntores) || [];
  if (!u.perfil) return "";
  return u.disjEscolhido && lista.includes(u.disjEscolhido)
    ? u.disjEscolhido
    : lista[0] || "";
}

// Grade de perfis da UC única (fluxo individual).
//   opts.avisoSemTipo     texto quando o tipo de propriedade não tem perfis;
//   opts.antesDeCalcular  hook antes do recálculo (o mini projeta aqui os
//                         motores do bloco técnico em state.cargas.mots).
function gdRenderPerfisUC(box, opts) {
  if (!box) return;
  const u = state;
  // Tipo de propriedade mudou de família: a escolha cai (e o editor aberto).
  if (revalidarPerfilBT(u)) delete _editorPerfil[GD_CHAVE_PERFIL_UC];
  if (opts.antesDeCalcular) opts.antesDeCalcular();
  recalcularCargasBT(u);
  u.cargaDisjEscolhido = gdDisjDoPerfil(u);
  box.innerHTML = "";
  montarPerfisBT(box, u, {
    chave: GD_CHAVE_PERFIL_UC,
    comGerador: false,
    avisoSemTipo: opts.avisoSemTipo,
    aoMudar: () => gdRenderPerfisUC(box, opts),
  });
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar(box);
    window.CemigMarcadores.atualizarAvancar();
  }
}
