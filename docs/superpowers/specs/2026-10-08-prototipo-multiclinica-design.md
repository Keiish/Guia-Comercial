# Protótipo multiclínica: desenho

Data: 08/10/2026 · Status: aprovado na conversa, aguardando revisão do documento

## Objetivo

Fechar o protótipo da cartilha web para uma apresentação ao vivo, conduzida pelo Péricles na própria tela, para a Letícia e o Jonathan. O protótipo roda só local, começa vazio (só a estrutura de clínicas e usuários) e o cadastro é feito ao vivo. Os dados ficam organizados como as futuras tabelas, para trocar o armazenamento por um banco ainda a escolher sem refazer as telas.

Fora deste trabalho: banco de dados, login com senha de verdade, publicação online, chatbot, integração com agenda, importação por planilha.

## 1. Modelo de dados

Um tipo por futura tabela, em `lib/modelo.ts`. Ids são texto.

| Entidade | Campos |
|---|---|
| `Organizacao` | id, nome |
| `Clinica` (unidade) | id, organizacaoId, nome, logo? |
| `Usuario` | id, nome, email, papel, clinicas: string[] |
| `Especialidade` | id, clinicaId, nome, icone |
| `Convenio` | id, clinicaId, nome, cor, logo?, subtipos: {id, nome}[] |
| `Exame` | id, clinicaId, nome, preparo: string[], documentos, subtipos: string[] |
| `Profissional` | id, clinicaId, especialidadeId, nome, horarios, idadeMinima?, procedimentos, exames, atende, restricoes, observacoes |

- `logo` é uma imagem em data URL, já reduzida (ver seção 4).
- `Convenio.cor` e `Especialidade.icone` são escolhidos automaticamente no cadastro (cor seguinte de uma paleta fixa; ícone padrão de estetoscópio). Não viram campo de formulário.
- `Profissional.horarios`, `atende` e `restricoes` mantêm o formato atual do protótipo.
- Médico que atende em duas clínicas é cadastrado nas duas (convênios e regras podem diferir).
- Sai o conceito de "setor dentro da clínica" (`Setor`, `setorId`, `visivelPara`): a clínica cumpre esse papel.

Na tela, a unidade se chama **Clínica**; a organização aparece como **Organização**. Todos os papéis veem o nome da organização (no seletor do menu e, para quem acessa, na tela Clínicas); só Administrador e Comercial criam organizações. (Decidido em 08/10/2026.)

## 2. Papéis e permissões

| Papel | Vê | Edita dados das clínicas | Cria organização e clínica | Cria usuário |
|---|---|---|---|---|
| `administrador` | todas | todas | sim | sim |
| `comercial` | todas | todas | sim | não |
| `coordenador` | só as vinculadas | só as vinculadas | não | não |
| `recepcao` (Recepção/Central) | só as vinculadas | nenhuma | não | não |

- `Usuario.clinicas` vazio vale "todas" e só é permitido para `administrador` e `comercial`.
- Coordenador e Recepção podem ter várias clínicas vinculadas; escolhem a atual no seletor do menu.
- Os nomes aparecem como no pedido: Administrador, Comercial, Coordenador, Recepção/Central. Nenhuma menção a "Mountain" no sistema.

## 3. Camada de dados (`lib/repositorio.ts`)

Único código que lê e grava dados. As telas não sabem onde os dados ficam.

- Armazenamento atual: um JSON único no `localStorage`, chave `cartilha:v1`. Se a chave não existir ou o formato não bater com a versão, carrega o ponto zero.
- Leitura: `clinicasDo(usuario)`, `organizacoes()`, `dadosDaClinica(clinicaId)` (especialidades, convênios, exames, profissionais), `usuarios()`.
- Gravação: `salvarProfissional`, `salvarExame`, `salvarConvenio`, `salvarEspecialidade`, `salvarClinica`, `salvarOrganizacao`, `salvarUsuario`, `restaurarDemonstracao`. Toda gravação recebe o usuário e confere a permissão antes; sem permissão, lança um erro com mensagem em português.
- Permissões: `podeVer(usuario, clinicaId)`, `podeEditar(usuario, clinicaId)`, `podeCriarClinica(usuario)`, `podeCriarUsuario(usuario)`. São funções puras, testáveis, e o desenho prevê movê-las para o servidor na v1.
- Na v1, `dadosDaClinica` roda no servidor e o banco inteiro não vai para o navegador: a ocultação de observações internas para a Recepção hoje é só de interface.
- O `store` (`lib/store.tsx`) guarda usuário e clínica atuais, chama o repositório e redesenha. Não aplica regra de acesso por conta própria.
- Funções síncronas: suficiente para o protótipo. Na troca pelo banco, o `store` passa a esperar as respostas; as telas continuam iguais.

