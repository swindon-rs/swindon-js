# SwindonJS

**Status: Beta** (not all features are implemented yet)

Makes it easier to chain ur async actions with ws and structured data in send method, controls connect state.

## Installation

```
    npm install --save -E swindon@0.3.2
```

## Basic Usage

Initializing Swindon:

```js
    import Swindon from 'swindon';

    const swindon = new Swindon('/ws');
```

This creates a auto-reconnecting instance of the library. It's adviced that
this object a singleton as swindon allows multiple applications to be joined
together using single websocket.

Now we can make method calls:

```js
    const result = await swindon.call("my_method", ['arg1'], {'kwarg1': 1})
```

Technically you can wait for connection to be established:

```js
    await swindon.waitConnected()
```

But that is rarely useful, because we usually queue `call`'s internally.

## Getting User Profile

Swindon sends minimal user info (at least `user_id`) right after connection
is established (technically in `hello` message). You can fetch it like this:

```js
    const user_info = await swindon.waitConnected()
```

## Subscriptions

Because swindon allows only subcriptions and unsubscriptions from the backend
we combine "subscription" API with the method call:

```js
    const guard = swindon.guard()
        .init('notifications.subscribe', [mytopic])
        .listen('notifications.'+mytopic, message => {
            // react-like code
            this.setState(message.n_notifications)
        })
        .deinit('notifications.unsubscribe', [mytopic])
```

Then when component doesn't need the data any more just call "close":

```js
    guard.close()
```

Note: `notifications.subscribe(mytopic)` will be called on every reconnect of
the websocket, until `close` is called.

