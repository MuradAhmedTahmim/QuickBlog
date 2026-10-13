import sanitizeHtml from 'sanitize-html';

// The editor produces real formatting we want to keep, so the allow-list is wide
// but excludes anything that can execute or load third party code.
const options = {
    allowedTags: [
        'h1','h2','h3','h4','h5','h6','p','br','hr','blockquote','pre','code',
        'strong','b','em','i','u','s','sub','sup','span','div',
        'ul','ol','li','a','img','figure','figcaption',
        'table','thead','tbody','tfoot','tr','th','td',
    ],
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['class', 'data-list', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {img: ['http', 'https', 'data']},
    // Quill writes inline styles for alignment and colour; keep those, drop the rest.
    allowedStyles: {
        '*': {
            'text-align': [/^left$|^right$|^center$|^justify$/],
            'color': [/^#(0x)?[0-9a-f]+$/i, /^rgba?\(/],
            'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgba?\(/],
        },
    },
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', {rel: 'noopener noreferrer'}),
    },
};

const sanitizeContent = (html = '') => sanitizeHtml(String(html), options);

// Comments and names are shown as plain text, so strip markup entirely.
export const sanitizeText = (text = '') =>
    sanitizeHtml(String(text), {allowedTags: [], allowedAttributes: {}}).trim();

export default sanitizeContent;
