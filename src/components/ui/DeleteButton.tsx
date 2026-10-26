import { useState, useEffect, useRef } from 'react'
import { Trash2, Check, Loader2 } from 'lucide-react'

/**
 * Botão de excluir em dois toques, para itens pequenos de lista.
 *
 * O primeiro clique arma, o segundo executa. Serve onde um diálogo modal seria
 * desproporcional — nota, follow-up, avaliação — mas um clique acidental ainda
 * destruiria o registro. Para itens com dependentes (turma, professor), use o
 * diálogo de confirmação: lá o usuário precisa ler o que será afetado.
 *
 * O estado armado se desfaz sozinho: um botão que fica vermelho para sempre
 * acaba sendo clicado de novo sem intenção.
 */
export default function DeleteButton({ onConfirm, loading, title = 'Excluir', armedLabel = 'Confirmar' }: {
  onConfirm: () => void
  loading?: boolean
  title?: string
  armedLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!armed) return
    timer.current = setTimeout(() => setArmed(false), 4000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [armed])

  if (loading) {
    return (
      <span className="p-1.5 inline-flex">
        <Loader2 className="w-3 h-3 animate-spin text-ink-mute" />
      </span>
    )
  }

  if (armed) {
    return (
      <button
        onClick={() => { setArmed(false); onConfirm() }}
        onMouseLeave={() => setArmed(false)}
        title={armedLabel}
        className="px-2 py-1 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition-all whitespace-nowrap"
        style={{ background: 'rgba(239,68,68,0.14)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <Check className="w-3 h-3 shrink-0" /> {armedLabel}
      </button>
    )
  }

  return (
    <button
      onClick={() => setArmed(true)}
      title={title}
      className="p-1.5 rounded-lg text-ink-mute hover:text-[#F87171] hover:bg-red-500/8 transition-all"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  )
}
