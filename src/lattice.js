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

function ends_with(a, b) {
    return a.length >= b.length && a.substr(a.length - b.length) == b
}


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
        let kval = this._keys[key]
        if(!kval) {
            this._keys[key] = kval = {}
        }
        return this._updateCounter(key, variable, value)
    }

    _updateCounter(key, variable, value) {
        let kval = this._keys[key]
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
        let kval = this._keys[key]
        if(!kval) {
            this._keys[key] = kval = {}
        }
        return this._updateSet(key, variable, value)
    }

    _updateSet(key, variable, value) {
        let kval = this._keys[key]
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

    _update(values) {
        let updated_keys = []
        for(var key in values) {
            let cur = values[key]
            let updated = false;
            if(!(key in this._keys)) {
                // new keys added to `updated_keys` even if there are no vars
                // but only first time they appear
                this._keys[key] = {}
                updated = true;
            }
            for(var fullvar in cur) {
                let value = cur[fullvar]
                let has_updates = false
                if(ends_with(fullvar, "_counter")) {
                    let variable = fullvar.substr(0, fullvar.length - 8);
                    has_updates = this._updateCounter(key, variable, value);
                } else if(ends_with(fullvar, "_set")) {
                    let variable = fullvar.substr(0, fullvar.length - 4);
                    has_updates = this._updateSet(key, variable, value);
                } else {
                    console.error("Unsupported variable type", fullvar)
                }
                if(has_updates) {
                     updated = true;
                }
            }
            if(updated) {
                updated_keys.push(key)
            }
        }
        if(updated_keys.length && this._onUpdate) {
            this._onUpdate(updated_keys, this)
        }
    }

    allKeys() {
        return Object.keys(this._keys)
    }
}
