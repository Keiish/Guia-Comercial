// Roda com: node lib/dados.check.mjs   (imprime "ok" quando tudo passa)
import assert from "node:assert";
import { atende, combina, coberturaDaBusca, lembrarRecente, resultadoPrincipal, sugestaoParaBusca, sugestoesDePlano, trechosDestaque, conflitosPlanos, corDoIndice, formatarValor, gruposHorarios, idsDeRedes, iniciais, juntarRedes, montarRedes, novaRedeId, novoId, pontuacao, resumoHorarios, resumoRedes, slug, subtipoInfo, tempoDesde, valorSemCifrao } from "./regras.ts";
import { pontoZero } from "./semente.ts";
import { decodificarCsv, lerTabela, planejarRedes, planejarRedesPorMedico, semCabecalho } from "./importar.ts";
import { VERSAO } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer, podeVerInterno } from "./permissoes.ts";
import {
  ErroRepositorio, listarCopias, importarRedes, importarRedesPorMedico, clinicasDo, dadosDaClinica, carregarProtegido, CHAVE, exportarBackup, importarBackup, excluirConvenio, excluirEspecialidade, excluirExame, excluirProfissional, excluirUsuario, migrar, restaurarDemonstracao, salvarClinica, salvarConvenio,
  salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional, salvarUsuario,
} from "./repositorio.ts";

// --- regras ---
const medico = (atendeMapa) => ({
  id: "m", clinicaId: "comn", especialidadeId: "e", nome: "Dra. Teste", horarios: [],
  procedimentos: [], exames: [], atende: atendeMapa, restricoes: [], observacoes: "",
});
// regra da skill modelo-dados-clinica: quem só atende exame não aparece na busca por consulta
assert(!atende(medico({ s1: "e" }), "s1", "consulta"));
assert(atende(medico({ s1: "e" }), "s1", "exame"));
assert(atende(medico({ s1: "ce" }), "s1", "consulta"));
assert(!atende(medico({}), "s1", "exame"));

const dados = {
  especialidades: [], exames: [], profissionais: [],
  convenios: [{ id: "c1", clinicaId: "comn", nome: "Unimed", cor: "#000", subtipos: [{ id: "c1-flex", nome: "Flex" }] }],
};
assert.equal(subtipoInfo(dados, "c1-flex").convenio.nome, "Unimed");
assert.equal(subtipoInfo(dados, "nao-existe"), undefined);

assert.equal(resumoHorarios([]), "Horários não informados");
assert.equal(
  resumoHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  "Seg e Sex · 08:00–12:00  |  Ter · 14:00–18:00",
);
assert.equal(resumoHorarios(["Seg", "Ter", "Qua", "Qui", "Sex"].map((dia) => ({ dia, inicio: "07:00", fim: "13:00" }))), "Seg a Sex · 07:00–13:00");

// resumoRedes: conta médicos e exames por rede
{
  const conv = { id: "h", clinicaId: "comn", nome: "Humana", cor: "#000", subtipos: [{ id: "h-gold", nome: "Gold" }, { id: "h-flex", nome: "Flex" }],
    gruposPlanos: [{ status: "somente_exames", titulo: "Somente exames", planos: ["Gold"] }] };
  const d = { especialidades: [], convenios: [conv],
    exames: [{ id: "x", clinicaId: "comn", nome: "Mamo", preparo: [], subtipos: ["h-gold"] }],
    profissionais: [{ ...medico({ "h-gold": "ce" }), id: "p1" }, { ...medico({ "h-gold": "e" }), id: "p2" }] };
  assert.deepEqual(resumoRedes(conv, d).map((r) => [r.subtipo.id, r.consultas, r.exames, r.examesCobertos]), [["h-gold", 1, 2, 1], ["h-flex", 0, 0, 0]]);
  // Gold está em "Somente exames" mas tem médico com consulta: é conflito
  assert.deepEqual(conflitosPlanos(conv, d), ["Gold"]);
  // só médico de exame na rede de "Somente exames": não é conflito
  assert.deepEqual(conflitosPlanos(conv, { ...d, profissionais: [d.profissionais[1]] }), []);
  // plano repetido em dois grupos aparece uma vez só
  assert.deepEqual(conflitosPlanos({ ...conv, gruposPlanos: [...conv.gruposPlanos, { status: "nao_atende", titulo: "Não atendemos", planos: ["Gold"] }] }, d), ["Gold"]);
}

