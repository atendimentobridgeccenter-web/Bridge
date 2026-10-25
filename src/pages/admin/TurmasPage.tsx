import { useState, useMemo } from 'react'
import {
  Plus, X, Save, Loader2, Edit2, Trash2, AlertTriangle, RefreshCw,
  CalendarDays, Users, User, Clock, MapPin, Link as LinkIcon,
  GraduationCap, Mail, Phone, Search, KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  useClasses, useCreateClass, useUpdateClass, useDeleteClass,
  useProductsForClasses, WEEKDAYS, formatSchedule,
} from '@/hooks/useClasses'
import type { ClassRow, ClassPatch, ClassStatus, SessionDraft } from '@/hooks/useClasses'
import {
  useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher,
  useProvisionTeacherAccess,
} from '@/hooks/useTeachers'
import type { Teacher, TeacherPatch } from '@/hooks/useTeachers'
import { useStudents } from '@/hooks/useStudents'
import type { StudentSubject, JlptLevel, Modality } from '@/hooks/useStudents'
import { BG_CARD2, BG_CARD, BG_INPUT, BORDER2, BORDER, ACCENT } from '@/lib/theme'

const SUBJECT_LABEL: Record<StudentSubject, string> = {
  jlpt:    'JLPT',
  refesco: 'Reforço Escolar',
  ingles:  'Inglês',
}

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const CLASS_STATUS = {
  ativa:     { label: 'Ativa',     color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)' },
  encerrada: { label: 'Encerrada', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
}

// ── Shared form bits ──────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }
const selectCls = inputCls + ' appearance-none cursor-pointer'

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = BORDER
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-white/40">{label}</label>
      {children}
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pb-5" style={{ borderBottom: `1px solid ${BORDER2}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Drawer({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void
  children: React.ReactNode; footer: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] h-full overflow-y-auto flex flex-col"
        style={{ background: BG_CARD, borderLeft: `1px solid ${BORDER}` }}
      >
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between gap-3"
          style={{ background: BG_CARD, borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#EDEDED] truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-white/35 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-5">{children}</div>

        <div
          className="sticky bottom-0 px-6 py-4 flex items-center justify-end gap-2"
          style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}` }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, loading, children }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="px-4 py-2 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: ACCENT, color: '#fff' }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-[12.5px] font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
    >
      {children}
    </button>
  )
}

// ── Confirm dialog ────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, loading }: {
  title: string; message: React.ReactNode; confirmLabel: string
  onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-[400px] rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: '#F87171' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#EDEDED]">{title}</p>
            <div className="text-[12.5px] text-white/45 mt-1.5 leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <GhostBtn onClick={onCancel}>Cancelar</GhostBtn>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Class drawer ──────────────────────────────────────────────

const EMPTY_CLASS: ClassPatch & { name: string } = {
  name: '', subject: null, jlpt_level: null, teacher_id: null, product_id: null,
  modality: null, unit: '', meet_link: '', classroom_link: '',
  capacity: null, school_year: '', notes: '', status: 'ativa',
}

function ClassDrawer({ row, onClose }: { row: ClassRow | null; onClose: () => void }) {
  const isEdit = !!row
  const create = useCreateClass()
  const update = useUpdateClass()
  const { data: teachers = [] } = useTeachers('ativo')
  const { data: products = [] } = useProductsForClasses()

  const [form, setForm] = useState<ClassPatch & { name: string }>(
    row
      ? {
          name:           row.name,
          subject:        row.subject,
          jlpt_level:     row.jlpt_level,
          teacher_id:     row.teacher_id,
          product_id:     row.product_id,
          modality:       row.modality,
          unit:           row.unit           ?? '',
          meet_link:      row.meet_link      ?? '',
          classroom_link: row.classroom_link ?? '',
          capacity:       row.capacity,
          school_year:    row.school_year    ?? '',
          notes:          row.notes          ?? '',
          status:         row.status,
        }
      : EMPTY_CLASS,
  )
  // Uma turma pode ter vários encontros por semana — a grade varia por produto.
  const [sessions, setSessions] = useState<SessionDraft[]>(
    row && row.sessions.length > 0
      ? row.sessions.map(s => ({ ...s }))
      : [{ weekday: 1, time_start: '', time_end: '' }],
  )
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setSession(i: number, patch: Partial<SessionDraft>) {
    setSessions(list => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  // Postgres recusa '' em colunas uuid/time: normaliza vazio para null.
  function payload(): ClassPatch & { name: string } {
    const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
    return {
      ...form,
      name:           form.name.trim(),
      teacher_id:     form.teacher_id || null,
      product_id:     form.product_id || null,
      unit:           blankToNull(form.unit),
      meet_link:      blankToNull(form.meet_link),
      classroom_link: blankToNull(form.classroom_link),
      school_year:    blankToNull(form.school_year),
      notes:          blankToNull(form.notes),
    }
  }

  async function save() {
    setError(null)
    if (!form.name.trim()) { setError('Dê um nome à turma.'); return }

    for (const s of sessions) {
      if (s.time_start && s.time_end && s.time_end <= s.time_start) {
        setError('Em cada encontro, o término precisa ser depois do início.')
        return
      }
    }
    // O banco tem unique (class_id, weekday, time_start); barrar aqui dá
    // mensagem legível em vez do erro cru da constraint.
    const slots = sessions.map(s => `${s.weekday}|${s.time_start ?? ''}`)
    if (new Set(slots).size !== slots.length) {
      setError('Há dois encontros no mesmo dia e horário.')
      return
    }

    try {
      if (isEdit) await update.mutateAsync({ id: row.id, patch: payload(), sessions })
      else        await create.mutateAsync({ patch: payload(), sessions })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <Drawer
      title={isEdit ? 'Editar turma' : 'Nova turma'}
      subtitle={isEdit ? row.name : 'Horário, professor e links ficam aqui — e valem para todos os alunos da turma'}
      onClose={onClose}
      footer={
        <>
          {error && <p className="text-[11.5px] mr-auto" style={{ color: '#F87171' }}>{error}</p>}
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={save} loading={saving}>
            {isEdit ? 'Salvar' : 'Criar turma'}
          </PrimaryBtn>
        </>
      }
    >
      <DrawerSection title="Identificação">
        <Field label="Nome da turma">
          <input className={inputCls} style={inputStyle}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Ex: JLPT N3 — Quarta 19h" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matéria">
            <select className={selectCls} style={inputStyle}
              value={form.subject ?? ''}
              onChange={e => set('subject', (e.target.value as StudentSubject) || null)}
              onFocus={focusBorder} onBlur={blurBorder}>
              <option value="">Selecionar…</option>
              {(Object.keys(SUBJECT_LABEL) as StudentSubject[]).map(s => (
                <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Nível JLPT">
            <select className={selectCls} style={inputStyle}
              value={form.jlpt_level ?? ''}
              onChange={e => set('jlpt_level', (e.target.value as JlptLevel) || null)}
              onFocus={focusBorder} onBlur={blurBorder}>
              <option value="">—</option>
              {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ano letivo">
            <input className={inputCls} style={inputStyle}
              value={form.school_year ?? ''}
              onChange={e => set('school_year', e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder}
              placeholder="Ex: 2026-2027" />
          </Field>
          <Field label="Produto">
            <select className={selectCls} style={inputStyle}
              value={form.product_id ?? ''}
              onChange={e => set('product_id', e.target.value || null)}
              onFocus={focusBorder} onBlur={blurBorder}>
              <option value="">Sem produto vinculado</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </DrawerSection>

      <DrawerSection title="Professor e horário">
        <Field label="Professor responsável">
          <select className={selectCls} style={inputStyle}
            value={form.teacher_id ?? ''}
            onChange={e => set('teacher_id', e.target.value || null)}
            onFocus={focusBorder} onBlur={blurBorder}>
            <option value="">Sem professor definido</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {teachers.length === 0 && (
            <p className="text-[11px] text-white/30">
              Nenhum professor ativo cadastrado — crie na aba Professores.
            </p>
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-medium text-white/40">
              Encontros na semana
            </label>
            <button
              onClick={() => setSessions(list => [...list, { weekday: 1, time_start: '', time_end: '' }])}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
              style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT, border: '1px solid rgba(232,82,26,0.22)' }}>
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          {sessions.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <select className={selectCls} style={inputStyle}
                  value={s.weekday}
                  onChange={e => setSession(i, { weekday: Number(e.target.value) })}
                  onFocus={focusBorder} onBlur={blurBorder}>
                  {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <input type="time" className={inputCls + ' flex-1 min-w-0'} style={inputStyle}
                value={s.time_start ?? ''}
                onChange={e => setSession(i, { time_start: e.target.value })}
                onFocus={focusBorder} onBlur={blurBorder} />
              <input type="time" className={inputCls + ' flex-1 min-w-0'} style={inputStyle}
                value={s.time_end ?? ''}
                onChange={e => setSession(i, { time_end: e.target.value })}
                onFocus={focusBorder} onBlur={blurBorder} />
              <button
                onClick={() => setSessions(list => list.filter((_, idx) => idx !== i))}
                disabled={sessions.length === 1}
                title={sessions.length === 1 ? 'A turma precisa de pelo menos um encontro' : 'Remover encontro'}
                className="p-2 rounded-lg text-white/30 hover:text-[#F87171] hover:bg-red-500/8 transition-all disabled:opacity-20 disabled:hover:bg-transparent shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <p className="text-[11px] text-white/25 leading-relaxed">
            Turma de duas aulas na semana leva dois encontros. O horário aparece
            agrupado quando coincide — "Seg, Qua · 19:00–20:30".
          </p>
        </div>
      </DrawerSection>

      <DrawerSection title="Local e acesso">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modalidade">
            <select className={selectCls} style={inputStyle}
              value={form.modality ?? ''}
              onChange={e => set('modality', (e.target.value as Modality) || null)}
              onFocus={focusBorder} onBlur={blurBorder}>
              <option value="">Selecionar…</option>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </Field>
          <Field label="Capacidade (vagas)">
            <input type="number" min={1} className={inputCls} style={inputStyle}
              value={form.capacity ?? ''}
              onChange={e => set('capacity', e.target.value ? Number(e.target.value) : null)}
              onFocus={focusBorder} onBlur={blurBorder}
              placeholder="Ex: 12" />
          </Field>
        </div>
        <Field label="Unidade">
          <input className={inputCls} style={inputStyle}
            value={form.unit ?? ''}
            onChange={e => set('unit', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Nome ou endereço da unidade" />
        </Field>
        <Field label="Link do Google Meet">
          <input className={inputCls} style={inputStyle}
            value={form.meet_link ?? ''}
            onChange={e => set('meet_link', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="https://meet.google.com/…" />
        </Field>
        <Field label="Link do Classroom">
          <input className={inputCls} style={inputStyle}
            value={form.classroom_link ?? ''}
            onChange={e => set('classroom_link', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="https://classroom.google.com/c/…" />
        </Field>
      </DrawerSection>

      <DrawerSection title="Situação">
        <div className="flex gap-2">
          {(Object.keys(CLASS_STATUS) as ClassStatus[]).map(s => {
            const cfg = CLASS_STATUS[s]
            const active = form.status === s
            return (
              <button key={s} onClick={() => set('status', s)}
                className="flex-1 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{
                  background: active ? cfg.bg : 'transparent',
                  border: `1px solid ${active ? cfg.border : BORDER}`,
                  color: active ? cfg.color : 'rgba(255,255,255,0.35)',
                }}>
                {cfg.label}
              </button>
            )
          })}
        </div>
        <Field label="Notas">
          <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 72 }}
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Observações sobre a turma…" />
        </Field>
      </DrawerSection>
    </Drawer>
  )
}

// ── Acesso ao portal ──────────────────────────────────────────

function TeacherAccessForm({ teacher }: { teacher: Teacher }) {
  const provision = useProvisionTeacherAccess()
  const [email, setEmail] = useState(teacher.email ?? '')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  // Senha inicial sugerida. O professor troca depois pelo "Esqueci minha senha";
  // o importante aqui é o admin não inventar algo fraco na pressa.
  function suggest() {
    const bytes = new Uint8Array(9)
    crypto.getRandomValues(bytes)
    const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '')
    setPassword(`Bridge-${b64}`)
  }

  async function submit() {
    setFeedback(null)
    try {
      const res = await provision.mutateAsync({
        teacherId: teacher.id,
        email: email.trim(),
        password: password || undefined,
      })
      setFeedback({ ok: !res.warning, text: res.warning ?? res.message ?? 'Acesso criado.' })
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : 'Não foi possível criar o acesso.' })
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Field label="E-mail de acesso">
        <input type="email" className={inputCls} style={inputStyle}
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={focusBorder} onBlur={blurBorder}
          placeholder="professor@exemplo.com" />
      </Field>

      <Field label="Senha inicial">
        <div className="flex gap-2">
          <input className={inputCls} style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Ao menos 8 caracteres" />
          <button onClick={suggest}
            className="px-2.5 rounded-xl text-[11.5px] font-medium whitespace-nowrap text-white/50 hover:text-white/80 transition-all shrink-0"
            style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}>
            Gerar
          </button>
        </div>
        <p className="text-[11px] text-white/25 leading-relaxed">
          Anote e passe ao professor. Ele troca depois pelo "Esqueci minha senha".
        </p>
      </Field>

      <button onClick={submit} disabled={provision.isPending || !email.trim()}
        className="px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
        style={{ background: ACCENT, color: '#fff' }}>
        {provision.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <KeyRound className="w-3.5 h-3.5" />}
        Criar acesso ao portal
      </button>

      {feedback && (
        <p className="text-[11px] leading-relaxed flex items-start gap-1.5"
          style={{ color: feedback.ok ? '#34D399' : '#F87171' }}>
          {feedback.ok
            ? <KeyRound className="w-3 h-3 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />}
          {feedback.text}
        </p>
      )}
    </div>
  )
}

// ── Teacher drawer ────────────────────────────────────────────

function TeacherDrawer({ row, onClose }: { row: Teacher | null; onClose: () => void }) {
  const isEdit = !!row
  const create = useCreateTeacher()
  const update = useUpdateTeacher()

  const [form, setForm] = useState<TeacherPatch & { name: string }>(
    row
      ? {
          name:         row.name,
          email:        row.email  ?? '',
          phone:        row.phone  ?? '',
          notes:        row.notes  ?? '',
          status:       row.status,
        }
      : { name: '', email: '', phone: '', notes: '', status: 'ativo' },
  )
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setError(null)
    if (!form.name.trim()) { setError('Informe o nome do professor.'); return }
    const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
    // auth_user_id não vem do formulário: quem grava é a Edge Function que
    // provisiona o acesso, para o vínculo nunca apontar para um id inventado.
    const patch: TeacherPatch & { name: string } = {
      ...form,
      name:  form.name.trim(),
      email: blankToNull(form.email),
      phone: blankToNull(form.phone),
      notes: blankToNull(form.notes),
    }
    try {
      if (isEdit) await update.mutateAsync({ id: row.id, patch })
      else        await create.mutateAsync(patch)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <Drawer
      title={isEdit ? 'Editar professor' : 'Novo professor'}
      subtitle={isEdit ? row.name : undefined}
      onClose={onClose}
      footer={
        <>
          {error && <p className="text-[11.5px] mr-auto" style={{ color: '#F87171' }}>{error}</p>}
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={save} loading={saving}>
            {isEdit ? 'Salvar' : 'Criar professor'}
          </PrimaryBtn>
        </>
      }
    >
      <DrawerSection title="Dados">
        <Field label="Nome">
          <input className={inputCls} style={inputStyle}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Nome completo" />
        </Field>
        <Field label="E-mail">
          <input type="email" className={inputCls} style={inputStyle}
            value={form.email ?? ''}
            onChange={e => set('email', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="email@exemplo.com" />
        </Field>
        <Field label="Telefone">
          <input className={inputCls} style={inputStyle}
            value={form.phone ?? ''}
            onChange={e => set('phone', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="+81 090-0000-0000" />
        </Field>
      </DrawerSection>

      <DrawerSection title="Acesso ao portal">
        {row?.auth_user_id ? (
          <div className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p className="text-[11.5px] font-medium flex items-center gap-1.5" style={{ color: '#34D399' }}>
              <KeyRound className="w-3 h-3 shrink-0" /> Acesso ativo
            </p>
            <p className="text-[11px] text-white/35 leading-relaxed">
              O professor entra em <code className="text-white/55">/professor</code> com
              {row.email ? <> o e-mail <span className="text-white/55">{row.email}</span></> : ' o e-mail cadastrado'}.
              Esqueceu a senha? Use "Esqueci minha senha" na tela de login.
            </p>
          </div>
        ) : !isEdit ? (
          <p className="text-[11.5px] text-white/30 leading-relaxed">
            Salve o professor primeiro. Depois reabra esta ficha para conceder o
            acesso ao portal.
          </p>
        ) : (
          <TeacherAccessForm teacher={row} />
        )}
      </DrawerSection>

      <DrawerSection title="Situação">
        <div className="flex gap-2">
          {([['ativo', 'Ativo', '#34D399'], ['inativo', 'Inativo', '#6B7280']] as const).map(
            ([value, label, color]) => {
              const active = form.status === value
              return (
                <button key={value} onClick={() => set('status', value)}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{
                    background: active ? `${color}14` : 'transparent',
                    border: `1px solid ${active ? `${color}33` : BORDER}`,
                    color: active ? color : 'rgba(255,255,255,0.35)',
                  }}>
                  {label}
                </button>
              )
            },
          )}
        </div>
        <Field label="Notas">
          <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 72 }}
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder}
            placeholder="Observações…" />
        </Field>
      </DrawerSection>
    </Drawer>
  )
}

// ── Occupancy bar ─────────────────────────────────────────────

function Occupancy({ enrolled, capacity }: { enrolled: number; capacity: number | null }) {
  if (capacity == null) {
    return (
      <p className="text-[12px] text-white/45 tabular-nums">
        {enrolled} <span className="text-white/25">aluno{enrolled !== 1 ? 's' : ''}</span>
      </p>
    )
  }
  const pct  = Math.min(100, Math.round((enrolled / capacity) * 100))
  const full = enrolled >= capacity
  const tone = full ? '#F87171' : pct >= 80 ? '#FCD34D' : '#34D399'
  return (
    <div className="flex flex-col gap-1.5 min-w-[72px]">
      <p className="text-[12px] font-medium tabular-nums" style={{ color: tone }}>
        {enrolled}<span className="text-white/25"> / {capacity}</span>
      </p>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

type Tab = 'turmas' | 'professores'

export default function TurmasPage() {
  const [tab, setTab] = useState<Tab>('turmas')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClassStatus | 'all'>('ativa')

  const [classDrawer,   setClassDrawer]   = useState<{ row: ClassRow | null } | null>(null)
  const [teacherDrawer, setTeacherDrawer] = useState<{ row: Teacher | null } | null>(null)
  const [delClass,      setDelClass]      = useState<ClassRow | null>(null)
  const [delTeacher,    setDelTeacher]    = useState<Teacher | null>(null)

  const classes  = useClasses(statusFilter === 'all' ? null : statusFilter)
  const teachers = useTeachers()
  const students = useStudents('ativo')

  const deleteClass   = useDeleteClass()
  const deleteTeacher = useDeleteTeacher()

  // Ocupação é derivada, nunca armazenada: entrada, trancamento, cancelamento e
  // virada de ano letivo mexem no aluno, e a contagem acompanha sozinha.
  const enrolledByClass = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students.data ?? []) {
      if (s.class_id) map.set(s.class_id, (map.get(s.class_id) ?? 0) + 1)
    }
    return map
  }, [students.data])

  const studentsPerTeacher = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students.data ?? []) {
      const tid = s.class?.teacher?.id
      if (tid) map.set(tid, (map.get(tid) ?? 0) + 1)
    }
    return map
  }, [students.data])

  const classesByTeacher = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of classes.data ?? []) {
      if (c.teacher_id) map.set(c.teacher_id, (map.get(c.teacher_id) ?? 0) + 1)
    }
    return map
  }, [classes.data])

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return classes.data ?? []
    return (classes.data ?? []).filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.teacher?.name ?? '').toLowerCase().includes(q) ||
      (c.unit ?? '').toLowerCase().includes(q) ||
      (c.school_year ?? '').toLowerCase().includes(q),
    )
  }, [classes.data, search])

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers.data ?? []
    return (teachers.data ?? []).filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.phone ?? '').includes(q),
    )
  }, [teachers.data, search])

  const loading   = tab === 'turmas' ? classes.isLoading : teachers.isLoading
  const refetching = tab === 'turmas' ? classes.isFetching : teachers.isFetching

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-semibold text-[#EDEDED] flex items-center gap-2">
            <CalendarDays className="w-5 h-5" style={{ color: ACCENT }} />
            Turmas e Professores
          </h1>
          <p className="text-[12.5px] text-white/35 mt-1 max-w-[560px]">
            Horário, professor e links de acesso vivem na turma. Mudar aqui vale para
            todos os alunos vinculados — sem editar ficha por ficha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (tab === 'turmas' ? classes.refetch() : teachers.refetch())}
            className="p-2 rounded-xl text-white/30 hover:text-white/70 transition-all"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            title="Recarregar"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refetching && 'animate-spin')} />
          </button>
          <button
            onClick={() =>
              tab === 'turmas' ? setClassDrawer({ row: null }) : setTeacherDrawer({ row: null })
            }
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5 transition-all"
            style={{ background: ACCENT, color: '#fff' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {tab === 'turmas' ? 'Nova turma' : 'Novo professor'}
          </button>
        </div>
      </div>

      {/* Tabs + search */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-1">
          {([['turmas', 'Turmas', CalendarDays], ['professores', 'Professores', GraduationCap]] as const).map(
            ([value, label, Icon]) => {
              const active = tab === value
              const count = value === 'turmas' ? (classes.data?.length ?? 0) : (teachers.data?.length ?? 0)
              return (
                <button key={value} onClick={() => setTab(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[12.5px] font-medium flex items-center gap-1.5 transition-all',
                    active ? 'text-[#EDEDED]' : 'text-white/35 hover:text-white/60',
                  )}
                  style={{
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="text-[11px] text-white/25 tabular-nums">{count}</span>
                </button>
              )
            },
          )}
        </div>

        <div className="h-5 w-px" style={{ background: BORDER }} />

        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-white/25 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'turmas' ? 'Buscar turma, professor, unidade…' : 'Buscar professor…'}
            className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {tab === 'turmas' && (
          <div className="flex items-center gap-1">
            {(['ativa', 'encerrada', 'all'] as const).map(s => {
              const active = statusFilter === s
              const label = s === 'all' ? 'Todas' : CLASS_STATUS[s].label
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all',
                    active ? 'text-[#EDEDED]' : 'text-white/30 hover:text-white/55',
                  )}
                  style={{
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
        </div>
      ) : tab === 'turmas' ? (
        filteredClasses.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={search ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada'}
            hint={search ? undefined : 'Crie a primeira turma para começar a vincular alunos.'}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredClasses.map(c => (
              <ClassCard
                key={c.id}
                row={c}
                enrolled={enrolledByClass.get(c.id) ?? 0}
                onEdit={() => setClassDrawer({ row: c })}
                onDelete={() => setDelClass(c)}
              />
            ))}
          </div>
        )
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={search ? 'Nenhum professor encontrado' : 'Nenhum professor cadastrado'}
          hint={search ? undefined : 'Cadastre os professores antes de criar as turmas.'}
        />
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          {filteredTeachers.map((t, i) => (
            <TeacherRow
              key={t.id}
              row={t}
              classCount={classesByTeacher.get(t.id) ?? 0}
              studentCount={studentsPerTeacher.get(t.id) ?? 0}
              first={i === 0}
              onEdit={() => setTeacherDrawer({ row: t })}
              onDelete={() => setDelTeacher(t)}
            />
          ))}
        </div>
      )}

      {/* Drawers */}
      {classDrawer && (
        <ClassDrawer row={classDrawer.row} onClose={() => setClassDrawer(null)} />
      )}
      {teacherDrawer && (
        <TeacherDrawer row={teacherDrawer.row} onClose={() => setTeacherDrawer(null)} />
      )}

      {/* Confirms */}
      {delClass && (
        <ConfirmDialog
          title="Excluir turma?"
          message={
            <>
              <strong className="text-white/70">{delClass.name}</strong> será removida.
              {(enrolledByClass.get(delClass.id) ?? 0) > 0 && (
                <>
                  {' '}Os <strong className="text-white/70">
                    {enrolledByClass.get(delClass.id)} aluno
                    {(enrolledByClass.get(delClass.id) ?? 0) !== 1 ? 's' : ''}
                  </strong>{' '}
                  vinculados ficarão sem turma e precisarão ser realocados — nenhuma ficha é apagada.
                </>
              )}
              {' '}Se a turma só terminou, prefira marcá-la como <strong className="text-white/70">Encerrada</strong>: o histórico é preservado.
            </>
          }
          confirmLabel="Excluir"
          loading={deleteClass.isPending}
          onCancel={() => setDelClass(null)}
          onConfirm={async () => {
            await deleteClass.mutateAsync(delClass.id)
            setDelClass(null)
          }}
        />
      )}
      {delTeacher && (
        <ConfirmDialog
          title="Excluir professor?"
          message={
            <>
              <strong className="text-white/70">{delTeacher.name}</strong> será removido.
              {(classesByTeacher.get(delTeacher.id) ?? 0) > 0 && (
                <>
                  {' '}Suas <strong className="text-white/70">
                    {classesByTeacher.get(delTeacher.id)} turma
                    {(classesByTeacher.get(delTeacher.id) ?? 0) !== 1 ? 's' : ''}
                  </strong>{' '}
                  ficarão sem professor responsável.
                </>
              )}
              {' '}Para tirá-lo das listas sem perder o vínculo histórico, marque-o como <strong className="text-white/70">Inativo</strong>.
            </>
          }
          confirmLabel="Excluir"
          loading={deleteTeacher.isPending}
          onCancel={() => setDelTeacher(null)}
          onConfirm={async () => {
            await deleteTeacher.mutateAsync(delTeacher.id)
            setDelTeacher(null)
          }}
        />
      )}
    </div>
  )
}

// ── Pieces ────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, hint }: {
  icon: React.ElementType; title: string; hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Icon className="w-10 h-10 text-white/8" />
      <p className="text-[13px] text-white/30">{title}</p>
      {hint && <p className="text-[12px] text-white/20 max-w-[320px] text-center">{hint}</p>}
    </div>
  )
}

function ClassCard({ row, enrolled, onEdit, onDelete }: {
  row: ClassRow; enrolled: number; onEdit: () => void; onDelete: () => void
}) {
  const cfg = CLASS_STATUS[row.status]
  return (
    <div
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="px-4 py-3.5 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[#EDEDED] truncate">{row.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {row.subject && (
              <span className="text-[11px] text-white/40">{SUBJECT_LABEL[row.subject]}</span>
            )}
            {row.jlpt_level && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                {row.jlpt_level}
              </span>
            )}
            {row.school_year && (
              <span className="text-[10.5px] text-white/25">{row.school_year}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
            {cfg.label}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/6 transition-all"
              title="Editar">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg text-white/30 hover:bg-white/6 transition-all"
              style={{ color: undefined }}
              title="Excluir">
              <Trash2 className="w-3.5 h-3.5 hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3.5 flex items-center gap-4 flex-wrap" style={{ background: BG_CARD2 }}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-white/25 shrink-0" />
          <p className="text-[12px] text-white/55 truncate tabular-nums">{formatSchedule(row.sessions)}</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-white/25 shrink-0" />
          <p className="text-[12px] text-white/55 truncate">{row.teacher?.name ?? 'Sem professor'}</p>
        </div>
        {(row.modality || row.unit) && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-white/25 shrink-0" />
            <p className="text-[12px] text-white/55 truncate">
              {[row.modality === 'online' ? 'Online' : row.modality === 'presencial' ? 'Presencial' : null, row.unit]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        )}
        {row.meet_link && (
          <a href={row.meet_link} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[11.5px] text-white/35 hover:text-white/70 transition-colors">
            <LinkIcon className="w-3 h-3" /> Meet
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-white/20 shrink-0" />
          <Occupancy enrolled={enrolled} capacity={row.capacity} />
        </div>
      </div>
    </div>
  )
}

function TeacherRow({ row, classCount, studentCount, first, onEdit, onDelete }: {
  row: Teacher; classCount: number; studentCount: number; first: boolean
  onEdit: () => void; onDelete: () => void
}) {
  const active = row.status === 'ativo'
  return (
    <div
      className="group px-4 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
      style={first ? undefined : { borderTop: `1px solid ${BORDER2}` }}
    >
      <div
        className="w-8 h-8 rounded-xl grid place-items-center shrink-0 text-[12px] font-semibold"
        style={{
          background: active ? 'rgba(232,82,26,0.12)' : 'rgba(255,255,255,0.04)',
          color: active ? ACCENT : 'rgba(255,255,255,0.3)',
        }}
      >
        {row.name.trim().charAt(0).toUpperCase() || '?'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#EDEDED] truncate">{row.name}</p>
          {!active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(107,114,128,0.12)', color: '#9CA3AF' }}>
              Inativo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {row.email && (
            <span className="text-[11px] text-white/30 flex items-center gap-1 truncate">
              <Mail className="w-2.5 h-2.5 shrink-0" /> {row.email}
            </span>
          )}
          {row.phone && (
            <span className="text-[11px] text-white/30 flex items-center gap-1 tabular-nums">
              <Phone className="w-2.5 h-2.5 shrink-0" /> {row.phone}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#EDEDED] tabular-nums">{classCount}</p>
          <p className="text-[10px] text-white/25">turma{classCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#EDEDED] tabular-nums">{studentCount}</p>
          <p className="text-[10px] text-white/25">aluno{studentCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/6 transition-all"
          title="Editar">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg text-white/30 hover:bg-white/6 transition-all"
          title="Excluir">
          <Trash2 className="w-3.5 h-3.5 hover:text-[#F87171]" />
        </button>
      </div>
    </div>
  )
}
