import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search, X, Plus, RefreshCw, User, GraduationCap,
  Phone, Mail, Calendar, BookOpen, DollarSign,
  Edit2, Trash2, ChevronDown, AlertTriangle, Loader2,
  Save, FileText, Link, MapPin, Clock, ArrowUpDown,
  CheckCircle2, PauseCircle, XCircle, Download,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent,
} from '@/hooks/useStudents'
import type {
  Student, StudentPatch, StudentStatus, StudentSubject,
  JlptLevel, PaymentMethod, CancelReason, Modality,
} from '@/hooks/useStudents'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#13151A'
const BG_CARD2 = '#16181F'
const BG_INPUT = '#0D0E12'
const BORDER   = 'rgba(255,255,255,0.07)'
const BORDER2  = 'rgba(255,255,255,0.05)'

// ── Config ────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ativo:     { label: 'Ativo',     color: '#34D399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)',  icon: CheckCircle2 },
  trancado:  { label: 'Trancado',  color: '#FCD34D', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',   icon: PauseCircle  },
  cancelado: { label: 'Cancelado', color: '#F87171', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.18)',   icon: XCircle      },
}

const SUBJECT_LABEL: Record<StudentSubject, string> = {
  jlpt:    'JLPT',
  refesco: 'Reforço Escolar',
  ingles:  'Inglês',
}

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const SCHOOL_YEARS = [
  'Shougakkou 1', 'Shougakkou 2', 'Shougakkou 3',
  'Shougakkou 4', 'Shougakkou 5', 'Shougakkou 6',
  'Chuugakkou 1', 'Chuugakkou 2', 'Chuugakkou 3',
  'Koukou 1', 'Koukou 2',
]

const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  financeiro:      'Financeiro',
  horario:         'Horário incompatível',
  mudanca:         'Mudança',
  desistencia:     'Desistência do aluno',
  nao_identificado:'Não identificado',
  outro:           'Outro',
}