// --- busca ---
assert(combina("Humana Saúde Gold", "humana gold"), "convênio + rede");
assert(combina("Humana Saúde Gold", "gold humana"), "qualquer ordem");
assert(combina("Dra. Helena Duarte Mastologia", "helena mastologia"));
assert(combina("Mamografia bilateral", "mamogarfia"), "letras invertidas");
assert(combina("Mamografia bilateral", "mamografa"), "uma letra a menos");
assert(combina("Mamografia bilateral", "mamo"), "começo da palavra");
assert(!combina("Humana Saúde Gold", "humana platinum"));
assert(!combina("Humana Saúde", "ana"), "pedaço curto no meio não conta");
assert(combina("qualquer coisa", "   "), "busca vazia combina");
// tolerância a erro só a partir de 6 letras: "bruna" não acha Bruno, "punsao" acha punção
assert(!combina("Dr. Bruno Reis", "bruna"));
assert(!combina("Dra. Paula Lins", "paulo"));
assert(combina("Punção aspirativa", "punsao"));
// "você quis dizer": até dois erros numa palavra de 4+ letras
assert.equal(sugestaoParaBusca(["Punção aspirativa por agulha fina (PAAF)", "Mamografia"], "pulsão"), "Punção aspirativa por agulha fina (PAAF)");
assert.equal(sugestaoParaBusca(["Mamografia", "Mamotomia"], "mamegrefia"), "Mamografia");
assert.equal(sugestaoParaBusca(["Mamografia"], "xyz"), undefined);
assert.equal(sugestaoParaBusca(["Mamografia"], "xxmografia"), "Mamografia", "dois erros ainda sugere");
assert.equal(sugestaoParaBusca(["Mamografia"], "xxxografia"), undefined, "três erros já não sugere");
assert.equal(sugestaoParaBusca(["Mamografia"], ""), undefined);
assert.equal(sugestaoParaBusca(["Mamografia"], "mamografia"), undefined, "nome que a busca já acha não vira sugestão");
assert(pontuacao("Mamografia bilateral", "mamo") > pontuacao("Ultrassom e mamografia", "mamo"));
assert.equal(pontuacao("Ultrassom", "mamo"), 0);

const humana = { id: "h", clinicaId: "comn", nome: "Humana Saúde", cor: "#000", subtipos: [
  { id: "h-gold", nome: "Gold" }, { id: "h-flex", nome: "Flex" }, { id: "h-gold-plus", nome: "Gold Plus" }] };
const cob = coberturaDaBusca([humana], (s) => s.id === "h-flex", "humana gold");
assert.equal(cob.length, 1);
assert.deepEqual(cob[0].cobre.map((s) => s.id), []);
assert.deepEqual(cob[0].naoCobre.map((s) => s.id), ["h-gold", "h-gold-plus"], "rede existe mas não cobre aparece");
assert.deepEqual(coberturaDaBusca([humana], () => true, "humana")[0].cobre.length, 3);
assert.deepEqual(sugestoesDePlano([humana], "humana gold").map((x) => x.subtipo.id), ["h-gold", "h-gold-plus"], "sugere pela rede");
assert.equal(sugestoesDePlano([humana], "humana").length, 0, "só o nome do convênio não sugere");
assert.equal(sugestoesDePlano([humana], "a").length, 0);
assert.deepEqual(trechosDestaque("Dra. Helena Duarte", "hel").filter((x) => x.marca).map((x) => x.t), ["Helena"]);
assert.deepEqual(trechosDestaque("Ultrassom Mamária", "mama").filter((x) => x.marca).map((x) => x.t), ["Mamária"], "sem acento");
assert.equal(trechosDestaque("Dra. Helena", "").map((x) => x.t).join(""), "Dra. Helena", "não perde texto");
let rec = [];
for (let n = 0; n < 10; n++) rec = lembrarRecente(rec, { tipo: "exame", id: `e${n}` });
rec = lembrarRecente(rec, { tipo: "exame", id: "e5" });
assert.equal(rec.length, 8);
assert.deepEqual(rec.slice(0, 2).map((x) => x.id), ["e5", "e9"], "sem repetir, mais novo primeiro");
assert.equal(lembrarRecente([{ tipo: "exame", id: "x" }], { tipo: "profissional", id: "x" }).length, 2);
const itensBusca = [{ tipo: "profissional", nome: "Dra. Camila Ferraz" }, { tipo: "exame", nome: "Mamografia bilateral" }, { tipo: "exame", nome: "Ultrassom e mamografia" }];
assert.equal(resultadoPrincipal(itensBusca, "mamo").nome, "Mamografia bilateral", "pelo nome, começo vale mais");
assert.equal(resultadoPrincipal(itensBusca, "xyz"), undefined);
assert.equal(resultadoPrincipal(itensBusca, ""), itensBusca[0], "busca vazia combina com tudo; a tela só usa com texto");
assert.deepEqual(coberturaDaBusca([{ ...humana, subtipos: [] }], () => true, "humana")[0], { convenio: { ...humana, subtipos: [] }, cobre: [], naoCobre: [] });
assert.deepEqual(coberturaDaBusca([humana], () => true, "unimed"), []);

