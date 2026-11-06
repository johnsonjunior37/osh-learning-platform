import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LearnIndexPage } from './pages/LearnIndexPage'
import { QuizEntryPage } from './pages/QuizEntryPage'
import { SharePage } from './pages/SharePage'
import { StagePage } from './pages/StagePage'

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

// GitHub Pages 不支援伺服端路由，使用 HashRouter 讓重新整理不會 404
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<LearnIndexPage />} />
          <Route path="learn/:stageId" element={<StagePage />} />
          <Route path="quiz" element={<QuizEntryPage />} />
          <Route path="share" element={<SharePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
