import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Globe, Loader2, Check,
  Monitor, Tablet, Smartphone,
  Undo, Redo, Eye,
  Layers, Palette, Sliders,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { GrapesJSConfig } from '@/lib/types'
import { cn } from '@/lib/cn'

// GrapesJS — import CSS in order: base first, then our dark override
import 'grapesjs/dist/css/grapes.min.css'
import '@/styles/grapesjs-dark.css'

// @ts-ignore — no official types
import grapesjs from 'grapesjs'
// @ts-ignore
import presetWebpage from 'grapesjs-preset-webpage'

// ── Types ─────────────────────────────────────────────────────

type DeviceName  = 'Desktop' | 'Tablet'  | 'Mobile'
type LeftTab     = 'blocks'  | 'layers'
type RightTab    = 'styles'  | 'traits'

// ── Tokens ────────────────────────────────────────────────────

const BG_SHELL   = '#0A0A0A'
const BG_PANEL   = '#16181F'
const BG_TABBAR  = '#13151A'
const BORDER     = '1px solid rgba(255,255,255,0.07)'
const ORANGE     = '#E8521A'

// ── Small helpers ──────────────────────────────────────────────

function Divider() {
  return <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
}

function PanelTab({
  active, icon: Icon, label, onClick,
}: {
  active: boolean
  icon:   React.ElementType
  label:  string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold relative transition-colors"
      style={{ color: active ? '#F1F5F9' : 'rgba(255,255,255,0.3)' }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
          style={{ background: ORANGE }}
        />
      )}
    </button>
  )
}

// ── Device buttons ─────────────────────────────────────────────

const DEVICES: { name: DeviceName; icon: React.ElementType }[] = [
  { name: 'Desktop',  icon: Monitor    },
  { name: 'Tablet',   icon: Tablet     },
  { name: 'Mobile',   icon: Smartphone },
]

// ── Page ──────────────────────────────────────────────────────

