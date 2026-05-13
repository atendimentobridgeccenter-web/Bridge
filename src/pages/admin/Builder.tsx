import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, Globe, GlobeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { GrapesJSConfig } from '@/lib/types'
import 'grapesjs/dist/css/grapes.min.css'

// @ts-ignore — no types for preset-webpage
import presetWebpage from 'grapesjs-preset-webpage'
// @ts-ignore
import grapesjs from 'grapesjs'

export default function Builder() {
  const { id }    = useParams<{ id?: string }>()
  const navigate  = useNavigate()

  const editorRef   = useRef<HTMLDivElement>(null)
  const gjsRef      = useRef<ReturnType<typeof grapesjs.init> | null>(null)

  const [title,     setTitle]     = useState('Nova Landing Page')
  const [slug,      setSlug]      = useState('')
  const [published, setPublished] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [pageId,    setPageId]    = useState<string | null>(id ?? null)
  const [ready,     setReady]     = useState(false)

  // Load existing page data before initializing GrapesJS
  useEffect(() => {
    if (!id) { setReady(true); return }

    supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title)
          setSlug(data.slug)
          setPublished(data.published)
        }
        setReady(true)
      })
  }, [id])

  // Initialize GrapesJS once the container is mounted and data is loaded
  useEffect(() => {
    if (!ready || !editorRef.current || gjsRef.current) return

    // Load initial HTML/CSS from DB if this is an edit
    let initHtml = '<div style="padding:60px 20px;text-align:center;"><h1>Sua Página Aqui</h1><p>Comece editando este conteúdo.</p></div>'
    let initCss  = ''

    const fetchContent = async () => {
      if (id) {
        const { data } = await supabase
          .from('landing_pages')
          .select('blocks_config')
          .eq('id', id)
          .single()

        if (data?.blocks_config) {
          const cfg = data.blocks_config as Record<string, unknown>
          if (cfg.type === 'grapesjs') {
            initHtml = (cfg.html as string) || initHtml
            initCss  = (cfg.css as string) || initCss
          }
        }
      }

      const editor = grapesjs.init({
        container: editorRef.current!,
        plugins: [presetWebpage],
        pluginsOpts: {},
        height: 'calc(100vh - 56px)',
        width: 'auto',
        storageManager: false,
        components: initHtml,
        style: initCss,
        canvas: {
          styles: [],
          scripts: [],
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet',  width: '768px' },
            { name: 'Mobile',  width: '375px' },
          ],
        },
        panels: {
          defaults: [],
        },
      })

      gjsRef.current = editor
    }

    fetchContent()

    return () => {
      gjsRef.current?.destroy()
      gjsRef.current = null
    }
  }, [ready, id])

  async function handleSave() {
    if (!slug.trim()) { alert('Defina um slug para a página.'); return }
    if (!gjsRef.current) return

    setSaving(true)

    const html = gjsRef.current.getHtml() as string
    const css  = gjsRef.current.getCss()  as string

    const blocksConfig: GrapesJSConfig = { type: 'grapesjs', html, css }

    if (pageId) {
      await supabase
        .from('landing_pages')
        .update({ title, slug, published, blocks_config: blocksConfig })
        .eq('id', pageId)
    } else {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert({ title, slug, published, blocks_config: blocksConfig })
        .select('id')
        .single()
      if (!error && data) {
        setPageId(data.id)
        navigate(`/admin/builder/${data.id}`, { replace: true })
      }
    }

    setSaving(false)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Top bar */}
      <header
        className="shrink-0 h-14 flex items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A' }}
      >
        <Link
          to="/admin"
          className="p-1.5 rounded-md text-[#71717A] hover:text-[#EDEDED] transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

        {/* Title input */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 max-w-[260px] text-sm font-medium text-[#EDEDED] bg-transparent
                     border-0 outline-none placeholder:text-[#52525B]"
          placeholder="Título da página"
        />

        {/* Slug input */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#71717A]"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-[#52525B]">/</span>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
            className="w-32 bg-transparent border-0 outline-none text-[#A1A1AA]
                       placeholder:text-[#52525B]"
            placeholder="meu-slug"
          />
        </div>

        <div className="flex-1" />

        {/* Publish toggle */}
        <button
          onClick={() => setPublished(p => !p)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={published
            ? { background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#71717A', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          {published
            ? <><Globe className="w-3.5 h-3.5" /> Publicado</>
            : <><GlobeOff className="w-3.5 h-3.5" /> Rascunho</>
          }
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium
                     bg-white text-black hover:bg-[#EBEBEB] transition-colors disabled:opacity-50"
        >
          {saving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Save className="w-3.5 h-3.5" />
          }
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </header>

      {/* GrapesJS container */}
      <div ref={editorRef} className="flex-1" />
    </div>
  )
}
