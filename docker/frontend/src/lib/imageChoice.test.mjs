import assert from 'node:assert/strict'
import { svgToDataUri } from './imageChoice.mjs'

const svg = '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="22" fill="#dbeafe"/></svg>'
const uri = svgToDataUri(svg)

assert.ok(uri.startsWith('data:image/svg+xml;utf8,'))
assert.ok(uri.includes('%3Csvg'))
assert.ok(uri.includes('viewBox'))
assert.equal(svgToDataUri(''), '')
assert.equal(svgToDataUri(null), '')
