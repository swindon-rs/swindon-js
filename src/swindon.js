import { _Guard } from './guard'
export { _Guard } from './guard'
import { _Connection } from './connection'
export { _Connection } from './connection'

const OK_DURATION = 10000;
const OK_TIMEOUT = 100;     // 100 ms, when connection is fine
const TIMEOUTS = [1000, 2000, 10000, 30000, 60000, 300000];  // 5 minutes max

export class Swindon {
  constructor(url, options) {
    this._url = url;
    this._options = {
      onStateChange: null,
      ...options,
    };
    this._connection = null;
    this._guards = [];
    this._status = 'starting';
    this._started = 0;
    this._reconnectTimeout = null;
    this._reconnectIndex = 0;
    this._reconnectTime = null;
    this._start();
  }

  _resetPromise() {
    this._waitConnected = new Promise((accept, reject) => {
      this._waitConnectedAccept = accept;
      this._waitConnectedReject = reject;
    })
  }

  _start() {
    this._resetPromise();
    this._initConnection()
  }

  _newState(status, reconnect_time) {
    this._reconnectTime = reconnect_time;
    this._status = status;
    const fun = this._options.onStateChange;
    try {
      if(fun) {
        this._options.onStateChange(this.state());
      }
    } catch(e) {
      console.error("Swindon: Error processing state", status, e)
    }
  }

  _initConnection() {
    this._clearReconnect();
    this._started = Date.now();
    this._newState('connecting', null);
    const ws = new WebSocket(this._url, "v1.swindon-lattice+json");
    ws.onopen = ev => {
      this._newState('connecting', null)
    };
    ws.onerror = ev => {
      console.error("Swindon: Websocket error")
    };
    ws.onclose = ev => {
      console.log("Swindon: Websocket closed", ev.code, ev.reason);
      this._scheduleReconnect();
    };
    this._connection = new _Connection(ws);

    for(let guard of this._guards) {
      guard._subscribe();
    }

    this._connection.waitConnected().then(({data, metadata}) => {
      this._newState('active', null);
      this._waitConnectedAccept(data);
      for(let guard of this._guards) {
        guard._callInits();
      }
    })
  }

  _clearReconnect() {
    if(this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null
    }
  }

  _scheduleReconnect() {
    if(this._status === 'closed') {
      return
    }
    this._resetPromise();
    this._clearReconnect();

    let timeo = OK_TIMEOUT;
    if(Date.now() - this._started <= OK_DURATION) {
      timeo = TIMEOUTS[this._reconnectIndex];
      this._reconnectIndex = Math.min(this._reconnectIndex+1,
                                       TIMEOUTS.length - 1);
    } else {
      timeo = OK_TIMEOUT;
      this._reconnectIndex = 0;
    }
    // Use 50-150% of the specified timeout
    // This randomizes reconnect delay to make server load smaller in case
    // all clients need to reconnect (i.e. when server restarted)
    timeo = timeo * (0.5 + Math.random());

    this._newState('wait', Date.now() + timeo);
    this._reconnectTimeout = setTimeout(_ => this._reconnect(), timeo);
  }
  _reconnect() {
    this._initConnection();
  }
  /**
   * Force reconnect now. For example, if user clicks a button.
   *
   * Note: this doesn't check if connection is already okay, so it's better
   * to do:
   *
   *    if(swindon.state().status != 'wait') {
   *        swindon.reconnectNow()
   *    }
   *
   */
  reconnectNow() {
    // _initConnection() resets the timer anyway just to be sure
    this._initConnection();
  }

  waitConnected() {
    return this._waitConnected;
  }

  guard() {
    const guard = new _Guard(this);
    this._guards.push(guard);
    return guard;
  }

  close() {
    this._newState('closed', null);
    const conn = this._connection;
    this._connection = null;
    if(conn) {
      conn.close();
    }
    this._clearReconnect();
  }

  _removeGuard(guard) {
    const idx = this._guards.indexOf(guard);
    if(idx >= 0) {
      this._guards.splice(idx, 0);
    }
  }

  state() {
    return {
      status: this._status,
      reconnect_time: this._reconnectTime,
      guards: this._guards.length,
    }
  }

  call(method_name, positional_args=[], named_args={}) {
    return this._waitConnected.then(_ => {
      return this._connection.call(method_name, positional_args, named_args)
    })
  }
}
