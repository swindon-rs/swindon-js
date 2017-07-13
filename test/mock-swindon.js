import sinon from 'sinon';

class Connection {
  constructor() {
    this.call = sinon.stub().returns(
        new Promise((accept) => {
          accept('42');
        })
    );
    this.subscribe = sinon.spy(x => this._mock_unsubscribe);
    this._mock_unsubscribe = sinon.spy();
  }
}

export function connection() {
  return new Connection()
}
