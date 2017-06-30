export { _Guard } from './guard'
export { _Connection } from './connection'

const RESOLVE = 0;
const REJECT = 1;
const RECONNECT_LIMIT = 3;
const SECOND = 1000;
const SERVER_TIMEOUT = 10 * SECOND;
const CONNECTION = '__conn__';

export default class Swindon {
  constructor(url, handlers, options) {
    this._url = url;
    this._options = Object.assign({
      debug: false,
      serverTimeout: SERVER_TIMEOUT,
      reconnectOnClose: false,
      reconnectOnError: false
    }, options);

    this._ws = null;

    this._lastRequestId = 0;
    this._reconnectAttempts ={
      onError: 0,
      onClose: 0,
    };
    // in seconds
    this._reconnectTimeouts = [0, 2, 4];
    this._requests = new Map();

    if (handlers) {
      this._result = handlers.result;
      this._error = handlers.error;
      this._hello = handlers.hello;
      this._message = handlers.message;
      this._lattice = handlers.lattice;
    }
  }

  isConnected() {
    return !!(this._ws && this._ws.readyState === WebSocket.OPEN);
  }

  _fulfillPromise(key, resolution, payload) {
    if (this._requests.has(key)) {
      const fulfiller = this._requests.get(key)[resolution];
      fulfiller(payload);
      this._requests.delete(key);
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      this._requests.set(CONNECTION, [resolve, reject]);
      const url = this._url;
      const ws = new WebSocket(url);
      ws.onopen = () => {
        this._fulfillPromise(CONNECTION, RESOLVE, null);
        this._reconnectAttempts.onError = 0;
        this._reconnectAttempts.onClose = 0;
      };
      ws.onmessage = (e) => {
        const json = JSON.parse(e.data);
        this._parseMessage(json);
      };
      ws.onerror = () => {
        this._fulfillPromise(CONNECTION, REJECT, null);
        if (this._options.reconnectOnError && (
            this._reconnectAttempts.onError < RECONNECT_LIMIT)) {
          setTimeout(() => {
            this.connect()
                .catch(() => (this._reconnectAttempts.onError++));
          }, this._reconnectTimeouts[this._reconnectAttempts.onError] * SECOND);
        }
      };
      ws.onclose = () => {
        if (this._options.reconnectOnClose && (
            this._reconnectAttempts.onClose < RECONNECT_LIMIT)) {
          setTimeout(() => {
            this._connect();
            this._reconnectAttempts.onClose++;
          }, this._reconnectTimeouts[this._reconnectAttempts.onClose] * SECOND);
        }
      };

      this._ws = ws;
    });
  }

  call(method, args, kwargs) {
    let val;
    if (this.isConnected()) {
      val = new Promise((resolve, reject) => {
        const requestId = this._lastRequestId;

        this._requests.set(requestId, [resolve, reject]);
        this._ws.send(JSON.stringify([
          method,
          {
              request_id: requestId,
              activity: 120, // 2 minutes for activity
          },
          args,
          kwargs,
        ]));

        setTimeout(() => this._fulfillPromise(requestId, REJECT, {
          requestMeta: {},
          data: {
              status: 'error',
              message: 'Timeout from server',
          },
        }), this._options.serverTimeout);

        this._lastRequestId += 1;
      });
    } else {
      console.error('Ooops! Swindon is not connected ;(');
      val = new Promise((_, reject) => reject());
    }

    return val;
  }

  _parseMessage(response) {
    const eventType = response[0];
    const requestMeta = response[1];
    const data = response[2];

    switch (eventType) {
      case 'result':
        return this._doResult(requestMeta, data);
      case 'error':
        return this._doError(requestMeta, data);
      case 'hello':
        return this._doHello(requestMeta, data);
      case 'message':
        return this._doMessage(requestMeta, data);
      case 'lattice':
        return this._doLattice(requestMeta, data);
      default:
        return this._doUnknownCommand(eventType, requestMeta, data);
    }
  }

  _doResult(requestMeta, data) {
    if (this._options.debug) {
      console.log('result', requestMeta, data);
    }

    this._result && this._result(requestMeta, data);
    this._fulfillPromise(requestMeta.request_id, RESOLVE, { requestMeta, data });
  }

  _doError(requestMeta, data) {
    if (this._options.debug) {
      console.error('error', requestMeta, data);
    }

    this._error && this._error(requestMeta, data);
    this._fulfillPromise(requestMeta.request_id, REJECT, { requestMeta, data });
  }

  _doHello(requestMeta, data) {
    if (this._options.debug) {
      console.log('hello', requestMeta, data);
    }

    this._hello && this._hello(requestMeta, data);
  }

  _doMessage(requestMeta, data) {
    if (this._options.debug) {
      console.log('message', requestMeta, data);
    }

    this._message && this._message(requestMeta, data);
  }

  _doLattice(requestMeta, data) {
    if (this._options.debug) {
      console.log('lattice', requestMeta, data);
    }

    this._lattice && this._lattice(requestMeta, data);
  }

  _doUnknownCommand(eventType, requestMeta, data) {
    console.error('Unknown command, check SwindonJS version', eventType, requestMeta, data);
  }
}
