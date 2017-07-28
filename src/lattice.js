// Error subclassing from mozilla docs
export function InvalidType(expected, value) {
    let err = Error(`Expected ${ expected } got: ${
        value && value.constructor && value.constructor.name || value
    }`)
    this.name = 'InvalidType';
    this.message = err.message
    this.stack = err.stack
    this.expected = expected
    this.value = value
}
InvalidType.prototype = Object.create(Error.prototype)
InvalidType.prototype.constructor = InvalidType

export class Lattice {
    constructor({onUpdate=null}={}) {
        this._onUpdate = onUpdate
        this._keys = {}
    }
    getCounter(key, variable) {
        return (this._keys[key] || {})[variable + '_counter'] || 0
    }
    getSet(key, variable) {
        return Object.keys((this._keys[key] || {})[variable + '_set'] || {})
    }
    updateCounter(key, variable, value) {
        if(Math.trunc(value) !== value) {
            throw new InvalidType("integer", value)
        }
        return this._updateCounter(key, variable, value)
    }
    _updateCounter(key, variable, value) {
        let kval = this._keys[key]
        if(!kval) {
            this._keys[key] = kval = {}
        }
        let fullvar = variable + '_counter'
        if(!kval[fullvar] || kval[fullvar] < value) {
            kval[fullvar] = value
            return true
        }
        return false
    }
    updateSet(key, variable, value) {
        if(!Array.isArray(value)) {
            throw new InvalidType("array of strings", value)
        }
        return this._updateSet(key, variable, value)
    }
    _updateSet(key, variable, value) {
        let kval = this._keys[key]
        if(!kval) {
            this._keys[key] = kval = {}
        }
        let fullvar = variable + '_set'
        let sval = kval[fullvar]
        if(!sval) {
            kval[fullvar] = sval = {}
        }
        let res = false;
        for(let x of value) {
            if(!sval[x]) {
                sval[x] = true
                res = true
            }
        }
        return res
    }
    allKeys() {
        return Object.keys(this._keys)
    }
}
