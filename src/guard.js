export class _Guard {
  constructor(swindon) {
    this._backend_init = []
    this._backend_deinit = []
    this._listeners = []
    this._cleanup = []
    this.close = this.close.bind(this);
    this._swindon = swindon
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
    for(let cleanup of this._cleanup.splice(0, this._cleanup.length)) {
      cleanup()
    }
    if(conn) {
      for(let call of this._backend_deinit) {
        conn.call(call.method_name, call.positional_args, call.keyword_args)
      }
    }
  }
  _subscribe() {
    this._cleanup = []
    for(let sub of this._listeners) {
      this._cleanup.push(this._swindon._connection
                         .subscribe(sub.topic, sub.callback))
    }
  }
  _call_inits() {
    const conn = this._connection = this._swindon._connection
    for(let call of this._backend_init) {
      conn.call(call.method_name, call.positional_args, call.keyword_args)
    }
  }
}
