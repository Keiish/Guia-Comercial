// Tipos do protótipo, um por futura tabela do banco. Ids são texto.

export type Tipo = "consulta" | "exame";
export type Papel = "administrador" | "comercial" | "coordenador" | "central" | "recepcao";

export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
// ponytail: um intervalo por dia; dois turnos separados no mesmo dia viram lista por dia
export type Horario = { dia: string; inicio: string; fim: string };
export type Restricao = { texto: string; subtipoId?: string };

export type Organizacao = { id: string; nome: string };
export type Clinica = { id: string; organizacaoId: string; nome: string; logo?: string };
// clinicas vazio = todas; só vale para Administrador e Comercial
export type Usuario = { id: string; nome: string; email: string; papel: Papel; clinicas: string[] };

export type Especialidade = { id: string; clinicaId: string; nome: string; icone: string };
export type Subtipo = { id: string; nome: string };
export type GrupoPlanoStatus = "atende" | "somente_exames" | "nao_atende";
export type GrupoPlano = {
  id?: string;
  status: GrupoPlanoStatus;
  titulo: string;
  nota?: string;
  planos: string[];
};
export type Convenio = {
  id: string;
  clinicaId: string;
  nome: string;
  cor: string;
  logo?: string;
  subtipos: Subtipo[];
  gruposPlanos?: GrupoPlano[];
  observacoesGerais?: string[];
  atualizadoEm?: string;
  atualizadoPor?: string;
};
export type Exame = {
  id: string;
  clinicaId: string;
  nome: string;
  preparo: string[];
  documentos?: string;
  valor?: string;
  observacoes?: string;
  observacoesInternas?: string;
  subtipos: string[];
  atualizadoEm?: string;
  atualizadoPor?: string;
};
// `atende` mapeia subtipo → "c" (consulta), "e" (exame) ou "ce" (ambos)
export type Profissional = {
  id: string;
  clinicaId: string;
  especialidadeId: string;
  nome: string;
  horarios: Horario[];
  idadeMinima?: number;
  procedimentos: string[];
  exames: string[];
  valor?: string;
  atende: Record<string, string>;
  restricoes: Restricao[];
  observacoes: string;
  observacoesInternas?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
};

// Sobe quando o formato muda; dado guardado com outra versão é descartado
export const VERSAO = 4;
export type Banco = {
  versao: number;
  organizacoes: Organizacao[];
  clinicas: Clinica[];
  usuarios: Usuario[];
  especialidades: Especialidade[];
  convenios: Convenio[];
  exames: Exame[];
  profissionais: Profissional[];
};

// O que as telas de consulta recebem: os dados de uma clínica
export type DadosClinica = Pick<Banco, "especialidades" | "convenios" | "exames" | "profissionais">;