export default function SalesPageEditorPage() {
  const { id }   = useParams<{ id?: string }>()
  const navigate = useNavigate()

  // DOM refs GrapesJS will hook into
  const canvasRef    = useRef<HTMLDivElement>(null)
  const blocksRef    = useRef<HTMLDivElement>(null)
  const layersRef    = useRef<HTMLDivElement>(null)
  const stylesRef    = useRef<HTMLDivElement>(null)
  const traitsRef    = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gjsRef = useRef<any>(null)

  // Page metadata
  const [title,     setTitle]     = useState('Nova Sales Page')
  const [slug,      setSlug]      = useState('')
  const [published, setPublished] = useState(false)
  const [pageId,    setPageId]    = useState<string | null>(id ?? null)

  // UI state
  const [ready,    setReady]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [leftTab,  setLeftTab]  = useState<LeftTab>('blocks')
  const [rightTab, setRightTab] = useState<RightTab>('styles')
  const [device,   setDevice]   = useState<DeviceName>('Desktop')

  // ── 1. Load page metadata ────────────────────────────────────

  useEffect(() => {
    if (!id) { setReady(true); return }

    supabase
      .from('landing_pages')
      .select('id, title, slug, published')
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

  // ── 2. Init GrapesJS after layout is mounted + data ready ────

  useEffect(() => {
    if (!ready) return
    if (!canvasRef.current || !blocksRef.current || !stylesRef.current ||
        !traitsRef.current  || !layersRef.current) return
    if (gjsRef.current) return

    const initHtml = `
      <div style="padding:80px 40px;text-align:center;font-family:sans-serif;">
        <h1 style="font-size:48px;font-weight:800;color:#111;margin:0 0 16px">
          Sua Sales Page Aqui
        </h1>
        <p style="font-size:18px;color:#555;max-width:560px;margin:0 auto 32px">
          Arraste blocos da esquerda para construir sua página de vendas.
        </p>
        <a href="#" style="display:inline-block;padding:16px 40px;background:#E8521A;
           color:#fff;font-weight:700;font-size:16px;border-radius:12px;text-decoration:none;">
          Começar Agora →
        </a>
      </div>
    `

    // Fetch existing content from DB
    const init = async () => {
      let html = initHtml
      let css  = ''

      if (id) {
        const { data } = await supabase
          .from('landing_pages')
          .select('blocks_config')
          .eq('id', id)
          .single()

        if (data?.blocks_config) {
          const cfg = data.blocks_config as Record<string, unknown>
          if (cfg.type === 'grapesjs') {
            html = (cfg.html as string) || html
            css  = (cfg.css  as string) || css
          }
        }
      }

      const editor = grapesjs.init({
        container: canvasRef.current!,

        // ── Content ──
        components: html,
        style:      css,

        // ── No localStorage — we save manually via Supabase ──
        storageManager: false,

        // ── Remove ALL built-in GrapesJS panels ──
        // Our React layout provides the panel chrome
        panels: { defaults: [] },

        // ── Route sub-UIs to their React-managed divs ──
        blockManager: {
          appendTo: blocksRef.current!,
        },

        styleManager: {
          appendTo: stylesRef.current!,
          sectors: [
            {
              name: 'Dimensões',
              open: false,
              properties: [
                'width', 'min-width', 'max-width',
                'height', 'min-height', 'max-height',
                'padding', 'margin',
              ],
            },
            {
              name: 'Tipografia',
              open: false,
              properties: [
                'font-family', 'font-size', 'font-weight',
                'letter-spacing', 'line-height', 'color',
                'text-align', 'text-decoration', 'text-transform',
              ],
            },
            {
              name: 'Fundo',
              open: false,
              properties: ['background-color', 'background-image', 'background-size', 'background-position'],
            },
            {
              name: 'Borda & Sombra',
              open: false,
              properties: ['border', 'border-radius', 'box-shadow', 'opacity'],
            },
            {
              name: 'Layout (Flex)',
              open: false,
              properties: ['display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'flex-wrap'],
            },
            {
              name: 'Posição',
              open: false,
              properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow'],
            },
          ],
        },

        traitManager: {
          appendTo: traitsRef.current!,
        },

        layerManager: {
          appendTo: layersRef.current!,
        },

        // ── Devices ──
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet',  width: '768px',  widthMedia: '992px'  },
            { name: 'Mobile',  width: '375px',  widthMedia: '480px'  },
          ],
        },

        // ── Canvas iframe isolation ──
        // The iframe naturally isolates our admin CSS.
        // We only inject normalize + Inter font for design fidelity.
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
          ],
          scripts: [],
        },

        // ── Preset blocks ──
        plugins:     [presetWebpage],
        pluginsOpts: { [presetWebpage]: {} },

        // ── Canvas height fills the flex container ──
        height: '100%',
        width:  'auto',

        // ── Enable rich text editor ──
        richTextEditor: {
          actions: ['bold', 'italic', 'underline', 'strikethrough', 'link'],
        },
      })

      gjsRef.current = editor

      // Sync undo/redo button availability (force re-render via a counter)
      editor.on('component:add component:remove component:update style:add', () => {
        // No direct state needed — buttons call editor API on click
      })
    }

    init()

    return () => {
      gjsRef.current?.destroy()
      gjsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // ── 3. Device switching ───────────────────────────────────────

  function switchDevice(d: DeviceName) {
    setDevice(d)
    gjsRef.current?.setDevice(d)
  }

  // ── 4. Undo / Redo ────────────────────────────────────────────

  function undo() { gjsRef.current?.UndoManager?.undo() }
  function redo() { gjsRef.current?.UndoManager?.redo() }

  // ── 5. Preview — opens a new tab with current HTML/CSS ────────

  function openPreview() {
    if (!gjsRef.current) return
    const html = gjsRef.current.getHtml() as string
    const css  = gjsRef.current.getCss()  as string
    const doc  = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>${css}</style>
    </head><body>${html}</body></html>`
    const blob = new Blob([doc], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  // ── 6. Save ───────────────────────────────────────────────────

  async function handleSave(publish = false) {
    if (!slug.trim()) { alert('Defina um slug antes de salvar.'); return }
    if (!gjsRef.current) return

    setSaving(true)

    const html: string = gjsRef.current.getHtml()
    const css:  string = gjsRef.current.getCss()
    const blocksConfig: GrapesJSConfig = { type: 'grapesjs', html, css }
    const nextPublished = publish ? true : published

    if (pageId) {
      await supabase
        .from('landing_pages')
        .update({ title, slug, published: nextPublished, blocks_config: blocksConfig })
        .eq('id', pageId)
    } else {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert({ title, slug, published: nextPublished, blocks_config: blocksConfig })
        .select('id')
        .single()

      if (!error && data) {
        setPageId(data.id)
        navigate(`/admin/sales-pages/${data.id}/edit`, { replace: true })
      }
    }

    if (publish) setPublished(true)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100vh', background: BG_SHELL }}
    >
      {/* ══ TOPBAR ════════════════════════════════════════════════ */}
      <header
        className="shrink-0 h-14 flex items-center gap-3 px-4"
        style={{ borderBottom: BORDER, background: '#0D0F13', zIndex: 20 }}
      >
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: '#52525B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <Divider />

        {/* Page title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-sm font-semibold bg-transparent border-0 outline-none max-w-[220px]"
          style={{ color: '#EDEDED' }}
          placeholder="Nome da página"
        />

        {/* Slug */}
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ color: '#3F3F46' }}>/</span>
          <input
            value={slug}
            onChange={e =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
            }
            className="w-28 bg-transparent border-0 outline-none"
            style={{ color: '#71717A' }}
            placeholder="meu-slug"
          />
        </div>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* Device switcher */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {DEVICES.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => switchDevice(name)}
              title={name}
              className="p-1.5 rounded-md transition-all"
              style={{
                background: device === name ? 'rgba(232,82,26,0.12)' : 'transparent',
                color:      device === name ? ORANGE : '#52525B',
                border:     device === name ? '1px solid rgba(232,82,26,0.25)' : '1px solid transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <Divider />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          {([
            { icon: Undo, fn: undo, title: 'Desfazer (Ctrl+Z)' },
            { icon: Redo, fn: redo, title: 'Refazer (Ctrl+Y)'  },
          ] as const).map(({ icon: Icon, fn, title: t }) => (
            <button
              key={t}
              onClick={fn}
              title={t}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: '#52525B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Preview */}
        <button
          onClick={openPreview}
          title="Pré-visualizar"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#A1A1AA' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>

        <Divider />

        {/* Publish toggle badge */}
        <button
          onClick={() => setPublished(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={
            published
              ? { background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#52525B', border: '1px solid rgba(255,255,255,0.07)' }
          }
        >
          <Globe className="w-3 h-3" />
          {published ? 'Publicado' : 'Rascunho'}
        </button>

        {/* Save draft */}
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A1A1AA' }}
        >
          {saving && !saved
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saved
              ? <Check className="w-3.5 h-3.5" style={{ color: '#34D399' }} />
              : <Save className="w-3.5 h-3.5" />
          }
          {saved ? 'Salvo!' : 'Salvar'}
        </button>

        {/* Publish */}
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background:  ORANGE,
            boxShadow:   '0 0 0 0 rgba(232,82,26,0)',
            transition:  'box-shadow 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(232,82,26,0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(232,82,26,0)' }}
        >
          <Globe className="w-3.5 h-3.5" />
          Publicar
        </button>
      </header>

      {/* ══ EDITOR BODY ══════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: 224, background: BG_PANEL, borderRight: BORDER }}
        >
          {/* Tab bar */}
          <div
            className="shrink-0 flex items-end gap-1 px-2"
            style={{ background: BG_TABBAR, borderBottom: BORDER }}
          >
            <PanelTab
              active={leftTab === 'blocks'}
              icon={Palette}
              label="Blocos"
              onClick={() => setLeftTab('blocks')}
            />
            <PanelTab
              active={leftTab === 'layers'}
              icon={Layers}
              label="Camadas"
              onClick={() => setLeftTab('layers')}
            />
          </div>

          {/* GrapesJS block manager */}
          <div
            ref={blocksRef}
            className="flex-1 overflow-y-auto"
            style={{ display: leftTab === 'blocks' ? 'block' : 'none' }}
          />

          {/* GrapesJS layer manager */}
          <div
            ref={layersRef}
            className="flex-1 overflow-y-auto"
            style={{ display: leftTab === 'layers' ? 'block' : 'none' }}
          />
        </aside>

        {/* ── CANVAS ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden relative">
          {/* Loading overlay */}
          {!ready && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: BG_SHELL }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${ORANGE} transparent transparent transparent` }}
              />
            </div>
          )}

          {/* GrapesJS canvas — takes over this div completely */}
          <div
            ref={canvasRef}
            className="w-full h-full"
            style={{ background: '#151618' }}
          />
        </main>

        {/* ── RIGHT PANEL ────────────────────────────────────── */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: 300, background: BG_PANEL, borderLeft: BORDER }}
        >
          {/* Tab bar */}
          <div
            className="shrink-0 flex items-end gap-1 px-2"
            style={{ background: BG_TABBAR, borderBottom: BORDER }}
          >
            <PanelTab
              active={rightTab === 'styles'}
              icon={Palette}
              label="Estilos"
              onClick={() => setRightTab('styles')}
            />
            <PanelTab
              active={rightTab === 'traits'}
              icon={Sliders}
              label="Atributos"
              onClick={() => setRightTab('traits')}
            />
          </div>

          {/* GrapesJS style manager */}
          <div
            ref={stylesRef}
            className="flex-1 overflow-y-auto"
            style={{ display: rightTab === 'styles' ? 'block' : 'none' }}
          />

          {/* GrapesJS trait manager */}
          <div
            ref={traitsRef}
            className="flex-1 overflow-y-auto"
            style={{ display: rightTab === 'traits' ? 'block' : 'none' }}
          />
        </aside>
      </div>
    </div>
  )
}
