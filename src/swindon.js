const RESOLVE = 0;
const REJECT = 1;
const RECONNECT_LIMIT = 3;
const SECOND = 1000;
const SERVER_TIMEOUT = 10 * SECOND;
const CONNECTION = '__conn__';

export default function Swindon(url, handlers, options) {
  this.url = url;
  this.options = Object.assign({
    debug: false,
    serverTimeout: SERVER_TIMEOUT,
    reconnectOnClose: false,
    reconnectOnError: false
  }, options);

  this.ws = null;

  this.lastRequestId = 0;
  this.reconnectAttempts ={
    onError: 0,
    onClose: 0,
  };
  // in seconds
  this.reconnectTimouts = [0, 2, 4];
  this.requests = new Map();

  if (handlers) {
    this.result = handlers.result;
    this.error = handlers.error;
    this.hello = handlers.hello;
    this.message = handlers.message;
    this.lattice = handlers.lattice;
  }
}

Swindon.prototype.isConnected = function() {
  return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
};

Swindon.prototype.fullfillPromise = function(key, resolution, payload) {
  if (this.requests.has(key)) {
    const fulfiller = this.requests.get(key)[resolution];
    fulfiller(payload);
    this.requests.delete(key);
  }
};

Swindon.prototype.connect = function() {
  return new Promise((resolve, reject) => {
    this.requests.set(CONNECTION, [resolve, reject]);
    const url = this.url;
    const ws = new WebSocket(url);
    ws.onopen = () => {
      this.fullfillPromise(CONNECTION, RESOLVE, null);
      this.reconnectAttempts.onError = 0;
      this.reconnectAttempts.onClose = 0;
    };
    ws.onmessage = (e) => {
      const json = JSON.parse(e.data);
      this.parseMessage(json);
    };
    ws.onerror = () => {
      this.fullfillPromise(CONNECTION, REJECT, null);
      if (this.options.reconnectOnError && (
          this.reconnectAttempts.onError < RECONNECT_LIMIT)) {
        setTimeout(() => {
          this.connect()
              .catch(() => (this.reconnectAttempts.onError++));
        }, this.reconnectTimouts[this.reconnectAttempts.onError] * SECOND);
      }
    };
    ws.onclose = () => {
      if (this.options.reconnectOnClose && (
          this.reconnectAttempts.onClose < RECONNECT_LIMIT)) {
        setTimeout(() => {
          this.connect();
          this.reconnectAttempts.onClose++;
        }, this.reconnectTimouts[this.reconnectAttempts.onClose] * SECOND);
      }
    };

    this.ws = ws;
  });
};

Swindon.prototype.send = function(method, args, kwargs) {
  let val;
  if (this.isConnected()) {
    val = new Promise((resolve, reject) => {
      const requestId = this.lastRequestId;

      this.requests.set(requestId, [resolve, reject]);
      this.ws.send(JSON.stringify([
        method,
        {
            request_id: requestId,
            activity: 120, // 2 minutes for activity
        },
        args,
        kwargs,
      ]));

      setTimeout(() => this.fullfillPromise(requestId, REJECT, {
        requestMeta: {},
        data: {
            status: 'error',
            message: 'Timeout from server',
        },
      }), this.options.serverTimeout);

      this.lastRequestId += 1;
    });
  } else {
    console.error('Ooops! Swindon is not connected ;(');
    val = new Promise((_, reject) => reject());
  }

  return val;
};

Swindon.prototype.parseMessage = function(response) {
  const eventType = response[0];
  const requestMeta = response[1];
  const data = response[2];

  switch (eventType) {
    case 'result':
      return this.doResult(requestMeta, data);
    case 'error':
      return this.doError(requestMeta, data);
    case 'hello':
      return this.doHello(requestMeta, data);
    case 'message':
      return this.doMessage(requestMeta, data);
    case 'lattice':
      return this.doLattice(requestMeta, data);
    default:
      return this.doUnknownCommand(eventType, requestMeta, data);
  }
};

Swindon.prototype.doResult = function(requestMeta, data) {
  if (this.options.debug) {
    console.log('result', requestMeta, data);
  }

  this.result && this.result(requestMeta, data);
  this.fullfillPromise(requestMeta.request_id, RESOLVE, { requestMeta, data });
};

Swindon.prototype.doError = function(requestMeta, data) {
  if (this.options.debug) {
    console.error('error', requestMeta, data);
  }

  this.error && this.error(requestMeta, data);
  this.fullfillPromise(requestMeta.request_id, REJECT, { requestMeta, data });
};

Swindon.prototype.doHello = function(requestMeta, data) {
  if (this.options.debug) {
    console.log('hello', requestMeta, data);
  }

  this.hello && this.hello(requestMeta, data);
};

Swindon.prototype.doMessage = function(requestMeta, data) {
  if (this.options.debug) {
    console.log('message', requestMeta, data);
  }

  this.message && this.message(requestMeta, data);
};

Swindon.prototype.doLattice = function(requestMeta, data) {
  if (this.options.debug) {
    console.log('lattice', requestMeta, data);
  }

  this.lattice && this.lattice(requestMeta, data);
};

Swindon.prototype.doUnknownCommand = function(eventType, requestMeta, data) {
  console.error('Unknown command, check SwindonJS version', eventType, requestMeta, data);
};