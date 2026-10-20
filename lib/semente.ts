import { VERSAO, type Banco, type Convenio, type Especialidade, type Exame, type Organizacao, type Profissional, type Usuario } from "./modelo.ts";

// Demonstração da cartilha com unidades, usuários, especialidades, convênios, exames e profissionais cadastrados.
const ORGANIZACOES: Organizacao[] = [
  { id: "oncologia-mastologia", nome: "Clínica de Oncologia e Mastologia" },
  { id: "promater", nome: "Promater" },
  { id: "oncoclinicas", nome: "Oncoclínicas" },
  { id: "oncoclinicas-mossoro", nome: "Nossa Clínica" },
  { id: "sao-marcos", nome: "Clínica São Marcos" },
];

const CLINICAS = [
  { id: "comn", organizacaoId: "oncologia-mastologia", nome: "COMN", logo: "/logos/comn.webp" },
  { id: "oncy", organizacaoId: "oncologia-mastologia", nome: "ONCY", logo: "/logos/oncy.webp" },
  { id: "promater", organizacaoId: "promater", nome: "Promater", logo: "/logos/promater.webp" },
  { id: "oncoclinicas", organizacaoId: "oncoclinicas", nome: "Oncoclínicas", logo: "/logos/oncoclinicas.webp" },
  { id: "oncoclinicas-mossoro", organizacaoId: "oncoclinicas-mossoro", nome: "Nossa Clínica", logo: "/logos/nossa-clinica.webp" },
  { id: "sao-marcos", organizacaoId: "sao-marcos", nome: "Clínica São Marcos", logo: "/logos/sao-marcos.webp" },
];

const USUARIOS: Usuario[] = [
  { id: "administrador", nome: "Administrador", email: "administrador@exemplo.com.br", papel: "administrador", clinicas: [] },
  { id: "comercial", nome: "Comercial", email: "comercial@exemplo.com.br", papel: "comercial", clinicas: [] },
  { id: "coordenador-comn", nome: "Coordenador COMN", email: "coordenacao.comn@exemplo.com.br", papel: "coordenador", clinicas: ["comn"] },
  { id: "central-comn", nome: "Central de atendimento COMN", email: "central.comn@exemplo.com.br", papel: "central", clinicas: ["comn"] },
  { id: "recepcao-comn", nome: "Recepção COMN", email: "recepcao.comn@exemplo.com.br", papel: "recepcao", clinicas: ["comn"] },
  { id: "recepcao-oncy", nome: "Recepção ONCY", email: "recepcao.oncy@exemplo.com.br", papel: "recepcao", clinicas: ["oncy"] },
  { id: "usuario-promater", nome: "Usuário Promater", email: "usuario@promater.exemplo.com.br", papel: "recepcao", clinicas: ["promater"] },
];

const ESPECIALIDADES: Especialidade[] = [
  { id: "esp-mvb2rb0t3u25i", clinicaId: "comn", nome: "Mastologia", icone: "Stethoscope" },
  { id: "esp-mvb2ruhwfs34i", clinicaId: "oncy", nome: "Oncologia Clinica", icone: "Stethoscope" },
  { id: "esp-mvb2soprt5q1z", clinicaId: "promater", nome: "Hematologia", icone: "Stethoscope" },
  { id: "esp-mvb2sw9hzmbn5", clinicaId: "oncoclinicas", nome: "Dermatologia", icone: "Stethoscope" },
  { id: "esp-mvb2t7lqb5j8r", clinicaId: "oncoclinicas-mossoro", nome: "Oncologia Clinica", icone: "Stethoscope" },
  { id: "esp-mvb2tmba1x463", clinicaId: "sao-marcos", nome: "Cirurgia Plástica", icone: "Stethoscope" },
  { id: "esp-mvb3uq5lzrpdk", clinicaId: "oncoclinicas-mossoro", nome: "Mastologia", icone: "Stethoscope" },
];

