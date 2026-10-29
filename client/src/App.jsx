import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home'
import Loader from './components/Loader'
import { useAppContext } from './context/AppContext'

// Only the homepage ships in the first chunk. Everything below is fetched when
// the reader actually navigates to it, which keeps the admin area and the Quill
// editor out of the initial download entirely.
const Blog = lazy(() => import('./pages/Blog'))
const Saved = lazy(() => import('./pages/Saved'))
const Author = lazy(() => import('./pages/Author'))
const AuthModal = lazy(() => import('./components/AuthModal'))

const Layout = lazy(() => import('./pages/admin/Layout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const AddBlog = lazy(() => import('./pages/admin/AddBlog'))
const ListBlog = lazy(() => import('./pages/admin/ListBlog'))
const Comments = lazy(() => import('./pages/admin/Comments'))
const Login = lazy(() => import('./components/admin/Login'))

// The admin area is only a convenience gate - every admin API route is
// independently guarded on the server. Admins and authors both get in; the
// API decides what each of them is allowed to see and change.
const AdminArea = () => {
  const { token, user, canWrite } = useAppContext()

  if (!token) return <Login />
  // Wait for the session before deciding, so a reload does not bounce the admin out.
  if (!user) return <Loader label="Checking your session" />
  if (!canWrite) return <Login />

  return <Layout />
}

const App = () => {
  const { authOpen } = useAppContext()

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--qb-surface)',
            color: 'var(--qb-ink)',
            border: '1px solid var(--qb-line)',
            fontSize: '0.875rem',
          },
        }}
      />

      {/* Mounted only once it is needed, so its chunk is never fetched otherwise. */}
      {authOpen && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}

      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog/:id" element={<Blog />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/author/:authorId" element={<Author />} />

          <Route path="/admin" element={<AdminArea />}>
            <Route index element={<Dashboard />} />
            <Route path="addBlog" element={<AddBlog />} />
            <Route path="editBlog/:id" element={<AddBlog />} />
            <Route path="listBlog" element={<ListBlog />} />
            <Route path="comments" element={<Comments />} />
          </Route>

          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
