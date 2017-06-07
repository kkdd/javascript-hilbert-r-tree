# Hilbert Packed R-Tree written in JavaScript

This is an implementation of a Hilbert Packed [R-Tree](https://en.wikipedia.org/wiki/R-tree). R-Trees are a special data structure for indexing spatial data. To improve the performance of query operations on the data structure, the R-Tree has been packed using the  space filling [Hilbert Curve](https://en.wikipedia.org/wiki/Hilbert_curve).

## Tutorial

##### Create an initially empty R-Tree

``` javascript
var maxNodes = 4;   // Maximum number of nodes within a bounding rectangle
var tree     = new RTree( maxNodes );
```

##### Create some structured data

``` javascript
var structuredData = [
  // {x left-side coordinate, y lower-side coordinate, width, height, data (or the data to store at this location)}
  {x: 0,  y: 0,  width: 10, height: 10, data: "This can be anything"},
  {x: 10, y: 20, width: 15, height: 20, data: 123456                },
  {x: 20, y: 20, width: 20, height: 25, data: {even: "this"}        },
]
```

##### Update the tree

At this point we can either choose to insert the data in batch mode or insert the data rows iteratively. The batch insert will produce the most efficient trees in the general case.

The batch procedure:

``` javascript
// Batch insert the data
tree.batchInsert( structuredData );
```

The iterative alternative:

``` javascript
// Insert the nodes one at the time
for (var i = structuredData.length - 1; i >= 0; i--) {
  tree.insert( structuredData[i] );
}
```

##### Search

The spatial R-Tree index is queried by using a bounding rectangle. The search will return data entries that overlap with query rectangle. 

``` javascript
// Search the R-Trees by using a bounding rectangle
var boundingRectangle = { x: 0,  y: 0, width: 5, height: 5 };
var results           = tree.search( boundingRectangle ); // results will contain the first element of structuredData
console.log( results ); // prints: [ "This can be anything" ]
```

###### For cylindrical geographic coordinates

``` javascript
var options = {xPeriod: 360, searchOverlapped: false, searchIndex: true};
var resultIndexes = tree.search(boudingRect, options); // returns the indexes of data array
```

![search result](https://github.com/kkdd/javascript-hilbert-r-tree/blob/master/rectangles.jpg?raw=true)
