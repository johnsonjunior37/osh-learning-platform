import { lazy, Suspense } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LearnIndexPage } from './pages/LearnIndexPage'
import { QuizEntryPage } from './pages/QuizEntryPage'
import { QuizPlayPage } from './pages/QuizPlayPage'
import { ResultPage } from './pages/ResultPage'
import { ReviewPage } from './pages/ReviewPage'
import { SharePage } from './pages/SharePage'
import { StagePage } from './pages/StagePage'

// 管理者後台另外打包，學員不會下載這部分程式
const AdminLoginPage = lazy(() => import('./admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })))
const AdminDashboardPage = lazy(() => import('./admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminAttemptPage = lazy(() => import('./admin/AdminAttemptPage').then((m) => ({ default: m.AdminAttemptPage })))

function NotFound() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-xl font-bold">找不到這個頁面</h1>
      <Link to="/" className="text-brand-700 underline">
        回首頁
      </Link>
    </div>
  )
}

const loading = <p className="py-10 text-center text-slate-500">載入中…</p>

// GitHub Pages 不支援伺服端路由，使用 HashRouter 讓重新整理不會 404
export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={loading}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="learn" element={<LearnIndexPage />} />
            <Route path="learn/:stageId" element={<StagePage />} />
            <Route path="quiz" element={<QuizEntryPage />} />
            <Route path="quiz/play" element={<QuizPlayPage />} />
            <Route path="result/:attemptId" element={<ResultPage />} />
            <Route path="review/:attemptId" element={<ReviewPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/attempts/:attemptId" element={<AdminAttemptPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
