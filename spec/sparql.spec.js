var despace = function(input){
  return input.replace(/\n|\t/mg,'').replace(/\s+/mg,' ').trim()
}

var s = require('../lib/sparql.js')
  , r = require('ramda')
  , query = s.query
  , select = s.select
  , Describe = s.describe
  , construct = s.construct
  , where = s.where
  , triple = s.triple
  , graph = s.graph
  , filter = s.filter
  , optional = s.optional
  , union = s.union
  , serialise = r.compose(despace, s.serialiseGGP)
  


describe("query", function(){
  it("should serialise the query", function(){
    var rq = query(select(['?s'], where(triple('?s','?p','?o'))))
    expect(despace(rq)).toEqual("SELECT ?s WHERE { ?s ?p ?o }")
  })
})
describe("GGP funcs", function(){
  it("filter", function(){
    expect(serialise(filter('?x > ?y'))).toEqual('FILTER(?x > ?y)')
  })
  it("graph", function(){
    expect(serialise(graph('?g', triple('?s', '?p', '?o')))).toEqual('GRAPH ?g { ?s ?p ?o }')
  })
})

