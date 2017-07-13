import assert from 'assert';
import sinon from 'sinon';
import { connection } from './mock-swindon';
import { _Guard } from './../lib/swindon';
import regeneratorRuntime from 'regenerator-runtime'


describe('Basic guard', () => {
  it('init-listen-deinit', () => {

    let conn = connection()
    let swindon = {_connection: conn, _removeGuard: sinon.spy() }
    let guard = new _Guard(swindon)
      .init('notifications.subscribe', ['yyy.zzz'])
      .listen('notifications.yyy.zzz', message => {
         this.setState(message.n_notifications)
      })
      .deinit('notifications.unsubscribe', ['yyy.zzz'])

    guard._subscribe()
    guard._callInits()
    assert(conn.call.calledWith('notifications.subscribe', ['yyy.zzz']))
    assert(conn.subscribe.calledWith('notifications.yyy.zzz'))

    guard.close()
    assert(conn._mock_unsubscribe.calledWith())
    assert(conn.call.calledWith('notifications.unsubscribe', ['yyy.zzz']))

    assert(swindon._removeGuard.calledWith(guard))

  });

  it('init-callback', async () => {

    let conn = connection();
    let counter = 7
    conn.call = sinon.spy(function() {
        return new Promise((accept) => {
          accept(counter++);
        })
    });
    let swindon = {_connection: conn,
                   _removeGuard: sinon.spy(),
                   _status: 'active'};

    let accept
    let wait1 = new Promise((a, _) => accept = a);
    const initCallback = (value) => accept(value)

    let guard = new _Guard(swindon)
      .init('notifications.subscribe', ['yyy.zzz'], {}, initCallback);
    let r1 = await wait1
    assert.equal(7, r1)

    let wait2 = new Promise((a, _) => accept = a) // replaces accept value
    guard._subscribe(); //re-init
    guard._callInits();
    let r2 = await wait2
    assert.equal(8, r2)
  });
});