const CONVENIOS: Convenio[] = [
  {
    id: "conv-mvb30cmh0be2n",
    clinicaId: "comn",
    nome: "Assefaz",
    cor: "#0b7a69",
    subtipos: [
      { id: "conv-mvb30cmh0be2n-unimed-intercambio", nome: "Unimed Intercâmbio" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb31hpicg9qr",
    clinicaId: "comn",
    nome: "Amil",
    cor: "#2d6be0",
    subtipos: [],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3dqh446tkc",
    clinicaId: "oncy",
    nome: "Geap Saúde",
    cor: "#0b7a69",
    subtipos: [
      { id: "conv-mvb3dqh446tkc-geapessencial", nome: "GEAPESSENCIAL" },
      { id: "conv-mvb3dqh446tkc-geapsaude-vida", nome: "GEAPSAUDE VIDA" },
      { id: "conv-mvb3dqh446tkc-geap-referencia-vida-ii", nome: "GEAP REFERENCIA VIDA II" },
      { id: "conv-mvb3dqh446tkc-geapreferencia", nome: "GEAPREFERENCIA" },
      { id: "conv-mvb3dqh446tkc-geap-referencia-vida", nome: "GEAP REFERENCIA VIDA" },
      { id: "conv-mvb3dqh446tkc-geapclassico", nome: "GEAPCLASSICO" },
      { id: "conv-mvb3dqh446tkc-geapfamilia", nome: "GEAPFAMILIA" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3kp07bc7c6",
    clinicaId: "oncy",
    nome: "Amil",
    cor: "#2d6be0",
    subtipos: [],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3nqv6fikob",
    clinicaId: "promater",
    nome: "Amil",
    cor: "#0b7a69",
    subtipos: [],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3pmvc34r92",
    clinicaId: "oncoclinicas",
    nome: "Geap Saúde",
    cor: "#0b7a69",
    subtipos: [
      { id: "conv-mvb3pmvc34r92-master-iicopart-cubatao", nome: "MASTER IICOPART. CUBATÃO" },
      { id: "conv-mvb3pmvc34r92-geap-class-iirn", nome: "GEAP CLASS IIRN" },
      { id: "conv-mvb3pmvc34r92-geapsaude-ii", nome: "GEAPSAUDE II" },
      { id: "conv-mvb3pmvc34r92-geapfamilia", nome: "GEAPFAMILIA" },
      { id: "conv-mvb3pmvc34r92-geapclassico", nome: "GEAPCLASSICO" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3uu3mfomla",
    clinicaId: "oncoclinicas-mossoro",
    nome: "Humana Saúde",
    cor: "#0b7a69",
    subtipos: [
      { id: "conv-mvb3uu3mfomla-humana-saude", nome: "HUMANA SAUDE" },
      { id: "conv-mvb3uu3mfomla-humana-ma-rede-superior-propria", nome: "HUMANA MA - REDE SUPERIOR + PROPRIA" },
      { id: "conv-mvb3uu3mfomla-humana-ne-rede-nacional", nome: "HUMANA NE - REDE NACIONAL" },
      { id: "conv-mvb3uu3mfomla-humana-ne-rede-propria-completa", nome: "HUMANA NE - REDE PROPRIA COMPLETA" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb3vqk3buinz",
    clinicaId: "oncoclinicas-mossoro",
    nome: "Brasil Saúde",
    cor: "#2d6be0",
    subtipos: [
      { id: "conv-mvb3vqk3buinz-brasil-saude", nome: "BRASIL SAUDE" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb44l4ri7agj",
    clinicaId: "sao-marcos",
    nome: "Assefaz",
    cor: "#0b7a69",
    subtipos: [
      { id: "conv-mvb44l4ri7agj-assefaz-safira", nome: "ASSEFAZ Safira" },
      { id: "conv-mvb44l4ri7agj-assefaz-cristal", nome: "ASSEFAZ Cristal" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
  {
    id: "conv-mvb44qpwksxnv",
    clinicaId: "sao-marcos",
    nome: "Caurn",
    cor: "#2d6be0",
    subtipos: [
      { id: "conv-mvb44qpwksxnv-caurn", nome: "Caurn" },
    ],
    gruposPlanos: [
      { status: "atende", titulo: "Atende consultas e exames", planos: [] },
      { status: "somente_exames", titulo: "Somente exames", nota: "Não precisa de encaminhamento para a clínica", planos: [] },
      { status: "nao_atende", titulo: "Não atendemos", planos: [] },
    ],
    observacoesGerais: [],
  },
];

const EXAMES: Exame[] = [
  {
    id: "exame-mvb4hbf4v62pg",
    clinicaId: "comn",
    nome: "Punção ou biópsia percutânea por agulha fina (PAAF) de nódulo mamário",
    preparo: [
      "Trazer requisição e ultra anterior se localizou nódulo.",
    ],
    valor: "R$ 380,00",
    subtipos: [],
  },
  {
    id: "exame-mvb4iqw79l5xs",
    clinicaId: "comn",
    nome: "Mamografia Digital",
    preparo: [
      "Trazer requisição, mamografia e ultra mamária anterior.",
      "Não usar cosméticos nas mamas nem axilas.",
      "Não vir com vestido.",
    ],
    valor: "R$ 220,00",
    subtipos: [],
  },
];

const PROFISSIONAIS: Profissional[] = [
  {
    id: "prof-mvb3084bm53mj",
    clinicaId: "comn",
    nome: "TERESA CRISTINA ANDRADE DE OLIVEIRA",
    especialidadeId: "esp-mvb2rb0t3u25i",
    horarios: [
      { dia: "Seg", inicio: "14:30", fim: "17:00" },
      { dia: "Ter", inicio: "13:30", fim: "17:00" },
      { dia: "Qua", inicio: "09:30", fim: "12:30" },
      { dia: "Qui", inicio: "13:30", fim: "17:30" },
      { dia: "Sex", inicio: "10:30", fim: "14:30" },
    ],
    idadeMinima: 15,
    procedimentos: [],
    exames: ["exame-mvb4hbf4v62pg"],
    atende: {
      "conv-mvb30cmh0be2n-unimed-intercambio": "c",
    },
    restricoes: [],
    observacoes: "",
  },
  {
    id: "prof-mvb39tc9f67ik",
    clinicaId: "oncy",
    nome: "DANIELLI DE ALMEIDA MATIAS",
    especialidadeId: "esp-mvb2ruhwfs34i",
    horarios: [
      { dia: "Ter", inicio: "08:00", fim: "12:00" },
      { dia: "Qua", inicio: "08:00", fim: "12:00" },
    ],
    valor: "R$ 350,00",
    procedimentos: [],
    exames: [],
    atende: {
      "conv-mvb3dqh446tkc-geapessencial": "c",
      "conv-mvb3dqh446tkc-geapsaude-vida": "c",
      "conv-mvb3dqh446tkc-geap-referencia-vida-ii": "c",
      "conv-mvb3dqh446tkc-geapreferencia": "c",
      "conv-mvb3dqh446tkc-geap-referencia-vida": "c",
      "conv-mvb3dqh446tkc-geapclassico": "c",
      "conv-mvb3dqh446tkc-geapfamilia": "c",
    },
    restricoes: [],
    observacoes: "",
  },
  {
    id: "prof-mvb3ndss07n86",
    clinicaId: "promater",
    nome: "Frank Cavalcanti Bahia Filho",
    especialidadeId: "esp-mvb2soprt5q1z",
    horarios: [
      { dia: "Seg", inicio: "12:00", fim: "15:00" },
    ],
    procedimentos: [],
    exames: [],
    atende: {},
    restricoes: [],
    observacoes: "",
  },
  {
    id: "prof-mvb3tn1y7x6hx",
    clinicaId: "oncoclinicas",
    nome: "Mirella Dantas Fulco",
    especialidadeId: "esp-mvb2sw9hzmbn5",
    horarios: [
      { dia: "Ter", inicio: "12:00", fim: "17:00" },
    ],
    idadeMinima: 10,
    procedimentos: [],
    exames: [],
    atende: {
      "conv-mvb3pmvc34r92-master-iicopart-cubatao": "c",
      "conv-mvb3pmvc34r92-geap-class-iirn": "c",
      "conv-mvb3pmvc34r92-geapsaude-ii": "c",
      "conv-mvb3pmvc34r92-geapfamilia": "c",
      "conv-mvb3pmvc34r92-geapclassico": "c",
    },
    restricoes: [],
    observacoes: "a cada 15 dias",
  },
  {
    id: "prof-mvb3wd2bm9vm6",
    clinicaId: "oncoclinicas-mossoro",
    nome: "Iago Tavares de Carvalho",
    especialidadeId: "esp-mvb2t7lqb5j8r",
    horarios: [],
    idadeMinima: 15,
    procedimentos: [],
    exames: [],
    atende: {
      "conv-mvb3uu3mfomla-humana-saude": "c",
      "conv-mvb3vqk3buinz-brasil-saude": "c",
    },
    restricoes: [],
    observacoes: "",
  },
  {
    id: "prof-mvb41znwk31kd",
    clinicaId: "oncoclinicas-mossoro",
    nome: "Layza Luyza de Andrade Belo Aguila",
    especialidadeId: "esp-mvb3uq5lzrpdk",
    horarios: [
      { dia: "Seg", inicio: "13:30", fim: "17:00" },
    ],
    procedimentos: [],
    exames: [],
    atende: {
      "conv-mvb3uu3mfomla-humana-saude": "c",
      "conv-mvb3uu3mfomla-humana-ma-rede-superior-propria": "c",
      "conv-mvb3uu3mfomla-humana-ne-rede-nacional": "c",
      "conv-mvb3uu3mfomla-humana-ne-rede-propria-completa": "c",
      "conv-mvb3vqk3buinz-brasil-saude": "c",
    },
    restricoes: [],
    observacoes: "Não atenderá particular",
  },
  {
    id: "prof-mvb43s2cn8p1h",
    clinicaId: "sao-marcos",
    nome: "Dario Segundo Morais de Macena",
    especialidadeId: "esp-mvb2tmba1x463",
    horarios: [
      { dia: "Qua", inicio: "12:00", fim: "17:00" },
    ],
    procedimentos: [],
    exames: [],
    atende: {
      "conv-mvb44l4ri7agj-assefaz-safira": "c",
      "conv-mvb44l4ri7agj-assefaz-cristal": "c",
      "conv-mvb44qpwksxnv-caurn": "c",
    },
    restricoes: [],
    observacoes: "",
  },
];

export function pontoZero(): Banco {
  return {
    versao: VERSAO,
    organizacoes: ORGANIZACOES.map((o) => ({ ...o })),
    clinicas: CLINICAS.map((c) => ({ ...c })),
    usuarios: USUARIOS.map((u) => ({ ...u, clinicas: [...u.clinicas] })),
    especialidades: ESPECIALIDADES.map((e) => ({ ...e })),
    convenios: CONVENIOS.map((c) => ({
      ...c,
      subtipos: c.subtipos.map((s) => ({ ...s })),
      gruposPlanos: c.gruposPlanos?.map((g) => ({ ...g, planos: [...g.planos] })),
      observacoesGerais: [...(c.observacoesGerais ?? [])],
    })),
    exames: EXAMES.map((e) => ({
      ...e,
      preparo: [...e.preparo],
      subtipos: [...e.subtipos],
    })),
    profissionais: PROFISSIONAIS.map((p) => ({
      ...p,
      horarios: p.horarios.map((h) => ({ ...h })),
      procedimentos: [...p.procedimentos],
      exames: [...p.exames],
      atende: { ...p.atende },
      restricoes: p.restricoes.map((r) => ({ ...r })),
    })),
  };
}
