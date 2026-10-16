import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Quill from 'quill';
// Imported here rather than in App, so the editor stylesheet ships with this
// lazily loaded chunk instead of the initial page.
import 'quill/dist/quill.snow.css'
import { parse } from 'marked'
import toast from 'react-hot-toast';
import { blogCategories } from '../../assets/assets'
import { ArrowLeftIcon, ImageIcon, SparkleIcon } from '../../components/Icons'
import Loader from '../../components/Loader'
import { useAppContext } from '../../context/AppContext';

const CATEGORIES = blogCategories.filter((category) => category !== 'All')

// Serves both /admin/addBlog and /admin/editBlog/:id - the only differences are
// where the initial values come from and which endpoint the form posts to.
const AddBlog = () => {
    const { axios, navigate, t } = useAppContext()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingBlog, setLoadingBlog] = useState(isEdit)

    const editorRef = useRef(null)
    const quillRef = useRef(null)

    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState('');
    const [currentImage, setCurrentImage] = useState('');
    const [title, setTitle] = useState('');
    const [subTitle, setSubTitle] = useState('');
    const [category, setCategory] = useState('Startup');
    const [isPublished, setIsPublished] = useState(false);
    const [initialContent, setInitialContent] = useState('');

    useEffect(() => {
        // Initiate Quill only once, and only after any blog being edited has
        // loaded - the editor element does not exist before that.
        if (!quillRef.current && editorRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                placeholder: t('admin.editorPlaceholder'),
                modules: {
                    toolbar: [
                        [{ header: [2, 3, 4, false] }],
                        ['bold', 'italic', 'underline', 'blockquote'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'code-block'],
                        ['clean'],
                    ],
                },
            })

            // Prefilling here, rather than in a timer, guarantees the editor
            // already exists when the loaded content is written into it.
            if (initialContent) quillRef.current.root.innerHTML = initialContent
        }
    }, [loadingBlog, initialContent, t])

    // Load the blog being edited and prefill every field.
    const loadBlog = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/blog/${id}`)
            if (!data.success) {
                toast.error(data.message)
                navigate('/admin/listBlog')
                return
            }
            setTitle(data.blog.title)
            setSubTitle(data.blog.subTitle || '')
            setCategory(data.blog.category)
            setIsPublished(data.blog.isPublished)
            setCurrentImage(data.blog.image)
            setInitialContent(data.blog.description)
            setLoadingBlog(false)
        } catch {
            toast.error(t('admin.loadArticleFailed'))
            navigate('/admin/listBlog')
        }
    }, [axios, id, navigate, t])

    useEffect(() => {
        if (isEdit) loadBlog()
    }, [isEdit, loadBlog])

    // Revoke the object URL so repeated picks do not leak memory.
    useEffect(() => {
        if (!image) { setPreview(''); return }
        const url = URL.createObjectURL(image)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [image])

    const generateContent = async () => {
        if (!title.trim()) return toast.error(t('admin.generateNeedsTitle'))

        try {
            setLoading(true);
            const { data } = await axios.post('/api/blog/generate', { prompt: title })
            if (data.success) {
                quillRef.current.root.innerHTML = parse(data.content)
            } else {
                toast.error(data.message)
            }
        } catch {
            toast.error(t('admin.generateFailed'))
        } finally {
            setLoading(false)
        }
    }

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        const description = quillRef.current?.root.innerHTML || ''
        // On an edit the existing thumbnail is kept unless a new one is chosen.
        if (!isEdit && !image) return toast.error(t('admin.needThumbnail'))
        if (quillRef.current?.getText().trim().length < 10) {
            return toast.error(t('admin.needContent'))
        }

        try {
            setIsAdding(true)

            const blog = { title, subTitle, description, category, isPublished }
            if (isEdit) blog.id = id

            const formData = new FormData();
            formData.append('blog', JSON.stringify(blog))
            if (image) formData.append('image', image)

            const { data } = await axios.post(isEdit ? '/api/blog/update' : '/api/blog/add', formData);

            if (data.success) {
                toast.success(t(isEdit ? 'admin.blogUpdated' : 'admin.blogAdded'));
                if (isEdit) {
                    navigate('/admin/listBlog')
                } else {
                    setImage(null)
                    setTitle('')
                    setSubTitle('')
                    quillRef.current.root.innerHTML = ''
                    setCategory('Startup')
                    setIsPublished(false)
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || t('admin.saveFailed'))
        } finally {
            setIsAdding(false)
        }
    }

    if (loadingBlog) return <Loader label={t('article.loading')} />

    const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm'
    const thumbnail = preview || currentImage

    return (
        <div className="p-5 sm:p-8">
            <header className="mb-6">
                {isEdit && (
                    <button
                        type="button" onClick={() => navigate('/admin/listBlog')}
                        className="inline-flex items-center gap-1.5 mb-3 text-sm text-muted hover:text-tealink transition-colors cursor-pointer"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> {t('admin.backToList')}
                    </button>
                )}
                <h1 className="text-xl font-semibold tracking-tight text-ink">
                    {t(isEdit ? 'admin.editArticle' : 'admin.newArticle')}
                </h1>
                <p className="mt-1 text-sm text-muted">
                    {t(isEdit ? 'admin.editSubtitle' : 'admin.newSubtitle')}
                </p>
            </header>

            <form onSubmit={onSubmitHandler} className="qb-card p-5 sm:p-7 max-w-3xl">
                <div>
                    <span className="block text-xs font-medium text-muted mb-1.5">{t('admin.thumbnail')}</span>
                    <label
                        htmlFor="image"
                        className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-line hover:border-tealsolid/60 transition-colors cursor-pointer w-fit"
                    >
                        {thumbnail ? (
                            <img src={thumbnail} alt={t('admin.thumbnailPreview')} className="w-28 h-20 rounded object-cover" />
                        ) : (
                            <span className="grid place-items-center w-28 h-20 rounded bg-raised text-muted">
                                <ImageIcon className="w-6 h-6" />
                            </span>
                        )}
                        <span className="text-sm text-muted">
                            {image ? image.name : t(isEdit ? 'admin.replaceImage' : 'admin.chooseImage')}
                        </span>
                        <input
                            id="image" type="file" accept="image/*" hidden
                            onChange={(event) => setImage(event.target.files[0] || null)}
                        />
                    </label>
                </div>

                <div className="mt-5">
                    <label htmlFor="blog-title" className="block text-xs font-medium text-muted mb-1.5">{t('admin.titleLabel')}</label>
                    <input
                        id="blog-title" type="text" required value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={t('admin.titlePlaceholder')} className={field}
                    />
                </div>

                <div className="mt-4">
                    <label htmlFor="blog-subtitle" className="block text-xs font-medium text-muted mb-1.5">{t('admin.subtitleLabel')}</label>
                    <input
                        id="blog-subtitle" type="text" required value={subTitle}
                        onChange={(event) => setSubTitle(event.target.value)}
                        placeholder={t('admin.subtitlePlaceholder')} className={field}
                    />
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-xs font-medium text-muted">{t('admin.content')}</span>
                        <button
                            type="button" onClick={generateContent} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-tealink hover:border-tealsolid/50 disabled:opacity-60 transition-colors cursor-pointer"
                        >
                            <SparkleIcon className="w-3.5 h-3.5" />
                            {loading ? t('admin.generating') : t('admin.generate')}
                        </button>
                    </div>

                    <div className="relative">
                        <div ref={editorRef} />
                        {loading && (
                            <div className="absolute inset-0 grid place-items-center bg-surface/70 rounded-lg">
                                <span className="w-7 h-7 rounded-full border-2 border-line border-t-tealsolid animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-5">
                    <div>
                        <label htmlFor="blog-category" className="block text-xs font-medium text-muted mb-1.5">{t('admin.category')}</label>
                        <select
                            id="blog-category" value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            className={`${field} w-auto pr-8`}
                        >
                            {CATEGORIES.map((item) => <option key={item} value={item}>{t(`categories.${item}`)}</option>)}
                        </select>
                    </div>

                    <label className="flex items-center gap-2.5 pb-2.5 cursor-pointer">
                        <input
                            type="checkbox" checked={isPublished}
                            onChange={(event) => setIsPublished(event.target.checked)}
                            className="w-4 h-4 accent-[var(--qb-teal-solid)] cursor-pointer"
                        />
                        <span className="text-sm text-ink">{t(isEdit ? 'admin.publishedLabel' : 'admin.publishNow')}</span>
                    </label>
                </div>

                <button
                    type="submit" disabled={isAdding}
                    className="mt-7 px-6 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
                >
                    {isAdding
                        ? t('common.saving')
                        : isEdit ? t('common.save') : isPublished ? t('admin.publishArticle') : t('admin.saveDraft')}
                </button>
            </form>
        </div>
    )
}

export default AddBlog
