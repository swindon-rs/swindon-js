import assert from 'assert';
import { connection } from './mock-swindon';
import { _Guard, _start_guard } from './../lib/swindon';

describe('Basic guard', () => {
  it('init-listen-deinit', () => {

    let guard = new _Guard()
      .init('notifications.subscribe', ['yyy.zzz'])
      .listen('notifications.yyy.zzz', message => {
         this.setState(message.n_notifications)
      })
      .deinit('notifications.unsubscribe', ['yyy.zzz'])

    let conn = connection()
    _start_guard(guard, conn)
    assert(conn.call.calledWith('notifications.subscribe', ['yyy.zzz']))
    assert(conn.subscribe.calledWith('notifications.yyy.zzz'))

    guard.close()
    assert(conn.unsubscribe.calledWith('notifications.yyy.zzz'))
    assert(conn.call.calledWith('notifications.unsubscribe', ['yyy.zzz']))

  });
});
