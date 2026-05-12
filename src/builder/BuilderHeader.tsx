import { useState } from 'react'
import { Save, Eye, ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface Props {
  title: string
  slug: string
  published: boolean
  saving: boolean
  onSave: () => void
  onTogglePublish: () => void
  onTitleChange: (t: string) => void
  onSlugChange: (s: string) => void
}

export default function BuilderHeader({
  title, slug, published, saving, onSave, onTogglePublish, onTitleChange, onSlugChange,
}: Props) {
  const navigate = useNavigate()
  const [editingSlug, setEditingSlug] = useState(false)

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4
                       bg-zinc-900 border-b border-white/6 z-10">
      <button
        onClick={() => navigate('/admin')}
        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-white/8" />

      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          className="bg-transparent text-white font-semibold text-sm outline-none w-full truncate
                     placeholder:text-zinc-600"
          placeholder="Título da página..."
        />
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <span>/</span>
          {editingSlug ? (
            <input
              autoFocus
              value={slug}
              onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              onBlur={() => setEditingSlug(false)}
              className="bg-transparent outline-none text-violet-400 w-40"
            />
          ) : (
            <button
              onClick={() => setEditingSlug(true)}
              className="text-violet-400/70 hover:text-violet-300 transition-colors"
            >
              {slug || 'slug-da-pagina'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => window.open(`/${slug}`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>

        <button
          onClick={onTogglePublish}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            published
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/6',
          )}
        >
          {published && <Check className="w-3 h-3" />}
          {published ? 'Publicado' : 'Rascunho'}
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold
                     bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white
                     transition-colors shadow-lg shadow-violet-900/30"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </header>
  )
}
