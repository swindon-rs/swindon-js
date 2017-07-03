============
Stateful API
============

Unlike in low-level API stateful API has the following goals:

1. Seamlessly reconnect websocket (except "reconnecting..." label)
2. Keep data updated on reconnect:

   a. Current values might be updated on server, receive them
   b. Things subscribed on client should be subscribed again

3. Unsubscribe at any time

Look-a-like
===========

Here is the example request to subscribe for simple pub-sub channel:

.. code-block:: javascript

  componentDidMount() {
    this.guard = swindon.guard()
        .init('notifications.subscribe', [mytopic])
        .listen('notifications.'+mytopic, message => {
           this.setState(message.n_notifications)
        })
        .deinit('notifications.unsubscribe', [mytopic])

    this.guard.on_init(response => {
      this.setState({'nmessages': response.n_notifications}))
    })
  }
  componentWillUnmount() {
    this.guard.close()
  }

The ``notifications.subscribe`` will be called again on every reconnect, and
``notifications.xxx`` subscription is local, and will be put before the request
is sent (this leaves no opportunity to miss messages).
