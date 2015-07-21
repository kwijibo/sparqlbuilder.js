let r = require('ramda'),
    compose = r.compose,
    curry = r.curry,
    entry = r.createMapEntry;

//indexToString :: Object -> String
let _indexToString = function (index) {
  return function (accum, key) {
    let val = index[key];
    if (ggp_serialisers[key]) return accum + ggp_serialisers[key](val);
    let ob = typeof val == 'string' ? val : _resourcePattern(val);
    return accum + ' ' + key + ' ' + ob;
  };
};

//resourcePattern :: Object -> String
let _resourcePattern = function (index) {
  return r.reduce(_indexToString(index))('', r.keys(index));
};

// _buildQuery:: query_type -> return_clause_key -> return_spec -> ...Object -> Array
let _buildQuery = r.curryN(4, function (query_type, return_clause_key, return_spec, ...inner) {
  let qt = { 'query_type': query_type };
  if (return_clause_key != null) {
    qt[return_clause_key] = return_spec;
  }
  return [qt, inner];
});

// select :: [col] -> mapEntry -> Object
// select(['?x'], {where: {'?x': {'a': 'ex:Person'}} })
// > [{"query_type": "SELECT", "vars": ["?x"]},{ where: {'?x': {'a': 'ex:Person'}} }]
let select = _buildQuery('SELECT', 'vars');
let describe = _buildQuery('DESCRIBE', 'vars');
let construct = _buildQuery('CONSTRUCT', 'construct');
let ask = r.partial(_buildQuery('ASK'), null, null);

let fromNamed = entry('from_named');
let from = entry('from');
let where = entry('where');
let having = entry('having');
let groubyBy = entry('group_by');
let orderBy = entry('order_by');
let limit = entry('limit');
let offset = entry('offset');

//graph:: name -> content -> {graph: [name,content]}
let graph = curry(function (name, content) {
  return entry('graph', [name, content]);
});

let filter = entry('filter');
// union:: a -> b -> {union:[a,b]}
let union = curry(function (a, b) {
  return entry('union', [a, b]);
});

let optional = entry('optional');

let triple = curry(function (s, p, o) {
  return entry(s, entry(p, o));
});

let query_components = ['from', 'from_named', 'where', 'having', 'group_by', 'order_by', 'limit', 'offset'];

let query_parts = {
  SELECT: ['query_type', 'vars'].concat(query_components),
  DESCRIBE: ['query_type', 'vars'].concat(query_components),
  CONSTRUCT: ['query_type', 'construct'].concat(query_components),
  ASK: ['query_type'].concat(query_components)
};
// query:: ...Object -> String
let query = function (...args) {
  let q = r.mergeAll(r.flatten(args));
  let q_type = q.query_type;
  let seq = query_parts[q_type];
  return r.map(_serialiseQPart(q), seq).join(' ');
};

let _serialiseQPart = curry(function __serialiseQPart(q, part) {
  let transform = serialisers[part];
  let value = q[part];
  if (transform && value !== undefined) {
    return transform(value);
  } else if (!transform) {
    throw Error('no serialiser for ' + part);
  }
});

let _prepend = curry(function (a, b) {
  return a + b;
});
let _append = curry(function (a, b) {
  return b + a;
});

let serialisers = {
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
};

let ggp_serialisers = {
  graph: function (list) {
    return `GRAPH ${ list[0] } { ${ _resourcePattern(list[1]) } }`;
  },
  union: function (list) {
    return `{ ${ _resourcePattern(list[0]) } } UNION { ${ _resourcePattern(list[1]) } }`;
  },
  optional: compose(_prepend('\nOPTIONAL {\n\t'), _append('\n}\n'), _resourcePattern),
  filter: compose(_prepend('FILTER('), _append(')'))
};

let _transferKeys = function (index) {
  return function (accum, key) {
    accum[key] = index[key];
    return accum;
  };
};
let _isPrivateFunc = r.propEq('0', '_');
let _isPublicFunc = r.complement(_isPrivateFunc);
let serialiser = curry(function (serialisers, obj) {
  return reduceObj(function (accum, k, v) {
    if (serialisers[k]) return serialisers[k](v);
  }, '', obj);
});

let reduceObj = curry(function (func, accum, obj) {
  r.forEach(function (i) {
    return accum = func(accum, i, obj[i], obj);
  })(r.keys(obj));
  return accum;
});

module.exports = {
  select: select,
  describe: describe,
  construct: construct,
  ask: ask,
  where: where,
  query: query,
  from: from,
  fromNamed: fromNamed,
  having: having,
  limit: limit,
  offset: offset,
  orderBy: orderBy,
  graph: graph,
  filter: filter,
  optional: optional,
  union: union,
  triple: triple,
  serialiseGGP: serialiser(ggp_serialisers)
};
