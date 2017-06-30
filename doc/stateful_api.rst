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
    this.guard = swindon
        .open('notifications.subscribe', mytopic)
        .subscribe('notifications.'+mytopic, message => {
           this.setState(message.n_notifications)
        })
        .close('notifications.unsubscribe', mytopic)

    this.guard.on_open(response => {
      this.setState({'nmessages': response.n_ntifications}))
    })
  }
  componentWillUnmount() {
    this.guard.unsubscribe()
  }

The ``notifications.subscribe`` will be called again on every reconnect, and
``notifications.xxx`` subscription is local, and will be put before the request
is sent (this leaves no opportunity to miss messages).
