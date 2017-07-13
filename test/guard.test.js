import assert from 'assert';
import sinon from 'sinon';
import { connection } from './mock-swindon';
import { _Guard } from './../lib/swindon';


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

  it('init-callback', (done) => {

    let conn = connection();
    let swindon = {_connection: conn, _removeGuard: sinon.spy(), _status: 'active'};
    const initCallback = sinon.spy();
    let guard = new _Guard(swindon)
      .init('notifications.subscribe', ['yyy.zzz'], {}, initCallback);

    guard._subscribe();
    guard._callInits(); //re-init

    setTimeout(() => {  // Let promise resolve
      assert(initCallback.calledWith('42'));
      assert(initCallback.callCount === 2);  // on init and on re-init
      done();
    }, 0);
  });
});
