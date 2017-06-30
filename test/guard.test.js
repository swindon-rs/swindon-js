import assert from 'assert';
import sinon from 'sinon';
import { connection } from './mock-swindon';
import { _Guard } from './../lib/swindon';


describe('Basic guard', () => {
  it('init-listen-deinit', () => {

    let conn = connection()
    let swindon = {_connection: conn, _remove_guard: sinon.spy()}
    let guard = new _Guard(swindon)
      .init('notifications.subscribe', ['yyy.zzz'])
      .listen('notifications.yyy.zzz', message => {
         this.setState(message.n_notifications)
      })
      .deinit('notifications.unsubscribe', ['yyy.zzz'])

    guard._subscribe()
    guard._call_inits()
    assert(conn.call.calledWith('notifications.subscribe', ['yyy.zzz']))
    assert(conn.subscribe.calledWith('notifications.yyy.zzz'))

    guard.close()
    assert(conn._mock_unsubscribe.calledWith())
    assert(conn.call.calledWith('notifications.unsubscribe', ['yyy.zzz']))

    assert(swindon._remove_guard.calledWith(guard))

  });
});