// --- redes ---
assert.equal(novaRedeId("h", "Gold", new Set()), "h-gold");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold"])), "h-gold-2");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold", "h-gold-2"])), "h-gold-3");
const juntas = juntarRedes("h", humana.subtipos, ["gold", "Prático", "Pratico", " Novo  ", ""]);
assert.deepEqual(juntas.map((s) => s.nome), ["Gold", "Flex", "Gold Plus", "Prático", "Novo"], "não repete por acento/maiúscula");
assert.equal(juntas[0].id, "h-gold", "rede existente mantém o id");
assert.deepEqual([...idsDeRedes({ convenios: [humana] })], ["h-gold", "h-flex", "h-gold-plus"]);
assert.deepEqual(
  gruposHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  ["Seg e Sex · 08:00–12:00", "Ter · 14:00–18:00"],
);

assert.equal(slug("Clínica São Marcos"), "clinica-sao-marcos");
assert.equal(slug("  Rede fechada! "), "rede-fechada");
assert.equal(iniciais("Dra. Helena Duarte"), "HD");
assert.equal(iniciais("COMN"), "CO");
assert.equal(iniciais("Clínica de Oncologia e Mastologia"), "CO");
assert.equal(iniciais("Promater"), "PR");
assert.notEqual(novoId("conv"), novoId("conv"));
assert(novoId("conv").startsWith("conv-"));

// formatarValor e valorSemCifrao
assert.equal(formatarValor("250"), "R$ 250,00");
assert.equal(formatarValor("250,00"), "R$ 250,00");
assert.equal(formatarValor("250.50"), "R$ 250,50");
assert.equal(formatarValor("R$ 250"), "R$ 250,00");
assert.equal(formatarValor("R$ 250,00"), "R$ 250,00");
assert.equal(formatarValor("1500"), "R$ 1.500,00");
assert.equal(formatarValor("1.500"), "R$ 1.500,00"); // ponto de milhar, não decimal
assert.equal(formatarValor("R$ 1.200"), "R$ 1.200,00");
assert.equal(formatarValor("1.500.000,50"), "R$ 1.500.000,50");
assert.equal(formatarValor("a combinar"), "a combinar"); // texto fica como digitado
assert.equal(formatarValor(""), "");
assert.equal(formatarValor(undefined), "");

assert.equal(valorSemCifrao("250"), "250,00");
assert.equal(valorSemCifrao("R$ 250,00"), "250,00");
assert.equal(valorSemCifrao(""), "");
assert.equal(valorSemCifrao(undefined), "");

assert.equal(corDoIndice(0), corDoIndice(8));

// --- ponto zero ---
const b = pontoZero();
assert.equal(b.versao, VERSAO);
assert.equal(b.organizacoes.length, 5);
assert.equal(b.clinicas.length, 6);
assert.equal(b.usuarios.length, 7);
assert.deepEqual(
  b.clinicas.filter((c) => c.organizacaoId === "oncologia-mastologia").map((c) => c.nome),
  ["COMN", "ONCY"],
);
for (const c of b.clinicas) assert(b.organizacoes.some((o) => o.id === c.organizacaoId), `${c.id} sem organização`);
for (const u of b.usuarios) for (const id of u.clinicas) assert(b.clinicas.some((c) => c.id === id), `${u.id}: clínica ${id}`);
assert.deepEqual([b.especialidades, b.convenios, b.exames, b.profissionais].map((l) => l.length), [7, 10, 2, 7]);
assert(!JSON.stringify(b).toLowerCase().includes("mountain"));
assert.notEqual(pontoZero(), pontoZero(), "cada chamada devolve um objeto novo");

// --- permissões ---
const b0 = { ...pontoZero(), especialidades: [], convenios: [], exames: [], profissionais: [] };
const quem = (id) => b0.usuarios.find((u) => u.id === id);
const adm = quem("administrador"), com = quem("comercial"), coord = quem("coordenador-comn");
const recComn = quem("recepcao-comn"), recOncy = quem("recepcao-oncy");

