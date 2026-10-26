import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Loader2, User, Mail, Phone, MapPin, Calendar,
  CalendarDays, Clock, Video, BookOpen, DollarSign, GraduationCap,
  Award, Plus, Pencil, Save, AlertCircle, ExternalLink, Banknote,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import DeleteButton from '@/components/ui/DeleteButton'
import { useStudent } from '@/hooks/useStudents'
import type { StudentDetail, StudentStatus } from '@/hooks/useStudents'
import { formatSchedule, useClasses } from '@/hooks/useClasses'
import { useTeachers } from '@/hooks/useTeachers'
import {
  useGrades, useCreateGrade, useUpdateGrade, useDeleteGrade,
} from '@/hooks/useGrades'
import type { Grade } from '@/hooks/useGrades'
import ContactPipelinePanel from '@/components/ContactPipelinePanel'
import { useContactStage } from '@/hooks/useContactStage'
import { contactKey } from '@/lib/contactKey'
import { stageOf } from '@/lib/stageConfig'
import { BG_PAGE, BG_CARD2, BG_CARD, BG_INPUT, BORDER2, BORDER, ACCENT } from '@/lib/theme'

const STATUS: Record<StudentStatus, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#FDBA74' },
  ativo:     { label: 'Ativo',     color: '#34D399' },
  trancado:  { label: 'Trancado',  color: '#FCD34D' },
  cancelado: { label: 'Cancelado', color: '#F87171' },
}

const SUBJECT_LABEL: Record<string, string> = {
  jlpt: 'JLPT', refesco: 'Reforço Escolar', ingles: 'Inglês',
}

