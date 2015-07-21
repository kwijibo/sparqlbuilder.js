const s = require('../lib/sparql.js')
, r = require('ramda')

const describeUrisByPaths = (uris,paths)=> {
  
}

const pathToPattern = (path)=>{
  compose(map(triple()),split('/'))
}
