// Editor do bloco "Avaliação de nivelamento" (nó assessment, OS-011).
// Fica em arquivo próprio, exportando só o componente, pela mesma regra de
// fast refresh registrada em formConstants.ts:1-5 — um arquivo que mistura
// export de componente com export de valor quebra o Fast Refresh.
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import type {
  FormNode, AssessmentConfig, AssessmentQuestion, AssessmentBand, JlptLevel,
} from './FormBuilder'
import { uid, isNodeAfterPayment } from './formConstants'

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-ink-mute'
const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-ink placeholder:text-ink-faint outline-none transition-colors'
const inputSty = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }
const focusColor = 'rgba(232,82,26,0.45)'
const blurColor  = 'rgba(255,255,255,0.08)'

export default function AssessmentEditor({
  node, nodes, onUpdate,
}: {
  node:     FormNode
  nodes:    FormNode[]
  onUpdate: (n: FormNode) => void
}) {
  const cfg: AssessmentConfig = node.assessment ?? { questions: [], bands: [], showResult: true }

  function setCfg(patch: Partial<AssessmentConfig>) {
    onUpdate({ ...node, assessment: { ...cfg, ...patch } })
  }

  // ── Questões ──────────────────────────────────────────────────
  function addQuestion() {
    const q: AssessmentQuestion = {
      id: uid(), title: '',
      options: [
        { id: uid(), label: '', points: 0 },
        { id: uid(), label: '', points: 1 },
      ],
    }
    setCfg({ questions: [...cfg.questions, q] })
  }
  function updateQuestion(id: string, patch: Partial<AssessmentQuestion>) {
    setCfg({ questions: cfg.questions.map(q => q.id === id ? { ...q, ...patch } : q) })
  }
  function removeQuestion(id: string) {
    setCfg({ questions: cfg.questions.filter(q => q.id !== id) })
  }
  function moveQuestion(id: string, dir: -1 | 1) {
    const idx = cfg.questions.findIndex(q => q.id === id)
    const to  = idx + dir
    if (idx === -1 || to < 0 || to >= cfg.questions.length) return
    const next = [...cfg.questions]
    const [item] = next.splice(idx, 1)
    next.splice(to, 0, item)
    setCfg({ questions: next })
  }
  function addOption(qId: string) {
    const q = cfg.questions.find(x => x.id === qId)
    if (!q) return
    updateQuestion(qId, { options: [...q.options, { id: uid(), label: '', points: 0 }] })
  }
  function updateOption(qId: string, optId: string, patch: Partial<{ label: string; points: number }>) {
    const q = cfg.questions.find(x => x.id === qId)
    if (!q) return
    updateQuestion(qId, { options: q.options.map(o => o.id === optId ? { ...o, ...patch } : o) })
  }
  function removeOption(qId: string, optId: string) {
    const q = cfg.questions.find(x => x.id === qId)
    if (!q) return
    updateQuestion(qId, { options: q.options.filter(o => o.id !== optId) })
  }

  // ── Faixas de pontuação ───────────────────────────────────────
  function addBand() {
    setCfg({ bands: [...cfg.bands, { minScore: 0, level: 'N5' }] })
  }
  function updateBand(idx: number, patch: Partial<AssessmentBand>) {
    setCfg({ bands: cfg.bands.map((b, i) => i === idx ? { ...b, ...patch } : b) })
  }
  function removeBand(idx: number) {
    setCfg({ bands: cfg.bands.filter((_, i) => i !== idx) })
  }

  // ── Validação (visível, não bloqueia o salvamento) ────────────
  const noQuestions     = cfg.questions.length === 0
  const bandsOutOfOrder = cfg.bands.some((b, i) => i > 0 && b.minScore <= cfg.bands[i - 1].minScore)
  const firstBandNotZero = cfg.bands.length > 0 && cfg.bands[0].minScore !== 0

  const maxScore = cfg.questions.reduce((sum, q) => {
    const max = q.options.reduce((m, o) => Math.max(m, o.points), 0)
    return sum + max
  }, 0)

  const afterPayment = isNodeAfterPayment(node, nodes)

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      {/* Aviso: bloco depois de um nó de pagamento */}
      {afterPayment && (
        <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--warning)' }}>
            Este bloco está depois de uma tela de pagamento. A ficha do aluno é criada com as respostas
            enviadas <strong>antes</strong> do pagamento — o nível respondido aqui não vai chegar até ela.
          </p>
        </div>
      )}

      {/* Título */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Título do Bloco</label>
        <input
          value={node.title}
          onChange={e => onUpdate({ ...node, title: e.target.value })}
          placeholder="Ex: Vamos descobrir seu nível"
          className={inputCls}
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusColor }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurColor }}
        />
      </div>

      {/* Destino na ficha do aluno */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Preenche na ficha do aluno</label>
        <select
          value={node.mapsTo ?? ''}
          onChange={e => onUpdate({ ...node, mapsTo: e.target.value || undefined })}
          className={inputCls + ' appearance-none cursor-pointer'}
          style={inputSty}
        >
          <option value="">Não transferir</option>
          <option value="jlpt_level">Nível JLPT (N5–N1)</option>
        </select>
      </div>

      {/* Mostrar nível ao aluno */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-[12px] font-semibold text-ink">Mostrar o nível ao aluno</p>
          <p className="text-[11px] text-ink-mute mt-0.5">
            {cfg.showResult ? 'O aluno vê o nível calculado ao final' : 'O resultado fica só para a equipe'}
          </p>
        </div>
        <button
          onClick={() => setCfg({ showResult: !cfg.showResult })}
          className="relative rounded-full transition-all duration-200 shrink-0"
          style={{ width: 36, height: 20, background: cfg.showResult ? '#E8521A' : 'rgba(255,255,255,0.1)' }}>
          <span className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
            style={{ width: 16, height: 16, transform: cfg.showResult ? 'translateX(16px)' : 'none' }} />
        </button>
      </div>

      {cfg.showResult && (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Título do Resultado</label>
          <input
            value={cfg.resultTitle ?? ''}
            onChange={e => setCfg({ resultTitle: e.target.value || undefined })}
            placeholder="Ex: Seu nível é"
            className={inputCls}
            style={inputSty}
            onFocus={e => { e.currentTarget.style.borderColor = focusColor }}
            onBlur={e  => { e.currentTarget.style.borderColor = blurColor }}
          />
        </div>
      )}

      {/* Questões */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Questões</label>
          <span className="text-[10px] text-ink-faint">{cfg.questions.length} questõe{cfg.questions.length !== 1 ? 's' : ''}</span>
        </div>

        {noQuestions && (
          <p className="text-[11px]" style={{ color: 'var(--warning)' }}>Adicione ao menos uma questão.</p>
        )}

        {cfg.questions.map((q, qi) => (
          <div key={q.id} className="flex flex-col gap-2.5 p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-ink-faint shrink-0">{String(qi + 1).padStart(2, '0')}</span>
              <input
                value={q.title}
                onChange={e => updateQuestion(q.id, { title: e.target.value })}
                placeholder="Enunciado da questão"
                className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-ink placeholder:text-ink-faint outline-none"
                style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
              />
              <button onClick={() => moveQuestion(q.id, -1)} disabled={qi === 0}
                className="p-1 rounded text-ink-faint hover:text-ink transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => moveQuestion(q.id, 1)} disabled={qi === cfg.questions.length - 1}
                className="p-1 rounded text-ink-faint hover:text-ink transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeQuestion(q.id)}
                className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {q.options.length === 0 && (
              <p className="text-[11px] pl-7" style={{ color: 'var(--warning)' }}>Adicione ao menos uma alternativa.</p>
            )}

            <div className="flex flex-col gap-1.5 pl-7">
              {q.options.map(o => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    value={o.label}
                    onChange={e => updateOption(q.id, o.id, { label: e.target.value })}
                    placeholder="Alternativa"
                    className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-ink placeholder:text-ink-faint outline-none"
                    style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={o.points}
                    onChange={e => updateOption(q.id, o.id, { points: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 px-2 py-1.5 rounded-md text-[12px] text-ink outline-none text-center"
                    style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
                  />
                  <span className="text-[10px] text-ink-faint shrink-0">pts</span>
                  <button onClick={() => removeOption(q.id, o.id)}
                    className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => addOption(q.id)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-[#E8521A] transition-colors self-start">
                <Plus className="w-3 h-3" /> Alternativa
              </button>
            </div>
          </div>
        ))}

        <button onClick={addQuestion}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold text-[#E8521A] transition-all"
          style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.18)' }}>
          <Plus className="w-3.5 h-3.5" /> Questão
        </button>
      </div>

      {/* Faixas de pontuação */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Faixas de Pontuação</label>
          <span className="text-[10px] text-ink-faint">máx. {maxScore} pts</span>
        </div>

        {bandsOutOfOrder && (
          <p className="text-[11px]" style={{ color: 'var(--warning)' }}>
            As faixas precisam estar em ordem crescente de pontuação mínima.
          </p>
        )}
        {firstBandNotZero && (
          <p className="text-[11px]" style={{ color: 'var(--warning)' }}>
            A primeira faixa precisa começar em 0 ponto.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {cfg.bands.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-ink-faint shrink-0">a partir de</span>
              <input
                type="number"
                min={0}
                value={b.minScore}
                onChange={e => updateBand(i, { minScore: Math.max(0, Number(e.target.value) || 0) })}
                className="w-16 px-2 py-1.5 rounded-md text-[12px] text-ink outline-none text-center"
                style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
              />
              <span className="text-[10px] text-ink-faint shrink-0">pts →</span>
              <select
                value={b.level}
                onChange={e => updateBand(i, { level: e.target.value as JlptLevel })}
                className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-ink outline-none appearance-none cursor-pointer"
                style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={() => removeBand(i)}
                className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addBand}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold text-[#E8521A] transition-all"
          style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.18)' }}>
          <Plus className="w-3.5 h-3.5" /> Faixa
        </button>
      </div>
    </div>
  )
}
