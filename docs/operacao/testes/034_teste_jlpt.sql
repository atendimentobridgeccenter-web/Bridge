-- 034_teste_jlpt.sql
-- Teste manual para a migration `supabase/migrations/034_jlpt_level_server_side.sql`
-- (OS-010). RODAR NO SQL EDITOR DO SUPABASE *ANTES* de aplicar a 034 em
-- definitivo — a 034 já precisa estar aplicada no banco onde este arquivo
-- roda (cria/substitui a função; este arquivo só testa o resultado).
--
-- Fica fora da migration de propósito (Gate 2, volta 1): um `supabase db
-- push` roda o arquivo de migration dentro de uma transação, e um
-- `rollback;` no meio dela desfaria a própria migration — a correção não
-- ficaria no banco, sem aviso nenhum. Aqui, isolado, o `rollback;` só
-- desfaz os dados de teste.
--
-- Nenhum dado fica no banco: tudo roda dentro de `begin; ... rollback;`.
-- Se todos os `assert` passarem, aparece
--   NOTICE: OS-010: todos os 7 casos de teste passaram.
-- Se algum falhar, a transação aborta com erro antes de chegar lá (efeito
-- igual ao rollback — nenhum lixo fica no banco de qualquer forma).
--
-- Casos cobertos:
--   1. Declarado + avaliação completa juntos → declarado vence.
--   2. Avaliação completa SEM declaração, com o navegador tendo gravado um
--      nível diferente em `{nodeId}` → o servidor ignora o navegador e usa
--      o recalculado (defeito original da OS, caminho principal).
--   3. Defeito original: "Não sei" no nível + outro campo mapeado (sem
--      avaliação nenhuma) → a ficha nasce com o outro campo e jlpt_level
--      nulo (antes da 034, isso quebrava a ficha inteira).
--   4. Avaliação incompleta (falta resposta), sem declaração → nulo, resto
--      intacto.
--   5. Avaliação com zero questões → nulo (não pode dar N5 de graça pra
--      quem nunca viu o bloco).
--   6. Configuração corrompida (points em texto, bands vazio) → nulo, resto
--      intacto, pagamento não quebra.
--   7. "n3" minúsculo → N3.

begin;
do $$
declare
  pid           uuid;
  lid           uuid;
  result_jlpt   text;

  cfg_base jsonb := jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'nivel1', 'type', 'question', 'mapsTo', 'jlpt_level'
      ),
      jsonb_build_object(
        'id', 'aval1', 'type', 'assessment',
        'assessment', jsonb_build_object(
          'questions', jsonb_build_array(
            jsonb_build_object(
              'id', 'q1', 'title', 'pergunta 1',
              'options', jsonb_build_array(
                jsonb_build_object('id', 'a', 'label', 'A', 'points', 0),
                jsonb_build_object('id', 'b', 'label', 'B', 'points', 10)
              )
            )
          ),
          'bands', jsonb_build_array(
            jsonb_build_object('minScore', 0,  'level', 'N5'),
            jsonb_build_object('minScore', 10, 'level', 'N3')
          )
        )
      ),
      jsonb_build_object(
        -- mapsTo student_name/email/phone_responsible/address nunca
        -- aparece na ficha via mapeamento: o `base` (029) sempre tem um
        -- valor pra esses 4 (até o fallback "Sem nome — revisar") e vence
        -- no `final := mapeado || base`. Por isso o teste usa school_year,
        -- que não está em `base`, pra provar que "o outro campo mapeado"
        -- sobrevive quando jlpt_level é descartado.
        'id', 'serie', 'type', 'question', 'mapsTo', 'school_year'
      )
    )
  );

  cfg_zero_questoes jsonb := jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'aval1', 'type', 'assessment',
        'assessment', jsonb_build_object(
          'questions', '[]'::jsonb,
          'bands', jsonb_build_array(
            jsonb_build_object('minScore', 0, 'level', 'N5')
          )
        )
      )
    )
  );

  cfg_corrompida jsonb := jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'aval1', 'type', 'assessment',
        'assessment', jsonb_build_object(
          'questions', jsonb_build_array(
            jsonb_build_object(
              'id', 'q1', 'title', 'pergunta 1',
              'options', jsonb_build_array(
                jsonb_build_object('id', 'a', 'label', 'A', 'points', 'muitos') -- points em texto
              )
            )
          ),
          'bands', '[]'::jsonb -- bands vazio
        )
      )
    )
  );
