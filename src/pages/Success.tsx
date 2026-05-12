import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Success() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 text-green-400 mb-8">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Compra Confirmada!</h1>
        <p className="text-slate-400 text-lg mb-10">
          Obrigado por escolher Bridge. Você receberá um e-mail com os próximos passos em breve.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
        >
          Voltar para o início
        </Link>
      </motion.div>
    </div>
  )
}
