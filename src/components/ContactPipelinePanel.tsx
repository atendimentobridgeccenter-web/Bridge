import { useState } from 'react'
import {
  CalendarClock, Plus, Save, Loader2, Check, Video,
  GraduationCap, User, Clock, ListChecks, AlertCircle, Pencil, CalendarPlus,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import DeleteButton from '@/components/ui/DeleteButton'
import {
  useEvaluations, useCreateEvaluation, useUpdateEvaluation, useDeleteEvaluation,
  useGenerateMeetLink, EVALUATION_STATUS,
} from '@/hooks/useEvaluations'
import type { Evaluation, EvaluationPatch, EvaluationStatus } from '@/hooks/useEvaluations'
import {
  useFollowUps, useCreateFollowUp, useUpdateFollowUp, useDeleteFollowUp,
  FOLLOW_UP_CHANNEL,
} from '@/hooks/useFollowUps'
import type { FollowUp, FollowUpChannel } from '@/hooks/useFollowUps'
import { useTeachers } from '@/hooks/useTeachers'
import { useClasses, formatSchedule } from '@/hooks/useClasses'
import { useUpdateContactStage } from '@/hooks/useContactStage'
import type { Stage } from '@/lib/stageConfig'
import type { JlptLevel } from '@/hooks/useStudents'
import { BG_CARD2, BG_CARD, BG_INPUT, BORDER2, BORDER, ACCENT } from '@/lib/theme'

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-ink placeholder:text-ink-faint outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }
const selectCls = inputCls + ' appearance-none cursor-pointer'

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = BORDER
}

// ── Date helpers ──────────────────────────────────────────────

// <input type="datetime-local"> trabalha em hora local sem timezone; o banco
// guarda timestamptz. Estas duas funções fazem a ponte nos dois sentidos.
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Sem data'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDateOnly(iso: string | null): string {
  if (!iso) return 'Sem prazo'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function isOverdue(due: string | null, done: string | null): boolean {
  return !done && !!due && new Date(due).getTime() < Date.now()
}

// ── Small pieces ──────────────────────────────────────────────

