const r = require('ramda')
  , compose = r.compose
  , curry = r.curry
  , entry = r.createMapEntry

//indexToString :: Object -> String
const _indexToString = (index) => (accum,key)=>{
    let val = index[key]
    if(ggp_serialisers[key]) return accum + ggp_serialisers[key](val)
    let ob = typeof val=='string'? val : _resourcePattern(val)
    return accum + ' ' + key + ' ' + ob
}

//resourcePattern :: Object -> String
const _resourcePattern = (index) => r.reduce(_indexToString(index))('', r.keys(index))

// _buildQuery:: query_type -> return_clause_key -> return_spec -> ...Object -> Array
const  _buildQuery = r.curryN(4, 
  (query_type, return_clause_key, return_spec, ...inner ) => {
    const qt = { "query_type": query_type }
    if(return_clause_key!=null){
      qt[return_clause_key] =return_spec
    }
    return [qt, inner]
  })

// select :: [col] -> mapEntry -> Object
// select(['?x'], {where: {'?x': {'a': 'ex:Person'}} })
// > [{"query_type": "SELECT", "vars": ["?x"]},{ where: {'?x': {'a': 'ex:Person'}} }]
const select    = _buildQuery('SELECT','vars')
const describe  = _buildQuery('DESCRIBE', 'vars')
const construct = _buildQuery('CONSTRUCT', 'construct')
const ask       = r.partial(_buildQuery('ASK'), null,null)

const fromNamed = entry('from_named')
const from = entry('from')
const where = entry('where')
const having = entry('having')
const groubyBy = entry('group_by')
const orderBy = entry('order_by')
const limit = entry('limit')
const offset = entry('offset')

//graph:: name -> content -> {graph: [name,content]}
const graph = curry((name,content)=> entry('graph', [name,content]))

const filter = entry('filter')
// union:: a -> b -> {union:[a,b]}
const union = curry((a,b)=> entry('union',[a,b]))

const optional = entry('optional')

const triple = curry((s,p,o)=>entry(s,entry(p,o)))

const query_components = ['from', 'from_named', 'where','having', 'group_by', 'order_by', 'limit', 'offset']

const query_parts = {
  SELECT:     ['query_type', 'vars', ...query_components],
  DESCRIBE:   ['query_type', 'vars', ...query_components],
  CONSTRUCT:  ['query_type', 'construct', ...query_components],
  ASK:        ['query_type', ...query_components]
}
// query:: ...Object -> String 
const query = (...args)=>{
  const q = r.mergeAll(r.flatten(args))
  const q_type = q.query_type
  const seq = query_parts[q_type]
  return r.map(_serialiseQPart(q), seq).join(" ")
}

const _serialiseQPart = curry(function __serialiseQPart(q,part){
  let transform = serialisers[part]
  let value = q[part]
  if(transform && value!==undefined){
    return transform(value)
  } else if(!transform) {
    throw Error("no serialiser for "+part)
  } 
})

const _prepend = curry((a,b)=>a+b)
const _append = curry((a,b)=>b+a)

const serialisers = {
  query_type: _append(' '),
  vars: r.join(' '),
  from_named: compose(_prepend('FROM NAMED '), _append('\n')),
  from: compose(_prepend('FROM '), _append('\n')),
  where: compose(_prepend('\nWHERE {\n\t'), _append(' \n}\n'), _resourcePattern),
  order_by: _prepend('\nORDER BY '),
  group_by: _prepend('GROUP BY '),
  having: _prepend('HAVING '),
  limit: _prepend('LIMIT '),
  offset: _prepend('OFFSET ')
}

const ggp_serialisers = {
  graph: (list)=> `GRAPH ${list[0]} { ${_resourcePattern(list[1])} }`,
  union: (list)=> `{ ${_resourcePattern(list[0])} } UNION { ${_resourcePattern(list[1])} }`,
  optional: compose(_prepend('\nOPTIONAL {\n\t'), _append('\n}\n'), _resourcePattern),
  filter: compose(_prepend('FILTER('),_append(')'))
}

const _transferKeys = (index)=> (accum,key) => {
                          accum[key] = index[key]
                          return accum
}
let _isPrivateFunc = r.propEq('0','_')
let _isPublicFunc = r.complement(_isPrivateFunc)
let serialiser = curry((serialisers,obj)=>{ 
  return reduceObj((accum,k,v)=>{
    if(serialisers[k]) return serialisers[k](v)
  }, '',obj)
})

let reduceObj= curry(function(func,accum,obj){
 r.forEach((i)=> accum = func(accum,i,obj[i],obj))(r.keys(obj))
 return accum
})

module.exports = {
  select:select,
  describe:describe,
  construct:construct,
  ask:ask,
  where:where,
  query:query,
  from:from,
  fromNamed:fromNamed,
  having:having,
  limit:limit,
  offset:offset,
  orderBy:orderBy,
  graph:graph,
  filter:filter,
  optional:optional,
  union:union,
  triple:triple,
  serialiseGGP:serialiser(ggp_serialisers)
}