## 4. Telas

| Tela | Quem vê | Comportamento |
|---|---|---|
| Login | todos | e-mail e senha só visuais; lista dos usuários de teste com o alcance de cada um. Com uma clínica só, entra direto nela; com várias, na primeira vinculada; Administrador e Comercial caem em Clínicas |
| Seletor de clínica (topo do menu) | todos | logo e nome da clínica atual. Troca entre as permitidas; com uma só, mostra cadeado |
| Busca rápida, Especialidades, Convênios, Exames, página do médico | todos | como hoje, restritas à clínica atual. Botões de cadastrar e editar só para quem `podeEditar` a clínica atual |
| Clínicas | Administrador, Comercial, Coordenador | organizações com suas clínicas (Coordenador vê só as suas). Quem pode editar troca nome e logo; Administrador e Comercial criam organização e clínica |
| Usuários | Administrador | lista e cadastro: nome, e-mail, papel, clínicas vinculadas (seleção múltipla). Botão **Restaurar demonstração**, com confirmação na própria tela |

Logos:
- Clínica: seletor do menu e cartões da tela Clínicas.
- Convênio: tela Convênios, tabela de convênios da página do médico, "convênios que cobrem" do exame.
- Envio: clicar no quadro da logo no cadastro ou na edição e escolher um arquivo. A imagem é reduzida no navegador (canvas) para no máximo 256 px no lado maior antes de guardar. Arquivo que não é imagem gera aviso.
- Sem logo: iniciais sobre a cor do convênio ou da clínica.

Saem: tela "Usuários e setores" (vira "Usuários"), campo Setor no cadastro do médico, clínicas e médicos de exemplo, dados da Unidade Centro e da Unidade Norte.

## 5. Ponto zero da demonstração

Organizações e clínicas:

| Organização | Clínicas |
|---|---|
| Clínica de Oncologia e Mastologia | COMN, ONCY |
| Promater | Promater |
| Nossa Clínica | Nossa Clínica |
| Oncology Group - Mossoró | Oncology Group - Mossoró |
| Oncoclínicas | Oncoclínicas |
| Oncoclínicas Mossoró | Oncoclínicas Mossoró |
| Clínica São Marcos | Clínica São Marcos |

Usuários de teste (e-mails fictícios):

| Nome | Papel | Clínicas |
|---|---|---|
| Administrador | administrador | todas |
| Comercial | comercial | todas |
| Coordenador COMN | coordenador | COMN |
| Central de atendimento COMN | recepcao | COMN |
| Recepção COMN | recepcao | COMN |
| Recepção ONCY | recepcao | ONCY |
| Usuário Promater | recepcao | Promater |

Especialidades, convênios, exames e médicos: vazios em todas as clínicas.

## 6. Erros e casos de borda

- `localStorage` cheio ou bloqueado: o app segue em memória e mostra o aviso "Não foi possível salvar neste navegador".
- Gravação sem permissão: o repositório recusa e o aviso mostra a mensagem do erro.
- Página de médico de outra clínica aberta pelo endereço: "Profissional não encontrado".
- Usuário cuja clínica atual deixou de ser permitida: volta para a primeira clínica permitida.
- Telas vazias: cada lista tem um texto de vazio que diz o que cadastrar primeiro (ex.: "Cadastre uma especialidade antes do primeiro médico").

## 7. Verificação

- `lib/dados.check.mjs` (roda com `node lib/dados.check.mjs`) passa a cobrir:
  - Recepção ONCY não vê a COMN; Recepção COMN não vê a ONCY;
  - Coordenador COMN edita a COMN e não edita a ONCY;
  - Comercial edita qualquer clínica e não cria usuário;
  - Recepção não grava nada (o repositório lança erro);
  - ponto zero com 7 organizações, 8 clínicas, 7 usuários e nenhum médico;
  - a busca "convênio + consulta" não retorna médico que só atende exame (regra da skill `modelo-dados-clinica`).
- `npx tsc --noEmit` e `npm run build` sem erros.
- No navegador, o roteiro da seção 8 de ponta a ponta, com um recarregamento no meio para confirmar que nada some.

## 8. Roteiro da apresentação

1. Entrar como **Coordenador COMN**: enviar a logo da COMN; cadastrar um convênio com rede e logo, uma especialidade, um médico com horários e um exame com preparo.
2. Entrar como **Recepção COMN**: buscar "quem atende" o convênio cadastrado e abrir a página do médico.
3. Entrar como **Recepção ONCY**: mostrar que a COMN não aparece.
4. Entrar como **Administrador**: mostrar as 7 organizações e criar um usuário vinculado à COMN e à ONCY.

Antes de apresentar: Administrador → Usuários → Restaurar demonstração.
