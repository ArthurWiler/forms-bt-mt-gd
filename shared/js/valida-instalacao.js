/* ============================================================
   CEMIG — Validação do número da Instalação / Unidade Consumidora
   ------------------------------------------------------------
   Dois formatos convivem (REN ANEEL nº 1.095, de 18/06/2024):

   1) INSTALAÇÃO (número antigo)
      Sempre 10 dígitos e sempre iniciado por 3.
        3123456789

   2) UNIDADE CONSUMIDORA (número novo) — 15 dígitos
      N15..N6  numeração sequencial (10 dígitos, inicia em 0.000.000.001)
      N5N4N3   número da distribuidora na BDGD — a CEMIG é 018
      N2N1     dígito verificador dos 13 dígitos anteriores
      Escrito com hífen antes do verificador, o "018" fica sendo os três
      últimos dígitos antes do hífen:
        0000000001018-47

   O verificador (N2N1) não é conferido aqui: a resolução não publica o
   algoritmo de cálculo, então validamos apenas a estrutura.
   ============================================================ */

const INSTAL_UC_DISTRIBUIDORA_CEMIG = "018";

// Só os dígitos do que foi digitado (ignora hífen, pontos e espaços).
const _instalDigitos = (v) => String(v == null ? "" : v).replace(/\D/g, "");

/* Instalação (antiga): 10 dígitos começando por 3. */
function ehInstalacaoAntiga(valor) {
  const d = _instalDigitos(valor);
  return d.length === 10 && d[0] === "3";
}

/* UC (nova): 15 dígitos, com "018" nas posições 11-13 (os três últimos
   antes do dígito verificador). */
function ehUcNova(valor) {
  const d = _instalDigitos(valor);
  return (
    d.length === 15 &&
    d.slice(10, 13) === INSTAL_UC_DISTRIBUIDORA_CEMIG
  );
}

/* Resultado da validação de um número de instalação/UC.
   Retorna { vazio, valido, tipo, msg }:
     tipo  = "instalacao" | "uc" | ""      (o que o número aparenta ser)
     msg   = texto de erro (vazio quando válido)
   Campo vazio é considerado VÁLIDO aqui — a obrigatoriedade é tratada
   separadamente pelo data-req dos marcadores. */
function validarInstalacaoUC(valor) {
  const bruto = String(valor == null ? "" : valor).trim();
  const d = _instalDigitos(bruto);
  if (!d) return { vazio: true, valido: true, tipo: "", msg: "" };

  if (ehInstalacaoAntiga(bruto))
    return { vazio: false, valido: true, tipo: "instalacao", msg: "" };
  if (ehUcNova(bruto)) return { vazio: false, valido: true, tipo: "uc", msg: "" };

  // Mensagem específica: aponta o que está errado no formato mais provável.
  // Até 10 dígitos o usuário provavelmente digita a instalação antiga;
  // acima disso, a UC nova de 15.
  let msg;
  if (d.length <= 10) {
    if (d[0] !== "3")
      msg = "A instalação deve começar por 3 e ter 10 dígitos.";
    else msg = `A instalação deve ter 10 dígitos (faltam ${10 - d.length}).`;
  } else if (d.length < 15) {
    msg = `A unidade consumidora deve ter 15 dígitos (faltam ${15 - d.length}).`;
  } else if (d.length > 15) {
    msg = "Número inválido: use 10 dígitos (instalação) ou 15 (UC).";
  } else {
    msg = 'A unidade consumidora deve ter "018" antes do dígito verificador.';
  }
  return { vazio: false, valido: false, tipo: "", msg };
}

/* Formata para exibição: a UC nova ganha o hífen antes do verificador
   (0000000001018-47); a instalação antiga fica como está. */
function formatarInstalacaoUC(valor) {
  const d = _instalDigitos(valor);
  if (d.length === 15) return d.slice(0, 13) + "-" + d.slice(13);
  return d;
}

/* Máscara de digitação: mantém só dígitos e insere o hífen assim que passa
   de 13, sem atrapalhar quem ainda está digitando uma instalação de 10. */
function mascararInstalacaoUC(valor) {
  const d = _instalDigitos(valor).slice(0, 15);
  return d.length > 13 ? d.slice(0, 13) + "-" + d.slice(13) : d;
}

/* Hook usado pelos formulários (data-fmt="instalacaoUC"): valida o valor e
   devolve a mensagem de erro. Assinatura combinada com form-marcadores.js. */
function fmtInstalacaoUC(valor) {
  return validarInstalacaoUC(valor);
}