assert(podeVer(recOncy, "oncy") && !podeVer(recOncy, "comn"), "Recepção ONCY não vê a COMN");
assert(podeVer(recComn, "comn") && !podeVer(recComn, "oncy"), "Recepção COMN não vê a ONCY");
assert.deepEqual(clinicasDo(b0, recOncy).map((c) => c.id), ["oncy"]);
assert.equal(clinicasDo(b0, com).length, 6);
assert(podeEditar(coord, "comn") && !podeEditar(coord, "oncy"), "Coordenador COMN edita só a COMN");
assert(podeEditar(com, "oncy") && podeCriarClinica(com) && !podeCriarUsuario(com), "Comercial edita tudo e não cria usuário");
assert(!podeEditar(recComn, "comn"), "Recepção não edita");
assert(podeCriarUsuario(adm) && !podeCriarClinica(coord));

// --- repositório ---
const ficha = (clinicaId, extra = {}) => ({ ...medico({}), id: "m1", clinicaId, ...extra });
const b1 = salvarProfissional(b0, coord, ficha("comn"));
assert.equal(dadosDaClinica(b1, "comn").profissionais.length, 1);
assert.equal(dadosDaClinica(b1, "oncy").profissionais.length, 0);
assert.equal(b0.profissionais.length, 0, "gravar não altera o banco anterior");
assert.throws(() => salvarProfissional(b0, coord, ficha("oncy")), ErroRepositorio);
assert.throws(() => salvarProfissional(b0, recComn, ficha("comn")), ErroRepositorio, "Recepção não grava nada");
// não dá para puxar um médico de clínica proibida trocando o clinicaId
const b2 = salvarProfissional(b0, com, ficha("oncy"));
assert.throws(() => salvarProfissional(b2, coord, ficha("comn")), ErroRepositorio);
// editar substitui, não duplica
const b3 = salvarProfissional(b1, coord, ficha("comn", { nome: "Dra. Outra" }));
assert.deepEqual(dadosDaClinica(b3, "comn").profissionais.map((p) => p.nome), ["Dra. Outra"]);

const conv = (id, clinicaId) => ({ id, clinicaId, nome: "Unimed", cor: "#000", subtipos: [] });
const b4 = salvarConvenio(salvarConvenio(b0, com, conv("c1", "comn")), com, conv("c2", "oncy"));
assert.equal(dadosDaClinica(b4, "comn").convenios.length, 1, "mesmo nome em clínicas diferentes não se mistura");
assert.throws(() => salvarConvenio(b0, recOncy, conv("c3", "oncy")), ErroRepositorio);
assert.equal(salvarExame(b0, coord, { id: "x1", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [] }).exames.length, 1);
assert.throws(() => salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "oncy", nome: "Cardio", icone: "Stethoscope" }), ErroRepositorio);

// clínicas e organizações
const nova = { id: "nova", organizacaoId: "promater", nome: "Nova" };
assert.throws(() => salvarClinica(b0, coord, nova), ErroRepositorio, "Coordenador não cria clínica");
assert.equal(salvarClinica(b0, com, nova).clinicas.length, 7);
assert.throws(() => salvarClinica(b0, com, { ...nova, organizacaoId: "nao-existe" }), ErroRepositorio);
const comn = b0.clinicas.find((c) => c.id === "comn");
assert.equal(salvarClinica(b0, coord, { ...comn, logo: "data:image/png;base64,AA" }).clinicas.find((c) => c.id === "comn").logo, "data:image/png;base64,AA");
assert.throws(() => salvarClinica(b0, coord, { ...b0.clinicas.find((c) => c.id === "oncy"), nome: "X" }), ErroRepositorio);
assert.throws(() => salvarOrganizacao(b0, coord, { id: "o", nome: "O" }), ErroRepositorio);
assert.equal(salvarOrganizacao(b0, com, { id: "o", nome: "O" }).organizacoes.length, 6);

// usuários
const novoUsuario = { id: "n1", nome: "Recepção nova", email: "n@exemplo.com.br", papel: "recepcao", clinicas: ["comn", "oncy"] };
assert.equal(salvarUsuario(b0, adm, novoUsuario).usuarios.length, 8);
assert.throws(() => salvarUsuario(b0, com, novoUsuario), ErroRepositorio, "Comercial não cria usuário");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, clinicas: [] }), ErroRepositorio, "Recepção precisa de clínica");
assert.deepEqual(salvarUsuario(b0, adm, { ...novoUsuario, papel: "comercial" }).usuarios.at(-1).clinicas, [], "Comercial vale para todas");

// restaurar
assert.deepEqual(restaurarDemonstracao(b3, adm), pontoZero());
assert.throws(() => restaurarDemonstracao(b3, com), ErroRepositorio);

