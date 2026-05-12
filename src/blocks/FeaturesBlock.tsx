import { motion } from 'framer-motion'
import { Zap, Shield, TrendingUp, Star, Globe, Lock, Cpu, BarChart3, Users } from 'lucide-react'
import type { FeaturesProps } from '@/lib/types'

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap:        <Zap className="w-6 h-6" />,
  Shield:     <Shield className="w-6 h-6" />,
  TrendingUp: <TrendingUp className="w-6 h-6" />,
  Star:       <Star className="w-6 h-6" />,
  Globe:      <Globe className="w-6 h-6" />,
  Lock:       <Lock className="w-6 h-6" />,
  Cpu:        <Cpu className="w-6 h-6" />,
  BarChart3:  <BarChart3 className="w-6 h-6" />,
  Users:      <Users className="w-6 h-6" />,
}

interface Props {
  data: FeaturesProps
  editable?: boolean
  onEdit?: (path: string, value: string) => void
}

export default function FeaturesBlock({ data, editable, onEdit }: Props) {
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }
  const fadeUp  = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }

  return (
    <section className="bg-slate-950 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-center text-3xl md:text-5xl font-bold text-white mb-20 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
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

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.features.map((feat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="group relative rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 mb-6 group-hover:bg-violet-500/20 transition-colors">
                {ICON_MAP[feat.icon] ?? <Zap className="w-6 h-6" />}
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">
                {editable ? (
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => onEdit?.(`features.${i}.title`, e.currentTarget.textContent ?? '')}
                    className="outline-none"
                  >
                    {feat.title}
                  </span>
                ) : feat.title}
              </h3>

              <p className="text-slate-400 leading-relaxed">
                {editable ? (
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => onEdit?.(`features.${i}.description`, e.currentTarget.textContent ?? '')}
                    className="outline-none"
                  >
                    {feat.description}
                  </span>
                ) : feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
