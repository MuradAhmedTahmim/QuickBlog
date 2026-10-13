const WORDS_PER_MINUTE = 215;

// Strips the stored HTML down to words so the estimate reflects the article body.
export const countWords = (html = '') => {
    const text = String(html)
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&[a-z]+;/gi, ' ');

    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
}

// Always at least a minute, so very short posts still read sensibly.
const readingTime = (html = '') => Math.max(1, Math.round(countWords(html) / WORDS_PER_MINUTE));

export default readingTime;
