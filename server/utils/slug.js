// Turns a title into a URL-safe slug. Bengali titles keep their own letters -
// Unicode slugs are valid in a URL and transliterating them would produce
// something no reader recognises - while spaces and punctuation are dropped.
export const slugify = (text = '') =>
    String(text)
        .normalize('NFKC')
        .toLowerCase()
        .replace(/['"’”“]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');

// Slugs are unique, so a second post with the same title gets a short suffix.
// `exists` is passed in rather than imported so this stays free of any model.
export const uniqueSlug = async (text, exists, fallback = 'post') => {
    const base = slugify(text) || fallback;

    if(!(await exists(base))) return base;

    for (let attempt = 2; attempt <= 50; attempt++){
        const candidate = `${base}-${attempt}`;
        if(!(await exists(candidate))) return candidate;
    }

    // Still taken after 50 tries: fall back to something that cannot collide.
    return `${base}-${Date.now().toString(36)}`;
}

export default slugify;
