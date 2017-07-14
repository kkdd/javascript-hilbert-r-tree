var RTreeRectangle = (function () {
    function RTreeRectangle(x, y, width, height, data, leafIndex) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.data = data;
        this.leafIndex = leafIndex;
        this.children = [];
    }
    RTreeRectangle.generateEmptyNode = function () {
        return new RTreeRectangle(Infinity, Infinity, 0, 0, null, null);
    };
    RTreeRectangle.prototype.overlaps = function (anotherRect) {
        return this.x < anotherRect.x + anotherRect.width && this.x + this.width > anotherRect.x && this.y + this.height > anotherRect.y && anotherRect.y + anotherRect.height > this.y;
    };
    RTreeRectangle.prototype.contains = function (anotherRect) {
        return this.x <= anotherRect.x && this.x + this.width >= anotherRect.x + anotherRect.width && this.y <= anotherRect.y && this.y + this.height >= anotherRect.y + anotherRect.height;
    };
    RTreeRectangle.prototype.growRectangleToFit = function (anotherRect) {
        if (this.x === Infinity) {
            this.height = anotherRect.height;
            this.width = anotherRect.width;
            this.x = anotherRect.x;
            this.y = anotherRect.y;
        }
        else {
            this.height = Math.max(this.y + this.height, anotherRect.y + anotherRect.height) - Math.min(this.y, anotherRect.y);
            this.width = Math.max(this.x + this.width, anotherRect.x + anotherRect.width) - Math.min(this.x, anotherRect.x);
            this.x = Math.min(this.x, anotherRect.x);
            this.y = Math.min(this.y, anotherRect.y);
        }
    };
    RTreeRectangle.prototype.areaIfGrownBy = function (anotherRect) {
        if (this.x === Infinity) {
            return anotherRect.height * anotherRect.width;
        }
        else {
            return (Math.max(this.y + this.height, anotherRect.y + anotherRect.height) - Math.min(this.y, anotherRect.y)) * (Math.max(this.x + this.width, anotherRect.x + anotherRect.width) - Math.min(this.x, anotherRect.x)) - this.getArea();
        }
    };
    RTreeRectangle.prototype.getArea = function () {
        return this.height * this.width;
    };
    RTreeRectangle.prototype.getCenter = function () {
        return {x: Math.ceil(this.x + this.width * 0.5), y: Math.ceil(this.y + this.height * 0.5)};
    };
    RTreeRectangle.prototype.splitIntoSiblings = function () {
        var pivot = Math.floor(this.children.length / 2);
        var sibling1 = RTreeRectangle.generateEmptyNode();
        var sibling2 = RTreeRectangle.generateEmptyNode();
        HilbertCurves.sortRect(this.children).forEach(function (rect, i) {
            if (i <= pivot) {
                sibling1.insertChildRectangle(rect);
            }
            else {
                sibling2.insertChildRectangle(rect);
            }
        });
        this.children.length = 0;
        return [sibling1, sibling2];
    };

    RTreeRectangle.prototype.numberOfChildren = function () {
        return this.children.length;
    };
    RTreeRectangle.prototype.isLeafNode = function () {
        return this.children.length === 0;
    };
    RTreeRectangle.prototype.hasLeafNodes = function () {
        return this.isLeafNode() || this.children[0].isLeafNode();
    };
    RTreeRectangle.prototype.insertChildRectangle = function (insertRect) {
        insertRect.parent = this;
        this.children.push(insertRect);
        this.growRectangleToFit(insertRect);
    };
    RTreeRectangle.prototype.removeChildRectangle = function (removeRect) {
        this.children.splice(this.children.indexOf(removeRect), 1);
    };
    RTreeRectangle.prototype.getSubtreeData = function (indexData) {
        if (this.children.length === 0) {
            return [this[indexData]];
        }
        return this.children.map(function (x) {return x.getSubtreeData(indexData)}).flatten();
    };
    return RTreeRectangle;
}());