begin
  insert into public.products (name, slug, price_id_stripe, form_logic_config, status)
  values ('OS-010 teste', 'os-010-teste-' || gen_random_uuid(), 'price_teste_os010', cfg_base, 'published')
  returning id into pid;

  -- Caso 1: declarado (N3 — Intermediário) + avaliação completa (soma=0 →
  -- N5 pela avaliação) → declarado vence, mesmo sendo um nível diferente do
  -- que a avaliação daria.
  insert into public.leads (product_id, email, payment_status, answers)
  values (pid, 'teste1@x.com', 'none',
    jsonb_build_object('nivel1', 'N3 — Intermediário', 'aval1.q.q1', 'a'))
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt = 'N3', 'Caso 1 (declarado vence) falhou: ' || coalesce(result_jlpt, 'null');

  -- Caso 2 (caminho principal da OS): avaliação completa, SEM declaração,
  -- com o navegador tendo gravado 'N5' em `aval1` (resultado exibido pro
  -- aluno) mas a resposta real (`aval1.q.q1` = 'b', 10 pontos) dá N3 pela
  -- faixa. O servidor precisa ignorar o `aval1` do navegador e usar o
  -- recalculado.
  insert into public.leads (product_id, email, payment_status, answers)
  values (pid, 'teste2@x.com', 'none',
    jsonb_build_object('aval1', 'N5', 'aval1.score', '10/10', 'aval1.q.q1', 'b'))
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt = 'N3',
    'Caso 2 (recalcula, ignora o navegador) falhou: ' || coalesce(result_jlpt, 'null');

  -- Caso 3 (defeito original da OS): "Não sei" no nível + outro campo
  -- mapeado (school_year), sem avaliação nenhuma → a ficha nasce com o
  -- outro campo e jlpt_level nulo. Antes da 034, "Não sei" quebrava o CHECK
  -- e a ficha inteira caía no fallback, sem nenhum campo mapeado.
  insert into public.leads (product_id, email, payment_status, answers)
  values (pid, 'teste3@x.com', 'none',
    jsonb_build_object('nivel1', 'Não sei', 'serie', '3º ano'))
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt is null, 'Caso 3 (Não sei) falhou: ' || coalesce(result_jlpt, 'null');
  assert (select school_year from public.students where lead_id = lid) = '3º ano',
    'Caso 3: o outro campo mapeado (school_year) não chegou na ficha — defeito original não corrigido';

  -- Caso 4: avaliação incompleta (sem resposta pra q1), sem declaração →
  -- nulo, resto da ficha intacto.
  insert into public.leads (product_id, email, name, payment_status, answers)
  values (pid, 'teste4@x.com', 'Fulano Teste', 'none', '{}'::jsonb)
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt is null, 'Caso 4 (incompleta) falhou: ' || coalesce(result_jlpt, 'null');
  assert (select student_name from public.students where lead_id = lid) = 'Fulano Teste',
    'Caso 4: resto da ficha não ficou intacto';

  -- Caso 5: avaliação com zero questões → nulo (não pode dar N5 de graça).
  update public.products set form_logic_config = cfg_zero_questoes where id = pid;
  insert into public.leads (product_id, email, payment_status, answers)
  values (pid, 'teste5@x.com', 'none', '{}'::jsonb)
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt is null, 'Caso 5 (zero questões) falhou: ' || coalesce(result_jlpt, 'null');

  -- Caso 6: "n3" minúsculo → N3.
  update public.products set form_logic_config = cfg_base where id = pid;
  insert into public.leads (product_id, email, payment_status, answers)
  values (pid, 'teste6@x.com', 'none', jsonb_build_object('nivel1', 'n3'))
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt = 'N3', 'Caso 6 (n3 minúsculo) falhou: ' || coalesce(result_jlpt, 'null');

  -- Caso 7: configuração corrompida (points em texto, bands vazio) → nulo,
  -- resto da ficha intacto, pagamento não quebra.
  update public.products set form_logic_config = cfg_corrompida where id = pid;
  insert into public.leads (product_id, email, name, payment_status, answers)
  values (pid, 'teste7@x.com', 'Ciclano Teste', 'none',
    jsonb_build_object('aval1.q.q1', 'a'))
  returning id into lid;
  update public.leads set payment_status = 'confirmed' where id = lid;
  select jlpt_level into result_jlpt from public.students where lead_id = lid;
  assert result_jlpt is null, 'Caso 7 (config corrompida) falhou: ' || coalesce(result_jlpt, 'null');
  assert (select student_name from public.students where lead_id = lid) = 'Ciclano Teste',
    'Caso 7: resto da ficha não ficou intacto';

  raise notice 'OS-010: todos os 7 casos de teste passaram.';
end $$;
rollback;
