import Moment from 'moment'
import 'moment/dist/locale/bn'
import dictionaries from './translations'

export const LANGUAGES = ['bn', 'en']
export const DEFAULT_LANGUAGE = 'bn'

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

// Bengali readers expect Bengali numerals, so every number the interface shows
// goes through here rather than being printed directly.
export const localizeDigits = (value, language) => {
  const text = String(value)
  if (language !== 'bn') return text
  return text.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)])
}

const lookup = (dictionary, path) =>
  path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dictionary)

// Falls back to English, then to the key itself, so a missing string shows up
// as something recognisable instead of blank space.
export const translate = (language, key, values = {}) => {
  const raw = lookup(dictionaries[language], key) ?? lookup(dictionaries.en, key) ?? key

  return String(raw).replace(/\{(\w+)\}/g, (match, name) =>
    name in values ? localizeDigits(values[name], language) : match
  )
}

// moment carries its own Bengali month names and numerals.
export const applyLanguage = (language) => {
  Moment.locale(language === 'bn' ? 'bn' : 'en')
  document.documentElement.lang = language
}

export default dictionaries
