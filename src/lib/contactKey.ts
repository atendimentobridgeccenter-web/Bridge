/**
 * Chave que identifica uma pessoa no pipeline, agrupando as várias inscrições
 * que ela possa ter enviado. É o que contact_stages, evaluations e follow_ups
 * usam para se pendurar no contato em vez de num único preenchimento.
 *
 * Estava duplicada em LeadsPage, PipelinePage e ContactsPage. Vive aqui porque
 * divergência entre as cópias faria registros se pendurarem em chaves distintas
 * para a mesma pessoa.
 */
export function contactKey(lead: { email?: string | null; phone?: string | null; id: string }): string {
  return lead.email ? lead.email.toLowerCase() : (lead.phone ?? lead.id)
}
