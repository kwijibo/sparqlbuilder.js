'use strict';

var r = require('ramda'),
    compose = r.compose,
    curry = r.curry,
    entry = r.createMapEntry;

//indexToString :: Object -> String
var _indexToString = function _indexToString(index) {
  return function (accum, key) {
    var val = index[key];
    if (ggp_serialisers[key]) return accum + ggp_serialisers[key](val);
    var ob = typeof val == 'string' ? val : _resourcePattern(val);
    return accum + ' ' + key + ' ' + ob;
  };
};

//resourcePattern :: Object -> String
var _resourcePattern = function _resourcePattern(index) {
  return r.reduce(_indexToString(index))('', r.keys(index));
};

// _buildQuery:: query_type -> return_clause_key -> return_spec -> ...Object -> Array
var _buildQuery = r.curryN(4, function (query_type, return_clause_key, return_spec) {
  for (var _len = arguments.length, inner = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
    inner[_key - 3] = arguments[_key];
  }

  var qt = { "query_type": query_type };
  if (return_clause_key != null) {
    qt[return_clause_key] = return_spec;
  }
  return [qt, inner];
});

// select :: [col] -> mapEntry -> Object
// select(['?x'], {where: {'?x': {'a': 'ex:Person'}} })
// > [{"query_type": "SELECT", "vars": ["?x"]},{ where: {'?x': {'a': 'ex:Person'}} }]
var select = _buildQuery('SELECT', 'vars');
var describe = _buildQuery('DESCRIBE', 'vars');
var construct = _buildQuery('CONSTRUCT', 'construct');
var ask = r.partial(_buildQuery('ASK'), null, null);

var fromNamed = entry('from_named');
var from = entry('from');
var where = entry('where');
var having = entry('having');
var groubyBy = entry('group_by');
var orderBy = entry('order_by');
var limit = entry('limit');
var offset = entry('offset');

//graph:: name -> content -> {graph: [name,content]}
var graph = curry(function (name, content) {
  return entry('graph', [name, content]);
});

var filter = entry('filter');
// union:: a -> b -> {union:[a,b]}
var union = curry(function (a, b) {
  return entry('union', [a, b]);
});

var optional = entry('optional');

var triple = curry(function (s, p, o) {
  return entry(s, entry(p, o));
});

var query_components = ['from', 'from_named', 'where', 'having', 'group_by', 'order_by', 'limit', 'offset'];

var query_parts = {
  SELECT: ['query_type', 'vars'].concat(query_components),
  DESCRIBE: ['query_type', 'vars'].concat(query_components),
  CONSTRUCT: ['query_type', 'construct'].concat(query_components),
  ASK: ['query_type'].concat(query_components)
};
// query:: ...Object -> String
var query = function query() {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  var q = r.mergeAll(r.flatten(args));
  var q_type = q.query_type;
  var seq = query_parts[q_type];
  return r.map(_serialiseQPart(q), seq).join(" ");
};

var _serialiseQPart = curry(function __serialiseQPart(q, part) {
  var transform = serialisers[part];
  var value = q[part];
  if (transform && value !== undefined) {
    return transform(value);
  } else if (!transform) {
    throw Error("no serialiser for " + part);
  }
});

var _prepend = curry(function (a, b) {
  return a + b;
});
var _append = curry(function (a, b) {
  return b + a;
});

var serialisers = {
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

var ggp_serialisers = {
  graph: function graph(list) {
    return 'GRAPH ' + list[0] + ' { ' + _resourcePattern(list[1]) + ' }';
  },
  union: function union(list) {
    return '{ ' + _resourcePattern(list[0]) + ' } UNION { ' + _resourcePattern(list[1]) + ' }';
  },
  optional: compose(_prepend('\nOPTIONAL {\n\t'), _append('\n}\n'), _resourcePattern),
  filter: compose(_prepend('FILTER('), _append(')'))
};

var _transferKeys = function _transferKeys(index) {
  return function (accum, key) {
    accum[key] = index[key];
    return accum;
  };
};
var _isPrivateFunc = r.propEq('0', '_');
var _isPublicFunc = r.complement(_isPrivateFunc);
var serialiser = curry(function (serialisers, obj) {
  return reduceObj(function (accum, k, v) {
    if (serialisers[k]) return serialisers[k](v);
  }, '', obj);
});

var reduceObj = curry(function (func, accum, obj) {
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