const CANCEL_COLORS: Record<CancelReason, string> = {
  financeiro:       '#F87171',
  horario:          '#FCD34D',
  mudanca:          '#93C5FD',
  desistencia:      '#F9A8D4',
  nao_identificado: '#6B7280',
  outro:            '#C4B5FD',
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function fmtCurrency(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(v)
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

// ── Donut chart (SVG, no library) ─────────────────────────────

function DonutChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null

  const r = 54
  const cx = 70; const cy = 70
  const circum = 2 * Math.PI * r

  let offset = 0
  const slices = data.filter(d => d.count > 0).map(d => {
    const pct   = d.count / total
    const dash  = pct * circum
    const gap   = circum - dash
    const slice = { ...d, dash, gap, offset }
    offset += dash
    return slice
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={20}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#EDEDED" fontSize={22} fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10}>cancelamentos</text>
      </svg>

      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-white/55">{s.label}</span>
            <span className="text-[12px] font-semibold text-white/70 ml-auto pl-4">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section header for drawer ─────────────────────────────────

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 border-b pb-2"
        style={{ borderColor: BORDER2 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }
const selectCls = inputCls + ' appearance-none cursor-pointer'

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = BORDER
}

// ── Student Drawer (create / edit) ────────────────────────────

const EMPTY: StudentPatch & { student_name: string } = {
  student_name: '',
  responsible_name: '',
  birth_date: '',
  phone_responsible: '',
  phone_student: '',
  email: '',
  address: '',
  start_date: '',
  subject: null,
  jlpt_level: null,
  school_year: '',
  pocket_id: '',
  class_schedule: '',
  teacher: '',
  modality: null,
  unit: '',
  meet_link: '',
  classroom_link: '',
  monthly_fee: null,
  payment_method: null,
  discount_notes: '',
  notes: '',
  status: 'ativo',
  lock_start: '',
  lock_end: '',
  cancel_date: '',
  cancel_reason: null,
  termo_url: '',
}

function StudentDrawer({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const isEdit = !!student
  const createMutation = useCreateStudent()
  const updateMutation = useUpdateStudent()

  const [form, setForm] = useState<StudentPatch & { student_name: string }>(
    student
      ? {
          student_name:      student.student_name,
          responsible_name:  student.responsible_name  ?? '',
          birth_date:        student.birth_date         ?? '',
          phone_responsible: student.phone_responsible  ?? '',
          phone_student:     student.phone_student      ?? '',
          email:             student.email              ?? '',
          address:           student.address            ?? '',
          start_date:        student.start_date         ?? '',
          subject:           student.subject,
          jlpt_level:        student.jlpt_level,
          school_year:       student.school_year        ?? '',
          pocket_id:         student.pocket_id          ?? '',
          class_schedule:    student.class_schedule     ?? '',
          teacher:           student.teacher            ?? '',
          modality:          student.modality,
          unit:              student.unit               ?? '',
          meet_link:         student.meet_link          ?? '',
          classroom_link:    student.classroom_link     ?? '',
          monthly_fee:       student.monthly_fee,
          payment_method:    student.payment_method,
          discount_notes:    student.discount_notes     ?? '',
          notes:             student.notes              ?? '',
          status:            student.status,
          lock_start:        student.lock_start         ?? '',
          lock_end:          student.lock_end           ?? '',
          cancel_date:       student.cancel_date        ?? '',
          cancel_reason:     student.cancel_reason,
          termo_url:         student.termo_url          ?? '',
        }
      : { ...EMPTY }
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.student_name.trim()) return
    if (isEdit && student) {
      await updateMutation.mutateAsync({ id: student.id, patch: form })
    } else {
      await createMutation.mutateAsync(form)
    }
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[560px] flex flex-col"
        style={{ background: BG_CARD2, borderLeft: `1px solid ${BORDER}`, zIndex: 1 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p className="text-[15px] font-bold text-[#EDEDED]">
              {isEdit ? 'Editar Aluno' : 'Novo Aluno'}
            </p>
            {isEdit && (
              <p className="text-[12px] text-white/30 mt-0.5">{student?.student_name}</p>
            )}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* ── Dados pessoais ── */}
          <DrawerSection title="Dados Pessoais">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome do aluno *">
                <input className={inputCls} style={inputStyle}
                  value={form.student_name}
                  onChange={e => set('student_name', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Nome completo" />
              </Field>
              <Field label="Nome do responsável">
                <input className={inputCls} style={inputStyle}
                  value={form.responsible_name ?? ''}
                  onChange={e => set('responsible_name', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Nome completo" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de nascimento">
                <input type="date" className={inputCls} style={inputStyle}
                  value={form.birth_date ?? ''}
                  onChange={e => set('birth_date', e.target.value || null)}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
              <Field label="E-mail">
                <input type="email" className={inputCls} style={inputStyle}
                  value={form.email ?? ''}
                  onChange={e => set('email', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="email@exemplo.com" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone / WhatsApp do responsável">
                <input className={inputCls} style={inputStyle}
                  value={form.phone_responsible ?? ''}
                  onChange={e => set('phone_responsible', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="+81 090-0000-0000" />
              </Field>
              <Field label="Telefone / WhatsApp do aluno">
                <input className={inputCls} style={inputStyle}
                  value={form.phone_student ?? ''}
                  onChange={e => set('phone_student', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Opcional" />
              </Field>
            </div>
            <Field label="Endereço completo">
              <input className={inputCls} style={inputStyle}
                value={form.address ?? ''}
                onChange={e => set('address', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="Cidade, Prefeitura, CEP…" />
            </Field>
          </DrawerSection>

          {/* ── Aulas ── */}
          <DrawerSection title="Aulas">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de início">
                <input type="date" className={inputCls} style={inputStyle}
                  value={form.start_date ?? ''}
                  onChange={e => set('start_date', e.target.value || null)}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
              <Field label="Matéria">
                <select className={selectCls} style={inputStyle}
                  value={form.subject ?? ''}
                  onChange={e => {
                    set('subject', (e.target.value as StudentSubject) || null)
                    set('jlpt_level', null)
                    set('school_year', '')
                  }}
                  onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="">Selecionar…</option>
                  <option value="jlpt">JLPT</option>
                  <option value="refesco">Reforço Escolar</option>
                  <option value="ingles">Inglês</option>
                </select>
              </Field>
            </div>

            {/* Conditional: JLPT level */}
            {form.subject === 'jlpt' && (
              <Field label="Nível JLPT">
                <div className="flex gap-2">
                  {JLPT_LEVELS.map(lv => (
                    <button key={lv} onClick={() => set('jlpt_level', lv === form.jlpt_level ? null : lv)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                      style={form.jlpt_level === lv
                        ? { background: 'rgba(232,82,26,0.2)', color: '#F0643A', border: '1px solid rgba(232,82,26,0.4)' }
                        : { background: BG_INPUT, color: 'rgba(255,255,255,0.35)', border: `1px solid ${BORDER}` }}>
                      {lv}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Conditional: Reforço Escolar */}
            {form.subject === 'refesco' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ano escolar">
                  <select className={selectCls} style={inputStyle}
                    value={form.school_year ?? ''}
                    onChange={e => set('school_year', e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder}>
                    <option value="">Selecionar…</option>
                    {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="POCKET ID">
                  <input className={inputCls} style={inputStyle}
                    value={form.pocket_id ?? ''}
                    onChange={e => set('pocket_id', e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="ID da plataforma" />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data / Horário da aula">
                <input className={inputCls} style={inputStyle}
                  value={form.class_schedule ?? ''}
                  onChange={e => set('class_schedule', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Ex: Quarta 19h" />
              </Field>
              <Field label="Professor">
                <input className={inputCls} style={inputStyle}
                  value={form.teacher ?? ''}
                  onChange={e => set('teacher', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Nome do professor" />
              </Field>
            </div>

            <Field label="Modalidade">
              <div className="flex gap-2">
                {(['presencial', 'online'] as Modality[]).map(m => (
                  <button key={m} onClick={() => set('modality', m === form.modality ? null : m)}
                    className="flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize transition-all"
                    style={form.modality === m
                      ? { background: 'rgba(96,165,250,0.12)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.3)' }
                      : { background: BG_INPUT, color: 'rgba(255,255,255,0.35)', border: `1px solid ${BORDER}` }}>
                    {m === 'presencial' ? 'Presencial' : 'Online'}
                  </button>
                ))}
              </div>
            </Field>

            {form.modality === 'presencial' && (
              <Field label="Unidade">
                <input className={inputCls} style={inputStyle}
                  value={form.unit ?? ''}
                  onChange={e => set('unit', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="Nome ou endereço da unidade" />
              </Field>
            )}
            {form.modality === 'online' && (
              <Field label="Link Google Meet">
                <input className={inputCls} style={inputStyle}
                  value={form.meet_link ?? ''}
                  onChange={e => set('meet_link', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="https://meet.google.com/…" />
              </Field>
            )}

            <Field label="Link Google Classroom">
              <input className={inputCls} style={inputStyle}
                value={form.classroom_link ?? ''}
                onChange={e => set('classroom_link', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="https://classroom.google.com/c/…" />
            </Field>
          </DrawerSection>

          {/* ── Financeiro ── */}
          <DrawerSection title="Financeiro">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor da mensalidade (¥)">
                <input type="number" className={inputCls} style={inputStyle}
                  value={form.monthly_fee ?? ''}
                  onChange={e => set('monthly_fee', e.target.value ? Number(e.target.value) : null)}
                  onFocus={focusBorder} onBlur={blurBorder}
                  placeholder="0" min={0} />
              </Field>
              <Field label="Forma de pagamento">
                <select className={selectCls} style={inputStyle}
                  value={form.payment_method ?? ''}
                  onChange={e => set('payment_method', (e.target.value as PaymentMethod) || null)}
                  onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="">Selecionar…</option>
                  <option value="deposito">Depósito bancário</option>
                  <option value="dinheiro">Em dinheiro</option>
                  <option value="stripe">Stripe</option>
                </select>
              </Field>
            </div>
            <Field label="Descontos aplicados">
              <input className={inputCls} style={inputStyle}
                value={form.discount_notes ?? ''}
                onChange={e => set('discount_notes', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="Ex: 10% desconto irmão" />
            </Field>
            <Field label="Notas">
              <textarea
                className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 72 }}
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="Observações gerais…" />
            </Field>
          </DrawerSection>

          {/* ── Status ── */}
          <DrawerSection title="Status">
            <div className="flex gap-2">
              {(['ativo', 'trancado', 'cancelado'] as StudentStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s]
                const Icon = cfg.icon
                return (
                  <button key={s} onClick={() => set('status', s)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
                    style={form.status === s
                      ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                      : { background: BG_INPUT, color: 'rgba(255,255,255,0.35)', border: `1px solid ${BORDER}` }}>
                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  </button>
                )
              })}
            </div>

            {form.status === 'trancado' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Início do trancamento">
                  <input type="date" className={inputCls} style={inputStyle}
                    value={form.lock_start ?? ''}
                    onChange={e => set('lock_start', e.target.value || null)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
                <Field label="Fim do trancamento">
                  <input type="date" className={inputCls} style={inputStyle}
                    value={form.lock_end ?? ''}
                    onChange={e => set('lock_end', e.target.value || null)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
              </div>
            )}

            {form.status === 'cancelado' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de cancelamento">
                  <input type="date" className={inputCls} style={inputStyle}
                    value={form.cancel_date ?? ''}
                    onChange={e => set('cancel_date', e.target.value || null)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
                <Field label="Motivo">
                  <select className={selectCls} style={inputStyle}
                    value={form.cancel_reason ?? ''}
                    onChange={e => set('cancel_reason', (e.target.value as CancelReason) || null)}
                    onFocus={focusBorder} onBlur={blurBorder}>
                    <option value="">Selecionar…</option>
                    {(Object.entries(CANCEL_REASON_LABEL) as [CancelReason, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </DrawerSection>

          {/* ── Documento ── */}
          <DrawerSection title="Documentos">
            <Field label="Link do Termo de Adesão (PDF)">
              <input className={inputCls} style={inputStyle}
                value={form.termo_url ?? ''}
                onChange={e => set('termo_url', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="https://drive.google.com/…" />
            </Field>
          </DrawerSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/40 transition-all"
            style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}>
            Cancelar
          </button>
          <button onClick={save} disabled={isPending || !form.student_name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: '#E8521A' }}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar alterações' : 'Cadastrar aluno'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────

function DeleteConfirm({ student, onClose }: { student: Student; onClose: () => void }) {
  const deleteMutation = useDeleteStudent()
  async function confirm() {
    await deleteMutation.mutateAsync(student.id)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 z-10"
        style={{ background: BG_CARD2, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#EDEDED]">Excluir aluno?</p>
            <p className="text-[12px] text-white/35 mt-0.5">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-[13px] text-white/50">
          <strong className="text-white/70">{student.student_name}</strong> será removido permanentemente.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/40"
            style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}>
            Cancelar
          </button>
          <button onClick={confirm} disabled={deleteMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: '#DC2626' }}>
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Student row ───────────────────────────────────────────────

function StudentRow({ student, onEdit, onDelete }: {
  student: Student; onEdit: () => void; onDelete: () => void
}) {
  const cfg = STATUS_CONFIG[student.status]
  const Icon = cfg.icon

  const subjectLabel = student.subject ? SUBJECT_LABEL[student.subject] : null
  const levelLabel   = student.subject === 'jlpt' && student.jlpt_level
    ? student.jlpt_level
    : student.subject === 'refesco' && student.school_year
      ? student.school_year
      : null

  return (
    <tr className="group border-b transition-colors duration-100"
      style={{ borderColor: BORDER2 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1A1C24' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>

      {/* Aluno / Responsável */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
            {initials(student.student_name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#EDEDED] truncate leading-tight">
              {student.student_name}
            </p>
            {student.responsible_name && (
              <p className="text-[11px] text-white/35 truncate mt-0.5 flex items-center gap-1">
                <User className="w-2.5 h-2.5 shrink-0" /> {student.responsible_name}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Matéria / Nível */}
      <td className="px-5 py-3.5">
        {subjectLabel ? (
          <div>
            <p className="text-[12px] font-medium text-[#EDEDED]">{subjectLabel}</p>
            {levelLabel && <p className="text-[10px] text-white/35 mt-0.5">{levelLabel}</p>}
          </div>
        ) : <span className="text-[12px] text-white/20">—</span>}
      </td>

      {/* Professor */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-white/45 truncate max-w-[130px]">{student.teacher ?? '—'}</p>
      </td>

      {/* Horário */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-white/45">{student.class_schedule ?? '—'}</p>
      </td>

      {/* Mensalidade */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] font-semibold text-[#EDEDED]">{fmtCurrency(student.monthly_fee)}</p>
        {student.payment_method && (
          <p className="text-[10px] text-white/25 mt-0.5 capitalize">
            {student.payment_method === 'deposito' ? 'Depósito' : student.payment_method === 'dinheiro' ? 'Dinheiro' : 'Stripe'}
          </p>
        )}
      </td>

      {/* Início */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-white/40">{fmtDate(student.start_date)}</p>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          <Icon className="w-3 h-3" /> {cfg.label}
        </span>
        {student.status === 'cancelado' && student.cancel_reason && (
          <p className="text-[10px] text-white/25 mt-1">
            {CANCEL_REASON_LABEL[student.cancel_reason]}
          </p>
        )}
        {student.status === 'trancado' && student.lock_end && (
          <p className="text-[10px] text-white/25 mt-1">até {fmtDate(student.lock_end)}</p>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5" style={{ width: 88 }}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-white/30 hover:text-[#93C5FD] hover:bg-blue-500/10 transition-colors"
            title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {student.termo_url && (
            <a href={student.termo_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Termo de Adesão">
              <FileText className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Excluir">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────

type SortKey = 'nome' | 'inicio'

export default function StudentsPage() {
  const [statusTab,   setStatusTab]   = useState<StudentStatus>('ativo')
  const [search,      setSearch]      = useState('')
  const [sortBy,      setSortBy]      = useState<SortKey>('nome')
  const [showDrawer,  setShowDrawer]  = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)

  const { data: allStudents = [], isLoading, isFetching, refetch } = useStudents()

  const counts = useMemo(() => ({
    ativo:     allStudents.filter(s => s.status === 'ativo').length,
    trancado:  allStudents.filter(s => s.status === 'trancado').length,
    cancelado: allStudents.filter(s => s.status === 'cancelado').length,
  }), [allStudents])

  const filtered = useMemo(() => {
    let list = allStudents.filter(s => s.status === statusTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.student_name.toLowerCase().includes(q) ||
        (s.responsible_name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.phone_responsible ?? '').includes(q)
      )
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'inicio') {
        const ta = a.start_date ? new Date(a.start_date).getTime() : 0
        const tb = b.start_date ? new Date(b.start_date).getTime() : 0
        return tb - ta
      }
      return a.student_name.localeCompare(b.student_name, 'pt-BR')
    })
  }, [allStudents, statusTab, search, sortBy])

  // Cancellation chart data
  const cancelChart = useMemo(() => {
    const cancelled = allStudents.filter(s => s.status === 'cancelado')
    const tally: Record<string, number> = {}
    for (const s of cancelled) {
      const k = s.cancel_reason ?? 'nao_identificado'
      tally[k] = (tally[k] ?? 0) + 1
    }
    return (Object.entries(CANCEL_REASON_LABEL) as [CancelReason, string][]).map(([k, label]) => ({
      label,
      count: tally[k] ?? 0,
      color: CANCEL_COLORS[k],
    })).filter(d => d.count > 0)
  }, [allStudents])

  function exportCSV() {
    const header = ['Aluno','Responsável','Nascimento','Tel Responsável','Tel Aluno','Email','Endereço',
      'Início','Matéria','Nível/Ano','Professor','Horário','Modalidade','Mensalidade','Pagamento','Status','Motivo cancelamento']
    const rows = filtered.map(s => [
      s.student_name, s.responsible_name ?? '', s.birth_date ?? '',
      s.phone_responsible ?? '', s.phone_student ?? '', s.email ?? '', s.address ?? '',
      s.start_date ?? '', s.subject ? SUBJECT_LABEL[s.subject] : '',
      s.jlpt_level ?? s.school_year ?? '',
      s.teacher ?? '', s.class_schedule ?? '', s.modality ?? '',
      s.monthly_fee?.toString() ?? '', s.payment_method ?? '',
      STATUS_CONFIG[s.status].label,
      s.cancel_reason ? CANCEL_REASON_LABEL[s.cancel_reason] : '',
    ])
    const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'alunos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
        <div className="max-w-7xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-bold text-[#EDEDED] tracking-tight">Alunos</h1>
              <p className="text-[13px] text-white/30 mt-0.5">Cadastro e controle de alunos</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.45)' }}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
              <button
                onClick={() => { setEditStudent(null); setShowDrawer(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ background: '#E8521A' }}>
                <Plus className="w-4 h-4" /> Novo Aluno
              </button>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['ativo', 'trancado', 'cancelado'] as StudentStatus[]).map(s => {
              const cfg  = STATUS_CONFIG[s]
              const Icon = cfg.icon
              const active = statusTab === s
              return (
                <button
                  key={s}
                  onClick={() => setStatusTab(s)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                  style={active
                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                    : { background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.4)' }}>
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums',
                    active ? '' : 'text-white/30'
                  )}
                    style={active ? { background: 'rgba(0,0,0,0.2)', color: cfg.color } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                    {counts[s]}
                  </span>
                </button>
              )
            })}

            {/* Refresh */}
            <button onClick={() => refetch()}
              className="p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all ml-auto"
              title="Atualizar">
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
          </div>

          {/* Cancellation chart — only when tab = cancelado */}
          {statusTab === 'cancelado' && cancelChart.length > 0 && (
            <div className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Motivos de Cancelamento
              </p>
              <DonutChart data={cancelChart} />
            </div>
          )}

          {/* Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-1 min-w-[220px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <Search className="w-4 h-4 text-white/25 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome do aluno ou responsável…"
                className="flex-1 bg-transparent outline-none text-[13px] text-white/70 placeholder:text-white/25"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <div className="flex items-center rounded-xl overflow-hidden"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <button
                onClick={() => setSortBy('nome')}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all"
                style={sortBy === 'nome'
                  ? { background: 'rgba(255,255,255,0.07)', color: '#EDEDED' }
                  : { color: 'rgba(255,255,255,0.35)' }}>
                <ArrowUpDown className="w-3 h-3" /> Nome
              </button>
              <button
                onClick={() => setSortBy('inicio')}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all"
                style={sortBy === 'inicio'
                  ? { background: 'rgba(255,255,255,0.07)', color: '#EDEDED' }
                  : { color: 'rgba(255,255,255,0.35)' }}>
                <Calendar className="w-3 h-3" /> Data de Início
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  <GraduationCap className="w-5 h-5 text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-white/40">
                    {search ? 'Nenhum aluno encontrado' : `Nenhum aluno ${STATUS_CONFIG[statusTab].label.toLowerCase()}`}
                  </p>
                  {!search && statusTab === 'ativo' && (
                    <button
                      onClick={() => { setEditStudent(null); setShowDrawer(true) }}
                      className="text-[12px] text-[#E8521A] hover:underline mt-2">
                      Cadastrar primeiro aluno
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Aluno / Responsável', 'Matéria', 'Professor', 'Horário', 'Mensalidade', 'Início', 'Status', ''].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(student => (
                      <StudentRow
                        key={student.id}
                        student={student}
                        onEdit={() => { setEditStudent(student); setShowDrawer(true) }}
                        onDelete={() => setDeleteStudent(student)}
                      />
                    ))}
                  </tbody>
                </table>

                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[11px] text-white/25">
                    {filtered.length} aluno{filtered.length !== 1 ? 's' : ''} {STATUS_CONFIG[statusTab].label.toLowerCase()}{search ? ` · filtro: "${search}"` : ''}
                  </p>
                  <p className="text-[10px] text-white/15">
                    {isFetching ? 'Atualizando…' : 'Dados em tempo real'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showDrawer || editStudent) && (
        <StudentDrawer
          student={editStudent}
          onClose={() => { setShowDrawer(false); setEditStudent(null) }}
        />
      )}
      {deleteStudent && (
        <DeleteConfirm
          student={deleteStudent}
          onClose={() => setDeleteStudent(null)}
        />
      )}
    </>
  )
}
