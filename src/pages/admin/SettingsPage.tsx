import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      style={{ background: '#0F1117' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Settings className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.25)' }} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold" style={{ color: '#EDEDED' }}>
          Configurações
        </p>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Em construção — disponível em breve.
        </p>
      </div>
    </div>
  )
}
