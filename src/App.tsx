import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'

// ── Admin (within AdminLayout sidebar shell) ──────────────────
const AdminHome      = lazy(() => import('@/pages/admin/AdminHome'))
const Leads          = lazy(() => import('@/pages/admin/LeadsKanbanPage'))
const Products       = lazy(() => import('@/pages/admin/Products'))
const ProductBuilder    = lazy(() => import('@/pages/admin/ProductBuilder'))
const ProductConfigPage = lazy(() => import('@/pages/admin/ProductConfigPage'))
const SettingsPage      = lazy(() => import('@/pages/admin/SettingsPage'))

// ── Builder (standalone — has its own full-screen layout) ─────
const Builder             = lazy(() => import('@/pages/admin/Builder'))
const SalesPageEditorPage = lazy(() => import('@/pages/admin/SalesPageEditorPage'))

// ── Auth ──────────────────────────────────────────────────────
const Login         = lazy(() => import('@/pages/Login'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))

// ── Public ────────────────────────────────────────────────────
const Apply               = lazy(() => import('@/pages/Apply'))
const Success             = lazy(() => import('@/pages/Success'))
const LandingPageRenderer = lazy(() => import('@/pages/LandingPage'))

// ── Members area ──────────────────────────────────────────────
const MyProducts    = lazy(() => import('@/pages/MyProducts'))
const ProductViewer = lazy(() => import('@/pages/ProductViewer'))

// ── Dev preview ───────────────────────────────────────────────
const PreviewQuizz  = lazy(() => import('@/pages/PreviewQuizz'))

function Spinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* ── Root redirect ── */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* ── Auth ── */}
          <Route path="/login"          element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── Admin (with sidebar) ── */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index                          element={<AdminHome />} />
            <Route path="leads"                   element={<Leads />} />
            <Route path="products"                element={<Products />} />
            <Route path="products/:id"            element={<ProductConfigPage />} />
            <Route path="products/:id/edit"       element={<ProductBuilder />} />
            <Route path="settings"                element={<SettingsPage />} />
          </Route>

          {/* ── Builder (standalone, no sidebar) ── */}
          <Route path="/admin/builder"                    element={<Builder />} />
          <Route path="/admin/builder/:id"                element={<Builder />} />

          {/* ── Sales Page Editor (standalone, full-screen) ── */}
          <Route path="/admin/sales-pages/new/edit"       element={<SalesPageEditorPage />} />
          <Route path="/admin/sales-pages/:id/edit"       element={<SalesPageEditorPage />} />

          {/* ── Public form ── */}
          <Route path="/apply"                    element={<Apply />} />
          <Route path="/obrigado"                 element={<Success />} />

          {/* ── Members area ── */}
          <Route path="/my-products"              element={<MyProducts />} />
          <Route path="/view/:product_slug"       element={<ProductViewer />} />

          {/* ── Dev preview ── */}
          <Route path="/preview-quizz"            element={<PreviewQuizz />} />

          {/* ── Public landing pages — must be last ── */}
          <Route path="/:slug"                    element={<LandingPageRenderer />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
