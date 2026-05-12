import { motion, AnimatePresence } from 'framer-motion'
import { Download, ExternalLink, BookOpen } from 'lucide-react'
import type { Lesson } from '@/lib/types'

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const vi = url.match(/vimeo\.com\/(\d+)/)

  const iframeCls = "w-full h-full"
  const wrapper   = "aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl shadow-black/40"

  if (yt) return (
    <div className={wrapper}>
      <iframe
        src={`https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`}
        className={iframeCls}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )

  if (vi) return (
    <div className={wrapper}>
      <iframe
        src={`https://player.vimeo.com/video/${vi[1]}?dnt=1`}
        className={iframeCls}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )

  return (
    <div className={wrapper}>
      <video src={url} controls className={iframeCls} />
    </div>
  )
}

export default function LessonView({ lesson }: { lesson: Lesson | null }) {
  return (
    <AnimatePresence mode="wait">
      {lesson ? (
        <motion.div
          key={lesson.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto w-full"
        >
          {lesson.type === 'video' && lesson.video_url && (
            <div className="mb-8">
              <VideoEmbed url={lesson.video_url} />
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight tracking-tight">
            {lesson.title}
          </h1>

          {lesson.duration_min ? (
            <p className="text-xs text-zinc-600 mb-8 tabular-nums">{lesson.duration_min} min de leitura</p>
          ) : (
            <div className="mb-8" />
          )}

          {lesson.type === 'text' && lesson.text_content && (
            <div
              className="prose prose-invert prose-violet prose-sm max-w-none
                         text-zinc-400 leading-relaxed
                         [&_h2]:text-white [&_h3]:text-zinc-200
                         [&_a]:text-violet-400 [&_a:hover]:text-violet-300
                         [&_code]:bg-zinc-800 [&_code]:text-violet-300 [&_code]:px-1 [&_code]:rounded
                         [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-white/8"
              dangerouslySetInnerHTML={{ __html: lesson.text_content }}
            />
          )}

          {lesson.type === 'download' && lesson.file_url && (
            <a
              href={lesson.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-4 rounded-xl
                         border border-violet-500/20 bg-violet-500/8
                         text-violet-300 hover:bg-violet-500/14
                         transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="font-semibold text-sm">{lesson.title}</p>
                <p className="text-xs text-violet-400/60 mt-0.5">Clique para baixar</p>
              </div>
              <ExternalLink className="w-4 h-4 ml-2 text-violet-400/40" />
            </a>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center py-20"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-white/6
                          flex items-center justify-center mb-5">
            <BookOpen className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Selecione uma aula</p>
          <p className="text-xs text-zinc-700 mt-1">Escolha um módulo no painel lateral.</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
