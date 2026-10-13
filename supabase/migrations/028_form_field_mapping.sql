-- 028_form_field_mapping.sql
-- Mapeamento configurável das respostas do formulário para a ficha do aluno.
--
-- Decisão do Everton (2026-10-12): "Quer mapeamento configurável das respostas
-- do formulário? Sim, pode ser configurável."
--
-- Como funciona: cada nó do formulário (products.form_logic_config.nodes) passa a
-- aceitar uma propriedade "mapsTo" com o nome da coluna de destino em students.
-- O gatilho de matrícula lê essa configuração e transfere as respostas. Antes
-- disso só as colunas fixas do lead (nome, e-mail, telefone, cidade) chegavam na
-- ficha, porque leads.answers é indexado por ID de nó, que varia por formulário.
--
-- DUAS PROTEÇÕES, e vale entender por quê:
--
-- 1. LISTA BRANCA de colunas de destino. Sem ela, um "mapsTo" errado (ou mal
--    intencionado) escrevendo em `status` criaria aluno já ativo sem revisão, e
--    em `lead_id` ou `class_id` corromperia os vínculos. Só campos descritivos
--    entram. Decisões de negócio — turma, mensalidade, forma de pagamento,
--    status — continuam sendo do time, não do formulário.
--
-- 2. TENTATIVA EM DOIS PASSOS. Uma resposta de texto livre caindo numa coluna
--    date ou num CHECK (subject, jlpt_level) levanta exceção. Se isso abortasse
--    o gatilho, abortaria a confirmação do pagamento junto — o cliente pagaria e
--    receberia erro. Então: tenta com os campos mapeados; se falhar, grava a
--    ficha só com os campos fixos e registra aviso. Pagamento nunca quebra por
--    causa de mapeamento mal configurado.

create or replace function public.create_student_draft_from_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg         jsonb;
  node        jsonb;
  destino     text;
  valor       text;
  mapeado     jsonb := '{}'::jsonb;
  base        jsonb;
  final       jsonb;

  -- Colunas que o formulário pode preencher. Tudo fora desta lista é ignorado.
  -- Deliberadamente ausentes: status, class_id, lead_id, id, monthly_fee,
  -- payment_method, termo_url, created_by e as colunas de controle.
  permitidas  text[] := array[
    'student_name', 'responsible_name', 'birth_date',
    'phone_responsible', 'phone_student', 'email', 'address',
    'deposit_name', 'school_year', 'pocket_id',
    'subject', 'jlpt_level', 'notes'
  ];
begin
  -- Idempotente: um rascunho por lead, mesmo que webhook e frontend confirmem
  -- o pagamento quase ao mesmo tempo no retorno do checkout.
  if exists (select 1 from public.students where lead_id = new.id) then
    return new;
  end if;

  -- Campos fixos do lead. student_name é NOT NULL: sem nome entra um marcador
  -- visível, em vez de barrar a confirmação do pagamento.
  base := jsonb_strip_nulls(jsonb_build_object(
    'lead_id',           new.id,
    'student_name',      coalesce(nullif(trim(new.name), ''), 'Sem nome — revisar'),
    'email',             nullif(trim(new.email), ''),
    'phone_responsible', nullif(trim(new.phone), ''),
    'address',           nullif(trim(new.city), ''),
    'payment_method',    case when new.stripe_session_id is not null then 'stripe' end,
    'start_date',        to_char(current_date, 'YYYY-MM-DD'),
    'status',            'rascunho'
  ));

  -- Mapeamento configurado no formulário do produto
  if new.product_id is not null and new.answers is not null then
    select p.form_logic_config->'nodes' into cfg
    from public.products p where p.id = new.product_id;

    if cfg is not null and jsonb_typeof(cfg) = 'array' then
      for node in select * from jsonb_array_elements(cfg) loop
        destino := nullif(trim(coalesce(node->>'mapsTo', '')), '');

        if destino is not null and destino = any(permitidas) then
          valor := new.answers->>(node->>'id');
          if valor is not null and trim(valor) <> '' then
            mapeado := mapeado || jsonb_build_object(destino, trim(valor));
          end if;
        end if;
      end loop;
    end if;
  end if;

  -- Os campos fixos têm a palavra final: o nome do lead é mais confiável que uma
  -- resposta solta, e status/payment_method não podem vir do formulário.
  final := mapeado || base;

  begin
    insert into public.students
    select * from jsonb_populate_record(null::public.students, final);
  exception when others then
    -- Mapeamento inválido (texto livre em coluna date, valor fora de um CHECK).
    -- Grava a ficha sem os campos mapeados para o pagamento não falhar, e deixa
    -- o motivo registrado na própria ficha, onde a equipe vai ver.
    insert into public.students
    select * from jsonb_populate_record(
      null::public.students,
      base || jsonb_build_object(
        'notes',
        'Atenção: o mapeamento de campos do formulário falhou (' || sqlerrm ||
        '). Os dados das respostas não foram transferidos — confira no card do lead.'
      )
    );
  end;

  return new;
end $$;

comment on function public.create_student_draft_from_lead() is
  'Cria ficha de aluno em rascunho quando o pagamento do lead é confirmado. '
  'Transfere as colunas fixas do lead mais as respostas cujo nó do formulário '
  'tenha "mapsTo" apontando para uma coluna da lista branca interna.';
