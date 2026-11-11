-- 034_jlpt_level_server_side.sql
-- Recria create_student_draft_from_lead() para calcular o jlpt_level no
-- servidor, com uma regra própria e independente da ordem dos nós. Origem:
-- OS-010 (spec `docs/operacao/specs/avaliacao-nivelamento.md`, "Regra do
-- servidor").
--
-- O QUE MUDA EM RELAÇÃO À 029
--   - jlpt_level sai do laço genérico de mapeamento (que faz "o último nó
--     vence") e passa a ter cálculo próprio, com tratamento de exceção
--     separado do bloco principal do insert:
--       1. Nível declarado: primeiro valor válido (N1-N5, via upper() +
--          extração do padrão N[1-5]) entre os nós com mapsTo = 'jlpt_level'
--          e type <> 'assessment', na ordem do array. Se existir, vence —
--          mesmo que também exista uma avaliação completa.
--       2. Sem nível declarado válido: recalcula a partir do primeiro nó
--          type = 'assessment' cuja avaliação esteja completa (todas as
--          questões da configuração atual com resposta `{nodeId}.q.{qId}`
--          cujo ID existe entre as alternativas). Soma os pontos e escolhe
--          a faixa de maior minScore que seja ≤ à soma. O valor de
--          `{nodeId}` enviado pelo navegador é ignorado.
--       3. Nada válido (avaliação incompleta e sem declaração): jlpt_level
--          fica nulo. Só esse campo é descartado — o resto do mapeamento
--          (laço genérico, de 029) continua normalmente.
--   - O cálculo confere os tipos (jsonb_typeof) antes de usar os valores e
--     fica dentro do seu próprio `begin ... exception when others`: uma
--     configuração corrompida (pontos em texto, faixas sem minScore
--     numérico, bands vazio) deixa só o jlpt_level nulo e nunca derruba a
--     confirmação do pagamento nem os outros campos — o insert principal e
--     o fallback de 029 continuam intactos, fora deste bloco.
--   - "n3" e "N3 — Intermediário" continuam virando N3 (upper() + extração
--     do primeiro N[1-5] encontrado), igual à regra de "nível declarado".
--
-- O QUE NÃO MUDA
--   - Lista branca de colunas (`permitidas`), idempotência (um student por
--     lead), campos fixos do lead vencendo o mapeamento, insert com colunas
--     explícitas, fallback que grava só os campos fixos em caso de erro,
--     security definer com search_path = public.
--   - O gatilho `leads_confirmed_creates_student` (022:75-79) continua
--     apontando para esta função por nome — não precisa ser recriado.
--
-- LIMITAÇÃO REGISTRADA (Gate 1)
--   A especificação não cobre o caso de mais de um nó `assessment`. Usa-se a
--   primeira avaliação completa na ordem do array; se nenhuma estiver
--   completa, jlpt_level fica nulo (mesmo resultado do caso "nenhum nó
--   assessment").
--
-- CONFERÊNCIA / TESTE (OS-010, volta 2 do Gate 2): o SQL de teste NÃO fica
-- neste arquivo. Um `supabase db push` roda o arquivo de migration dentro de
-- uma transação; um `rollback;` no meio da migration desfaria a própria
-- migration (a função nova incluída), deixando a correção fora do banco sem
-- avisar. O teste está em `docs/operacao/testes/034_teste_jlpt.sql` — rodar
-- esse arquivo (begin; do $$ ... $$; rollback;) no SQL Editor ANTES de
-- aplicar esta migration em definitivo. Cobre: declarado + avaliação
-- completa juntos (declarado vence), avaliação completa sem declaração com
-- o navegador tendo gravado outro nível em {nodeId} (prova de que o
-- servidor ignora o valor do navegador), o defeito original ("Não sei" com
-- outro campo mapeado → ficha com o outro campo e jlpt_level nulo),
-- avaliação incompleta sozinha (nulo), avaliação com zero questões (nulo),
-- configuração corrompida (nulo) e "n3" minúsculo (vira N3).

create or replace function public.create_student_draft_from_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg          jsonb;
  node         jsonb;
  destino      text;
  valor        text;
  mapeado      jsonb := '{}'::jsonb;
  base         jsonb;
  final        jsonb;
  r            public.students;

  -- ── OS-010: cálculo do jlpt_level ──────────────────────────────
  jlpt_calc    text := null;
  jlpt_encontrado boolean := false;
  aval         jsonb;
  pergunta     jsonb;
  opcao        jsonb;
  resposta_id  text;
  pontos_q     numeric;
  soma         numeric;
  completa     boolean;
  faixa        jsonb;
  melhor_min   numeric;
  melhor_nivel text;

  permitidas text[] := array[
    'student_name', 'responsible_name', 'birth_date',
    'phone_responsible', 'phone_student', 'email', 'address',
    'deposit_name', 'school_year', 'pocket_id',
    'subject', 'jlpt_level', 'notes'
  ];
begin
  if exists (select 1 from public.students where lead_id = new.id) then
    return new;
  end if;

  base := jsonb_strip_nulls(jsonb_build_object(
    'student_name',      coalesce(nullif(trim(new.name), ''), 'Sem nome — revisar'),
    'email',             nullif(trim(new.email), ''),
    'phone_responsible', nullif(trim(new.phone), ''),
    'address',           nullif(trim(new.city), '')
  ));

  if new.product_id is not null and new.answers is not null then
    select p.form_logic_config->'nodes' into cfg
    from public.products p where p.id = new.product_id;

    if cfg is not null and jsonb_typeof(cfg) = 'array' then

      -- ── 1. Nível declarado (primeiro válido, nunca "último vence") ──
      begin
        for node in select * from jsonb_array_elements(cfg) loop
          exit when jlpt_encontrado;
          if coalesce(node->>'type', '') <> 'assessment'
             and nullif(trim(coalesce(node->>'mapsTo', '')), '') = 'jlpt_level' then
            valor := new.answers->>(node->>'id');
            if valor is not null and trim(valor) <> '' then
              valor := substring(upper(trim(valor)) from 'N[1-5]');
              if valor is not null then
                jlpt_calc := valor;
                jlpt_encontrado := true;
              end if;
            end if;
          end if;
        end loop;
      exception when others then
        jlpt_calc := null;
        jlpt_encontrado := false;
      end;

      -- ── 2. Sem declaração válida: recalcula pela primeira avaliação
      --      completa, na ordem do array ────────────────────────────
      if not jlpt_encontrado then
        begin
          for node in select * from jsonb_array_elements(cfg) loop
            exit when jlpt_encontrado;

            if coalesce(node->>'type', '') = 'assessment'
               and jsonb_typeof(node->'assessment') = 'object'
               and jsonb_typeof(node->'assessment'->'questions') = 'array'
               and jsonb_array_length(node->'assessment'->'questions') > 0
               and jsonb_typeof(node->'assessment'->'bands') = 'array' then

              aval     := node->'assessment';
              completa := true;
              soma     := 0;

              for pergunta in select * from jsonb_array_elements(aval->'questions') loop
                if jsonb_typeof(pergunta->'options') <> 'array' then
                  completa := false;
                  exit;
                end if;

                resposta_id := new.answers->>((node->>'id') || '.q.' || (pergunta->>'id'));
                if resposta_id is null or trim(resposta_id) = '' then
                  completa := false;
                  exit;
                end if;

                pontos_q := null;
                for opcao in select * from jsonb_array_elements(pergunta->'options') loop
                  if opcao->>'id' = resposta_id then
                    if jsonb_typeof(opcao->'points') = 'number' then
                      pontos_q := (opcao->>'points')::numeric;
                    end if;
                  end if;
                end loop;

                if pontos_q is null then
                  completa := false;
                  exit;
                end if;

                soma := soma + pontos_q;
              end loop;

              if completa then
                melhor_min   := null;
                melhor_nivel := null;

                for faixa in select * from jsonb_array_elements(aval->'bands') loop
                  if jsonb_typeof(faixa->'minScore') = 'number'
                     and (faixa->>'level') ~ '^N[1-5]$' then
                    if (faixa->>'minScore')::numeric <= soma
                       and (melhor_min is null or (faixa->>'minScore')::numeric > melhor_min) then
                      melhor_min   := (faixa->>'minScore')::numeric;
                      melhor_nivel := faixa->>'level';
                    end if;
                  end if;
                end loop;

                if melhor_nivel is not null then
                  jlpt_calc := melhor_nivel;
                  jlpt_encontrado := true;
                end if;
              end if;
            end if;
          end loop;
        exception when others then
          -- Configuração corrompida (points em texto, bands malformado,
          -- etc.): descarta só o jlpt_level, nunca o resto do mapeamento.
          jlpt_calc := null;
          jlpt_encontrado := false;
        end;
      end if;
    end if;
  end if;

  -- ── Laço genérico de mapeamento (029), sem jlpt_level ────────────
  if new.product_id is not null and new.answers is not null and cfg is not null
     and jsonb_typeof(cfg) = 'array' then
    for node in select * from jsonb_array_elements(cfg) loop
      destino := nullif(trim(coalesce(node->>'mapsTo', '')), '');
      if destino is not null and destino = any(permitidas) and destino <> 'jlpt_level' then
        valor := new.answers->>(node->>'id');
        if valor is not null and trim(valor) <> '' then
          mapeado := mapeado || jsonb_build_object(destino, trim(valor));
        end if;
      end if;
    end loop;
  end if;

  if jlpt_calc is not null then
    mapeado := mapeado || jsonb_build_object('jlpt_level', jlpt_calc);
  end if;

  -- Campos fixos do lead vencem o mapeamento: o nome registrado no lead é mais
  -- confiável que uma resposta solta do formulário.
  final := mapeado || base;

  begin
    -- A coerção de texto para date/numeric/CHECK acontece aqui. Se falhar, cai
    -- no bloco de exceção e a ficha ainda é criada.
    select * into r from jsonb_populate_record(null::public.students, final);

    insert into public.students (
      lead_id, status, start_date, payment_method,
      student_name, responsible_name, birth_date,
      phone_responsible, phone_student, email, address,
      deposit_name, school_year, pocket_id,
      subject, jlpt_level, notes
    ) values (
      new.id, 'rascunho', current_date,
      case when new.stripe_session_id is not null then 'stripe' end,
      r.student_name, r.responsible_name, r.birth_date,
      r.phone_responsible, r.phone_student, r.email, r.address,
      r.deposit_name, r.school_year, r.pocket_id,
      r.subject, r.jlpt_level, r.notes
    );

  exception when others then
    -- Mapeamento inválido. Grava só os campos fixos, para o pagamento não falhar,
    -- e deixa o motivo na ficha, onde a equipe vai ver na revisão do rascunho.
    insert into public.students (
      lead_id, status, start_date, payment_method,
      student_name, email, phone_responsible, address, notes
    ) values (
      new.id, 'rascunho', current_date,
      case when new.stripe_session_id is not null then 'stripe' end,
      coalesce(nullif(trim(new.name), ''), 'Sem nome — revisar'),
      nullif(trim(new.email), ''),
      nullif(trim(new.phone), ''),
      nullif(trim(new.city), ''),
      'Atenção: o mapeamento de campos do formulário falhou (' || sqlerrm ||
      '). As respostas não foram transferidas — confira no card do lead.'
    );
  end;

  return new;
end $$;

comment on function public.create_student_draft_from_lead() is
  'Cria ficha de aluno em rascunho quando o pagamento do lead é confirmado. '
  'Transfere as colunas fixas do lead mais as respostas cujo nó do formulário '
  'tenha "mapsTo" apontando para uma coluna da lista branca interna. '
  'jlpt_level tem regra própria (OS-010): nível declarado (não-assessment) '
  'vence; senão, recalcula pela primeira avaliação completa (nó assessment) '
  'na ordem do array; sem nenhum dos dois, fica nulo — nunca derruba o resto.';
