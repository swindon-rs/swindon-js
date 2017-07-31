import assert from 'assert';
import sinon from 'sinon';
import { Lattice, InvalidType } from './../lib/swindon';
import regeneratorRuntime from 'regenerator-runtime'

describe('Lattice', () => {
  it('inits', () => {
    new Lattice()
  })
  it('counter updates', () => {
    let lat = new Lattice()
    assert.equal(lat.getCounter('x', 'y'), 0)
    assert.equal(lat.updateCounter('x', 'y', 5), true)
    assert.equal(lat.getCounter('x', 'y'), 5)
    assert.equal(lat.getCounter('x', 'z'), 0)
    assert.equal(lat.getCounter('z', 'y'), 0)
    assert.equal(lat.updateCounter('x', 'y', 4), false)
    assert.equal(lat.getCounter('x', 'y'), 5)
    assert.equal(lat.updateCounter('x', 'y', 7), true)
    assert.equal(lat.getCounter('x', 'y'), 7)
    assert.equal(lat.updateCounter('x', 'y', 6), false)
    assert.equal(lat.getCounter('x', 'y'), 7)
    assert.throws(() => lat.updateCounter('x', 'y', 'vvv'), InvalidType)
    assert.equal(lat.getCounter('x', 'y'), 7)
  })
  it('set updates', () => {
    let lat = new Lattice()
    assert.deepEqual(lat.getSet('x', 'y'), [])
    assert.deepEqual(lat.updateSet('x', 'y', ['a', 'b']), true)
    assert.deepEqual(lat.getSet('x', 'y'), ['a', 'b'])
    assert.deepEqual(lat.getSet('x', 'z'), [])
    assert.deepEqual(lat.getSet('z', 'y'), [])
    assert.deepEqual(lat.updateSet('x', 'y', ['a']), false)
    assert.deepEqual(lat.getSet('x', 'y'), ['a', 'b'])
    assert.deepEqual(lat.updateSet('x', 'y', ['a', 'c']), true)
    assert.deepEqual(lat.getSet('x', 'y'), ['a', 'b', 'c'])
    assert.deepEqual(lat.updateSet('x', 'y', ['b']), false)
    assert.deepEqual(lat.getSet('x', 'y'), ['a', 'b', 'c'])
    assert.throws(() => lat.updateSet('x', 'y', 'vvv'), InvalidType)
    assert.deepEqual(lat.getSet('x', 'y'), ['a', 'b', 'c'])
  })
})