const PAYMENT_METHOD: Record<string, string> = {
  deposito: 'Depósito bancário', dinheiro: 'Em dinheiro', stripe: 'Stripe',
}

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-ink placeholder:text-ink-faint outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }
const selectCls = inputCls + ' appearance-none cursor-pointer'

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = BORDER
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtYen(v: number | null): string {
  if (v == null) return '—'
  return `¥ ${v.toLocaleString('ja-JP')}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// ── Pieces ────────────────────────────────────────────────────

function Card({ title, icon: Icon, action, children }: {
  title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl flex flex-col" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
          <p className="text-[12px] font-semibold text-ink">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-4 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value, href }: {
  icon: React.ElementType; label: string; value: string | null; href?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-ink-faint shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] text-ink-mute">{label}</p>
        {value
          ? href
            ? <a href={href} target="_blank" rel="noreferrer"
                className="text-[12.5px] text-ink hover:text-ink break-words transition-colors">
                {value}
              </a>
            : <p className="text-[12.5px] text-ink break-words">{value}</p>
          : <p className="text-[12.5px] text-ink-faint">—</p>}
      </div>
    </div>
  )
}

// ── Grades ────────────────────────────────────────────────────

function GradeForm({ studentId, defaultClassId, row, onClose }: {
  studentId: string; defaultClassId: string | null; row: Grade | null; onClose: () => void
}) {
  const create = useCreateGrade()
  const update = useUpdateGrade()
  const { data: teachers = [] } = useTeachers('ativo')
  const { data: classes = [] }  = useClasses()

  const [form, setForm] = useState({
    title:       row?.title ?? '',
    score:       row?.score ?? ('' as number | ''),
    max_score:   row?.max_score ?? 100,
    assessed_on: row?.assessed_on ?? new Date().toISOString().slice(0, 10),
    teacher_id:  row?.teacher_id ?? '',
    class_id:    row?.class_id ?? defaultClassId ?? '',
    note:        row?.note ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!form.title.trim()) { setError('Dê um título à avaliação.'); return }
    // assessed_on é NOT NULL no banco: se o campo for apagado, o normalizador
    // manda null e o insert falha com erro cru. Melhor barrar aqui.
    if (!form.assessed_on) { setError('Informe a data da avaliação.'); return }
    if (form.score !== '' && form.max_score && Number(form.score) > Number(form.max_score)) {
      setError('A nota não pode ser maior que o valor máximo.')
      return
    }
    const patch = {
      title:       form.title.trim(),
      score:       form.score === '' ? null : Number(form.score),
      max_score:   form.max_score || null,
      assessed_on: form.assessed_on,
      teacher_id:  form.teacher_id || null,
      class_id:    form.class_id   || null,
      note:        form.note.trim() || null,
    }
    try {
      if (row) await update.mutateAsync({ id: row.id, patch })
      else     await create.mutateAsync({ ...patch, student_id: studentId, title: patch.title })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="rounded-xl p-3.5 flex flex-col gap-3" style={{ background: BG_CARD2, border: `1px solid ${BORDER}` }}>
      <input className={inputCls} style={inputStyle}
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        onFocus={focusBorder} onBlur={blurBorder}
        placeholder="Ex: Simulado JLPT N3 — Leitura" />

      <div className="grid grid-cols-3 gap-2.5">
        <input type="number" step="0.01" className={inputCls} style={inputStyle}
          value={form.score}
          onChange={e => setForm(f => ({ ...f, score: e.target.value === '' ? '' : Number(e.target.value) }))}
          onFocus={focusBorder} onBlur={blurBorder} placeholder="Nota" />
        <input type="number" step="0.01" className={inputCls} style={inputStyle}
          value={form.max_score ?? ''}
          onChange={e => setForm(f => ({ ...f, max_score: e.target.value ? Number(e.target.value) : 0 }))}
          onFocus={focusBorder} onBlur={blurBorder} placeholder="Máx." />
        <input type="date" className={inputCls} style={inputStyle}
          value={form.assessed_on}
          onChange={e => setForm(f => ({ ...f, assessed_on: e.target.value }))}
          onFocus={focusBorder} onBlur={blurBorder} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <select className={selectCls} style={inputStyle}
          value={form.teacher_id}
          onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
          onFocus={focusBorder} onBlur={blurBorder}>
          <option value="">Professor não definido</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectCls} style={inputStyle}
          value={form.class_id}
          onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
          onFocus={focusBorder} onBlur={blurBorder}>
          <option value="">Turma não definida</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.status === 'encerrada' ? ' (encerrada)' : ''}
            </option>
          ))}
        </select>
      </div>

      <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 56 }}
        value={form.note}
        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
        onFocus={focusBorder} onBlur={blurBorder}
        placeholder="Observações sobre o desempenho…" />

      <div className="flex items-center gap-2">
        {error && (
          <p className="text-[11px] flex items-center gap-1 mr-auto" style={{ color: '#F87171' }}>
            <AlertCircle className="w-3 h-3 shrink-0" /> {error}
          </p>
        )}
        <button onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium text-ink-sub hover:text-ink hover:bg-tint/5 transition-all ml-auto">
          Cancelar
        </button>
        <button onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: ACCENT, color: '#fff' }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {row ? 'Salvar' : 'Lançar'}
        </button>
      </div>
    </div>
  )
}

function GradeRow({ row, onEdit, onDelete }: {
  row: Grade; onEdit: () => void; onDelete: () => void
}) {
  const pct = row.score != null && row.max_score ? (row.score / row.max_score) * 100 : null
  const tone = pct == null ? '#9CA3AF' : pct >= 70 ? '#34D399' : pct >= 50 ? '#FCD34D' : '#F87171'
  return (
    <div className="group rounded-xl px-3.5 py-3 flex items-start gap-3"
      style={{ background: BG_CARD2, border: `1px solid ${BORDER2}` }}>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-ink truncate">{row.title}</p>
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <span className="text-[11px] text-ink-mute tabular-nums">{fmtShort(row.assessed_on)}</span>
          {row.teacher && <span className="text-[11px] text-ink-mute">{row.teacher.name}</span>}
          {row.class && <span className="text-[11px] text-ink-faint truncate">{row.class.name}</span>}
        </div>
        {row.note && <p className="text-[11.5px] text-ink-mute mt-1.5 whitespace-pre-wrap">{row.note}</p>}
      </div>

      <div className="text-right shrink-0">
        <p className="text-[15px] font-semibold tabular-nums" style={{ color: tone }}>
          {row.score != null ? row.score : '—'}
          {row.max_score != null && <span className="text-[11px] text-ink-faint"> / {row.max_score}</span>}
        </p>
        {pct != null && <p className="text-[10px] text-ink-faint tabular-nums">{Math.round(pct)}%</p>}
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} title="Editar"
          className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-tint/6 transition-all">
          <Pencil className="w-3 h-3" />
        </button>
        <DeleteButton onConfirm={onDelete} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading, isFetching, error, refetch } = useStudent(id)

  const grades      = useGrades(id)
  const deleteGrade = useDeleteGrade()
  const [gradeForm, setGradeForm] = useState<{ row: Grade | null } | null>(null)

  // Chave do pipeline: vem do lead de origem. Ficha cadastrada à mão não tem
  // lead, então também não tem avaliação nem follow-up para mostrar.
  const ckey = student?.lead ? contactKey(student.lead) : undefined
  const { data: stageRow } = useContactStage(ckey)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_PAGE }}>
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="w-9 h-9 text-ink-ghost" />
        <p className="text-[13px] text-ink-mute">Aluno não encontrado</p>
        <button onClick={() => navigate('/admin/alunos')}
          className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(var(--tint), 0.55)' }}>
          Voltar para Alunos
        </button>
      </div>
    )
  }

  const s: StudentDetail = student
  const st = STATUS[s.status]
  const stage = stageRow?.stage ? stageOf(stageRow.stage) : null
  const gradeRows = grades.data ?? []

  const avg = (() => {
    const scored = gradeRows.filter(g => g.score != null && g.max_score)
    if (scored.length === 0) return null
    const sum = scored.reduce((a, g) => a + (g.score! / g.max_score!) * 100, 0)
    return Math.round(sum / scored.length)
  })()

  return (
    <div className="flex flex-col gap-5">

      {/* Back */}
      <button onClick={() => navigate('/admin/alunos')}
        className="flex items-center gap-1.5 text-[12px] text-ink-mute hover:text-ink transition-colors w-fit">
        <ArrowLeft className="w-3.5 h-3.5" /> Alunos
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-[15px] font-bold"
          style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT }}>
          {initials(s.student_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-bold text-ink tracking-tight truncate">
            {s.student_name}
          </h1>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}2E` }}>
              {st.label}
            </span>
            {stage && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }}>
                {stage.label}
              </span>
            )}
            {s.subject && (
              <span className="text-[11.5px] text-ink-mute">{SUBJECT_LABEL[s.subject] ?? s.subject}</span>
            )}
            {s.jlpt_level && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(var(--tint), 0.06)', color: 'rgba(var(--tint), 0.5)' }}>
                {s.jlpt_level}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {avg != null && (
            <div className="px-3 py-1.5 rounded-xl text-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[15px] font-semibold tabular-nums"
                style={{ color: avg >= 70 ? '#34D399' : avg >= 50 ? '#FCD34D' : '#F87171' }}>
                {avg}%
              </p>
              <p className="text-[9.5px] text-ink-faint">média</p>
            </div>
          )}
          <button onClick={() => refetch()} title="Recarregar"
            className="p-2 rounded-xl text-ink-mute hover:text-ink transition-all"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Avaliação e follow-ups do contato de origem */}
      {ckey && (
        <ContactPipelinePanel
          contactKey={ckey}
          leadId={s.lead?.id ?? null}
          currentStage={stageRow?.stage ?? null}
        />
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Coluna esquerda */}
        <div className="flex flex-col gap-4">

          <Card title="Dados pessoais" icon={User}>
            <Row icon={User}     label="Responsável"        value={s.responsible_name} />
            <Row icon={Calendar} label="Nascimento"         value={s.birth_date ? fmtDate(s.birth_date) : null} />
            <Row icon={Phone}    label="Tel. responsável"   value={s.phone_responsible} />
            <Row icon={Phone}    label="Tel. aluno"         value={s.phone_student} />
            <Row icon={Mail}     label="E-mail"             value={s.email} />
            <Row icon={MapPin}   label="Endereço"           value={s.address} />
          </Card>

          <Card title="Financeiro" icon={DollarSign}>
            <Row icon={DollarSign} label="Mensalidade" value={fmtYen(s.monthly_fee)} />
            <Row icon={Banknote}   label="Forma de pagamento"
              value={s.payment_method ? PAYMENT_METHOD[s.payment_method] ?? s.payment_method : null} />
            <Row icon={User}       label="Nome exibido no depósito" value={s.deposit_name} />
            {s.lead && s.lead.payment_status !== 'none' && (
              <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                style={{
                  background: s.lead.payment_status === 'confirmed' ? 'rgba(52,211,153,0.07)' : 'rgba(251,191,36,0.07)',
                  border: `1px solid ${s.lead.payment_status === 'confirmed' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                }}>
                <p className="text-[11.5px] font-medium"
                  style={{ color: s.lead.payment_status === 'confirmed' ? '#34D399' : '#FCD34D' }}>
                  {s.lead.payment_status === 'confirmed'
                    ? `Pagamento confirmado em ${fmtShort(s.lead.paid_at)}`
                    : 'Pagamento em aberto'}
                </p>
              </div>
            )}
            {s.discount_notes && <Row icon={Award} label="Descontos" value={s.discount_notes} />}
          </Card>

          <Card title="Origem" icon={ExternalLink}>
            {s.lead ? (
              <>
                <Row icon={Calendar}     label="Inscrição em" value={fmtDate(s.lead.created_at)} />
                <Row icon={ExternalLink} label="Fonte"        value={s.lead.utm_source} />
                <Row icon={ExternalLink} label="Campanha"     value={s.lead.utm_campaign} />
                <RouterLink to={`/admin/leads/${s.lead.id}`}
                  className="text-[11.5px] flex items-center gap-1.5 transition-colors hover:opacity-80"
                  style={{ color: ACCENT }}>
                  <ExternalLink className="w-3 h-3" /> Abrir card do lead
                </RouterLink>
              </>
            ) : (
              <p className="text-[12px] text-ink-mute">
                Ficha cadastrada manualmente — sem inscrição de origem.
              </p>
            )}
          </Card>
        </div>

        {/* Coluna central e direita */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          <Card title="Turma" icon={CalendarDays}>
            {s.class ? (
              <>
                <p className="text-[13.5px] font-semibold text-ink">{s.class.name}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Row icon={Clock}  label="Horário"    value={formatSchedule(s.class.sessions)} />
                  <Row icon={User}   label="Professor"  value={s.class.teacher?.name ?? null} />
                  <Row icon={MapPin} label="Modalidade"
                    value={[
                      s.class.modality === 'online' ? 'Online' : s.class.modality === 'presencial' ? 'Presencial' : null,
                      s.class.unit,
                    ].filter(Boolean).join(' · ') || null} />
                  <Row icon={Calendar} label="Início na escola" value={fmtDate(s.start_date)} />
                </div>
                <div className="flex items-center gap-4 flex-wrap pt-1">
                  {s.class.meet_link && (
                    <a href={s.class.meet_link} target="_blank" rel="noreferrer"
                      className="text-[11.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition-colors">
                      <Video className="w-3 h-3" /> Google Meet
                    </a>
                  )}
                  {s.class.classroom_link && (
                    <a href={s.class.classroom_link} target="_blank" rel="noreferrer"
                      className="text-[11.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition-colors">
                      <BookOpen className="w-3 h-3" /> Classroom
                    </a>
                  )}
                  <RouterLink to="/admin/turmas"
                    className="text-[11.5px] flex items-center gap-1.5 transition-colors hover:opacity-80 ml-auto"
                    style={{ color: ACCENT }}>
                    <ExternalLink className="w-3 h-3" /> Gerenciar turma
                  </RouterLink>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[12.5px] text-ink-mute">Sem turma vinculada.</p>
                <p className="text-[11.5px] text-ink-faint">
                  Horário, professor e links de acesso vêm da turma — vincule uma na ficha do aluno.
                </p>
              </div>
            )}
          </Card>

          <Card
            title="Notas"
            icon={GraduationCap}
            action={!gradeForm && (
              <button onClick={() => setGradeForm({ row: null })}
                className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold flex items-center gap-1 shrink-0 transition-all"
                style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT, border: '1px solid rgba(232,82,26,0.22)' }}>
                <Plus className="w-3 h-3" /> Lançar nota
              </button>
            )}
          >
            {gradeForm && (
              <GradeForm
                key={gradeForm.row?.id ?? 'nova'}
                studentId={s.id}
                defaultClassId={s.class_id}
                row={gradeForm.row}
                onClose={() => setGradeForm(null)}
              />
            )}

            {grades.isLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />
              </div>
            ) : gradeRows.length === 0 && !gradeForm ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <GraduationCap className="w-7 h-7 text-ink-ghost" />
                <p className="text-[12px] text-ink-mute">Nenhuma nota lançada</p>
              </div>
            ) : (
              gradeRows.map(g => (
                <GradeRow
                  key={g.id}
                  row={g}
                  onEdit={() => setGradeForm({ row: g })}
                  onDelete={() => deleteGrade.mutate(g.id)}
                />
              ))
            )}
          </Card>

          {(s.notes || s.status === 'trancado' || s.status === 'cancelado') && (
            <Card title="Situação e observações" icon={AlertCircle}>
              {s.status === 'trancado' && (
                <Row icon={Calendar} label="Trancamento"
                  value={[s.lock_start && fmtShort(s.lock_start), s.lock_end && fmtShort(s.lock_end)]
                    .filter(Boolean).join(' até ') || null} />
              )}
              {s.status === 'cancelado' && (
                <>
                  <Row icon={Calendar} label="Cancelado em" value={s.cancel_date ? fmtDate(s.cancel_date) : null} />
                  <Row icon={AlertCircle} label="Motivo" value={s.cancel_reason} />
                </>
              )}
              {s.notes && (
                <div>
                  <p className="text-[10.5px] text-ink-mute mb-1">Observações</p>
                  <p className="text-[12.5px] text-ink-sub whitespace-pre-wrap">{s.notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
