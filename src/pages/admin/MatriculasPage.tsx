import { useState, useMemo } from 'react'
import {
  ClipboardCheck, Search, X, RefreshCw, Loader2, Users, Clock, User,
  CheckCircle2, AlertCircle, CircleDashed, Download,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStudents } from '@/hooks/useStudents'
import type { Student, StudentStatus, LeadPaymentStatus } from '@/hooks/useStudents'
import { useClasses, formatSchedule } from '@/hooks/useClasses'
import { useTeachers } from '@/hooks/useTeachers'
import ActivateEnrollmentModal from '@/components/ActivateEnrollmentModal'

// ── Tokens ────────────────────────────────────────────────────

const BG_CARD  = '#13151A'
const BG_CARD2 = '#16181F'
const BORDER   = 'rgba(255,255,255,0.07)'
const BORDER2  = 'rgba(255,255,255,0.05)'
const ACCENT   = '#E8521A'

const STUDENT_STATUS: Record<StudentStatus, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#FDBA74' },
  ativo:     { label: 'Ativo',     color: '#34D399' },
  trancado:  { label: 'Trancado',  color: '#FCD34D' },
  cancelado: { label: 'Cancelado', color: '#F87171' },
}

// Sem lead vinculado é matrícula cadastrada à mão: não há pagamento de
// formulário para consultar, então não é pendência nem confirmação.
const PAYMENT: Record<LeadPaymentStatus | 'sem_lead', { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: 'Pago',      color: '#34D399', icon: CheckCircle2  },
  pending:   { label: 'Em aberto', color: '#FCD34D', icon: AlertCircle   },
  none:      { label: 'Sem cobrança', color: '#9CA3AF', icon: CircleDashed },
  sem_lead:  { label: 'Manual',    color: '#6B7280', icon: CircleDashed },
}

