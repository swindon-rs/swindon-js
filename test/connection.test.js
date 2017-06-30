import regeneratorRuntime from 'regenerator-runtime'
import assert from 'assert';
import { Server, WebSocket } from 'mock-socket';
import { _Connection } from './../lib/swindon';



describe('Connection', () => {
  it('call', async () => {
    const serv = new Server('/ws')
    serv.on('connection', (serv) => {
      serv.send(JSON.stringify([ 'hello', {}, {} ]))
    });
    serv.on('message', (msg) => {
      serv.send('["result", {"request_id": 1}, "ok"]')
    });

    let wsock = new WebSocket('/ws')
    let conn = new _Connection(wsock)
    await conn.wait_connected()
    let ok = await conn.call("test")
    assert(ok == "ok")
    serv.close()
  })

  it('subscribe', async (done) => {
    const serv = new Server('/ws')
    serv.on('connection', (serv) => {
      serv.send(JSON.stringify([ 'hello', {}, {} ]))
      serv.send(JSON.stringify([ 'message', {topic: 'xxx'}, "yyy" ]))
    });

    let wsock = new WebSocket('/ws')
    let conn = new _Connection(wsock)
    conn.subscribe('xxx', value => {
      assert(value == 'yyy')
      done()
    })
    await conn.wait_connected()
    serv.close()
  })
})
