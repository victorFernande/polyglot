import assert from 'node:assert/strict'
import { bootstrapPathForUserId } from './apiUser.mjs'

assert.equal(bootstrapPathForUserId(1), '/users/1/bootstrap')
assert.equal(bootstrapPathForUserId(99991), '/users/99991/bootstrap')
assert.equal(bootstrapPathForUserId('99992'), '/users/99992/bootstrap')
assert.equal(bootstrapPathForUserId(0), '/users/1/bootstrap')
assert.equal(bootstrapPathForUserId('abc'), '/users/1/bootstrap')
