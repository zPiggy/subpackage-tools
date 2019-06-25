
each = require '../src'

describe 'next', ->
  
  it 'rethrow if error', (next) ->
    lsts = process.listeners 'uncaughtException'
    process.removeAllListeners 'uncaughtException'
    process.on 'uncaughtException', (err) ->
      err.message.should.eql 'User Error'
      process.removeAllListeners 'uncaughtException'
      for lst in lsts
        process.on 'uncaughtException', lst
      next()
    eacher = each()
    .times(10)
    .call (element, index, next) ->
      next()
    .next (err) ->
      throw Error 'User Error'
  
  describe 'async', ->
    
    it 'run arguments only contains next', (next) ->
      each( [ 'a', 'b', 'c' ] )
      .call (next) ->
        arguments.length.should.eql 1
        next()
      .next next
      
    it 'run arguments contains element and next', (next) ->
      elements = []
      each( [ 'a', 'b', 'c' ] )
      .call (element, next) ->
        elements.push element
        next()
      .error next
      .next ->
        elements.should.eql [ 'a', 'b', 'c' ]
        next()
    
  describe 'sync', ->
    
    it 'run arguments is empty', (next) ->
      each( [ 'a', 'b', 'c' ] )
      .sync()
      .call ->
        arguments.length.should.eql 0
      .next next
      
    it 'run arguments contains element', (next) ->
      elements = []
      each( [ 'a', 'b', 'c' ] )
      .sync()
      .call (element) ->
        elements.push element
      .error next
      .next ->
        elements.should.eql [ 'a', 'b', 'c' ]
        next()

  
  
