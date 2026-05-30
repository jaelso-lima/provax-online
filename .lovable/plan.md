
## Objetivo

Permitir gerar simulado direto a partir do **Cronograma** (por bloco/dia) e da **Matéria** (lista de assuntos do edital), sempre usando a **banca do edital** e os conteúdos exatos do edital.

## Mudanças

### 1. Novo modal `SimuladoBlocoModal` (`src/components/SimuladoBlocoModal.tsx`)
Diálogo reutilizável que pergunta:

- **Modo** (quando há vários itens):
  - "Bloco completo" → input de quantidade **por assunto** (lista cada matéria/tópico do bloco com seu input)
  - "Escolher 1 conteúdo" → seleciona um item + input de quantidade total
- Validação: 1–20 questões por assunto, total ≤ 100.
- Ao confirmar, chama a edge function `generate-questions` no modo `prova_completa` com distribuição customizada (mesmo padrão que `CustomProvaModal` já usa), passando:
  - `banca_id` do edital (raioX/info)
  - lista `{ materia_nome, topico, quantidade }`
  - contexto extra no prompt: nome do edital/cargo e tópico exato
- Cria o simulado e navega para `/simulado/:id`.
- Reaproveita helpers de `simuladoService`/`simuladoRepository` para resolver `materia_id`/`banca_id` por nome.

### 2. Cronograma (`ViewerCronograma` em `EditalEstudoViewer.tsx`)
Abaixo de cada bloco de dia, adicionar botão pequeno **"Gerar simulado deste dia"** (ícone Sparkles, `size="sm" variant="outline"`).
- Ao clicar, abre `SimuladoBlocoModal` com:
  - `itens = dia.blocos.map(b => ({ materia: b.materia, topico: b.topico }))`
  - `bancaNome` do edital
  - `titulo = "DIA X — ..."`

### 3. Aba Estudo (lista de matérias) em `EditalEstudoViewer.tsx`
O botão atual **"Treinar essa matéria"** (linha 532) hoje só navega com `?materia_nome=`. Substituir o handler para abrir `SimuladoBlocoModal` com:
- `itens = materia.conteudos_principais.map(c => ({ materia: materia.nome, topico: c }))`
- `bancaNome` do edital
- `titulo = materia.nome`

Assim o usuário escolhe "matéria inteira" (distribui questões por assunto) ou "1 conteúdo específico".

### 4. Banca do edital
Extrair de `raioX?.banca || info?.banca` (já disponível na página). Resolver `banca_id` via `fetchBancas()` por nome (case-insensitive). Se não encontrar, gera sem filtro de banca mas envia o nome no prompt como contexto.

## Não muda

- Nenhuma alteração de DB, RLS, ou edge functions.
- `CustomProvaModal` e fluxos atuais ficam intactos.
- Geração continua passando por `generate-questions` (com `check_daily_limit` server-side já implementado).

## Detalhes técnicos

- Reaproveitar a lógica de criação de simulado de `CustomProvaModal` extraindo para helper `src/lib/criarSimuladoEdital.ts` (insere em `simulados`, chama edge function, retorna `simulado_id`).
- O modal aceita prop `bancaNome?: string` e resolve internamente para `banca_id` quando possível.
- UI mobile-first: botão pequeno (`h-7 text-xs gap-1`), alinhado à direita do cabeçalho do bloco/matéria.
