import sinon from 'sinon';

class Connection {
  constructor() {
    this.call = sinon.spy();
    this.subscribe = sinon.spy();
    this.unsubscribe = sinon.spy();
  }
}

export function connection() {
  return new Connection()
}
