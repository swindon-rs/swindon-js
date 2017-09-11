require('./mock-websocket');

import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import { Server } from 'mock-socket';
import regeneratorRuntime from 'regenerator-runtime'

import { Swindon, CallError, Lattice } from './../lib/swindon';


const wsUrl = '/public';


function server(url) {
  const mockServer = new Server(url);

  mockServer.sendj = function(...args) {
    mockServer.send(JSON.stringify(args))
  }

  mockServer.on('connection', (server) => {
    mockServer.sendj('hello', { request_id: 1 }, {user_id: 7})
  });

  return mockServer;
}


describe('Swindon connection action', () => {
  describe('Init WebSocket', () => {
    it('should create object correctly', () => {
      let swindon = new Swindon('/1')
      try {
        assert(swindon instanceof Swindon, 'must be instance of class');
      } finally {
        swindon.close()
      }
    });

    it('should connect to Web Socket server', async () => {
      let srv = server('/2')
      let swindon = new Swindon('/2')
      try {
        assert.equal(swindon.state().status, 'connecting')
        let user_info = await swindon.waitConnected()
        assert.equal(swindon.state().status, 'active',
          'establish ws client-server connection')
        assert.equal(user_info.user_id, 7)
      } finally {
        swindon.close()
        srv.close()
      }
    });
  });
});

describe('Swindon Public actions', () => {
    it('should send data, and receive result', async () => {
        let srv = server('/3')
        try {
          srv.on('message', data => {
            assert.deepEqual(JSON.parse(data),
              ["publish", {"request_id": 1, "active": 120}, "something", {}]);
            srv.sendj("result", {"request_id": 1}, "ok")
          })
          var swindon = new Swindon('/3')
          let data = await swindon.call("publish", "something")
          assert.equal(data, "ok")
        } finally {
          swindon.close()
          srv.close()
        }
    });
    it('should call error', async () => {
        let srv = server('/4')
        try {
          srv.on('message', data => {
            assert.deepEqual(JSON.parse(data),
              ["publish", {"request_id": 1, "active": 120}, "something", {}]);
            srv.sendj("error", {"request_id": 1}, "some_error")
          })
          var swindon = new Swindon('/4')
          let error;
          try {
            let data = await swindon.call("publish", "something")
          } catch(e) {
            error = e;
          }
          assert(error instanceof CallError)
          assert.deepEqual(error.data, "some_error")
          assert.deepEqual(error.metadata, {request_id: 1})
        } finally {
          swindon.close()
          srv.close()
        }
    });
    it('guard subscribe', async () => {
        let srv = server('/5')
        try {
          srv.on('message', data => {
            srv.sendj("result", {"request_id": 1}, "subscribed")
            srv.sendj("message", {"topic": "kittens"}, "meaw")
          })
          var swindon = new Swindon('/5')
          let guard
          let wait_msg = new Promise(accept => {
            guard = swindon.guard()
              .init('subscribe', 'kittens')
              .listen('kittens', (input) => {
                accept(input)
              })
          });
          let msg = await wait_msg
          assert.equal(msg, "meaw")
          guard.close()
        } finally {
          swindon.close()
          srv.close()
        }
    });
    it('guard subscribe after connect', async () => {
        let srv = server('/6')
        try {
          srv.on('message', data => process.nextTick(() => {
            srv.sendj("result", {"request_id": 1}, "subscribed")
            srv.sendj("message", {"topic": "kittens"}, "meaw")
          }))
          var swindon = new Swindon('/6')
          await swindon.waitConnected()

          let guard
          let wait_msg = new Promise(accept => {
            guard = swindon.guard()
              .init('subscribe', 'kittens')
              .listen('kittens', (input) => {
                accept(input)
              })
          });
          let msg = await wait_msg
          assert.equal(msg, "meaw")
        } finally {
          swindon.close()
          srv.close()
        }
    });
});

describe('Swindon lattices', () => {

    it('lattice1', async () => {
        let srv = server('/7')
        try {
          srv.on('message', data => process.nextTick(() => {
            srv.sendj("result", {"request_id": 1}, "subscribed")
            process.nextTick(() => {
              srv.sendj("lattice", {"namespace": "kittens"}, {
                "key1": {"a_counter": 100, "b_set": ["a", "b"]},
                "key2": {"x_counter": 200},
              })
              process.nextTick(() => {
                srv.sendj("lattice", {"namespace": "kittens"}, {
                    "key1": {"a_counter": 105, "b_set": ["c", "b"]},
                    "key2": {"x_counter": 50},
                })
              })
            })
          }))
          var swindon = new Swindon('/7')
          await swindon.waitConnected()

          let accept
          let wait_update = new Promise((a, _) => {
            accept = arg => {
                // need to check intermediate state here, because next
                // callback is just waiting for us right now
                assert.deepEqual(lattice.getCounter("1", "a"), 100)
                assert.deepEqual(lattice.getSet("1", "b"), ["a", "b"])
                assert.deepEqual(lattice.getCounter("2", "x"), 200)
                // replace accept with next function
                wait_update = new Promise((a, _) => { accept = a })
                a(arg)
            }
          })

          let lattice = new Lattice({
            onUpdate(keys) {
              accept(keys)
            }
          })

          let guard = swindon.guard()
              .init('subscribe', 'kittens')
              .lattice('kittens', 'key', lattice)

          assert.deepEqual(lattice.getCounter("1", "a"), 0)
          assert.deepEqual(lattice.getSet("1", "b"), [])
          assert.deepEqual(lattice.getCounter("2", "x"), 0)

          let update1 = await wait_update
          assert.deepEqual(update1, ['1', '2'])

          let update2 = await wait_update
          assert.deepEqual(update2, ['1'])

          assert.deepEqual(lattice.getCounter("1", "a"), 105)
          assert.deepEqual(lattice.getSet("1", "b"), ["a", "b", "c"])
          assert.deepEqual(lattice.getCounter("2", "x"), 200)

        } finally {
          swindon.close()
          srv.close()
        }
    })

    it('empty keys', async () => {
        let srv = server('/8')
        try {
          srv.on('message', data => process.nextTick(() => {
            srv.sendj("result", {"request_id": 1}, "subscribed")
            process.nextTick(() => {
              srv.sendj("lattice", {"namespace": "kittens"}, {
                // empty key triggers key update too
                "key1": {}
              })
              process.nextTick(() => {
                srv.sendj("lattice", {"namespace": "kittens"}, {
                    "key1": {},
                    // .. but it trigers update only first time
                    "key2": {},
                })
              })
            })
          }))
          var swindon = new Swindon('/8')
          await swindon.waitConnected()

          let accept
          let wait_update = new Promise((a, _) => {
            accept = arg => {
                wait_update = new Promise((a, _) => { accept = a })
                a(arg)
            }
          })

          let lattice = new Lattice({
            onUpdate(keys) {
              accept(keys)
            }
          })

          let guard = swindon.guard()
              .init('subscribe', 'kittens')
              .lattice('kittens', 'key', lattice)

          let update1 = await wait_update
          assert.deepEqual(update1, ['1'])

          let update2 = await wait_update
          assert.deepEqual(update2, ['2'])

        } finally {
          swindon.close()
          srv.close()
        }
    })

})
