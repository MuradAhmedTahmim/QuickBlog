import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axios from "axios";
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';
import { DEFAULT_LANGUAGE, LANGUAGES, applyLanguage, localizeDigits, translate } from '../i18n'

// VITE_BASE_URL points at the Express API. The client ships no example env
// file (the API's .env.example is the project's single one), so an unset value
// falls back to the port the API listens on locally - see HowToSetup.md.
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

const AppContext = createContext();


const safeStorage = {
    get(key){
        try { return localStorage.getItem(key) } catch { return null }
    },
    set(key, value){
        try { localStorage.setItem(key, value) } catch { /* storage blocked */ }
    },
    remove(key){
        try { localStorage.removeItem(key) } catch { /* storage blocked */ }
    },
}

// Lets the server count an anonymous reader once instead of once per refresh.
// It identifies a browser, never a person, and carries no personal data.
const getVisitorId = () => {
    let id = safeStorage.get('qb-visitor');
    if(!id){
        id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, '');
        safeStorage.set('qb-visitor', id);
    }
    return id;
}

const applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

const readLanguage = () => {
    const saved = safeStorage.get('qb-lang');
    return LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
}

// Set before React renders so the very first paint already uses the right
// locale for dates and the right lang attribute for screen readers.
applyLanguage(readLanguage());

// Installed at module load rather than in an effect: child effects run before
// the provider's, so a page opened straight on an article would otherwise fire
// its request before these headers existed - and the view would go uncounted.
axios.defaults.headers.common['x-visitor-id'] = getVisitorId();
const storedToken = safeStorage.get('token');
if(storedToken) axios.defaults.headers.common['Authorization'] = storedToken;

