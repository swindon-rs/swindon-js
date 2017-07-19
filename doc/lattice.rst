.. default-domain: js

=======
Lattice
=======

This documents :class:`Lattice`, for more comprehensive documentation on
lattices refer to `swindon documentation`_.

API
===

.. _swindon documentation: https://swindon-rs.github.io/swindon/swindon-lattice/

.. class:: Lattice({onUpdate})

   Create a new lattice. A :class:`Lattice` instance can be used before
   connection is established so it isn't created attached to a connection.

   To attach the lattice to a connection :meth:`Guard.lattice` (see
   :ref:`stateful api <stateful_api>`):

   .. code-block:: javascript

       let lat = new Lattice()
       // ...
       swindon.guard()
        .init(...)
        .lattice('example-org', 'chat-rooms:', lat)

   Because we explicitly support optimistic updates, you can use lattice
   object before connection is updated or even :class:`Swindon` object is
   created.

   ``onUpdate(updated_keys, lattice)``
       The function called when update is received. The ``updated_keys`` is
       a array of key names updated. And the ``lattice`` is this object.

       The pseudo code handling updates is like this:

       .. code-block:: javascript

          for(let key of updated_keys) {
            let read_messages = lattice.getCounter(key, 'read_messages')
            let total_messages = lattice.getCounter(key, 'total_messages')
            setUnreadNumber(key, total_messages - read_messages)
          }

.. method:: getCounter(key, variable)

   Returns value of counter CRDT (variable name has ``_counter`` suffix
   stripped).

.. method:: updateCounter(key, variable)

   Update internal state of a counter CRDT (variable name has ``_counter``
   suffix stripped).

   See `update notes`_.

.. method:: getSet(key, variable)

   Returns value of set CRDT (variable has ``_set`` suffix stripped).

.. method:: updateSet(key, variable)

   Update internal state of a set CRDT (variable name has ``_set``
   suffix stripped).

   See `update notes`_.

.. method:: allKeys()

   Iterator over all keys of the lattice (with registered prefix stripped).


Update Notes
============

All ``update*`` methods do domain specific update procedure. I.e. if you
pass smaller value to ``updateCounter`` it will be ignored.

Also this API doesn't ensure that corresponding value is updated at the server
side. It's application responsibility to call needed application-specific
server-side method that updates value in the database.

.. warning:: Currently there is no way to undo optimistic transaction, we
   will add some API to support this use case in future.
