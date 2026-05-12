import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { CTAProps } from '@/lib/types'

interface Props {
  data: CTAProps
  editable?: boolean
  onEdit?: (field: keyof CTAProps, value: string) => void
}

export default function CallToActionBlock({ data, editable, onEdit }: Props) {
  const navigate = useNavigate()

  const et = (field: keyof CTAProps, className = 'outline-none') =>
    editable ? (
      <span
        contentEditable
        suppressContentEditableWarning
        className={className}
        onBlur={e => onEdit?.(field, e.currentTarget.textContent ?? '')}
      >
        {data[field]}
      </span>
    ) : (
      <>{data[field]}</>
    )

  return (
    <section className="relative bg-slate-950 py-32 px-6 overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none" />

      <motion.div
        className="relative z-10 max-w-3xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          {et('title')}
        </h2>
        <p className="text-lg md:text-xl text-slate-400 mb-12">
          {et('subtitle')}
        </p>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="px-10 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xl shadow-2xl shadow-violet-900/60 transition-all"
          onClick={() => navigate(data.buttonLink)}
        >
          {data.buttonText}
        </motion.button>
      </motion.div>
    </section>
  )
}
