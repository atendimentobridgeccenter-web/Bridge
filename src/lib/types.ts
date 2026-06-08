// ── Block types ──────────────────────────────────────────────

export type BlockType =
  | 'HeroBlock'
  | 'FeaturesBlock'
  | 'CallToActionBlock'
  | 'HeadingBlock'
  | 'TextBlock'
  | 'ImageBlock'
  | 'ButtonBlock'
  | 'AccordionBlock'
  | 'VideoBlock'
  | 'CarouselBlock'

export interface HeroProps {
  title: string
  subtitle: string
  backgroundImage: string
  buttonText: string
  buttonLink: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface FeaturesProps {
  headline: string
  features: Feature[]
}

export interface CTAProps {
  title: string
  subtitle: string
  buttonText: string
  buttonLink: string
}

// ── Common block style ────────────────────────────────────────

export interface BlockStyle {
  bg?:       string   // CSS background (color or gradient)
  color?:    string   // text color
  paddingY?: number   // vertical padding in px
  align?:    'left' | 'center' | 'right'
}

// ── New block prop interfaces ──────────────────────────────────

export interface HeadingProps {
  text:        string
  level?:      'h1' | 'h2' | 'h3' | 'h4'
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'extrabold'
  fontSize?:   'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'
  style?:      BlockStyle
}

export interface TextBlockProps {
  text:      string
  fontSize?: 'sm' | 'base' | 'lg' | 'xl'
  maxWidth?: boolean
  style?:    BlockStyle
}

export interface ImageBlockProps {
  src:      string
  alt?:     string
  caption?: string
  radius?:  number   // border-radius px
  shadow?:  boolean
  link?:    string
  width?:   'sm' | 'md' | 'lg' | 'full'
  style?:   BlockStyle
}

export type ButtonTarget = 'form' | 'checkout' | 'url'

export interface ButtonBlockProps {
  label:        string
  target:       ButtonTarget
  url?:         string
  productSlug?: string
  variant?:     'solid' | 'outline'
  size?:        'sm' | 'md' | 'lg'
  color?:       string   // button bg
  textColor?:   string   // button text
  fullWidth?:   boolean
  style?:       BlockStyle
}

export interface AccordionItem {
  id:       string
  question: string
  answer:   string
}

export interface AccordionBlockProps {
  title?: string
  items:  AccordionItem[]
  style?: BlockStyle
}

export interface VideoBlockProps {
  url:       string
  caption?:  string
  autoplay?: boolean
  muted?:    boolean
  style?:    BlockStyle
}

export interface CarouselSlide {
  id:       string
  src:      string
  alt?:     string
  caption?: string
}

export interface CarouselBlockProps {
  slides:    CarouselSlide[]
  autoplay?: boolean
  interval?: number   // seconds
  showDots?: boolean
  style?:    BlockStyle
}

export type BlockProps =
  | HeroProps
  | FeaturesProps
  | CTAProps
  | HeadingProps
  | TextBlockProps
  | ImageBlockProps
  | ButtonBlockProps
  | AccordionBlockProps
  | VideoBlockProps
  | CarouselBlockProps

export interface PageBlock {
  id: string
  type: BlockType
  order: number
  props: BlockProps
}

export interface LegacyBlocksConfig {
  blocks: PageBlock[]
}

export interface GrapesJSConfig {
  type: 'grapesjs'
  html: string
  css: string
}

export type BlocksConfig = LegacyBlocksConfig | GrapesJSConfig

// ── Database: Landing Pages ───────────────────────────────────

export interface LandingPage {
  id: string
  slug: string
  title: string
  published: boolean
  blocks_config: BlocksConfig
  created_at: string
  updated_at: string
}

// ── Form / pricing types ──────────────────────────────────────

export type QuestionType = 'text' | 'email' | 'select' | 'multiselect' | 'textarea'

export interface FormOption {
  value: string
  label: string
  nextStep: string
}

export interface FormStep {
  id: string
  question: string
  type: QuestionType
  field: string
  placeholder?: string
  required?: boolean
  options?: FormOption[]
  nextStep?: string
}

// ── Pricing engine types ──────────────────────────────────────

export type RuleOperator = 'eq' | 'neq' | 'includes' | 'gt' | 'lt'
export type RuleActionType = 'replace' | 'add'

export interface PricingCondition {
  step_id: string
  operator: RuleOperator
  value: string
}

export interface PricingAction {
  type: RuleActionType
  price_id: string
  label: string
  amount: number   // cents
}

export interface PricingRule {
  id: string
  label: string
  condition: PricingCondition
  action: PricingAction
}

export interface LineItem {
  price_id: string
  label: string
  amount: number
  source_rule_id: string   // 'default' | rule.id
}

export interface FormSchema {
  steps: FormStep[]
  default_price_id: string
  default_label: string
  default_amount: number
  allowed_price_ids: string[]
  pricing_rules: PricingRule[]
  success_url?: string
  cancel_url?: string
}

// ── Database: Bridge Leads ────────────────────────────────────

export interface BridgeLead {
  id: string
  email: string | null
  product_id: string | null
  landing_page_slug: string | null
  answers: Record<string, string | string[]>
  current_step: number
  completed: boolean
  stripe_session_id: string | null
  created_at: string
  updated_at: string
}

// ── Checkout request/response ─────────────────────────────────

export interface CheckoutRequest {
  lead_id: string
  product_id: string
  price_ids: string[]
  customer_email: string
}

export interface CheckoutResponse {
  url: string
}

// ── Product Engine types ──────────────────────────────────────

export type ProductStatus = 'draft' | 'published' | 'archived'

export interface CheckoutConfig {
  price_id: string
  currency: string
  trial_days?: number
  upsell_price_id?: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  status: ProductStatus
  price_id_stripe: string | null
  thumbnail_url: string | null
  landing_page_config: BlocksConfig
  form_logic_config: Record<string, unknown>
  checkout_config: CheckoutConfig | Record<string, never>
  created_at: string
  updated_at: string
}

// ── Lead (tabela leads — QuizzRunner) ────────────────────────

export interface Lead {
  id:           string
  product_id:   string | null
  email:        string | null
  phone:        string | null
  name:         string | null
  cpf:          string | null
  city:         string | null
  state:        string | null
  answers:      Record<string, string>
  qualified:    boolean
  created_at:   string
  // joined
  product_name?:        string | null
  product_form_nodes?:  unknown  // form_logic_config.nodes para resolver títulos
}

// ── product_structure: one row = one Module ───────────────────

export interface Lesson {
  id: string
  title: string
  type: 'video' | 'text' | 'download'
  video_url?: string
  text_content?: string
  file_url?: string
  duration_min?: number
  order: number
  free_preview?: boolean
}

export interface ModuleContent {
  lessons: Lesson[]
}

export interface ProductModule {
  id: string
  product_id: string
  title: string
  description: string
  content_json: ModuleContent
  order_index: number
  created_at: string
  updated_at: string
}

// ── user_access ───────────────────────────────────────────────

export interface UserAccess {
  id: string
  user_id: string
  product_id: string
  purchased_at: string
  stripe_session_id: string | null
}

// ── Members area view helpers ─────────────────────────────────

export interface ProductWithModules extends Product {
  modules: ProductModule[]
}
