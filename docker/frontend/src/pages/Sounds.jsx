import React from 'react'
import { Volume2, Sparkles } from 'lucide-react'
import { SOUND_CATALOG } from '../lib/soundCatalog.mjs'

export default function Sounds() {
  function preview(sound) {
    sound.unlock()
    sound.play()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🔊 Som</h1>
        <p className="text-gray-400">
          Central de efeitos sonoros do Polyglot. Sempre que um novo som for criado, ele deve entrar no catálogo central e aparecer aqui para teste.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SOUND_CATALOG.map((sound) => (
          <section key={sound.id} className="card flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-polyglot-accent/20 text-polyglot-accent">
                    <Volume2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{sound.label}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polyglot-gold">{sound.cue}</p>
                  </div>
                </div>
                <Sparkles className="text-polyglot-gold" size={20} />
              </div>
              <p className="text-sm text-gray-300">{sound.description}</p>
            </div>

            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-2"
              onClick={() => preview(sound)}
            >
              <Volume2 size={18} /> Testar som
            </button>
          </section>
        ))}
      </div>
    </div>
  )
}
