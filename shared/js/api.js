// ============================================================
// CEMIG — Helpers de consulta externa (ViaCEP / BrasilAPI)
// Extraído de micro/mini app.js — comportamento idêntico.
// Uso (dentro do componente App):
//   const { buscarCep, buscarCnpj } = criarConsultasExternas({
//     d, set, soDigitos, mascararFixo, mascararCEP, setCepStatus, setCnpjStatus,
//   });
// ============================================================
function criarConsultasExternas({
  d,
  set,
  soDigitos,
  mascararFixo,
  mascararCEP,
  setCepStatus,
  setCnpjStatus,
}) {
  // ViaCEP
  const buscarCep = async (cep) => {
    const limpo = soDigitos(cep);
    if (limpo.length !== 8) return;
    setCepStatus("Buscando endereço…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const j = await r.json();
      if (j.erro) {
        setCepStatus("CEP não encontrado.");
        return;
      }
      setCepStatus("");
      set({
        logradouro: j.logradouro || d.logradouro,
        bairro: j.bairro || d.bairro,
        municipio: j.localidade || d.municipio,
        estado: j.uf || d.estado,
      });
    } catch (e) {
      setCepStatus("Falha ao buscar CEP.");
    }
  };

  // BrasilAPI (CNPJ)
  const buscarCnpj = async (cnpj) => {
    const limpo = soDigitos(cnpj);
    if (limpo.length !== 14) return;
    setCnpjStatus("Buscando dados do CNPJ…");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (!r.ok) {
        setCnpjStatus("CNPJ não encontrado.");
        return;
      }
      const j = await r.json();
      setCnpjStatus("");
      // Preenche apenas identidade (razão social/e-mail/telefone). O endereço
      // NÃO é auto-preenchido pelo CNPJ — use o CEP (buscarCep) para isso.
      set({
        titular: j.razao_social || d.titular,
        email: j.email || d.email,
        telefone: j.ddd_telefone_1 ? mascararFixo(j.ddd_telefone_1) : d.telefone,
      });
    } catch (e) {
      setCnpjStatus("Falha ao buscar CNPJ.");
    }
  };

  return { buscarCep, buscarCnpj };
}
