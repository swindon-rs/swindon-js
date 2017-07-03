import regeneratorRuntime from 'regenerator-runtime'
import assert from 'assert';
import { Server, WebSocket } from 'mock-socket';
import { _Connection } from './../lib/swindon';



describe('Connection', () => {
  it('call', async () => {
    const serv = new Server('/ws')
    try {
      serv.on('connection', (serv) => {
        serv.send(JSON.stringify([ 'hello', {}, {} ]))
      });
      serv.on('message', (msg) => {
        serv.send('["result", {"request_id": 1}, "ok"]')
      });

      let wsock = new WebSocket('/ws')
      let conn = new _Connection(wsock)
      await conn.waitConnected()
      let result = await conn.call("test", [], {})
      assert.equal(result, "ok")
    } finally {
      serv.close()
    }
  })

  it('subscribe', async (done) => {
    const serv = new Server('/ws')
    try {
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
      await conn.waitConnected()
    } finally {
      serv.close()
    }
  })
})
