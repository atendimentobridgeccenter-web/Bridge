-- 029_fix_field_mapping_insert.sql
-- Corrige o gatilho da 028, que estava quebrado.
--
-- O defeito: `insert into students select * from jsonb_populate_record(null::students, j)`
-- devolve NULL para toda coluna ausente no json — inclusive id, created_at e
-- updated_at. O insert então gravava esses nulos explicitamente, ignorando os
-- DEFAULT das colunas, e batia em "null value in column id violates not-null".
-- Como o fallback repetia a mesma construção, os dois caminhos falhavam e a
-- confirmação do pagamento quebrava junto.
--
-- A correção lista as colunas explicitamente. Além de deixar os defaults agirem,
-- a própria lista do insert passa a ser a lista branca — imposta pela estrutura
-- do comando, não só por verificação em tempo de execução. O array `permitidas`
-- continua, agora como segunda barreira.

create or replace function public.create_student_draft_from_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg        jsonb;
  node       jsonb;
  destino    text;
  valor      text;
  mapeado    jsonb := '{}'::jsonb;
  base       jsonb;
  final      jsonb;
  r          public.students;

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