export const AppProvider = ({ children })=>{

    const navigate = useNavigate()

    const [token, setToken] = useState(() => safeStorage.get('token'))
    const [user, setUser] = useState(null)
    const [blogs, setBlogs] = useState([])
    const [blogsLoading, setBlogsLoading] = useState(true)
    const [input, setInput] = useState("")

    const [likedBlogs, setLikedBlogs] = useState(new Set())
    const [bookmarkedBlogs, setBookmarkedBlogs] = useState(new Set())

    const [authOpen, setAuthOpen] = useState(false)

    // Matches whatever the bootstrap script in index.html already applied.
    const [theme, setTheme] = useState(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    )

    const [language, setLanguageState] = useState(readLanguage)

    const isAdmin = user?.role === 'admin'
    // Admins and authors both reach the CMS; the API scopes an author to their
    // own articles, so the client only has to decide what to show.
    const canWrite = isAdmin || user?.role === 'author'

    /* ------------------------------- theme ------------------------------- */

    const toggleTheme = useCallback(() => {
        setTheme((current) => {
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            safeStorage.set('qb-theme', next);
            return next;
        })
    }, [])

    // Follow the system while the reader has not chosen for themselves.
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (event) => {
            if(safeStorage.get('qb-theme')) return;
            const next = event.matches ? 'dark' : 'light';
            applyTheme(next);
            setTheme(next);
        }
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [])

    /* ------------------------------ language ----------------------------- */

    const setLanguage = useCallback((next) => {
        if(!LANGUAGES.includes(next)) return;
        applyLanguage(next);
        safeStorage.set('qb-lang', next);
        setLanguageState(next);
    }, [])

    const toggleLanguage = useCallback(() => {
        setLanguage(language === 'bn' ? 'en' : 'bn');
    }, [language, setLanguage])

    // The interface reads every string through t(); article content is never
    // passed through it, so blogs stay exactly as their author wrote them.
    const t = useCallback(
        (key, values) => translate(language, key, values),
        [language]
    )

    // Numbers shown in the interface follow the language's own numerals.
    const n = useCallback((value) => localizeDigits(value, language), [language])

    /* -------------------------------- auth ------------------------------- */

    const applyToken = useCallback((value) => {
        if(value){
            safeStorage.set('token', value);
            axios.defaults.headers.common['Authorization'] = value;
        }else{
            safeStorage.remove('token');
            delete axios.defaults.headers.common['Authorization'];
        }
        setToken(value || null);
    }, [])

    const logout = useCallback(() => {
        applyToken(null);
        setUser(null);
        setLikedBlogs(new Set());
        setBookmarkedBlogs(new Set());
        toast.success(translate(readLanguage(), 'auth.signedOut'));
    }, [applyToken])

    const fetchEngagement = useCallback(async () => {
        try {
            const {data} = await axios.get('/api/user/engagement');
            if(data.success){
                setLikedBlogs(new Set(data.likedBlogs));
                setBookmarkedBlogs(new Set(data.bookmarkedBlogs));
            }
        } catch {
            /* engagement state is an enhancement - the page still works without it */
        }
    }, [])

    const loadSession = useCallback(async () => {
        try {
            const {data} = await axios.get('/api/user/me');
            if(data.success){
                setUser(data.user);
                await fetchEngagement();
                return;
            }
        } catch (error) {
            // A rejected token is stale; anything else may just be the network.
            if(error?.response?.status === 401){
                applyToken(null);
                setUser(null);
            }
        }
    }, [applyToken, fetchEngagement])

    const authenticate = useCallback(async (mode, payload) => {
        const {data} = await axios.post(`/api/user/${mode}`, payload);
        if(!data.success) return data;

        applyToken(data.token);
        setUser(data.user);
        await fetchEngagement();
        return data;
    }, [applyToken, fetchEngagement])

    /* ------------------------------- blogs ------------------------------- */

    // Articles are fetched for the language the interface is in. A post marked
    // for both languages always comes back; one written only in the other
    // language does not. If that leaves nothing to read, we ask again without
    // the filter rather than showing an empty site.
    const fetchBlogs = useCallback(async (lang = readLanguage())=>{
        try {
           const {data} = await axios.get('/api/blog/all', {params: {lang}});
           if(!data.success){
               toast.error(data.message)
               return
           }

           if(data.blogs.length === 0){
               const {data: all} = await axios.get('/api/blog/all');
               setBlogs(all.success ? all.blogs : [])
               return
           }

           setBlogs(data.blogs)
        } catch {
            toast.error(translate(readLanguage(), 'errors.blogsFailed'))
        } finally {
            setBlogsLoading(false)
        }
    }, [])

    /* ---------------------------- engagement ----------------------------- */

    // Returns false when the reader needs an account, so callers can prompt.
    const requireAuth = useCallback(() => {
        if(user) return true;
        setAuthOpen(true);
        return false;
    }, [user])

    const toggleLike = useCallback(async (blogId) => {
        if(!requireAuth()) return null;
        try {
            const {data} = await axios.post('/api/blog/like', {blogId});
            if(!data.success){
                toast.error(data.message);
                return null;
            }
            setLikedBlogs((current) => {
                const next = new Set(current);
                data.liked ? next.add(blogId) : next.delete(blogId);
                return next;
            })
            // Keep the cached list in step so counts match across pages.
            setBlogs((current) => current.map((blog) =>
                blog._id === blogId ? {...blog, likesCount: data.likes} : blog
            ))
            return data;
        } catch {
            toast.error(t('engage.likeFailed'))
            return null;
        }
    }, [requireAuth, t])

    const toggleBookmark = useCallback(async (blogId) => {
        if(!requireAuth()) return null;
        try {
            const {data} = await axios.post('/api/user/bookmark', {blogId});
            if(!data.success){
                toast.error(data.message);
                return null;
            }
            setBookmarkedBlogs((current) => {
                const next = new Set(current);
                data.bookmarked ? next.add(blogId) : next.delete(blogId);
                return next;
            })
            toast.success(t(data.bookmarked ? 'engage.savedToast' : 'engage.removedToast'));
            return data;
        } catch {
            toast.error(t('engage.bookmarkFailed'))
            return null;
        }
    }, [requireAuth, t])

    /* ------------------------------ startup ------------------------------ */

    // Re-runs when the reader switches language, so the article list follows.
    useEffect(()=>{
        fetchBlogs(language);
    },[fetchBlogs, language])

    useEffect(() => {
        if(token) loadSession();
    }, [token, loadSession])

    const value = useMemo(() => ({
        axios, navigate,
        token, setToken: applyToken, user, setUser, isAdmin, canWrite, logout, authenticate, loadSession,
        blogs, setBlogs, blogsLoading, fetchBlogs,
        input, setInput,
        theme, toggleTheme,
        language, setLanguage, toggleLanguage, t, n,
        likedBlogs, bookmarkedBlogs, toggleLike, toggleBookmark, requireAuth,
        authOpen, setAuthOpen,
    }), [navigate, token, applyToken, user, isAdmin, canWrite, logout, authenticate, loadSession,
         blogs, blogsLoading, fetchBlogs, input, theme, toggleTheme,
         language, setLanguage, toggleLanguage, t, n,
         likedBlogs, bookmarkedBlogs, toggleLike, toggleBookmark, requireAuth, authOpen])

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = ()=>{
    return useContext(AppContext)
};
