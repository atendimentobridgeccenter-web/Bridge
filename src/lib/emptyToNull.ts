/**
 * Converte string vazia em null antes de gravar.
 *
 * Input de formulário entrega `''` quando está em branco, e o Postgres recusa
 * `''` em coluna date, time, uuid e numeric — o erro é 22007
 * ("invalid input syntax for type date"). Era o que impedia criar aluno: cinco
 * campos de data saíam vazios do formulário.
 *
 * Fica na camada de mutação, e não em cada formulário, porque é a única garantia
 * que não depende de alguém lembrar. Formulário novo entra protegido.
 *
 * Em coluna de texto a troca é inofensiva: nesta base, campo em branco e campo
 * ausente significam a mesma coisa. Em coluna NOT NULL é até melhor — null falha
 * com erro explícito, enquanto `''` gravaria um nome de aluno vazio em silêncio.
 */
// `T extends object` e não `Record<string, unknown>`: interface declarada sem
// index signature (LeadPatch, por exemplo) não satisfaz Record.
export function emptyToNull<T extends object>(patch: T): T {
  const out = { ...patch } as Record<string, unknown>
  for (const key of Object.keys(out)) {
    if (out[key] === '') out[key] = null
  }
  return out as T
}