// --- backup e migração ---
assert.equal(migrar(null), null);
assert.equal(migrar({ versao: 1 }), null, "formato desconhecido não vira banco");
assert.deepEqual(migrar(pontoZero()), pontoZero());
const copia = exportarBackup(b1);
assert.deepEqual(importarBackup(b0, adm, copia), b1);
assert.throws(() => importarBackup(b0, com, copia), ErroRepositorio, "só o Administrador restaura");
assert.throws(() => importarBackup(b0, adm, "{não é json"), ErroRepositorio);

const { usuarios: _u, ...semUsuarios } = pontoZero();
assert.equal(migrar(semUsuarios), null, "banco sem lista de usuários não vale");
assert.equal(migrar({ versao: VERSAO, clinicas: [] }), null);
assert.throws(() => importarBackup(b0, adm, JSON.stringify(semUsuarios)), ErroRepositorio);
const semAdm = { ...pontoZero(), usuarios: pontoZero().usuarios.filter((x) => x.papel !== "administrador") };
assert.throws(() => importarBackup(b0, adm, JSON.stringify(semAdm)), /pelo menos um Administrador/, "cópia sem Administrador tranca o sistema");
const { atende: _a, ...semAtende } = ficha("comn");
assert.equal(migrar({ ...b1, profissionais: [semAtende] }), null, "profissional sem atende não vale");
assert.equal(migrar({ ...b1, profissionais: [{ ...ficha("comn"), horarios: null }] }), null, "profissional sem horários não vale");
assert.equal(migrar({ ...b0, convenios: [{ ...conv("c1", "comn"), subtipos: undefined }] }), null, "convênio sem subtipos não vale");
assert.deepEqual(migrar(b4), b4, "banco válido passa");
// migrar recusa ficha que depois derrubaria a tela
{
  const base = pontoZero();
  assert.equal(migrar({ ...base, exames: [{ id: "x", clinicaId: "comn", nome: "Sem listas" }] }), null, "exame sem preparo/subtipos");
  assert.equal(migrar({ ...base, usuarios: [{ id: "u", nome: "U", email: "u@x", papel: "recepcao" }] }), null, "usuário sem clinicas");
  assert.ok(migrar(base), "semente passa");
}

// dados antigos: copia uma vez só; sem espaço para a cópia, protege a chave antiga
const memoria = (cheio) => {
  const m = new Map();
  return { m, get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { if (cheio && k !== CHAVE) throw new Error("cheio"); m.set(k, v); } };
};
globalThis.localStorage = memoria(false);
localStorage.setItem(CHAVE, '{"versao":1}');
assert.equal(carregarProtegido().protegido, false);
carregarProtegido();
assert.equal([...localStorage.m.keys()].filter((k) => k.startsWith("cartilha:backup")).length, 1, "não repete a cópia");
globalThis.localStorage = memoria(true);
localStorage.setItem(CHAVE, '{"versao":1}');
assert.equal(carregarProtegido().protegido, true, "sem espaço para a cópia, não pode gravar por cima");
// JSON inválido: guarda a cópia e avisa; JSON válido não guarda nada
globalThis.localStorage = memoria(false);
localStorage.setItem(CHAVE, "{quebrado");
assert.equal(carregarProtegido().copiaGuardada, true);
assert.equal(listarCopias().length, 1);
assert.equal(listarCopias()[0].texto, "{quebrado");
globalThis.localStorage = memoria(false);
localStorage.setItem(CHAVE, JSON.stringify(pontoZero()));
assert.equal(carregarProtegido().copiaGuardada, false);
assert.equal(listarCopias().length, 0);

// --- redes órfãs ---
const convR = { id: "cr", clinicaId: "comn", nome: "Humana", cor: "#000", subtipos: [{ id: "cr-gold", nome: "Gold" }, { id: "cr-flex", nome: "Flex" }] };
let bR = salvarConvenio(b0, com, convR);
bR = salvarProfissional(bR, com, ficha("comn", { atende: { "cr-gold": "ce", "cr-flex": "c" }, restricoes: [{ texto: "x", subtipoId: "cr-gold" }] }));
bR = salvarExame(bR, com, { id: "xr", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: ["cr-gold", "cr-flex"] });
// renomear mantém o id: nada se perde
const renomeado = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-gold", nome: "Gold Nacional" }, { id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(renomeado.profissionais[0].atende, { "cr-gold": "ce", "cr-flex": "c" });
// tirar a rede limpa os vínculos
const semGold = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(semGold.profissionais[0].atende, { "cr-flex": "c" });
assert.equal(semGold.profissionais[0].restricoes[0].subtipoId, undefined);
assert.deepEqual(semGold.exames[0].subtipos, ["cr-flex"]);
assert.deepEqual(conflitosPlanos({ ...convR, gruposPlanos: [{ status: "nao_atende", titulo: "Não atendemos", planos: ["gold"] }] }, dadosDaClinica(bR, "comn")), ["gold"]);

