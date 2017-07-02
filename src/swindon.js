import { _Guard } from './guard'
export { _Guard } from './guard'
import { _Connection } from './connection'
export { _Connection } from './connection'

const OK_DURATION = 10000
const OK_TIMEOUT = 100     // 100 ms, when connection is fine
const TIMEOUTS = [1000, 2000, 10000, 30000, 60000, 300000]  // 5 minutes max

export default class Swindon {
  constructor(url, options) {
    this._url = url
    this._options = {...options}
    this._connection = null
    this._guards = []
    this._start()
    this._status = 'starting'
    this._started = 0
    this._reconnect_timeout = null
    this._reconnect_index = 0
    this._reconnect_time = null
    this._start()
  }

  _reset_promise() {
    this._wait_connected = new Promise((accept, reject) => {
      this._wait_connected_accept = accept;
      this._wait_connected_reject = reject;
    })
  }

  _start() {
    this._reset_promise()
    this._init_connection()
  }

  _init_connection() {
    this._clear_reconnect()
    this._started = Date.now()
    this._status = 'connecting'
    this._reconnect_time = null
    const ws = new WebSocket(this._url)
    ws.onopen = ev => {
      this._status = 'connecting'
    }
    ws.onerror = ev => {
      console.error("Swindon websocket error", ev)
    }
    ws.onclose = ev => {
      console.log("Swindon websocket closed", ev.code, ev.reason)
      this._status = 'wait'
      this._schedule_reconnect()
    }
    this._connection = new _Connection(ws)
    this._connection.wait_connected().then(({data, metadata}) => {
      this._status = 'active'
      this._wait_connected_accept(data)
      for(var guard of this._guards) {
        guard._subscribe()
      }
      for(var guard of this._guards) {
        guard._call_inits()
      }
    })
  }

  _clear_reconnect() {
    if(this._reconnect_timeout) {
      clearTimeout(this._reconnect_timeout)
      this._reconnect_timeout = null
    }
  }

  _schedule_reconnect() {
    this._reset_promise()
    this._clear_reconnect()

    let timeo = OK_TIMEOUT
    if(new Date() - this._started >= OK_DURATION) {
      timeo = TIMEOUTS[this._reconnect_index];
      this._reconnect_index = Math.min(this._reconnect_index+1,
                                       TIMEOUTS.length - 1);
    } else {
      timeo = OK_TIMEOUT
      this._reconnect_index = 0
    }

    this._reconnect_time = Date.now() + timeo
    this._reconnect_timeout = setTimeout(_ => this._reconnect(), timeo)
  }
  _reconnect() {
    this._init_connection()
  }

  wait_connected() {
    return this._wait_connected;
  }

  guard() {
    const guard = new _Guard(this)
    this._guards.push(guard)
    return guard
  }

  close() {
    const conn = this._connection
    this._connection = null
    if(conn) {
      conn.close()
    }
  }

  _remove_guard(guard) {
    const idx = this._guards.indexOf(guard)
    if(idx >= 0) {
      this._guards.splice(idx, 0)
    }
  }

  state() {
    return {
      status: this._status,
      reconnect_time: this._reconnect_time,
      guards: this._guards.length,
    }
  }

  call(method_name, positional_args=[], named_args={}) {
    return this._wait_connected.then(_ => {
      return this._connection.call(method_name, positional_args, named_args)
    })
  }
}
