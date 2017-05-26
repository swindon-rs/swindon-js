# SwindonJS
Promise based client web socket wrapper.

Makes it easier to chain ur async actions with ws and structured data in send method, controls connect state.

# Installation

`npm install --save -E @evo/swindon`

# Usage

Initializing Swindon

```js
    import Swindon from 'swindon';
    
    const connectionUrl = 'ws://holocost:8080';
    const callBack = (requestMeta, data) => { /* ur code */ };
    
    const oSwindon = new Swindon(connectionUrl,{
        result: callBack,
        error: callBack,
        hello: callBack,
        message: callBack,
        lattice: callBack,
    }, { debug: true, serverTimout: 1000 });
```

Next we can make some actions right after connection is done

```js
    oSwindon.connect()
        .then((data) => {
            makeStuff(data);
            // etc...
        })
        .catch((e) => { throw Error(e) });;
```

Sending data, and make something after

```js
    oSwindon.send('method', [1,2,3], { msg: 'hi there'} )
        .then(({ requestMeta, data }) => {
            makeStuff(requestMeta, data);
            // etc...
        })
        .catch((e) => { throw Error(e) });
```