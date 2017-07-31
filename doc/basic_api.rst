.. default-domain: js

.. _basic_api:

=========
Basic API
=========


.. js:class:: Swindon(url, {onStateChange})

   Create an instance of swindon.

   ``url``
       the websocket url to connect to. The library will try to
       connect immediately and reconnect every time. You can use
       ``onStateChange`` and ``status()`` and ``waitConnected()`` to track
       when connection is established.

   ``onStateChange``
       callback which is called when connection state is
       changed. Callback is passed the result of a method ``state()``.

       Example of callback that displays status for user:

       .. code-block:: js

            function update_status(state) {
                console.log("Websocket status changed", state)
                switch(state.status) {
                    case "wait":
                        let left = Math.round((state.reconnect_time
                                               - Date.now())/1000);
                        if(left < 1) {
                            set_status("Reconnecting...")
                        } else {
                            set_status("Reconnecting in " + left + " seconds")
                        }
                        break;
                    case "active":
                        set_status("Connected"); // Probably should be hidden
                        break;
                    case "connecting":
                        set_status("Connecting...")
                        break;
                    case "unsupported":
                        set_status("WebSockets are unsupported by browser")
                        break;
                    default:
                        // it's "closed" or maybe some future value
                        set_status("No connection.");
                        break;
                }
            }

       Note: technically the example above requires calling ``set_status``
       every second to update UI. We don't call ``onStateChange`` periodially,
       this is a responsibility of the application. Use ``state()`` to fetch
       up to date state on such periodic callback.

   It's expected that this object is a singleton on any web page. You may
   put it into some global application object or module and give access
   to other modules.

   .. method:: reconnectNow()

      Forcefully reconnect now. It works both, when timer is set and when
      connection is active. Usually, you may want to check `state()` to
      avoid race conditions between UI and connection state:

      .. code-block:: js

          if(swindon.state().status != 'wait') {
              swindon.reconnectNow()
          }

   .. method:: waitConnected()

      Returns promise which waits for connection to be established and
      ``hello`` handshake received. Then returns data from the ``hello``
      message. When connection is broken the promise is reset again (i.e.
      new promise will be returned in subsequent call to ``waitConnected``)

   .. method:: call(dotted_name, positional_args=[], keyword_args={})

      Call the server-side method. Method call may contain either positional
      or keyword (named) arguments or both of them. Depending on the language
      of backend these kinds of arguments cold be interchanged or not. It's
      recommended to use either ``positional_args`` or ``keyword_args`` for
      any specific method but not both.

      The call returns a ``Promise`` which resolves either to result of a
      call on server side or the error. Currently we only propagate
      server-side errors, but in future version we will have client-side
      timeouts and an error when connection is broken

      When connection is not active, the calls are queued by relying on
      ``waitConnected`` future.

   .. method:: guard()

      Returns new guard. Guard object is used for subscriptions and for
      calling methods on each reconnect.

      See `Stateful API <stateful_api>`_ for more info.


   .. method:: state()

      Returns current state of the connection. State contains at least these
      fields:

      ``status``
        One of the options:

        * ``connecting`` websocket connection started, but either is not
          established yet, or ``hello`` handshake messages is not received yet
        * ``active`` connection is active and operating, requests only work
          in this state
        * ``wait`` connection is broken and will reconnect later
        * ``closed`` the :meth:`close` called on connection
        * ``unsupported`` websocket is not supported by the browser,
          creating lattices, guards, and calling methods should work but,
          will never return successful result

      ``reconnect_time``

        Only non-null in ``wait`` state. It represent the time when we
        will try to reconnect again (a ``Date`` object).

      More fields may be present for debugging purposes, we don't document
      them yet. You can use introspection to find out fields, but you shouldn't
      rely on them on any purposes other than debugging

   .. method:: close()

      Close the connection.
