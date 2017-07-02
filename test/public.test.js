require('./mock-websocket');

import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import { Server } from 'mock-socket';
import regeneratorRuntime from 'regenerator-runtime'

import Swindon from './../lib/swindon';

// Serve info
const textAlign = '    ';

// Client Info, common
const serverInfo = [1, 2, 3, 4, 5];
const error = { code: 500 };

// Socket Server
const wsUrl = '/public';

function server() {
  const mockServer = new Server(wsUrl);

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
      let swindon = new Swindon(wsUrl)
      assert(swindon instanceof Swindon, 'must be instance of class');
    });

    it('should connect to Web Socket server', async () => {
      let srv = server()
      let swindon = new Swindon(wsUrl)
      assert.equal(swindon.state().status, 'connecting')
      let user_info = await swindon.wait_connected()
      assert.equal(swindon.state().status, 'active',
        'establish ws client-server connection')
      assert.equal(user_info.user_id, 7)
      srv.close()
    });
  });
});

describe('Swindon Public actions', () => {
    it('should send data, and receive result', async () => {
        let srv = server()
        try {
          srv.on('message', data => {
            assert.deepEqual(JSON.parse(data),
              ["publish", {"request_id": 1}, "something", {}]);
            srv.sendj("result", {"request_id": 1}, "ok")
          })
          let swindon = new Swindon(wsUrl)
          let data = await swindon.call("publish", "something")
          assert.equal(data, "ok")
        } finally {
          srv.close()
        }
    });
    it('should call error', async () => {
        let srv = server()
        try {
          srv.on('message', data => {
            assert.deepEqual(JSON.parse(data),
              ["publish", {"request_id": 1}, "something", {}]);
            srv.sendj("error", {"request_id": 1}, "some_error")
          })
          let swindon = new Swindon(wsUrl)
          let error;
          try {
            let data = await swindon.call("publish", "something")
          } catch(e) {
            error = e;
          }
          assert.equal(error, "some_error")
        } finally {
          srv.close()
        }
    });
    it('guard subscribe', async () => {
        let srv = server()
        try {
          srv.on('message', data => {
            srv.sendj("result", {"request_id": 1}, "subscribed")
            srv.sendj("message", {"topic": "kittens"}, "meaw")
          })
          let swindon = new Swindon(wsUrl)
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
          srv.close()
        }
    });
});

