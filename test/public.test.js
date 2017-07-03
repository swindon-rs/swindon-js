require('./mock-websocket');

import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import { Server } from 'mock-socket';
import regeneratorRuntime from 'regenerator-runtime'

import { Swindon } from './../lib/swindon';


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
              ["publish", {"request_id": 1}, "something", {}]);
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
              ["publish", {"request_id": 1}, "something", {}]);
            srv.sendj("error", {"request_id": 1}, "some_error")
          })
          var swindon = new Swindon('/4')
          let error;
          try {
            let data = await swindon.call("publish", "something")
          } catch(e) {
            error = e;
          }
          assert.equal(error, "some_error")
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

