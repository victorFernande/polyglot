import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const wave = readFileSync(new URL('../../../../waves/wave-02-french.md', import.meta.url), 'utf8')
const readme = readFileSync(new URL('../../../../french/README.md', import.meta.url), 'utf8')

test('French wave uses Non, je ne regrette rien as the boss-final song', () => {
  assert.match(wave, /Boss Final:[\s\S]*Non, je ne regrette rien/i)
  assert.match(wave, /Édith Piaf/i)
  assert.match(wave, /Cantar.*Non, je ne regrette rien/i)
})

test('French README names the boss-final song explicitly', () => {
  assert.match(readme, /Boss final[\s\S]*Non, je ne regrette rien/i)
  assert.match(readme, /Édith Piaf/i)
})
