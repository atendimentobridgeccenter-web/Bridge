import { motion, AnimatePresence } from 'framer-motion'
import { Download, ExternalLink } from 'lucide-react'
import type { Lesson } from '@/lib/types'

interface Props {
  lesson: Lesson | null
}

function VideoEmbed({ url }: { url: string }) {
  // Support YouTube, Vimeo, direct embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const viMatch = url.match(/vimeo\.com\/(\d+)/)

  if (ytMatch) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (viMatch) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
        <iframe
          src={`https://player.vimeo.com/video/${viMatch[1]}?dnt=1`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // Generic video URL
  return (
    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
      <video src={url} controls className="w-full h-full" />
    </div>
  )
}

export default function LessonView({ lesson }: Props) {
  return (
    <AnimatePresence mode="wait">
      {lesson ? (
        <motion.div
          key={lesson.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto w-full"
        >
          {/* Video */}
          {lesson.type === 'video' && lesson.video_url && (
            <div className="mb-8">
              <VideoEmbed url={lesson.video_url} />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
            {lesson.title}
          </h1>

          {/* Text content */}
          {lesson.type === 'text' && lesson.text_content && (
            <div
              className="prose prose-invert prose-violet max-w-none text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lesson.text_content }}
            />
          )}

          {/* Download */}
          {lesson.type === 'download' && lesson.file_url && (
            <a
              href={lesson.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <Download className="w-5 h-5" />
              <div>
                <p className="font-semibold">{lesson.title}</p>
                <p className="text-xs text-violet-400/70 mt-0.5">Clique para baixar</p>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          )}

          {lesson.duration_min ? (
            <p className="mt-8 text-xs text-slate-600">Duração: {lesson.duration_min} min</p>
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-slate-600"
        >
          <div className="text-5xl mb-4">🎓</div>
          <p className="text-lg font-medium text-slate-500">Selecione uma aula</p>
          <p className="text-sm mt-1">Escolha um módulo e uma aula na barra lateral.</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
