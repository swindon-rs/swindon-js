require('./mock-websocket');

import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import { Server } from 'mock-socket';

import Swindon from './../src/swindon';

// Serve info
const debugMode = false;
const textAlign = '    ';

// Client Info, common
const msgMethod = 'send_message';
const serverInfo = [1, 2, 3, 4, 5];
const message = { body: 'Hi there' };
const error = { code: 500 };

// Socket Server
const wsUrl = 'ws://localhost:8080';
const serverStorage = { request_id: 0, activity: 120 };
const mockServer = new Server(wsUrl);

mockServer.on('connection', (server) => {
    debugMode && console.log(`${textAlign}Connection success`, server.url);
    mockServer.send(JSON.stringify([ 'hello', serverStorage, message ]))
});

mockServer.on('message', (data) => {
    try {
        serverStorage.data = JSON.parse(data);
    } catch (e) {
        console.log(`${textAlign}[WS Server] Can't parse data form Swindon: ${e}`);
    }

    serverStorage.method = serverStorage.data[0];
    serverStorage.requestMeta = serverStorage.data[1];
    serverStorage.requestInfo = serverStorage.data[2];
    serverStorage.message = serverStorage.data[3];

    mockServer.send(JSON.stringify([ 'result', serverStorage.requestMeta, serverStorage.message ]));
});

// Swindon pub methods callbacks dict
const callBacks = {
    result: sinon.spy(),
    error: sinon.spy(),
    hello: sinon.spy(),
    message: sinon.spy(),
    lattice: sinon.spy(),
};

describe('Swindon connection action', () => {
  describe('Init WebSocket', () => {
    it('should create object correctly', (done) => {
        global.oSwindon = new Swindon(wsUrl, {
            result: callBacks.result,
            error: callBacks.error,
            hello: callBacks.hello,
            message: callBacks.message,
            lattice: callBacks.lattice,
        }, { debug: debugMode });

        assert(oSwindon instanceof Swindon, 'must be instance of class');
        done();
    });

    it('should connect to Web Socket server', (finalize) => {
        oSwindon.connect()
            .then(() => {
                assert(oSwindon.isConnected(), 'establish ws client-server connection');
                assert(callBacks.hello.calledWith(serverStorage, message),
                    'should call hello, till this time');
                swindonPublicActionsList();
                finalize();
            }).catch((e) => (console.log(`Error: ${e}`)));
    });
  });
});

function swindonPublicActionsList() {
    describe('Swindon Public actions', () => {
        it('should send data, and receive result', (done) => {
            oSwindon.send(msgMethod, serverInfo, message)
            .then((data) => {
                console.log('ALARM!!!!!!!!!!!',data);
                assert(serverStorage.method === msgMethod && (
                    _.isEqual(serverStorage.requestInfo, serverInfo)) && (
                        _.isEqual(serverStorage.message, message)
                    ),
                    'server data in storage equals sent by ws');
                assert(callBacks.result.calledWith(serverStorage.requestMeta, message),
                    'should call result, till this time');
                done();
            }).catch((e) => (console.log(`Error: ${e}`)));
        });
        it('should call error', (done) => {
            serverStorage.requestMeta.request_id++;
            mockServer.send(JSON.stringify([ 'error', serverStorage.requestMeta, error ]));
            assert(callBacks.error.calledWith(serverStorage.requestMeta, error),
                    'should call error, till this time');
            done();
        });
        it('should call message', (done) => {
            serverStorage.requestMeta.request_id++;
            mockServer.send(JSON.stringify([ 'message', serverStorage.requestMeta, message ]));
            assert(callBacks.message.calledWith(serverStorage.requestMeta, message),
                    'should call message, till this time');
            done();
        });
        it('should call lattice', (done) => {
            serverStorage.requestMeta.request_id++;
            mockServer.send(JSON.stringify([ 'lattice', serverStorage.requestMeta, message ]));
            assert(callBacks.lattice.calledWith(serverStorage.requestMeta, message),
                    'should lattice error, till this time');
            done();
        });
    });
}
