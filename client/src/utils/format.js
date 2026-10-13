// Small shared formatters, so the same number never renders two ways.

export const compactNumber = (value = 0) => {
    const n = Number(value) || 0;
    if(n < 1000) return String(n);
    if(n < 1000000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '')}k`;
    return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
}

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Strips the stored HTML so a card excerpt never shows stray markup.
export const excerpt = (html = '', length = 150) => {
    const text = String(html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&(lt|gt|quot|#39);/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > length ? `${text.slice(0, length).trimEnd()}...` : text;
}

export const initials = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
