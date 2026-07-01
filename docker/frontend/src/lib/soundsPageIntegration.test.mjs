import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const layoutSource = readFileSync(new URL('../components/Layout.jsx', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('../pages/Sounds.jsx', import.meta.url), 'utf8')

assert.match(layoutSource, /label:\s*['"]Som['"]/, 'sidebar must include the Som menu item')
assert.match(layoutSource, /path:\s*['"]\/sounds['"]/, 'Som menu item must link to /sounds')
assert.match(appSource, /import Sounds from ['"]\.\/pages\/Sounds['"]/, 'App must import the Sounds page')
assert.match(appSource, /<Route path=['"]\/sounds['"] element=\{<Sounds \/>\}/, 'App must expose /sounds route')
assert.match(pageSource, /SOUND_CATALOG\.map/, 'Sounds page must render from the central sound catalog')
assert.match(pageSource, /function preview\(sound\)/, 'Preview action must stay inside the click gesture instead of waiting before playback')
assert.match(pageSource, /sound\.unlock\(\)[\s\S]*sound\.play\(\)/, 'Preview buttons must unlock/resume audio during the click before playing')
assert.match(pageSource, /onPointerDown=\{\(\) => sound\.unlock\(\)\}/, 'Preview buttons must unlock on pointer down for mobile browsers before synthetic click playback')
assert.match(pageSource, /onTouchStart=\{\(\) => sound\.unlock\(\)\}/, 'Preview buttons must unlock on touch start for iOS Safari')
assert.match(pageSource, /Testar som/, 'Sounds page must provide test buttons for each sound')
