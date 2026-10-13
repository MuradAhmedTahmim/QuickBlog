import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import BlogCard from '../components/BlogCard'
import EmptyState from '../components/EmptyState'
import Loader from '../components/Loader'
import { DraftIcon, UserIcon } from '../components/Icons'
import { useAppContext } from '../context/AppContext'
import { initials, plural } from '../utils/format'

const Author = () => {
  const { authorId } = useParams()
  const { axios, user, setUser } = useAppContext()

  const [author, setAuthor] = useState(null)
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // An author may only ever edit their own page.
  const isOwner = Boolean(user && author && user._id === author._id)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!avatar) { setAvatarPreview(''); return }
    const url = URL.createObjectURL(avatar)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatar])

  const fetchAuthor = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const { data } = await axios.get(`/api/user/author/${authorId}`)
      if (data.success) {
        setAuthor(data.author)
        setBlogs(data.blogs)
        setName(data.author.name)
        setBio(data.author.bio || '')
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [axios, authorId])

  useEffect(() => { fetchAuthor() }, [fetchAuthor])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      // Sent as multipart only when a new picture was chosen.
      const body = new FormData()
      body.append('name', name)
      body.append('bio', bio)
      if (avatar) body.append('image', avatar)

      const { data } = await axios.post('/api/user/profile', body)
      if (data.success) {
        toast.success(data.message)
        setUser(data.user)
        setAuthor((current) => ({ ...current, name: data.user.name, bio: data.user.bio, image: data.user.image }))
        setAvatar(null)
        setEditing(false)
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Loader label="Loading profile" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-16">
          <div className="qb-card">
            <EmptyState icon={UserIcon} title="Author not found" description="This profile may have been removed." />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <header className="bg-navy text-onnavy">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {author.image
              ? <img src={author.image} alt="" className="w-20 h-20 rounded-full object-cover shrink-0" />
              : (
                <span className="w-20 h-20 rounded-full bg-onnavy/10 text-teal grid place-items-center text-2xl font-semibold shrink-0">
                  {initials(author.name)}
                </span>
              )}

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{author.name}</h1>
              <p className="mt-1.5 text-sm text-onnavy/65">
                {plural(blogs.length, 'published article')}
              </p>
              {author.bio
                ? <p className="mt-3 max-w-2xl text-sm sm:text-base text-onnavy/75 leading-relaxed">{author.bio}</p>
                : <p className="mt-3 text-sm text-onnavy/50 italic">No bio yet.</p>}
            </div>

            {isOwner && !editing && (
              <button
                type="button" onClick={() => setEditing(true)}
                className="sm:ml-auto px-4 py-2 rounded-full border border-onnavy/25 text-sm hover:bg-onnavy/10 transition-colors cursor-pointer shrink-0"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-12">
        {isOwner && editing && (
          <form onSubmit={saveProfile} className="qb-card p-6 mb-10 max-w-xl">
            <h2 className="text-base font-semibold text-ink">Edit your profile</h2>

            <div className="mt-4">
              <span className="block text-xs font-medium text-muted mb-1.5">Profile picture</span>
              <label htmlFor="profile-image" className="flex items-center gap-3 w-fit cursor-pointer group">
                {avatarPreview || author.image ? (
                  <img
                    src={avatarPreview || author.image} alt="Profile picture preview"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-navysoft text-tealink grid place-items-center font-semibold">
                    {initials(name || author.name)}
                  </span>
                )}
                <span className="text-sm text-muted group-hover:text-tealink transition-colors">
                  {avatar ? avatar.name : 'Choose a picture'}
                </span>
                <input
                  id="profile-image" type="file" accept="image/*" hidden
                  onChange={(event) => setAvatar(event.target.files[0] || null)}
                />
              </label>
            </div>

            <div className="mt-4">
              <label htmlFor="profile-name" className="block text-xs font-medium text-muted mb-1.5">Display name</label>
              <input
                id="profile-name" value={name} onChange={(event) => setName(event.target.value)}
                required minLength={2} maxLength={60} className={field}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="profile-bio" className="block text-xs font-medium text-muted mb-1.5">
                Bio <span className="text-muted/70">({bio.length}/400)</span>
              </label>
              <textarea
                id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)}
                maxLength={400} rows={4} className={`${field} resize-y`}
                placeholder="A sentence or two about what you write."
              />
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="submit" disabled={saving}
                className="px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setName(author.name); setBio(author.bio || ''); setAvatar(null) }}
                className="px-5 py-2.5 rounded-full border border-line text-sm text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <h2 className="text-xl font-semibold tracking-tight text-ink mb-6">Articles</h2>

        {blogs.length === 0 ? (
          <div className="qb-card">
            <EmptyState
              icon={DraftIcon}
              title="No published articles yet"
              description={isOwner ? 'Anything you publish will show up here.' : 'This author has not published anything yet.'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => <BlogCard key={blog._id} blog={blog} />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default Author
