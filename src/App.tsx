import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// ── Admin (heavy — separate chunk) ───────────────────────────
const AdminHome      = lazy(() => import('@/pages/admin/AdminHome'))
const Builder        = lazy(() => import('@/pages/admin/Builder'))
const Products       = lazy(() => import('@/pages/admin/Products'))
const ProductBuilder = lazy(() => import('@/pages/admin/ProductBuilder'))

// ── Public ────────────────────────────────────────────────────
const Apply               = lazy(() => import('@/pages/Apply'))
const Success             = lazy(() => import('@/pages/Success'))
const LandingPageRenderer = lazy(() => import('@/pages/LandingPage'))

// ── Members area ──────────────────────────────────────────────
const MyProducts     = lazy(() => import('@/pages/MyProducts'))
const ProductViewer  = lazy(() => import('@/pages/ProductViewer'))

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* ── Admin ── */}
          <Route path="/admin"                          element={<AdminHome />} />
          <Route path="/admin/builder"                  element={<Builder />} />
          <Route path="/admin/builder/:id"              element={<Builder />} />
          <Route path="/admin/products"                 element={<Products />} />
          <Route path="/admin/products/:id/edit"        element={<ProductBuilder />} />

          {/* ── Public form ── */}
          <Route path="/apply"                          element={<Apply />} />
          <Route path="/obrigado"                       element={<Success />} />

          {/* ── Members area ── */}
          <Route path="/my-products"                    element={<MyProducts />} />
          <Route path="/view/:product_slug"             element={<ProductViewer />} />

          {/* ── Public landing pages — must be last ── */}
          <Route path="/:slug"                          element={<LandingPageRenderer />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