// --- excluir ---
const bE = salvarExame(salvarProfissional(b0, coord, ficha("comn", { exames: ["xe"] })), coord, { id: "xe", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [] });
const semExame = excluirExame(bE, coord, "xe");
assert.equal(semExame.exames.length, 0);
assert.deepEqual(semExame.profissionais[0].exames, [], "médico deixa de apontar para o exame");
assert.equal(excluirProfissional(bE, coord, "m1").profissionais.length, 0);
assert.throws(() => excluirProfissional(bE, recComn, "m1"), ErroRepositorio);
assert.throws(() => excluirProfissional(b2, coord, "m1"), ErroRepositorio, "não exclui de outra clínica");
const semConv = excluirConvenio(bR, com, "cr");
assert.equal(semConv.convenios.length, 0);
assert.deepEqual(semConv.profissionais[0].atende, {});
assert.deepEqual(semConv.exames[0].subtipos, []);
const bEsp = salvarProfissional(salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "comn", nome: "Cardio", icone: "" }), coord, ficha("comn", { especialidadeId: "e1" }));
assert.throws(() => excluirEspecialidade(bEsp, coord, "e1"), ErroRepositorio, "especialidade com médico não sai");
assert.equal(excluirEspecialidade(salvarEspecialidade(b0, coord, { id: "e2", clinicaId: "comn", nome: "X", icone: "" }), coord, "e2").especialidades.length, 0);
assert.equal(excluirUsuario(b0, adm, "recepcao-oncy").usuarios.length, 6);
assert.throws(() => excluirUsuario(b0, adm, "administrador"), ErroRepositorio, "não exclui a si mesmo");
assert.throws(() => excluirUsuario(b0, com, "recepcao-oncy"), ErroRepositorio);
assert.throws(() => excluirEspecialidade(bEsp, coord, "e1"), /Mova o médico desta especialidade/, "singular");
const bEsp2 = salvarProfissional(bEsp, coord, ficha("comn", { id: "m2", especialidadeId: "e1" }));
assert.throws(() => excluirEspecialidade(bEsp2, coord, "e1"), /Mova os 2 médicos desta especialidade/, "plural");
assert.deepEqual(semConv.profissionais[0].restricoes, [{ texto: "x" }], "excluir convênio limpa a rede da restrição");
const admUsuario = b0.usuarios.find((x) => x.id === "administrador");
assert.throws(() => salvarUsuario(b0, adm, { ...admUsuario, papel: "comercial" }), /próprio acesso de Administrador/, "não rebaixa a si mesmo");
const bSoAdm = { ...b0, usuarios: [admUsuario] };
assert.throws(() => salvarUsuario(bSoAdm, adm, { ...admUsuario, papel: "comercial" }), ErroRepositorio);
assert.equal(salvarUsuario(bSoAdm, adm, { ...admUsuario, nome: "Outro nome" }).usuarios[0].nome, "Outro nome", "editar sem mudar o papel vale");

// --- montarRedes (formulário) ---
const antesR = [{ id: "v-gold", nome: "Gold" }, { id: "v-flex", nome: "Flex" }];
assert.deepEqual(montarRedes("v", antesR, [{ id: "v-gold", nome: "Gold Nacional" }, { id: "v-flex", nome: "Flex" }], [], []).redes, [{ id: "v-gold", nome: "Gold Nacional" }, { id: "v-flex", nome: "Flex" }]);
assert.deepEqual(montarRedes("v", antesR, [{ id: "v-gold", nome: "  " }, { id: "v-flex", nome: "Flex" }], [], []).redes, antesR, "nome vazio mantém o anterior");
assert.match(montarRedes("v", antesR, [{ id: "v-gold", nome: "FLEX" }, { id: "v-flex", nome: "flex" }], [], []).erro, /mesmo nome/);
assert.deepEqual(montarRedes("v", antesR, [], [], ["Plano A"]).redes, [], "remover tudo não ressuscita pelos planos");
assert.deepEqual(montarRedes("v", [], [], [], ["Plano A", "Plano A"]).redes.map((r) => r.nome), ["Plano A"], "convênio novo usa os planos");
assert.equal(montarRedes("v", antesR, antesR, ["gold", "Prime"], []).redes.length, 3, "nova com nome existente não duplica");

