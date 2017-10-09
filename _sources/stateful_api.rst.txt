.. default-domain: js

.. _stateful_api:

============
Stateful API
============

Unlike in :ref:`low-level API <basic_api>` stateful API has the following goals:

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

API Description
===============

.. class:: _Guard

   A class returned by ``swindon.guard()``. It follows "fluent" pattern on
   every method (except :meth:`close`), which means every method returns
   ``this``, and method calls are chainable.

   .. method:: init(method_name, args=[], kwargs={}, callback=null)

        Call the server method ``method_name`` as part of guard initialization.
        Basically this means call the method when ``init()`` called and every
        time connection is establishes, until guard is closed.

        Except being called on each reconnect and that it returns guard,
        it resembles semantics of :meth:`Swindon.call`.

        ``callback`` is a function called with result of method call. It may
        be called multiple times.

   .. method:: deinit(method_name, args=[], kwargs={}, callback=null)

        Call the server method ``method_name`` on ``guard.close()``. This
        should be used to unsubscribe to all resources that were subscribed
        in ``init``.

        While technically you can call ``swindon.call()`` at the same time
        as ``guard.close()``, the ``deinit`` method is a convenience helper
        to keep ``init`` and ``deinit`` in the same place.

        ``callback`` is a function called with result of method call.

   .. method:: listen(topic, callback)

        A (client-side) subscription to the topic.

        ``callback(data, metadata)`` is a function called when data arrives
        for specified topic. Data is completely opaque from swindon and is what
        swindon receives. The only guaranteed field in ``metadata`` is
        ``topic`` which represents topic this callback subscribed to. Refer to
        swindon docs for more info on ``metadata``.

        .. note:: Library doesn't ensure that this connection is subscribed
           to the specified topic in swindon itself. It's your responsibility
           to make sure that backend call executed in ``init`` subscribes
           current connection to specified ``topic`` using the `API
           <pub-sub-api_>`_, and that it unsubscribes in ``deinit``. Guard
           frees resources occupied by client-side subscription in ``close``.


   .. method:: lattice(namespace, prefix, lattice_object)

        Registers lattice object within this guard. All callback and state
        management is implemented in :class:`Lattice` itself.

        The respective class lattice tracks all the keys prefixed by ``prefix``
        with the prefix itself removed. This allows easy composition of
        lattices from different applications without applications themselves
        managing the prefix.

        .. note:: Library doesn't ensure that this connection is subscribed
           to the specified topic in swindon itself. It's your responsibility
           to make sure that backend call executed in ``init`` subscribes
           current connection to specified ``lattice`` with neede keys
           using the `API <lattice-API_>`_, and that it unsubscribes in ``deinit``.
           Guard frees resources occupied by client-side subscription
           in ``close``.

.. _pub-sub-api: https://swindon-rs.github.io/swindon/swindon-lattice/backend.html#pub-sub-subscriptions
.. _lattice-api: https://swindon-rs.github.io/swindon/swindon-lattice/backend.html#lattice-subscriptions
.. _frontend-docs: https://swindon-rs.github.io/swindon/swindon-lattice/frontend.html


