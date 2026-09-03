import { useState, useEffect } from 'react'
import {
  Tag, Plus, Trash2, X, Check, Loader2, Ticket,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#13151A'
const BG_INPUT = '#0D0E12'
const BORDER   = 'rgba(255,255,255,0.07)'
const ACCENT   = '#E8521A'

// ── Types ─────────────────────────────────────────────────────

interface Coupon {
  id:             string
  code:           string
  description:    string | null
  discount_type:  'percentage' | 'fixed'
  discount_value: number
  applies_to:     'enrollment' | 'monthly' | 'both'
  max_uses:       number | null
  uses_count:     number
  active:         boolean
  expires_at:     string | null
  created_at:     string
}

const BLANK_FORM = {
  code:           '',
  description:    '',
  discount_type:  'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  applies_to:     'both' as 'enrollment' | 'monthly' | 'both',
  max_uses:       '',
  expires_at:     '',
}

// ── Helpers ───────────────────────────────────────────────────

function discountLabel(c: Coupon) {
  return c.discount_type === 'percentage'
    ? `${c.discount_value}%`
    : `R$ ${c.discount_value.toFixed(2).replace('.', ',')}`
}

function appliesToLabel(a: string) {
  if (a === 'enrollment') return 'Matrícula'
  if (a === 'monthly')    return 'Mensalidade'
  return 'Matrícula + Mensalidade'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ── Page ──────────────────────────────────────────────────────

export default function CuponsPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState(BLANK_FORM)

  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
  const inputSty = { background: BG_INPUT, border: `1px solid ${BORDER}` }
  const labelCls = 'block text-[12px] font-semibold text-white/40 mb-1.5 uppercase tracking-wider'

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons((data ?? []) as Coupon[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (!code) { toast.error('Informe o código do cupom.'); return }
    const value = parseFloat(form.discount_value)
    if (isNaN(value) || value <= 0) { toast.error('Valor de desconto inválido.'); return }
    setSaving(true)
    const { error } = await supabase.from('coupons').insert({
      code,
      description:    form.description.trim() || null,
      discount_type:  form.discount_type,
      discount_value: value,
      applies_to:     form.applies_to,
      max_uses:       form.max_uses ? parseInt(form.max_uses) : null,
      expires_at:     form.expires_at || null,
    })
    setSaving(false)
    if (error) { toast.error(`Erro: ${error.message}`); return }
    toast.success('Cupom criado!')
    setForm(BLANK_FORM)
    setCreating(false)
    load()
  }

  async function toggleActive(c: Coupon) {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id)
    if (error) { toast.error('Erro ao atualizar.'); return }
    setCoupons(cs => cs.map(x => x.id === c.id ? { ...x, active: !c.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cupom permanentemente?')) return
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir.'); return }
    setCoupons(cs => cs.filter(c => c.id !== id))
    toast.success('Cupom excluído.')
  }

  const activeCount   = coupons.filter(c => c.active).length
  const inactiveCount = coupons.filter(c => !c.active).length
  const totalUses     = coupons.reduce((sum, c) => sum + c.uses_count, 0)

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#DADCE6] tracking-tight">Cupons de Desconto</h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#404252' }}>
              Códigos aplicados no formulário de pagamento
            </p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer"
              style={{ background: ACCENT, boxShadow: '0 4px 16px rgba(232,82,26,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Cupom
            </button>
          )}
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cupons Ativos',  value: activeCount,   color: '#34D399' },
            { label: 'Inativos',       value: inactiveCount, color: '#5A5C6A' },
            { label: 'Usos Totais',    value: totalUses,     color: '#FB923C' },
          ].map(item => (
            <div
              key={item.label}
              className="p-4 rounded-xl flex flex-col gap-1.5"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <span className="text-[11px]" style={{ color: '#404252' }}>{item.label}</span>
              <p className="text-[26px] font-bold tabular-nums leading-none"
                style={{ color: loading ? '#ffffff15' : item.color }}>
                {loading ? '—' : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Create form ── */}
        {creating && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: 'rgba(232,82,26,0.04)', border: '1px solid rgba(232,82,26,0.15)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-bold text-[#DADCE6]">Novo Cupom</p>
              <button
                type="button"
                onClick={() => { setCreating(false); setForm(BLANK_FORM) }}
                className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Código</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: BRIDGE10"
                  className={inputCls + ' font-mono'}
                  style={inputSty}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
                />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Desconto de boas-vindas"
                  className={inputCls}
                  style={inputSty}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tipo</label>
                <select
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                  className={inputCls + ' appearance-none cursor-pointer'}
                  style={inputSty}
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{form.discount_type === 'percentage' ? 'Porcentagem' : 'Valor (R$)'}</label>
                <input
                  type="number"
                  min="0"
                  step={form.discount_type === 'percentage' ? '1' : '0.01'}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percentage' ? '10' : '50.00'}
                  className={inputCls}
                  style={inputSty}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
                />
              </div>
              <div>
                <label className={labelCls}>Aplica em</label>
                <select
                  value={form.applies_to}
                  onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as 'enrollment' | 'monthly' | 'both' }))}
                  className={inputCls + ' appearance-none cursor-pointer'}
                  style={inputSty}
                >
                  <option value="both">Matrícula + Mensalidade</option>
                  <option value="enrollment">Matrícula</option>
                  <option value="monthly">Mensalidade</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Máx. de usos</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Ilimitado"
                  className={inputCls}
                  style={inputSty}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
                />
              </div>
              <div>
                <label className={labelCls}>Expira em</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className={inputCls + ' cursor-pointer'}
                  style={{ ...inputSty, colorScheme: 'dark' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setCreating(false); setForm(BLANK_FORM) }}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                style={{ background: ACCENT }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Cupom
              </button>
            </div>
          </form>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#404252' }} />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)' }}
            >
              <Ticket className="w-5 h-5 text-[#E8521A]" />
            </div>
            <p className="text-[13px]" style={{ color: '#2E3042' }}>Nenhum cupom criado ainda.</p>
            <p className="text-[11px]" style={{ color: '#1C1E28' }}>Clique em "Novo Cupom" para começar.</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          >
            {/* Header */}
            <div
              className="grid px-5 py-3 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '1fr 1fr 80px 100px 80px 44px',
                color: '#2E3042',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span>Código</span>
              <span>Desconto</span>
              <span>Usos</span>
              <span>Aplica em</span>
              <span>Status</span>
              <span />
            </div>

            {coupons.map((c, idx) => {
              const expired = c.expires_at && new Date(c.expires_at) < new Date()
              const exhausted = c.max_uses !== null && c.uses_count >= c.max_uses

              return (
                <div
                  key={c.id}
                  className="group grid items-center px-5 py-3 transition-all hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: '1fr 1fr 80px 100px 80px 44px',
                    borderBottom: idx < coupons.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    opacity: (!c.active || expired || exhausted) ? 0.55 : 1,
                  }}
                >
                  {/* Code */}
                  <div>
                    <span
                      className="font-mono font-bold text-[12.5px] px-2 py-0.5 rounded-md"
                      style={{
                        background: c.active ? 'rgba(232,82,26,0.1)' : 'rgba(255,255,255,0.04)',
                        color:      c.active ? '#E8521A'              : '#5A5C6A',
                        border:     `1px solid ${c.active ? 'rgba(232,82,26,0.2)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {c.code}
                    </span>
                    {c.description && (
                      <p className="text-[10.5px] mt-0.5 truncate" style={{ color: '#2E3042' }}>{c.description}</p>
                    )}
                  </div>

                  {/* Discount */}
                  <div>
                    <p className="text-[13px] font-semibold text-[#DADCE6]">{discountLabel(c)}</p>
                    {c.expires_at && (
                      <p className="text-[10px]" style={{ color: expired ? '#EF4444' : '#2E3042' }}>
                        {expired ? 'Expirado' : `Expira ${fmtDate(c.expires_at)}`}
                      </p>
                    )}
                  </div>

                  {/* Uses */}
                  <p className="text-[12.5px] tabular-nums" style={{ color: '#5A5C6A' }}>
                    {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ''}
                  </p>

                  {/* Applies to */}
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded self-center"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#7B7E92' }}
                  >
                    {appliesToLabel(c.applies_to)}
                  </span>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(c)}
                    title={c.active ? 'Desativar' : 'Ativar'}
                    className="relative rounded-full transition-all duration-200 shrink-0 cursor-pointer"
                    style={{ width: 36, height: 20, background: c.active ? ACCENT : 'rgba(255,255,255,0.1)' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                      style={{ width: 16, height: 16, transform: c.active ? 'translateX(16px)' : 'none' }}
                    />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer"
                    style={{
                      background: 'rgba(239,68,68,0.07)',
                      border: '1px solid rgba(239,68,68,0.12)',
                      color: '#F87171',
                    }}
                    title="Excluir cupom"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
