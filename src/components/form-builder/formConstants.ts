// Constantes e helpers do form-builder que NÃO são componentes React.
// Ficam fora de FormBuilder.tsx/FormCanvas.tsx de propósito: um arquivo que
// mistura export de componente com export de valor quebra o Fast Refresh
// (react-refresh/only-export-components) e força reload completo da página
// a cada edição.
import {
  Type, Mail, List, CheckSquare, AlignLeft,
  Phone, Hash, Calendar, MapPin, Map, Sparkles, CheckCircle, CreditCard,
  User, SquareCheck, Landmark, Upload, Banknote,
} from 'lucide-react'
import type { NodeType } from './FormBuilder'

export interface TypeMeta { label: string; icon: React.ElementType; color: string }

export function uid(): string { return Math.random().toString(36).slice(2, 9) }

export const TYPE_META: Record<NodeType, TypeMeta> = {
  welcome:  { label: 'Boas-vindas',     icon: Sparkles,    color: '#E8521A' },
  name:     { label: 'Nome',            icon: User,        color: '#60A5FA' },
  text:     { label: 'Texto Curto',     icon: Type,        color: '#60A5FA' },
  email:    { label: 'E-mail',          icon: Mail,        color: '#34D399' },
  phone:    { label: 'Telefone',        icon: Phone,       color: '#34D399' },
  cpf:      { label: 'CPF',            icon: CreditCard,  color: '#60A5FA' },
  number:   { label: 'Número',         icon: Hash,        color: '#A78BFA' },
  date:     { label: 'Data',           icon: Calendar,    color: '#F472B6' },
  city:     { label: 'Cidade',         icon: MapPin,      color: '#FB923C' },
  state:    { label: 'Estado',         icon: Map,         color: '#FBBF24' },
  radio:    { label: 'Múlt. Escolha',  icon: CheckSquare, color: '#F59E0B' },
  select:   { label: 'Lista Suspensa', icon: List,        color: '#A78BFA' },
  textarea: { label: 'Texto Longo',    icon: AlignLeft,   color: '#FB923C' },
  confirm:          { label: 'Confirmação',    icon: SquareCheck, color: '#34D399' },
  thankyou:         { label: 'Encerramento',   icon: CheckCircle, color: '#34D399' },
  'bank-deposit':     { label: 'Dados Bancários', icon: Landmark,   color: '#3B82F6' },
  'receipt-upload':   { label: 'Comprovante',     icon: Upload,     color: '#8B5CF6' },
  'payment-done':     { label: 'Pag. Dinheiro',   icon: Banknote,   color: '#10B981' },
  'stripe-checkout':  { label: 'Pag. Cartão',     icon: CreditCard, color: '#A855F7' },
}

export const SCREEN_TYPES: NodeType[] = ['welcome', 'thankyou', 'bank-deposit', 'receipt-upload', 'payment-done', 'stripe-checkout']
