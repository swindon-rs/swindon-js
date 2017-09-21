Swindon.js Changes By Version
=============================


v0.5.0
------

* Implemented `register` CRDT (requires swindon 0.7.0)
* Added `defaultActiveTime` and a default of two minutes
* Errors in server calls thrown as ``CallError`` rather than bare data
  sent from server (so also metadata is available)
* Added connection error information as part of status, so javascript can
  redirect user to the authorization form if user was unauthorized
  (in chrome this requires swindon 0.7.0)
* Added processing of `fatal_error` (swindon 0.7.0)