function SectionCard({ icon: Icon, title, hint, action, children }: {
  icon: React.ElementType; title: string; hint?: string
  action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl flex flex-col" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
          <p className="text-[12px] font-semibold text-ink">{title}</p>
          {hint && <p className="text-[11px] text-ink-faint truncate hidden sm:block">· {hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold flex items-center gap-1 shrink-0 transition-all"
      style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT, border: '1px solid rgba(232,82,26,0.22)' }}>
      <Plus className="w-3 h-3" /> {label}
    </button>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="text-[10.5px] font-medium text-ink-mute">{children}</label>
}

function FormActions({ onCancel, onSave, saving, error, saveLabel }: {
  onCancel: () => void; onSave: () => void; saving: boolean
  error: string | null; saveLabel: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && (
        <p className="text-[11px] flex items-center gap-1 mr-auto" style={{ color: '#F87171' }}>
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
      <button onClick={onCancel}
        className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium text-ink-sub hover:text-ink hover:bg-tint/5 transition-all ml-auto">
        Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
        style={{ background: ACCENT, color: '#fff' }}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        {saveLabel}
      </button>
    </div>
  )
}

// ── Evaluation form ───────────────────────────────────────────

function EvaluationForm({ contactKey, leadId, row, currentStage, onClose }: {
  contactKey: string; leadId: string | null; row: Evaluation | null
  currentStage: Stage | null; onClose: () => void
}) {
  const create = useCreateEvaluation()
  const update = useUpdateEvaluation()
  const updateStage = useUpdateContactStage()
  const { data: teachers = [] } = useTeachers('ativo')
  const { data: allClasses = [] } = useClasses()

  const [form, setForm] = useState({
    scheduled_at:          toLocalInput(row?.scheduled_at ?? null),
    duration_minutes:      row?.duration_minutes ?? 60,
    specialist_teacher_id: row?.specialist_teacher_id ?? '',
    meet_link:             row?.meet_link ?? '',
    status:                (row?.status ?? 'agendada') as EvaluationStatus,
    outcome_note:          row?.outcome_note ?? '',
    recommended_class_id:  row?.recommended_class_id ?? '',
    recommended_level:     (row?.recommended_level ?? '') as JlptLevel | '',
  })
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Turma encerrada continua selecionável quando já é a recomendada, senão
  // salvar limparia a recomendação sem avisar.
  const classOptions = allClasses.filter(
    c => c.status === 'ativa' || c.id === form.recommended_class_id,
  )

  async function save() {
    setError(null)
    const patch: EvaluationPatch = {
      scheduled_at:          fromLocalInput(form.scheduled_at),
      duration_minutes:      form.duration_minutes || null,
      specialist_teacher_id: form.specialist_teacher_id || null,
      meet_link:             form.meet_link.trim() || null,
      status:                form.status,
      outcome_note:          form.outcome_note.trim() || null,
      recommended_class_id:  form.recommended_class_id || null,
      recommended_level:     form.recommended_level || null,
    }
    try {
      if (row) await update.mutateAsync({ id: row.id, patch })
      else     await create.mutateAsync({ ...patch, contact_key: contactKey, lead_id: leadId })

      // O estágio acompanha o que acabou de acontecer, para o comercial não ter
      // de mexer no funil à mão depois de agendar ou de registrar o resultado.
      const target: Stage | null =
        form.status === 'realizada' ? 'avaliacao_feita'
          : form.status === 'agendada' && form.scheduled_at ? 'avaliacao_agendada'
          : null
      if (target && target !== currentStage) {
        await updateStage.mutateAsync({
          contactKey,
          stage: target,
          previousStage: currentStage,
          note: target === 'avaliacao_feita' ? 'Avaliação registrada' : 'Avaliação agendada',
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  const saving = create.isPending || update.isPending || updateStage.isPending
  const showOutcome = form.status === 'realizada'

  return (
    <div className="px-4 py-4 flex flex-col gap-3" style={{ background: BG_CARD2, borderBottom: `1px solid ${BORDER2}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Lbl>Data e hora</Lbl>
          <input type="datetime-local" className={inputCls} style={inputStyle}
            value={form.scheduled_at}
            onChange={e => set('scheduled_at', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Lbl>Duração (minutos)</Lbl>
          <input type="number" min={1} className={inputCls} style={inputStyle}
            value={form.duration_minutes ?? ''}
            onChange={e => set('duration_minutes', e.target.value ? Number(e.target.value) : 0)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="60" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Lbl>Especialista</Lbl>
          <select className={selectCls} style={inputStyle}
            value={form.specialist_teacher_id}
            onChange={e => set('specialist_teacher_id', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}>
            <option value="">Não definido</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Lbl>Situação</Lbl>
          <select className={selectCls} style={inputStyle}
            value={form.status}
            onChange={e => set('status', e.target.value as EvaluationStatus)}
            onFocus={focusBorder} onBlur={blurBorder}>
            {(Object.keys(EVALUATION_STATUS) as EvaluationStatus[]).map(s => (
              <option key={s} value={s}>{EVALUATION_STATUS[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Lbl>Link do Google Meet</Lbl>
        <input className={inputCls} style={inputStyle}
          value={form.meet_link}
          onChange={e => set('meet_link', e.target.value)}
          onFocus={focusBorder} onBlur={blurBorder}
          placeholder="https://meet.google.com/…" />
        <p className="text-[10.5px] text-ink-faint leading-relaxed">
          Pode colar um link manualmente, ou salvar com data e hora e usar
          "Gerar link do Meet" na avaliação — aí o evento é criado no Google
          Calendar e o convite sai para o aluno e o especialista.
        </p>
      </div>

      {showOutcome && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Lbl>Turma recomendada</Lbl>
              <select className={selectCls} style={inputStyle}
                value={form.recommended_class_id}
                onChange={e => set('recommended_class_id', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}>
                <option value="">Não definida</option>
                {classOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatSchedule(c.sessions)}
                    {c.status === 'encerrada' ? ' (encerrada)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Lbl>Nível indicado</Lbl>
              <select className={selectCls} style={inputStyle}
                value={form.recommended_level}
                onChange={e => set('recommended_level', e.target.value as JlptLevel | '')}
                onFocus={focusBorder} onBlur={blurBorder}>
                <option value="">—</option>
                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Lbl>Nota da avaliação</Lbl>
            <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 76 }}
              value={form.outcome_note}
              onChange={e => set('outcome_note', e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder}
              placeholder="Nível observado, pontos de atenção, turma e horário em que o aluno se encaixa…" />
          </div>
        </>
      )}

      <FormActions
        onCancel={onClose} onSave={save} saving={saving} error={error}
        saveLabel={row ? 'Salvar' : 'Agendar'}
      />
    </div>
  )
}

// ── Evaluation row ────────────────────────────────────────────

function EvaluationRow({ row, onEdit, onDelete }: {
  row: Evaluation; onEdit: () => void; onDelete: () => void
}) {
  const cfg = EVALUATION_STATUS[row.status]
  const genMeet = useGenerateMeetLink()
  const [meetError, setMeetError] = useState<string | null>(null)

  async function generate() {
    setMeetError(null)
    try {
      const res = await genMeet.mutateAsync(row.id)
      if (res.warning) setMeetError(res.warning)
    } catch (e) {
      setMeetError(e instanceof Error ? e.message : 'Não foi possível gerar o convite.')
    }
  }

  return (
    <div className="group px-4 py-3 flex flex-col gap-2" style={{ borderBottom: `1px solid ${BORDER2}` }}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <Clock className="w-3.5 h-3.5 text-ink-faint shrink-0" />
        <p className="text-[12.5px] font-medium text-ink tabular-nums">
          {fmtDateTime(row.scheduled_at)}
        </p>
        {row.duration_minutes && (
          <span className="text-[11px] text-ink-faint tabular-nums">{row.duration_minutes} min</span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${cfg.color}1A`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
          {cfg.label}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} title="Editar"
            className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-tint/6 transition-all">
            <Pencil className="w-3 h-3" />
          </button>
          <DeleteButton onConfirm={onDelete} />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap pl-6">
        <span className="text-[11.5px] text-ink-mute flex items-center gap-1.5">
          <User className="w-3 h-3 shrink-0" />
          {row.specialist?.name ?? 'Especialista não definido'}
        </span>
        {row.meet_link && (
          <a href={row.meet_link} target="_blank" rel="noreferrer"
            className="text-[11.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition-colors">
            <Video className="w-3 h-3 shrink-0" /> Entrar no Meet
          </a>
        )}
        {row.scheduled_at && (
          <button onClick={generate} disabled={genMeet.isPending}
            title={row.calendar_event_id
              ? 'Atualiza o evento já criado com a data atual'
              : 'Cria o evento no Google Calendar e envia o convite'}
            className="text-[11.5px] flex items-center gap-1.5 transition-opacity hover:opacity-75 disabled:opacity-40"
            style={{ color: ACCENT }}>
            {genMeet.isPending
              ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              : <CalendarPlus className="w-3 h-3 shrink-0" />}
            {row.calendar_event_id ? 'Atualizar convite' : 'Gerar link do Meet'}
          </button>
        )}
      </div>

      {meetError && (
        <p className="ml-6 text-[11px] flex items-start gap-1.5" style={{ color: '#F87171' }}>
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {meetError}
        </p>
      )}

      {(row.recommended_class || row.recommended_level) && (
        <div className="ml-6 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap"
          style={{ background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.15)' }}>
          <GraduationCap className="w-3 h-3 shrink-0" style={{ color: '#5EEAD4' }} />
          <p className="text-[11.5px]" style={{ color: '#5EEAD4' }}>
            {row.recommended_class
              ? <>Indicado para <strong className="font-semibold">{row.recommended_class.name}</strong> · {formatSchedule(row.recommended_class.sessions)}</>
              : <>Nível indicado</>}
            {row.recommended_level && <span className="ml-1 opacity-70">({row.recommended_level})</span>}
          </p>
        </div>
      )}

      {row.outcome_note && (
        <p className="ml-6 text-[12px] text-ink-sub leading-relaxed whitespace-pre-wrap">
          {row.outcome_note}
        </p>
      )}
    </div>
  )
}

// ── Follow-up form ────────────────────────────────────────────

function FollowUpForm({ contactKey, evaluationId, nextSeq, row, onClose }: {
  contactKey: string; evaluationId: string | null; nextSeq: number
  row: FollowUp | null; onClose: () => void
}) {
  const create = useCreateFollowUp()
  const update = useUpdateFollowUp()

  const [form, setForm] = useState({
    due_at:  row?.due_at ? row.due_at.slice(0, 10) : '',
    channel: (row?.channel ?? '') as FollowUpChannel | '',
    note:    row?.note ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    const patch = {
      due_at:  form.due_at ? new Date(`${form.due_at}T12:00:00`).toISOString() : null,
      channel: form.channel || null,
      note:    form.note.trim() || null,
    }
    try {
      if (row) await update.mutateAsync({ id: row.id, patch })
      else     await create.mutateAsync({
        ...patch, contact_key: contactKey, evaluation_id: evaluationId, seq: nextSeq,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3" style={{ background: BG_CARD2, borderBottom: `1px solid ${BORDER2}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Lbl>Prazo</Lbl>
          <input type="date" className={inputCls} style={inputStyle}
            value={form.due_at}
            onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
            onFocus={focusBorder} onBlur={blurBorder} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Lbl>Canal</Lbl>
          <select className={selectCls} style={inputStyle}
            value={form.channel}
            onChange={e => setForm(f => ({ ...f, channel: e.target.value as FollowUpChannel | '' }))}
            onFocus={focusBorder} onBlur={blurBorder}>
            <option value="">Não definido</option>
            {(Object.keys(FOLLOW_UP_CHANNEL) as FollowUpChannel[]).map(c => (
              <option key={c} value={c}>{FOLLOW_UP_CHANNEL[c]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Lbl>Nota</Lbl>
        <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 60 }}
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          onFocus={focusBorder} onBlur={blurBorder}
          placeholder="O que combinar nesse contato…" />
      </div>
      <FormActions
        onCancel={onClose} onSave={save}
        saving={create.isPending || update.isPending}
        error={error} saveLabel={row ? 'Salvar' : 'Adicionar'}
      />
    </div>
  )
}

// ── Follow-up row ─────────────────────────────────────────────

function FollowUpRow({ row, onEdit, onDelete, onToggle, toggling }: {
  row: FollowUp; onEdit: () => void; onDelete: () => void
  onToggle: () => void; toggling: boolean
}) {
  const done    = !!row.done_at
  const overdue = isOverdue(row.due_at, row.done_at)
  return (
    <div className="group px-4 py-2.5 flex items-start gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
      <button onClick={onToggle} disabled={toggling}
        title={done ? 'Reabrir' : 'Marcar como feito'}
        className="mt-0.5 w-4 h-4 rounded-md shrink-0 grid place-items-center transition-all disabled:opacity-40"
        style={{
          background: done ? 'rgba(52,211,153,0.15)' : 'transparent',
          border: `1px solid ${done ? 'rgba(52,211,153,0.45)' : BORDER}`,
        }}>
        {toggling
          ? <Loader2 className="w-2.5 h-2.5 animate-spin text-ink-mute" />
          : done && <Check className="w-2.5 h-2.5" style={{ color: '#34D399' }} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-ink-faint tabular-nums shrink-0">
            #{row.seq}
          </span>
          <p className={cn('text-[12px] tabular-nums', done ? 'text-ink-faint line-through' : 'text-ink-sub')}>
            {fmtDateOnly(row.due_at)}
          </p>
          {row.channel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'rgba(var(--tint), 0.05)', color: 'rgba(var(--tint), 0.4)' }}>
              {FOLLOW_UP_CHANNEL[row.channel]}
            </span>
          )}
          {overdue && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
              Atrasado
            </span>
          )}
        </div>
        {row.note && (
          <p className={cn('text-[12px] mt-1 whitespace-pre-wrap', done ? 'text-ink-faint' : 'text-ink-sub')}>
            {row.note}
          </p>
        )}
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

// ── Panel ─────────────────────────────────────────────────────

export default function ContactPipelinePanel({ contactKey, leadId, currentStage }: {
  contactKey: string
  leadId: string | null
  currentStage: Stage | null
}) {
  const evaluations = useEvaluations(contactKey)
  const followUps   = useFollowUps(contactKey)
  const deleteEval  = useDeleteEvaluation()
  const deleteFu    = useDeleteFollowUp()
  const updateFu    = useUpdateFollowUp()

  const [evalForm, setEvalForm] = useState<{ row: Evaluation | null } | null>(null)
  const [fuForm,   setFuForm]   = useState<{ row: FollowUp | null } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const evals = evaluations.data ?? []
  const fus   = followUps.data ?? []

  const latestEval = evals[0] ?? null
  const nextSeq    = fus.reduce((max, f) => Math.max(max, f.seq), 0) + 1
  const pending    = fus.filter(f => !f.done_at).length

  async function toggleDone(row: FollowUp) {
    setTogglingId(row.id)
    try {
      await updateFu.mutateAsync({
        id: row.id,
        patch: { done_at: row.done_at ? null : new Date().toISOString() },
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Avaliação ── */}
      <SectionCard
        icon={CalendarClock}
        title="Avaliação"
        hint={evals.length > 0 ? `${evals.length} registro${evals.length !== 1 ? 's' : ''}` : undefined}
        action={!evalForm && <AddBtn onClick={() => setEvalForm({ row: null })} label="Agendar" />}
      >
        {evalForm && (
          <EvaluationForm
            key={evalForm.row?.id ?? 'nova'}
            contactKey={contactKey}
            leadId={leadId}
            row={evalForm.row}
            currentStage={currentStage}
            onClose={() => setEvalForm(null)}
          />
        )}

        {evaluations.isLoading ? (
          <div className="px-4 py-8 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />
          </div>
        ) : evals.length === 0 && !evalForm ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2">
            <CalendarClock className="w-7 h-7 text-ink-ghost" />
            <p className="text-[12px] text-ink-mute">Nenhuma avaliação agendada</p>
            <p className="text-[11px] text-ink-faint text-center max-w-[240px]">
              Ao agendar, o contato avança para "Avaliação agendada" no pipeline.
            </p>
          </div>
        ) : (
          evals.map(row => (
            <EvaluationRow
              key={row.id}
              row={row}
              onEdit={() => setEvalForm({ row })}
              onDelete={() => deleteEval.mutate(row.id)}
            />
          ))
        )}
      </SectionCard>

      {/* ── Follow-ups ── */}
      <SectionCard
        icon={ListChecks}
        title="Follow-ups"
        hint={fus.length > 0 ? `${pending} em aberto de ${fus.length}` : undefined}
        action={!fuForm && <AddBtn onClick={() => setFuForm({ row: null })} label="Adicionar" />}
      >
        {fuForm && (
          <FollowUpForm
            key={fuForm.row?.id ?? 'novo'}
            contactKey={contactKey}
            evaluationId={fuForm.row?.evaluation_id ?? latestEval?.id ?? null}
            nextSeq={nextSeq}
            row={fuForm.row}
            onClose={() => setFuForm(null)}
          />
        )}

        {followUps.isLoading ? (
          <div className="px-4 py-8 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />
          </div>
        ) : fus.length === 0 && !fuForm ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2">
            <ListChecks className="w-7 h-7 text-ink-ghost" />
            <p className="text-[12px] text-ink-mute">Nenhum follow-up</p>
            <p className="text-[11px] text-ink-faint text-center max-w-[240px]">
              Crie quantos precisar — a sequência é livre.
            </p>
          </div>
        ) : (
          fus.map(row => (
            <FollowUpRow
              key={row.id}
              row={row}
              toggling={togglingId === row.id}
              onToggle={() => toggleDone(row)}
              onEdit={() => setFuForm({ row })}
              onDelete={() => deleteFu.mutate(row.id)}
            />
          ))
        )}
      </SectionCard>
    </div>
  )
}
