A functional DSL for generating SPARQL queries

eg:

```
query(
  select(['?s'], 
    where(triple('?s', '?p', '?o'))
  ),
  limit(100),
  offset(0)
)
//> SELECT ?s WHERE { ?s ?p ?o } LIMIT 100 OFFSET 0
```

Functional composition and currying lets you create more useful specific
functions:

```
let selectByType = compose(query,select(['?item']), where, triple('?item','a'))
selectByType('foaf:Person')
//> SELECT ?item WHERE { ?item a foaf:Person }
```


```
//pageByType:: String -> Number -> Number -> String
let pageByType = curry(rdftype,pageSize,pageNumber) => {
 return query( select(['?item'], where(triple('?item', 'a', rdftype)), limit(pageSize*pageNumber), offset((pageNumber-1)*pageSize) ) 
})

let personPage = pageByType('foaf:person',50)

personPage(2)
//> SELECT ?item WHERE { ?item a foaf:Person } LIMIT 50 OFFSET 50

```