function paymentOf(s: Student): keyof typeof PAYMENT {
  return s.lead ? s.lead.payment_status : 'sem_lead'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthKey(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 7)
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ── Page ──────────────────────────────────────────────────────

export default function MatriculasPage() {
  const [search,        setSearch]        = useState('')
  const [classFilter,   setClassFilter]   = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [payFilter,     setPayFilter]     = useState<keyof typeof PAYMENT | 'all'>('all')
  const [statusFilter,  setStatusFilter]  = useState<StudentStatus | 'all'>('all')
  const [monthFilter,   setMonthFilter]   = useState('all')
  const [activating,    setActivating]    = useState<Student | null>(null)

  const students = useStudents()
  const classes  = useClasses()
  const teachers = useTeachers()

  const all = students.data ?? []

  const months = useMemo(() => {
    const set = new Set<string>()
    for (const s of all) {
      const k = monthKey(s.start_date)
      if (k) set.add(k)
    }
    return Array.from(set).sort().reverse()
  }, [all])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter(s => {
      if (classFilter === '__sem_turma__') {
        if (s.class_id) return false
      } else if (classFilter !== 'all' && s.class_id !== classFilter) {
        return false
      }
      if (teacherFilter !== 'all' && s.class?.teacher?.id !== teacherFilter) return false
      if (payFilter     !== 'all' && paymentOf(s) !== payFilter) return false
      if (statusFilter  !== 'all' && s.status !== statusFilter) return false
      if (monthFilter   !== 'all' && monthKey(s.start_date) !== monthFilter) return false
      if (q) {
        const hay = [
          s.student_name, s.responsible_name ?? '', s.email ?? '',
          s.class?.name ?? '', s.class?.teacher?.name ?? '',
        ].join(' ').toLowerCase()
        if (!hay.includes(q) && !(s.phone_responsible ?? '').includes(q)) return false
      }
      return true
    })
  }, [all, search, classFilter, teacherFilter, payFilter, statusFilter, monthFilter])

  // Agrupa por turma; alunos sem turma viram um grupo próprio no fim, que é
  // justamente a fila de quem precisa ser alocado.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; schedule: string; teacher: string; capacity: number | null; rows: Student[] }>()
    for (const s of filtered) {
      const key = s.class_id ?? '__sem_turma__'
      if (!map.has(key)) {
        map.set(key, {
          key,
          name:     s.class?.name ?? 'Sem turma — aguardando alocação',
          schedule: s.class ? formatSchedule(s.class.sessions) : '—',
          teacher:  s.class?.teacher?.name ?? 'Sem professor',
          capacity: s.class?.capacity ?? null,
          rows:     [],
        })
      }
      map.get(key)!.rows.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === '__sem_turma__') return 1
      if (b.key === '__sem_turma__') return -1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [filtered])

  const totals = useMemo(() => ({
    total:     filtered.length,
    ativos:    filtered.filter(s => s.status === 'ativo').length,
    rascunhos: filtered.filter(s => s.status === 'rascunho').length,
    emAberto:  filtered.filter(s => paymentOf(s) === 'pending').length,
    semTurma:  filtered.filter(s => !s.class_id).length,
  }), [filtered])

  const anyFilter = search || classFilter !== 'all' || teacherFilter !== 'all'
    || payFilter !== 'all' || statusFilter !== 'all' || monthFilter !== 'all'

  function clearFilters() {
    setSearch(''); setClassFilter('all'); setTeacherFilter('all')
    setPayFilter('all'); setStatusFilter('all'); setMonthFilter('all')
  }

  function exportCSV() {
    const header = ['Aluno','Responsável','Turma','Professor','Horário','Início',
      'Status','Pagamento','Pago em','Mensalidade','Nome no depósito']
    const rows = filtered.map(s => [
      s.student_name, s.responsible_name ?? '',
      s.class?.name ?? '', s.class?.teacher?.name ?? '',
      s.class ? formatSchedule(s.class.sessions) : '',
      s.start_date ?? '',
      STUDENT_STATUS[s.status].label,
      PAYMENT[paymentOf(s)].label,
      s.lead?.paid_at ? fmtDate(s.lead.paid_at) : '',
      s.monthly_fee?.toString() ?? '',
      s.deposit_name ?? '',
    ])
    const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'matriculas.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls = 'px-2.5 py-1.5 rounded-lg text-[12px] text-[#EDEDED] outline-none appearance-none cursor-pointer'
  const selectStyle = { background: BG_CARD2, border: `1px solid ${BORDER}` }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-semibold text-[#EDEDED] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" style={{ color: ACCENT }} />
            Controle de Matrícula
          </h1>
          <p className="text-[12.5px] text-white/35 mt-1 max-w-[560px]">
            Quem está em cada turma, quem tem pagamento em aberto e quem ainda
            precisa ser alocado. As vagas são contadas a partir dos alunos ativos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => students.refetch()} title="Recarregar"
            className="p-2 rounded-xl text-white/30 hover:text-white/70 transition-all"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <RefreshCw className={cn('w-3.5 h-3.5', students.isFetching && 'animate-spin')} />
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-medium flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-all disabled:opacity-30"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Matrículas"      value={totals.total}     color="#EDEDED" />
        <Stat label="Ativos"          value={totals.ativos}    color="#34D399" />
        <Stat label="Rascunhos"       value={totals.rascunhos} color="#FDBA74"
              hint="Criados pelo pagamento, aguardando revisão" />
        <Stat label="Pagto. em aberto" value={totals.emAberto} color="#FCD34D" />
        <Stat label="Sem turma"       value={totals.semTurma}  color="#F87171"
              hint="Precisam ser alocados" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-white/25 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno, responsável, turma, professor…"
            className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none min-w-0" />
        </div>

        <select className={selectCls} style={selectStyle}
          value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="all">Todas as turmas</option>
          <option value="__sem_turma__">Sem turma (a alocar)</option>
          {(classes.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className={selectCls} style={selectStyle}
          value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
          <option value="all">Todos os professores</option>
          {(teachers.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select className={selectCls} style={selectStyle}
          value={payFilter} onChange={e => setPayFilter(e.target.value as keyof typeof PAYMENT | 'all')}>
          <option value="all">Qualquer pagamento</option>
          {(Object.keys(PAYMENT) as (keyof typeof PAYMENT)[]).map(k => (
            <option key={k} value={k}>{PAYMENT[k].label}</option>
          ))}
        </select>

        <select className={selectCls} style={selectStyle}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as StudentStatus | 'all')}>
          <option value="all">Qualquer status</option>
          {(Object.keys(STUDENT_STATUS) as StudentStatus[]).map(k => (
            <option key={k} value={k}>{STUDENT_STATUS[k].label}</option>
          ))}
        </select>

        <select className={selectCls} style={selectStyle}
          value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="all">Qualquer mês de início</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        {anyFilter && (
          <button onClick={clearFilters}
            className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium text-white/40 hover:text-white/75 transition-all flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Content */}
      {students.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardCheck className="w-10 h-10 text-white/8" />
          <p className="text-[13px] text-white/30">
            {anyFilter ? 'Nenhuma matrícula com esses filtros' : 'Nenhuma matrícula registrada'}
          </p>
          {!anyFilter && (
            <p className="text-[12px] text-white/20 max-w-[340px] text-center">
              As fichas aparecem aqui conforme os pagamentos são confirmados ou a
              equipe cadastra alunos manualmente.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(g => (
            <div key={g.key} className="rounded-2xl overflow-hidden"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>

              {/* Group header */}
              <div className="px-4 py-3 flex items-center gap-3 flex-wrap"
                style={{ background: BG_CARD2, borderBottom: `1px solid ${BORDER2}` }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#EDEDED] truncate">{g.name}</p>
                  {g.key !== '__sem_turma__' && (
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-white/35 flex items-center gap-1 tabular-nums">
                        <Clock className="w-2.5 h-2.5" /> {g.schedule}
                      </span>
                      <span className="text-[11px] text-white/35 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" /> {g.teacher}
                      </span>
                    </div>
                  )}
                </div>
                <GroupCount rows={g.rows} capacity={g.capacity} />
              </div>

              {/* Rows */}
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER2}` }}>
                      {['Aluno', 'Início', 'Status', 'Pagamento', 'Mensalidade', ''].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(s => {
                      const st  = STUDENT_STATUS[s.status]
                      const pay = PAYMENT[paymentOf(s)]
                      const PayIcon = pay.icon
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors"
                          style={{ borderBottom: `1px solid ${BORDER2}` }}>
                          <td className="px-4 py-2.5">
                            <p className="text-[12.5px] text-[#EDEDED] truncate">{s.student_name}</p>
                            {s.responsible_name && (
                              <p className="text-[10.5px] text-white/25 truncate">{s.responsible_name}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-[12px] text-white/45 tabular-nums">{fmtDate(s.start_date)}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}2E` }}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[11.5px] flex items-center gap-1.5 whitespace-nowrap" style={{ color: pay.color }}>
                              <PayIcon className="w-3 h-3 shrink-0" /> {pay.label}
                            </span>
                            {s.lead?.paid_at && (
                              <p className="text-[10px] text-white/20 tabular-nums mt-0.5">
                                {fmtDate(s.lead.paid_at)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-[12px] text-white/45 tabular-nums">
                              {s.monthly_fee != null ? `¥ ${s.monthly_fee.toLocaleString('ja-JP')}` : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-right" style={{ width: 120 }}>
                            {s.status === 'rascunho' && (
                              <button onClick={() => setActivating(s)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all"
                                style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT, border: '1px solid rgba(232,82,26,0.22)' }}>
                                Revisar e ativar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {activating && (
        <ActivateEnrollmentModal
          key={activating.id}
          student={activating}
          onClose={() => setActivating(null)}
        />
      )}
    </div>
  )
}

// ── Pieces ────────────────────────────────────────────────────

function Stat({ label, value, color, hint }: {
  label: string; value: number; color: string; hint?: string
}) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
      <p className="text-[19px] font-semibold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-white/20 mt-0.5 leading-snug">{hint}</p>}
    </div>
  )
}

// Vaga é contada só com aluno ativo: rascunho ainda não entrou, trancado e
// cancelado já saíram.
function GroupCount({ rows, capacity }: { rows: Student[]; capacity: number | null }) {
  const active = rows.filter(s => s.status === 'ativo').length
  if (capacity == null) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <Users className="w-3.5 h-3.5 text-white/20" />
        <p className="text-[12px] text-white/50 tabular-nums">
          {active} ativo{active !== 1 ? 's' : ''}
          {rows.length !== active && <span className="text-white/25"> · {rows.length} no total</span>}
        </p>
      </div>
    )
  }
  const full = active >= capacity
  const tone = full ? '#F87171' : active / capacity >= 0.8 ? '#FCD34D' : '#34D399'
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Users className="w-3.5 h-3.5 text-white/20" />
      <p className="text-[12px] font-medium tabular-nums" style={{ color: tone }}>
        {active}<span className="text-white/25"> / {capacity} vagas</span>
      </p>
      {full && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
          Lotada
        </span>
      )}
    </div>
  )
}
