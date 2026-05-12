import { motion } from 'framer-motion'
import { Zap, Shield, TrendingUp, Star, Globe, Lock, Cpu, BarChart3, Users } from 'lucide-react'
import type { FeaturesProps } from '@/lib/types'

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap:        <Zap        className="w-5 h-5" />,
  Shield:     <Shield     className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Star:       <Star       className="w-5 h-5" />,
  Globe:      <Globe      className="w-5 h-5" />,
  Lock:       <Lock       className="w-5 h-5" />,
  Cpu:        <Cpu        className="w-5 h-5" />,
  BarChart3:  <BarChart3  className="w-5 h-5" />,
  Users:      <Users      className="w-5 h-5" />,
}

interface Props {
  data: FeaturesProps
  editable?: boolean
  onEdit?: (path: string, value: string) => void
}

export default function FeaturesBlock({ data, editable, onEdit }: Props) {
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
  const fadeUp  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }

  return (
    <section className="bg-zinc-950 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section headline */}
        <motion.h2
          className="text-center text-3xl md:text-5xl font-bold text-white mb-20 tracking-tight"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {editable ? (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onEdit?.('headline', e.currentTarget.textContent ?? '')}
              className="outline-none"
            >
              {data.headline}
            </span>
          ) : data.headline}
        </motion.h2>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.features.map((feat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="group relative rounded-2xl border border-white/6 bg-zinc-900/50
                         p-7 hover:border-violet-500/30 hover:bg-violet-500/4
                         transition-all duration-300"
            >
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 to-violet-500/0
                              group-hover:from-violet-500/3 group-hover:to-transparent
                              transition-all duration-500 pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl
                                bg-violet-500/10 text-violet-400 mb-6
                                group-hover:bg-violet-500/18 transition-colors">
                  {ICON_MAP[feat.icon] ?? <Zap className="w-5 h-5" />}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2.5">
                  {editable ? (
                    <span
                      contentEditable suppressContentEditableWarning className="outline-none"
                      onBlur={e => onEdit?.(`features.${i}.title`, e.currentTarget.textContent ?? '')}
                    >{feat.title}</span>
                  ) : feat.title}
                </h3>

                <p className="text-zinc-500 text-sm leading-relaxed">
                  {editable ? (
                    <span
                      contentEditable suppressContentEditableWarning className="outline-none"
                      onBlur={e => onEdit?.(`features.${i}.description`, e.currentTarget.textContent ?? '')}
                    >{feat.description}</span>
                  ) : feat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
