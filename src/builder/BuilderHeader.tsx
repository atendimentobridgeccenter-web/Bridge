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
    <header className="h-14 shrink-0 flex items-center gap-4 px-4 bg-slate-900 border-b border-slate-800 z-10">
      <button
        onClick={() => navigate('/admin')}
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          className="bg-transparent text-white font-semibold text-sm outline-none w-full truncate"
          placeholder="Título da página..."
        />
        <div className="flex items-center gap-1 text-xs text-slate-500">
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
            <button onClick={() => setEditingSlug(true)} className="text-violet-400 hover:text-violet-300">
              {slug || 'slug-da-pagina'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.open(`/${slug}`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>

        <button
          onClick={onTogglePublish}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            published
              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white',
          )}
        >
          {published && <Check className="w-3.5 h-3.5" />}
          {published ? 'Publicado' : 'Rascunho'}
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </header>
  )
}