// --- central × recepção ---
const central = quem("central-comn");
assert.equal(central.papel, "central");
assert(podeVerInterno(central) && !podeVerInterno(recComn));
assert(!podeEditar(central, "comn") && podeVer(central, "comn"), "Central só consulta");
const bI = salvarProfissional(b0, coord, ficha("comn", { observacoesInternas: "só a central" }));
assert.equal(dadosDaClinica(bI, "comn", central).profissionais[0].observacoesInternas, "só a central");
assert.equal(dadosDaClinica(bI, "comn", recComn).profissionais[0].observacoesInternas, undefined, "recepção não vê");
const bIx = salvarExame(b0, coord, { id: "xi", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [], observacoesInternas: "só a central" });
assert.equal(dadosDaClinica(bIx, "comn", central).exames[0].observacoesInternas, "só a central");
assert(!("observacoesInternas" in dadosDaClinica(bIx, "comn", recComn).exames[0]), "recepção recebe exame sem observações internas");
// migração da versão 3: a central vira papel central
const v3 = { ...pontoZero(), versao: 3, usuarios: pontoZero().usuarios.map((u) => u.id === "central-comn" ? { ...u, papel: "recepcao" } : u) };
assert.equal(migrar(v3).versao, VERSAO);
assert.equal(migrar(v3).usuarios.find((u) => u.id === "central-comn").papel, "central");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, papel: "central", clinicas: [] }), ErroRepositorio, "Central precisa de clínica");

// --- atualização ---
const agora = new Date("2026-10-14T12:00:00Z");
assert.equal(tempoDesde("2026-10-14T08:00:00Z", agora), "hoje");
assert.equal(tempoDesde("2026-10-13T08:00:00Z", agora), "ontem");
assert.equal(tempoDesde("2026-10-02T08:00:00Z", agora), "há 12 dias");
assert.equal(tempoDesde("2026-06-10T08:00:00Z", agora), "há 4 meses");
assert.equal(tempoDesde("2025-01-10T08:00:00Z", agora), "há mais de um ano");
assert.equal(tempoDesde("não é data", agora), "");
assert.equal(tempoDesde("2026-09-14T08:00:00Z", agora), "há 30 dias");
assert.equal(tempoDesde("2026-09-13T08:00:00Z", agora), "há 1 mês");
const bAt = salvarProfissional(b0, coord, ficha("comn"));
assert.equal(bAt.profissionais[0].atualizadoPor, coord.nome);
assert(!Number.isNaN(Date.parse(bAt.profissionais[0].atualizadoEm)));


// --- importar ---
assert.deepEqual(lerTabela("Rede\nGold\n\nFlex  \n"), [["Rede"], ["Gold"], ["Flex"]]);
assert.deepEqual(lerTabela("Médico\tRede\nDra. Ana\tGold"), [["Médico", "Rede"], ["Dra. Ana", "Gold"]]);
assert.deepEqual(lerTabela('a;"b; c"\n1;2'), [["a", "b; c"], ["1", "2"]]);
assert.deepEqual(semCabecalho([["Rede"], ["Gold"]]), [["Gold"]]);
assert.deepEqual(semCabecalho([["Gold"]]), [["Gold"]]);
assert.deepEqual(planejarRedes(humana, ["gold", "Nacional", "Nacional", "Prata"]), { novas: ["Nacional", "Prata"], existentes: ["gold"], repetidas: ["Nacional"] });
const dI = { especialidades: [], exames: [], convenios: [humana], profissionais: [
  { ...medico({}), id: "pa", nome: "Dra. Ana Lima" }, { ...medico({}), id: "pb", nome: "Dr. Bruno Reis" }] };
const plano = planejarRedesPorMedico(dI, [["Ana Lima", "Gold", "consulta"], ["Bruno", "Nacional", ""], ["Carlos", "Gold", ""]]);
assert.deepEqual(plano.itens, [
  { profissionalId: "pa", medico: "Dra. Ana Lima", nomePlanilha: "Ana Lima", rede: "Gold", atendimento: "c" },
  { profissionalId: "pb", medico: "Dr. Bruno Reis", nomePlanilha: "Bruno", rede: "Nacional", atendimento: "ce" }]);
