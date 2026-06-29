import assert from 'node:assert/strict'
import { selectableImageChoiceOptions, svgToDataUri } from './imageChoice.mjs'

const svg = '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="22" fill="#dbeafe"/></svg>'
const uri = svgToDataUri(svg)

assert.ok(uri.startsWith('data:image/svg+xml;utf8,'))
assert.ok(uri.includes('%3Csvg'))
assert.ok(uri.includes('viewBox'))
assert.equal(svgToDataUri(''), '')
assert.equal(svgToDataUri(null), '')

const options = selectableImageChoiceOptions([
  { label_pt: 'Olá', value: 'Hallo', image_src: 'data:image/svg+xml;charset=UTF-8,%3Csvg%3E' },
  { label_pt: 'café', value: 'Kaffee', svg },
  null,
  { label_pt: '', value: '' },
])

assert.equal(options.length, 2)
assert.deepEqual(options.map((option) => option.selectValue), ['Hallo', 'Kaffee'])
assert.deepEqual(options.map((option) => option.label), ['Olá', 'café'])
assert.ok(options.every((option) => option.imageSrc.startsWith('data:image/svg+xml')))
assert.ok(options.every((option) => option.key))
