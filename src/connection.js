export class _Connection {
  constructor(websock) {
    this._listeners = {}
    this._lattices = {}
    this._hello = new Promise((accept, reject) => {
      this._helloAccept = accept;
      this._helloReject = reject;
    })
    this._requests = {}
    this._lastRequestId = 0;

    // We don't do anything on onopen, because we wait for
    // hello message instead
    websock.onmessage = (e) => {
      const json = JSON.parse(e.data);
      this._dispatch(json);
    };

    this._ws = websock;
  }
  _dispatch(input) {
    const eventType = input[0]
    const meta = input[1]
    const data = input[2]

    switch (eventType) {

      case 'result': {
        const promise = this._requests[meta.request_id]
        delete this._requests[meta.request_id]
        if(promise) {
          promise.accept(data)
        } else {
          console.error('Swindon: Unsolicited reply',
            meta.request_id, data)
        }
        return
      }

      case 'error': {
        const promise = this._requests[meta.request_id]
        delete this._requests[meta.request_id]
        // TODO(tailhook) wrap it into some error object
        if(promise) {
          promise.reject(data)
        } else {
          console.error('Swindon: Unsolicited error reply',
            meta.request_id, data)
        }
        return
      }

      case 'hello':
        // metadata is second param, so you can
        // ignore it most of the time
        this._helloAccept({ data, meta })
        return

      case 'message':
        const handlers = this._listeners[meta.topic]
        if(handlers) {
          for(var handler of handlers) {
            try {
              // metadata is second param, so you can
              // ignore it most of the time
              handler(data, meta)
            } catch(e) {
              // TODO(tailhook)
              console.error("Swindon: Error processing message", meta, data, e)
            }
          }
        } else {
          console.info('Swindon: Unsolicited message', meta)
        }
        return

      case 'lattice':
        const lattices = this._lattices[meta.namespace]
        if(lattices) {
          for(var lat_handler of lattices) {
            try {
              // metadata is second param, so you can
              // ignore it most of the time
              lat_handler(data, meta)
            } catch(e) {
              // TODO(tailhook)
              console.error("Swindon: Error processing lattice", meta, data, e)
            }
          }
        } else {
          console.info('Swindon: Unsolicited lattice', meta)
        }
        return

      default:
        console.error('Unknown command, check SwindonJS version',
          eventType, requestMeta, data)
        return
    }
  }

  call(method_name, positional_args, keyword_args) {
    this._lastRequestId += 1
    const rid = this._lastRequestId
    const meta = {request_id: rid}
    const promise = new Promise((accept, reject) => {
      this._requests[rid] = {
        accept: accept,
        reject: reject,
      }
    })
    this._ws.send(JSON.stringify([method_name, meta,
                                  positional_args, keyword_args]))
    return promise;
  }

  subscribe(topic, callback) {
    const l = this._listeners[topic] || []
    l.push(callback)
    this._listeners[topic] = l
    return () => {
      const idx = l.indexOf(callback)
      if(idx >= 0) {
        l.splice(l.indexOf(callback), 1)
        if(l.length == 0) {
          delete this._listeners[topic]
        }
      }
    }
  }
  lattice_subscribe(namespace, callback) {
    const l = this._lattices[namespace] || []
    l.push(callback)
    this._lattices[namespace] = l
    return () => {
      const idx = l.indexOf(callback)
      if(idx >= 0) {
        l.splice(l.indexOf(callback), 1)
        if(l.length == 0) {
          delete this._lattices[namespace]
        }
      }
    }
  }

  waitConnected() {
    return this._hello
  }

  close() {
    this._ws.close()
  }
}
