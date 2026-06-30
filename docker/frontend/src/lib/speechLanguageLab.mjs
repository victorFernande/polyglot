export const SPEECH_TEST_LANGUAGES = [
  { code: 'de', label: 'Alemão', speechLang: 'de-DE' },
  { code: 'fr', label: 'Francês', speechLang: 'fr-FR' },
  { code: 'ru', label: 'Russo', speechLang: 'ru-RU' },
  { code: 'jp', label: 'Japonês', speechLang: 'ja-JP' },
  { code: 'en', label: 'Inglês', speechLang: 'en-US' },
]

const SAMPLE_TRANSLATIONS = {
  'bom dia': {
    de: 'Guten Morgen',
    fr: 'Bonjour',
    ru: 'Доброе утро',
    jp: 'おはようございます',
    en: 'Good morning',
  },
  'obrigado': {
    de: 'Danke',
    fr: 'Merci',
    ru: 'Спасибо',
    jp: 'ありがとうございます',
    en: 'Thank you',
  },
  'eu quero café': {
    de: 'Ich möchte Kaffee',
    fr: 'Je veux du café',
    ru: 'Я хочу кофе',
    jp: 'コーヒーが欲しいです',
    en: 'I want coffee',
  },
  'onde fica o banheiro?': {
    de: 'Wo ist die Toilette?',
    fr: 'Où sont les toilettes ?',
    ru: 'Где туалет?',
    jp: 'トイレはどこですか？',
    en: 'Where is the bathroom?',
  },
  'eu estou aprendendo idiomas': {
    de: 'Ich lerne Sprachen',
    fr: 'J’apprends des langues',
    ru: 'Я изучаю языки',
    jp: '私は言語を学んでいます',
    en: 'I am learning languages',
  },
}

function normalizeText(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function speechLangForTestLanguage(languageCode) {
  return SPEECH_TEST_LANGUAGES.find((language) => language.code === languageCode)?.speechLang || 'pt-BR'
}

export function translateSpeechTestText(text, languageCode) {
  const normalized = normalizeText(text)
  if (!normalized) return ''
  return SAMPLE_TRANSLATIONS[normalized]?.[languageCode] || String(text || '').trim()
}