assert.deepEqual(plano.semMedico, ["Carlos"]);
let bImp = salvarConvenio(b0, com, { ...humana, clinicaId: "comn" });
bImp = salvarProfissional(salvarProfissional(bImp, com, { ...medico({}), id: "pa", clinicaId: "comn", nome: "Dra. Ana Lima" }), com, { ...medico({}), id: "pb", clinicaId: "comn", nome: "Dr. Bruno Reis" });
bImp = importarRedesPorMedico(bImp, com, "h", plano.itens);
assert.equal(bImp.convenios[0].subtipos.at(-1).nome, "Nacional", "rede que faltava é criada");
assert.equal(bImp.profissionais.find((p) => p.id === "pa").atende["h-gold"], "c");
assert.equal(bImp.profissionais.find((p) => p.id === "pb").atende["h-nacional"], "ce");
assert.equal(importarRedes(bImp, com, "h", ["Prata", "gold"]).convenios[0].subtipos.length, 5);
assert.deepEqual(lerTabela("Unimed, Plano Pleno\nGold", ["\t", ";"]), [["Unimed, Plano Pleno"], ["Gold"]], "vírgula não parte o nome no modo redes");
assert.deepEqual(lerTabela('"Unimed ""Pleno"""'), [['Unimed "Pleno"']], "aspas escapadas");
assert.equal(decodificarCsv(new TextEncoder().encode("Médico")), "Médico");
assert.equal(decodificarCsv(new Uint8Array([0x4d, 0xe9, 0x64, 0x69, 0x63, 0x6f])), "Médico", "windows-1252");
assert.equal(decodificarCsv(new Uint8Array([0xef, 0xbb, 0xbf, 0x52])), "R", "BOM removido");
assert.throws(() => importarRedesPorMedico(bImp, com, "h", [{ profissionalId: "outra", rede: "X", atendimento: "c" }]), ErroRepositorio, "médico inexistente");
const bOutra = salvarProfissional(bImp, adm, { ...medico({}), id: "po", clinicaId: "oncy", nome: "Dr. Outra Clínica" });
assert.throws(() => importarRedesPorMedico(bOutra, adm, "h", [{ profissionalId: "po", rede: "X", atendimento: "c" }]), ErroRepositorio, "médico de outra clínica");
assert.equal(importarRedesPorMedico(bImp, com, "h", [{ profissionalId: "pa", rede: "###", atendimento: "c" }]).convenios[0].subtipos.length, 4, "rede sem nome é ignorada");
assert.throws(() => importarRedes(bImp, recComn, "h", ["X"]), ErroRepositorio);
// médico casa sem tolerância a erro de digitação: "Bruno" não pode ligar à Bruna
const dBruna = { ...dI, profissionais: [{ ...medico({}), id: "pn", nome: "Dra. Bruna Reis" }] };
assert.deepEqual(planejarRedesPorMedico(dBruna, [["Bruno Reis", "Gold", ""]]).semMedico, ["Bruno Reis"], "Bruno Reis não casa com Bruna Reis");
assert.equal(planejarRedesPorMedico(dBruna, [["bruna", "Gold", ""]]).itens.length, 1, "começo do nome ainda casa");
// linhas repetidas (mesmo médico + mesma rede) viram um vínculo só, unindo o atendimento
const rep = planejarRedesPorMedico(dI, [["Ana Lima", "Gold", "consulta"], ["Ana Lima", "gold", "exame"], ["Ana Lima", "Gold", "consulta"], ["Bruno", "Gold", "exame"]]);
assert.deepEqual(rep.itens.map((i) => [i.profissionalId, i.atendimento]), [["pa", "ce"], ["pb", "e"]], "vínculos distintos, c + e = ce");
assert.equal(importarRedesPorMedico(bImp, com, "h", [{ profissionalId: "pa", rede: "Prata", atendimento: "c" }, { profissionalId: "pa", rede: "prata", atendimento: "e" }]).profissionais.find((p) => p.id === "pa").atende["h-prata"], "ce", "repositório também une");
const bCe = salvarProfissional(bImp, com, { ...bImp.profissionais.find((p) => p.id === "pa"), atende: { "h-gold": "ce" } });
const depois = importarRedesPorMedico(bCe, com, "h", [{ profissionalId: "pa", rede: "Gold", atendimento: "c" }]);
assert.equal(depois.profissionais.find((p) => p.id === "pa").atende["h-gold"], "ce", "importar consulta não tira o exame que já existia");

// --- validações ---
assert.throws(() => salvarProfissional(b0, coord, ficha("comn", { horarios: [{ dia: "Seg", inicio: "14:00", fim: "08:00" }] })), ErroRepositorio);
const bEs = salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "comn", nome: "Mastologia", icone: "" });
assert.throws(() => salvarEspecialidade(bEs, coord, { id: "e9", clinicaId: "comn", nome: "mastologia ", icone: "" }), ErroRepositorio, "especialidade repetida");
assert.equal(salvarEspecialidade(bEs, coord, { id: "e1", clinicaId: "comn", nome: "Mastologia", icone: "" }).especialidades.length, 1, "editar a mesma não acusa repetição");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, id: "n2", email: "RECEPCAO.COMN@exemplo.com.br" }), ErroRepositorio, "e-mail repetido");

console.log("ok");
