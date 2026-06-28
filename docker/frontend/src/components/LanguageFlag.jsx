import React from 'react'

const FLAGS = {
  de: { src: 'https://flagcdn.com/de.svg', emoji: '🇩🇪', label: 'Alemanha' },
  fr: { src: 'https://flagcdn.com/fr.svg', emoji: '🇫🇷', label: 'França' },
  ru: { src: 'https://flagcdn.com/ru.svg', emoji: '🇷🇺', label: 'Rússia' },
  jp: { src: 'https://flagcdn.com/jp.svg', emoji: '🇯🇵', label: 'Japão' },
  en: { src: '/flags/en.svg', emoji: '🇬🇧', label: 'Inglês' },
}

export default function LanguageFlag({ code, className = 'w-12 h-12' }) {
  const flag = FLAGS[code]
  if (!flag) return null

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20 shadow-lg ${className}`}
      role="img"
      aria-label={`Bandeira: ${flag.label}`}
      title={`${flag.emoji} ${flag.label}`}
    >
      <img
        src={flag.src}
        alt={`${flag.emoji} ${flag.label}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </span>
  )
}
