export class _Guard {
  constructor() {
    this._backend_init = []
    this._backend_deinit = []
    this._listeners = []
    this._cleanup = []
    this.close = this.close.bind(this);
    this._connection = null
  }
  init(method_name, positional_args, keyword_args) {
    this._backend_init.push({ method_name, positional_args, keyword_args });
    return this;
  }
  deinit(method_name, positional_args, keyword_args) {
    this._backend_deinit.push({ method_name, positional_args, keyword_args });
    return this;
  }
  listen(topic, callback) {
    this._listeners.push({ topic, callback })
    return this;
  }
  close() {
    let conn = this._connection;
    this.connection = null
    if(conn) {
      for(let cleanup of this._cleanup) {
        cleanup()
      }
      for(let call of this._backend_deinit) {
        conn.call(call.method_name, call.positional_args, call.keyword_args)
      }
    }
  }
}

export function _start_guard(guard, conn) {
  guard._cleanup = []
  for(let sub of guard._listeners) {
    guard._cleanup.push(conn.subscribe(sub.topic, sub.callback))
  }
  for(let call of guard._backend_init) {
    conn.call(call.method_name, call.positional_args, call.keyword_args)
  }
  guard._connection = conn;
}
