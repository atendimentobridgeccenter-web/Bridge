import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { HeroProps } from '@/lib/types'

interface Props {
  data: HeroProps
  editable?: boolean
  onEdit?: (field: keyof HeroProps, value: string) => void
}

export default function HeroBlock({ data, editable, onEdit }: Props) {
  const navigate = useNavigate()

  const et = (field: keyof HeroProps, cls: string) =>
    editable ? (
      <span
        className={cls}
        contentEditable
        suppressContentEditableWarning
        onBlur={e => onEdit?.(field, e.currentTarget.textContent ?? '')}
      >
        {data[field] as string}
      </span>
    ) : (
      <span className={cls}>{data[field] as string}</span>
    )

  return (
    <section
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
      style={
        data.backgroundImage
          ? { backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}
      }
    >
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/70" />

      {/* Glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[800px] h-[800px] rounded-full
                      bg-violet-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0
                      w-[500px] h-[500px] rounded-full
                      bg-indigo-600/8 blur-[120px] pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-8 text-center"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                     border border-violet-500/25 bg-violet-500/8 text-violet-300
                     text-xs font-medium mb-10 tracking-wide"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Enterprise SaaS Platform
        </motion.div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-7 leading-[1.05]">
          {et('title', 'outline-none')}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          {et('subtitle', 'outline-none')}
        </p>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl
                     bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg
                     shadow-2xl shadow-violet-900/50 transition-colors"
          onClick={() => navigate(data.buttonLink)}
        >
          {data.buttonText}
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40
                      bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  )
}
