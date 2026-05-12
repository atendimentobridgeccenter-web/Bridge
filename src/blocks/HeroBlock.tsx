import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { HeroProps } from '@/lib/types'

interface Props {
  data: HeroProps
  editable?: boolean
  onEdit?: (field: keyof HeroProps, value: string) => void
}

export default function HeroBlock({ data, editable, onEdit }: Props) {
  const navigate = useNavigate()

  const editableText = (field: keyof HeroProps, className: string) =>
    editable ? (
      <span
        className={className}
        contentEditable
        suppressContentEditableWarning
        onBlur={e => onEdit?.(field, e.currentTarget.textContent ?? '')}
      >
        {data[field] as string}
      </span>
    ) : (
      <span className={className}>{data[field] as string}</span>
    )

  return (
    <section
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      style={
        data.backgroundImage
          ? { backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}
      }
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/80" />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Enterprise SaaS Platform
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
          {editableText('title', 'outline-none')}
        </h1>

        <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          {editableText('subtitle', 'outline-none')}
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg shadow-xl shadow-violet-900/50 transition-colors"
          onClick={() => navigate(data.buttonLink)}
        >
          {data.buttonText}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </motion.button>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  )
}