var RTree = (function () {
    function RTree(maxNodes) {
        this.maxNodes = maxNodes;
        this.count = 0;
        this.root = RTreeRectangle.generateEmptyNode();
    }
    RTree.prototype._recursiveSeach = function (searchRect, node, includedOnly, indexData) {
        var _this = this;
        if (searchRect.contains(node)) {
            return node.getSubtreeData(indexData);
        }
		else if (node.isLeafNode()) {
		    return (includedOnly===true)?[]:node.getSubtreeData(indexData);
		}
        else {
            var overlapped = node.children.filter(function (x) {return x.overlaps(searchRect);});
            return overlapped.map(function (iterateNode) {return _this._recursiveSeach(searchRect, iterateNode, includedOnly, indexData)}).flatten();
        }
    };

    RTree.prototype.search = function (searchBoundary, options) {
	    if (!options) {options = {}}
        var cycles, _this = this;
        var indexData = options.searchIndex?"leafIndex":"data";
        if (!options.xPeriod) {cycles = [0];}
        else {
            var xperi = options.xPeriod;
            var dx = _this.root.x - searchBoundary.x;
            var start = Math.ceil((dx - searchBoundary.width)/xperi);
            var len = Math.floor((dx + _this.root.width)/xperi) - start + 1;
            cycles = Array.from(Array(len), (_, i) => (start+i)*xperi); // range()
        }
        var result = cycles.map(function (dx) {
	        var searchRect = new RTreeRectangle(dx + searchBoundary.x, searchBoundary.y, searchBoundary.width, searchBoundary.height, null, null);
 	        return _this._recursiveSeach(searchRect, _this.root, options.includedOnly, indexData);
	    });
	    return result.flatten();
    };

    RTree.prototype.insert = function (dataPoint) {
        var currentNode = this.root;
        if (currentNode) {
            var insertRect = new RTreeRectangle(dataPoint.x, dataPoint.y, dataPoint.width, dataPoint.height, dataPoint.data, this.count);
            while (!currentNode.hasLeafNodes()) {
			     currentNode.growRectangleToFit(insertRect);
			     currentNode = currentNode.children.minBy(function (rect) {return rect.areaIfGrownBy(insertRect)});
            }
            currentNode.insertChildRectangle(insertRect);
            this.balanceTreePath(insertRect);
            this.count += 1;
        }
    };

    RTree.prototype._recursiveTreeLayer = function (listOfRectangles, level) {
        if (level === void 0) {level = 1;}
        var numberOfParents = Math.ceil(listOfRectangles.length / this.maxNodes);
        var nodeLevel = [];
        var childCount = 0;
        var parent;
        for (var i = 0; i < numberOfParents; i++) {
            parent = RTreeRectangle.generateEmptyNode();
            childCount = Math.min(this.maxNodes, listOfRectangles.length);
            for (var y = 0; y < childCount; y++) {
                parent.insertChildRectangle(listOfRectangles.pop());
            }
            nodeLevel.push(parent);
        }
        if (numberOfParents > 1) {
            return this._recursiveTreeLayer(nodeLevel, level + 1);
        }
        else {
            return nodeLevel;
        }
    };
    RTree.prototype.batchInsert = function (listOfData) {
        var count = this.count;
        var rectangles = listOfData.map(function (dataPoint, i) {
            return new RTreeRectangle(dataPoint.x, dataPoint.y, dataPoint.width, dataPoint.height, dataPoint.data, i + count);
        });
        var sorted = HilbertCurves.sortRect(rectangles);
        this.root = this._recursiveTreeLayer(sorted)[0];
        this.count += listOfData.length;
    };

    RTree.prototype.balanceTreePath = function (leafRectangle) {
        var currentNode = leafRectangle;
        while (currentNode.parent && currentNode.parent.numberOfChildren() > this.maxNodes) {
            var currentNode = currentNode.parent;
            if (currentNode != this.root) {
                currentNode.parent.removeChildRectangle(currentNode);
                currentNode.splitIntoSiblings().forEach(function (rect) {
                    currentNode.parent.insertChildRectangle(rect);
                });
            }
            else if (currentNode == this.root) {
                currentNode.splitIntoSiblings().forEach(function (rect) {
                    currentNode.insertChildRectangle(rect);
                });
            }
        }
    };
    return RTree;
}());

var HilbertCurves;
(function (HilbertCurves) {

	function sortRect(listOfRectangles) {
	    var center, min = Infinity, max = -Infinity;
	    listOfRectangles.forEach(function (rect) {
	        center = rect.getCenter();
	        max = Math.max(max, center.x, center.y);
	        min = Math.min(min, center.x, center.y);
	    });
	    var maxCoord = max - min;
	    var sorted = listOfRectangles.sort(function (rect) {
	        center = rect.getCenter();
	        return HilbertCurves.toHilbertCoordinates(maxCoord, center.x-min, center.y-min);
	    });
	    return sorted;
	}
	HilbertCurves.sortRect = sortRect;

    function toHilbertCoordinates(maxCoordinate, x, y) {
        var r = maxCoordinate;
        var mask = (1 << r) - 1;
        var hodd = 0;
        var heven = x ^ y;
        var notx = ~x & mask;
        var noty = ~y & mask;
        var tmp = notx ^ y;
        var v0 = 0;
        var v1 = 0;
        for (var k = 1; k < r; k++) {
            v1 = ((v1 & heven) | ((v0 ^ noty) & tmp)) >> 1;
            v0 = ((v0 & (v1 ^ notx)) | (~v0 & (v1 ^ noty))) >> 1;
        }
        hodd = (~v0 & (v1 ^ x)) | (v0 & (v1 ^ noty));
        return hilbertInterleaveBits(hodd, heven);
    }
    HilbertCurves.toHilbertCoordinates = toHilbertCoordinates;

    function hilbertInterleaveBits(odd, even) {
        var val = 0;
        var max = Math.max(odd, even);
        var n = 0;
        while (max > 0) {
            n++;
            max >>= 1;
        }
        for (var i = 0; i < n; i++) {
            var mask = 1 << i;
            var a = (even & mask) > 0 ? (1 << (2 * i)) : 0;
            var b = (odd & mask) > 0 ? (1 << (2 * i + 1)) : 0;
            val += a + b;
        }
        return val;
    }
})(HilbertCurves || (HilbertCurves = {}));


nRange = function(imin, nrange) {
    var rng = Array.from(Array(nrange?nrange-imin:imin).keys());
    return rng.map(function (i) {return i+(nrange?imin:0)});
}

Array.prototype.minBy = function (mapFunc) {
    var arr = this.map(mapFunc);
    return this[arr.indexOf(Math.min.apply(null, arr))];
};

Array.prototype.flatten = function () {
    return this.reduce(function (p, c) {
        return Array.isArray(c) ? p.concat(c.flatten()) : p.concat(c);
    }, []);
};
