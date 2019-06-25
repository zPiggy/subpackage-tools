
each = require '../src'

describe 'promise', ->
  
  it 'return a promise', (next) ->
    each( [ 1, 2, 3 ] )
    .call (element, index, callback) ->
      if index < 2
      then setImmediate callback
      else next()
    .promise()
    .toString().should.eql '[object Promise]'
      
  it 'accept catch error before promise', ->
    err = null
    each( [ 1, 2, 3 ] )
    .call (element, index, callback) ->
      throw Error 'CatchMe'
    .error (e) ->
      err = e
    .promise()
    .then ->
      err.message.should.eql 'CatchMe'
    , ->
      throw Error 'Bad'
        
  it 'accept then before promise', ->
    called = false
    each( [ 1, 2, 3 ] )
    .call (element, index, callback) ->
      callback()
    .next ->
      called = true
    .promise()
    .then ->
      called.should.be.true()
    , ->
      throw Error 'Bad'
        
  it 'pass err to then before promise', ->
    err = null
    each( [ 1, 2, 3 ] )
    .call (element, index, callback) ->
      throw Error 'CatchMe'
    .next (e) ->
      err = e
    .promise()
    .then ->
      err.message.should.eql 'CatchMe'
    , ->
      throw Error 'Bad'
      
