
var RoundGoban = function(opts) {
    this.opts = opts ? opts : {};
    for(var k in RoundGoban.defaultOpts) {
        if(opts[k] === undefined) {
            opts[k] = RoundGoban.defaultOpts[k];
        }
    }

    this.offsetX = 0;
    this.offsetY = 0;
    this.radius = 0;
    this.padding = 0;
    this.size = 9;
};
RoundGoban.defaultOpts = {
    labels: true,
    lineWidthMultiplier: function(from, to) {
        if(from < 9 && to < 9) {
            return 2;
        } else {
            return 1;
        }
    },
    outerCircle: true,
    strokeStyle: function(from, to) {
        return '#333'
    }
};

RoundGoban.prototype.pointLetter = function(point) {
    var x = (point + 1) % this.size;
    if(x == 0) {
        x = this.size;
    }
    var c = String.fromCharCode(65+x-1);
    if(c == "I") {
        c = "J";
    }
    return c;
};
RoundGoban.prototype.pointToCoord = function(point) {
    var y = Math.floor((point + this.size) / this.size);
    return pointLetter(point) + y;
};
RoundGoban.prototype.recalculateSize = function(goban) {
    var width = goban.width;
    var height = goban.height;
    var min = Math.min(width, height);

    this.padding = Math.round((min / 100) * 8);

    this.radius = (min - 2*this.padding) / 2;

    this.offsetX = width / 2;
    this.offsetY = height / 2;
};
RoundGoban.prototype.redraw = function(goban) {
    var points = goban.points;
    var ctx = goban.ctx;

    var rotation = 0;

    ctx.clearRect(0, 0, goban.width, goban.height);

    var lineWidthAddition = (this.radius*2 - 210) / 1000;
    var defaultLineWidth = 0.25;

    var loopRadius = this.radius;
    if(this.opts.outerCircle) {
        var lastAngle = -0.18;
        var stepAngle = (Math.PI*2) / this.size;
        for(var i=0; i<this.size; i++) {
            ctx.beginPath();
            var angle = lastAngle + stepAngle;
            var from = i;
            var to = from + 1;
            if(to == this.size) {
                to = 1;
            }

            ctx.strokeStyle = this.opts.strokeStyle(from, to);
            ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
            ctx.lineWidth *= this.opts.lineWidthMultiplier(from, to);

            ctx.arc(this.offsetX, this.offsetY, loopRadius, lastAngle, angle); 
            lastAngle = angle;
            ctx.stroke();
        }
    }
    var pointIndex = 0;

    for(var j=0; j<this.size; j++) {
        var inner = j == this.size - 1;
        var outer = j == 0;

        if(inner) {
            ctx.beginPath();
        }
        for(var i=0; i<this.size; i++, pointIndex++) {
            var pointIndex = this.size*j + i;
            var angle = ((i + rotation) / this.size) * 2 * Math.PI;
            var x = (( Math.sin( angle ) * loopRadius ) + this.offsetX);
            var y = goban.height - (( Math.cos( angle ) * loopRadius ) + this.offsetY);
            var neighbours = [];

            if(outer && this.opts.showCoords) {
                var letter = this.pointLetter(pointIndex);
                var fontSize = 8 + Math.round((this.radius*2 - 210) / 70);

                ctx.font = "normal bold "+fontSize+"px Arial";
                var lRadius = loopRadius;
                //if(outer) {
                lRadius += (this.padding*0.70);
                //} else {
                //   lRadius -= (padding*0.7);
                //}
                var lAngle = ((i + rotation) / this.size) * 2 * Math.PI;
                var lx = (( Math.sin( lAngle ) * lRadius ) + this.offsetX);
                var ly = goban.height - (( Math.cos( lAngle ) * lRadius ) + this.offsetY);

                var textMetrics = ctx.measureText(letter);
                lx -= textMetrics.width/2;
                ly += fontSize / 2;
                ctx.fillText(letter, lx, ly);
            }
            if(outer) {
                if(i == 0) {
                    neighbours.push(this.size-1);
                    neighbours.push(i+1);
                } else if(i == this.size - 1) {
                    neighbours.push(0);
                    neighbours.push(i-1);
                } else {
                    neighbours.push(i+1);
                    neighbours.push(i-1);
                }
            } else if(inner) {
                if(i == 0) {
                    neighbours.push(this.size*this.size - 1);
                    neighbours.push(pointIndex + 1);
                } else if(i == this.size - 1) {
                    neighbours.push(this.size*(this.size-1));
                    neighbours.push(pointIndex - 1);
                } else {
                    neighbours.push(pointIndex + 1);
                    neighbours.push(pointIndex - 1);
                }
            }
            var pointRadiusStart = 6.5;
            var pointRadiusRatio = 0.3;
            pointRadiusStart += (this.radius*2 - 210) / 33;
            pointRadiusRatio += (this.radius*2 - 210) / 1000;

            var pointRadius = pointRadiusStart + ((this.size - j - 1) * pointRadiusRatio);
            //var pointRadius = 13 + ((this.size - j - 1) * 0.3); // large
            //var pointRadius = 10 + ((this.size - j - 1) * 0.3); // medium
            //var pointRadius = 7 + ((this.size - j - 1) * 0.1); // small
            var point = points[pointIndex];
            if(!point) {
                point = {
                    id: pointIndex,
                    neighbours: neighbours,
                    elements: {}
                };
                //point.value = valueFun(point);
                //point.connected = connectedFun(point);
            }
            var hitArea = {
                x: x - pointRadius,
                y: y - pointRadius,
                x2: x + pointRadius,
                y2: y + pointRadius
            };
            point.x = x;
            point.y = y;
            point.hitArea = hitArea;
            point.radius = pointRadius;
            points[pointIndex] = point;
            goban.repositionPoint(point);

            if(inner) {
                var from = point.id;
                var to = point.id + 1;
                if(to == this.size*this.size) {
                    to = this.size*(this.size-1);
                }
                ctx.strokeStyle = this.opts.strokeStyle(from, to);
                ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
                ctx.lineWidth *= this.opts.lineWidthMultiplier(from, to);
                ctx.lineTo(x, y);
            }
        }
        if(inner) {
            ctx.closePath();
            ctx.stroke();
        }
        // 250 minimum this.size - 2*padding
        // 10 minimum reduction
        loopRadius -= 10 + ((this.radius*2 - 210) / 22);
        //loopRadius -= 19; // 9 large
        //loopRadius -= 15; // 9 medium
        //loopRadius -= 10; // 9 small
        //loopRadius -= 9; // 19 large small
        rotation += 0.5;
    }
    ctx.lineWidth = this.opts.lineWidthMultiplier * (0.25 + lineWidthAddition);
    for(var i=0; i<points.length; i++) {
        var p1 = points[i];
        var i2 = i+this.size;
        var p2 = points[i+this.size];
        //if(i == 37 || i == 40 || i == 43
        //   //|| i == 0 || i == 3 || i == 6
        //   //|| i == 74 || i == 77 || i == 80
        //  ) {
        //    ctx.beginPath();
        //    ctx.arc(p1.x, p1.y, 4, 0, Math.PI*2, true); 
        //    ctx.closePath();
        //    ctx.fill();
        //}
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        if(p2) {
            ctx.strokeStyle = this.opts.strokeStyle(p1.id, p2.id);
            ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
            ctx.lineWidth *= this.opts.lineWidthMultiplier(p1.id, p2.id);
            ctx.lineTo(p2.x, p2.y);

            if(p1.neighbours.indexOf(i2) == -1) {
                p1.neighbours.push(i2);
            }
            if(p2.neighbours.indexOf(i) == -1) {
                p2.neighbours.push(i);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
    // todo: merge these for loops into 1
    for(var i=0; i<points.length; i++) {
        ctx.beginPath();
        var p1 = points[i];
        var i2 = (i+this.size)%this.size == 0 ? i+this.size+this.size-1 : i+this.size-1;
        var p2 = points[i2];
        ctx.moveTo(p1.x, p1.y);
        if(p2) {
            ctx.strokeStyle = this.opts.strokeStyle(p1.id, p2.id);
            ctx.lineTo(p2.x, p2.y);
            if(p1.neighbours.indexOf(i2) == -1) {
                p1.neighbours.push(i2);
            }
            if(p2.neighbours.indexOf(i) == -1) {
                p2.neighbours.push(i);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
};

RoundGoban.geometry = function() {
    return {
        points: [
            [8, 1, 9, 17],
            [2, 0, 10, 9],
            [3, 1, 11, 10],
            [4, 2, 12, 11],
            [5, 3, 13, 12],
            [6, 4, 14, 13],
            [7, 5, 15, 14],
            [8, 6, 16, 15],
            [0, 7, 17, 16],
            [0, 18, 1, 26],
            [1, 19, 2, 18],
            [2, 20, 3, 19],
            [3, 21, 4, 20],
            [4, 22, 5, 21],
            [5, 23, 6, 22],
            [6, 24, 7, 23],
            [7, 25, 8, 24],
            [8, 26, 0, 25],
            [9, 27, 10, 35],
            [10, 28, 11, 27],
            [11, 29, 12, 28],
            [12, 30, 13, 29],
            [13, 31, 14, 30],
            [14, 32, 15, 31],
            [15, 33, 16, 32],
            [16, 34, 17, 33],
            [17, 35, 9, 34],
            [18, 36, 19, 44],
            [19, 37, 20, 36],
            [20, 38, 21, 37],
            [21, 39, 22, 38],
            [22, 40, 23, 39],
            [23, 41, 24, 40],
            [24, 42, 25, 41],
            [25, 43, 26, 42],
            [26, 44, 18, 43],
            [27, 45, 28, 53],
            [28, 46, 29, 45],
            [29, 47, 30, 46],
            [30, 48, 31, 47],
            [31, 49, 32, 48],
            [32, 50, 33, 49],
            [33, 51, 34, 50],
            [34, 52, 35, 51],
            [35, 53, 27, 52],
            [36, 54, 37, 62],
            [37, 55, 38, 54],
            [38, 56, 39, 55],
            [39, 57, 40, 56],
            [40, 58, 41, 57],
            [41, 59, 42, 58],
            [42, 60, 43, 59],
            [43, 61, 44, 60],
            [44, 62, 36, 61],
            [45, 63, 46, 71],
            [46, 64, 47, 63],
            [47, 65, 48, 64],
            [48, 66, 49, 65],
            [49, 67, 50, 66],
            [50, 68, 51, 67],
            [51, 69, 52, 68],
            [52, 70, 53, 69],
            [53, 71, 45, 70],
            [54, 72, 55, 80],
            [55, 73, 56, 72],
            [56, 74, 57, 73],
            [57, 75, 58, 74],
            [58, 76, 59, 75],
            [59, 77, 60, 76],
            [60, 78, 61, 77],
            [61, 79, 62, 78],
            [62, 80, 54, 79],
            [80, 73, 63, 64],
            [74, 72, 64, 65],
            [75, 73, 65, 66],
            [76, 74, 66, 67],
            [77, 75, 67, 68],
            [78, 76, 68, 69],
            [79, 77, 69, 70],
            [80, 78, 70, 71],
            [72, 79, 71, 63]
        ]
    };
};


/*
if(!window.Black) {
    // crap I didn't want to abstract out of here
    // so just filled with stubs
    Black = 'BLACK';
    BlackStone = function() {
        return {
            element: $('<div></div>')
        }
    };
    White = 'WHITE';
    WhiteStone = function() {
        return {
            element: $('<div></div>')
        }
    };
}
if(!window.Callbacks) {
    Callbacks = function() {
        return {
            callback: function() {}
        }
    };
}
var RoundGoban = function(sel, opts) {
    var defaultOpts = {
        labels: true,
        lineWidthMultiplier: function(from, to) {
            return 1;
        },
        outerCircle: true,
        strokeStyle: function(from, to) {
            return '#000'
        }
    };
    if(!opts) {
        opts = {}
    };
    $.extend(defaultOpts, opts);
    opts = defaultOpts;

    var container = $(sel);
    var element;
    var canvas;
    var ctx;
    var radius;
    var offsetY;
    var offsetX;
    var width;
    var height;
    //var n = 19;
    var n = 9;
    var padding = 30;
    var points = [];
    var turn = Black;
    var callbacks = Callbacks();
    var enabled = true;
    var stateEditable = false;

    var getPoint = function(x, y) {
        // todo: sort points by x and y coord
        // so we when to stop searching
        for(var i=0; i<points.length; i++) {
            var point = points[i]
            var hitArea = point.hitArea;
            if(x >= hitArea.x && y >= hitArea.y
               && x <= hitArea.x2 && y <= hitArea.y2)
           {
               return point;
           }
        }
        return false;
    };
    var ghostElements = {};
    ghostElements[Black] = BlackStone().element;
    ghostElements[White] = WhiteStone().element;
    for(var k in ghostElements) {
        ghostElements[k].addClass('ghost');
    }
    var ghostElement = function() {
        return ghostElements[turn];
    };

    var lastFocusedOverlay = null;
    var lastFocusedPoint = null;

    var repositionElement = function(el, point) {
        var diameter = point.radius * 2;
        el.remove(); // weird resize fix - only likes to be resized while not on the page
        el.width(diameter);
        el.height(diameter);
        el.css({
            left: point.x - point.radius,
            top: point.y - point.radius
        });
        element.append(el); // weird resize fix
    };
    // todo: refactor out into a Point object
    var repositionPoint = function(pointIndex) {
        var point = points[pointIndex];
        if(point.element) {
            repositionElement(point.element, point);
        }
        if(point.overlay) {
            repositionElement(point.overlay.element, point);
        }
    };
    var place = function(pointIndex, stone, focus) {
        var point = points[pointIndex];
        if(point.stone) {
            return;
        }
        var placedElement = ghostElements[stone].clone(true);
        placedElement.removeClass('ghost');
        point.stone = stone;
        point.element = placedElement;
        repositionPoint(pointIndex);

        element.append(point.element);

        if(focus === true) {
            if(lastFocusedPoint) {
                lastFocusedOverlay.element.remove();
                lastFocusedOverlay = null;
                lastFocusedPoint = null;
            }
            var focusOverlay = PointOverlay(stone);
            var focusElement = focusOverlay.element;
            var diameter = point.radius * 2;
            focusElement.width(diameter);
            focusElement.height(diameter);
            focusElement.css({
                left: point.x - point.radius,
                top: point.y - point.radius
            });
            element.append(focusElement);
            lastFocusedOverlay = focusOverlay;
            lastFocusedPoint = point;
        }
    };
    var clearPoint = function(index) {
        var point = points[index];
        if(point.element) {
            point.element.remove();
            point.element = null;
            point.stone = null;
        }
    };
    var clear = function(index) {
        if(index === undefined) {
            for(var k in points) {
                clearPoint(k);
            }
        } else {
            clearPoint(index);
        }
    };
    
    var recalculateSize = function() {
        width = container.width();
        height = container.height();
        var min = Math.min(width, height);

        padding = Math.round((min / 100) * 8);

        radius = (min - 2*padding) / 2;

        offsetX = width / 2;
        offsetY = height / 2;
    };
    var valueFun = function(point) {
        return function() {
            if(point.stone) {
                if(!point.overlay) {
                    return point.stone;
                } else if(point.stone == White) {
                    return 'WHITE_DEAD';
                } else if(point.stone == Black) {
                    return 'BLACK_DEAD';
                }
            } else if(!point.overlay) {
                return 'EMPTY';
            } else if(point.overlay.color == White) {
                return 'BLACK_TERRITORY';
            } else if(point.overlay.color == Black) {
                return 'WHITE_TERRITORY';
            }
        }
    };
    var connectedFun = function(point) {
        return function() {
            var thisValue = point.value();
            var thisNeighbours = $.extend(true, [], point.neighbours);
            var thisConnected = [point.point]
            var seen = [point.point];
            while(thisNeighbours.length > 0) {
                var neighbourIndex = thisNeighbours.shift();
                if(seen.indexOf(neighbourIndex) != -1) {
                    console.log("seen", neighbourIndex);
                    continue;
                }
                seen.push(neighbourIndex);
                var neighbour = points[neighbourIndex];
                console.log("value", thisValue, neighbour.value());
                if(neighbour.value() == thisValue) {
                    thisNeighbours = thisNeighbours.concat(neighbour.neighbours);
                    thisConnected.push(neighbourIndex);
                }
            }
            return thisConnected;
        };
    };

    (function() {
        recalculateSize();
        canvas = $('<canvas width="'+width+'" height="'+height+'"></canvas>');
        element = $('<div class="goban round-goban"></div>');
        element.append(canvas);

        canvas.mousemove(function(e) {
            if(!enabled) {
                return;
            }
            var containerOffset = container.offset();
            var x = e.pageX - containerOffset.left;
            var y = e.pageY - containerOffset.top;
            var point = getPoint(x, y);
            if(point && !point.stone) {
                var diameter = point.radius * 2;
                ghostElement().width(diameter);
                ghostElement().height(diameter);
                ghostElement().css({
                    left: point.x - point.radius,
                    top: point.y - point.radius
                });
                var el = ghostElement();
                element.append(el);

                el.click(function(e) {
                    if(!enabled) {
                        return;
                    }
                    var x = e.pageX - containerOffset.left;
                    var y = e.pageY - containerOffset.top;
                    var point = getPoint(x, y);
                    if(!point) {
                        return;
                    }
                    place(point.point, turn, true);
                    callbacks.fire('placed', {
                        point: point.point,
                        stone: turn
                    });
                });
            } else {
                ghostElement().remove();
            }
        });
        $(document.body).click(function(e) {
            if(!stateEditable) {
                return;
            }
            var containerOffset = container.offset();
            var x = e.pageX - containerOffset.left;
            var y = e.pageY - containerOffset.top;
            var point = getPoint(x, y);
            if(point) {
                callbacks.fire('stateEdit', point);
            }
        });
        //canvas.width(width);
        //canvas.height(height);
        container.append(element);
        ctx = canvas[0].getContext("2d");
    })();

    var pointLetter = function(point) {
        var x = (point + 1) % n;
        if(x == 0) {
            x = n;
        }
        var c = String.fromCharCode(65+x-1);
        if(c == "I") {
            c = "J";
        }
        return c;
    };
    var pointToCoord = function(point) {
        var y = Math.floor((point + n) / n);
        return pointLetter(point) + y;
    };

    var draw = function() {
        var rotation = 0;

        var lineWidthAddition = (radius*2 - 210) / 1000;
        var defaultLineWidth = 0.25;

        var loopRadius = radius;
        if(opts.outerCircle) {
            ctx.beginPath();
            var lastAngle = 0;
            var stepAngle = (Math.PI*2) / n;
            for(var i=0; i<n; i++) {
                var angle = lastAngle + stepAngle;
                var from = i+1;
                var to = from + 1;
                if(to == n+1) {
                    to = 1;
                }
                ctx.strokeStyle = opts.strokeStyle(from, to);
                ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
                ctx.lineWidth *= opts.lineWidthMultiplier(from, to);

                ctx.arc(offsetX, offsetY, loopRadius, lastAngle, angle, true); 
                lastAngle = angle;
            }
            ctx.closePath();
            ctx.stroke();
        }
        var pointIndex = 0;

        for(var j=0; j<n; j++) {
            var inner = j == n - 1;
            var outer = j == 0;

            if(inner) {
                ctx.beginPath();
            }
            for(var i=0; i<n; i++, pointIndex++) {
                var pointIndex = n*j + i;
                var angle = ((i + rotation) / n) * 2 * Math.PI;
                var x = (( Math.sin( angle ) * loopRadius ) + offsetX);
                var y = height - (( Math.cos( angle ) * loopRadius ) + offsetY);
                var neighbours = [];

                if(outer && opts.labels) {
                    var letter = pointLetter(pointIndex);
                    var fontSize = 8 + Math.round((radius*2 - 210) / 70);

                    ctx.font = "normal bold "+fontSize+"px Arial";
                    var lRadius = loopRadius;
                    //if(outer) {
                       lRadius += (padding*0.70);
                    //} else {
                    //   lRadius -= (padding*0.7);
                    //}
                    var lAngle = ((i + rotation) / n) * 2 * Math.PI;
                    var lx = (( Math.sin( lAngle ) * lRadius ) + offsetX);
                    var ly = height - (( Math.cos( lAngle ) * lRadius ) + offsetY);

                    var textMetrics = ctx.measureText(letter);
                    lx -= textMetrics.width/2;
                    ly += fontSize / 2;
                    ctx.fillText(letter, lx, ly);
                }
                if(outer) {
                    if(i == 0) {
                        neighbours.push(n-1);
                        neighbours.push(i+1);
                    } else if(i == n - 1) {
                        neighbours.push(0);
                        neighbours.push(i-1);
                    } else {
                        neighbours.push(i+1);
                        neighbours.push(i-1);
                    }
                } else if(inner) {
                    if(i == 0) {
                        neighbours.push(n*n - 1);
                        neighbours.push(pointIndex + 1);
                    } else if(i == n - 1) {
                        neighbours.push(n*(n-1));
                        neighbours.push(pointIndex - 1);
                    } else {
                        neighbours.push(pointIndex + 1);
                        neighbours.push(pointIndex - 1);
                    }
                }
                var pointRadiusStart = 6.5;
                var pointRadiusRatio = 0.3;
                pointRadiusStart += (radius*2 - 210) / 33;
                pointRadiusRatio += (radius*2 - 210) / 1000;

                var pointRadius = pointRadiusStart + ((n - j - 1) * pointRadiusRatio);
                //var pointRadius = 13 + ((n - j - 1) * 0.3); // large
                //var pointRadius = 10 + ((n - j - 1) * 0.3); // medium
                //var pointRadius = 7 + ((n - j - 1) * 0.1); // small
                var point = points[pointIndex];
                if(!point) {
                    point = {
                        point: pointIndex,
                        neighbours: neighbours
                    };
                    point.value = valueFun(point);
                    point.connected = connectedFun(point);
                }
                var hitArea = {
                    x: x - pointRadius,
                    y: y - pointRadius,
                    x2: x + pointRadius,
                    y2: y + pointRadius
                };
                point.x = x;
                point.y = y;
                point.hitArea = hitArea;
                point.radius = pointRadius;
                points[pointIndex] = point;
                repositionPoint(pointIndex);

                if(inner) {
                    var from = point.point;
                    var to = point.point + 1;
                    if(to == n*n) {
                        to = n*(n-1);
                    }
                    ctx.strokeStyle = opts.strokeStyle(from, to);
                    ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
                    ctx.lineWidth *= opts.lineWidthMultiplier(from, to);
                    ctx.lineTo(x, y);
                }
            }
            if(inner) {
                ctx.closePath();
                ctx.stroke();
            }
            // 250 minimum size - 2*padding
            // 10 minimum reduction
            loopRadius -= 10 + ((radius*2 - 210) / 22);
            //loopRadius -= 19; // 9 large
            //loopRadius -= 15; // 9 medium
            //loopRadius -= 10; // 9 small
            //loopRadius -= 9; // 19 large small
            rotation += 0.5;
        }
        ctx.lineWidth = opts.lineWidthMultiplier * (0.25 + lineWidthAddition);
        for(var i=0; i<points.length; i++) {
            var p1 = points[i];
            var i2 = i+n;
            var p2 = points[i+n];
            //if(i == 37 || i == 40 || i == 43
            //   //|| i == 0 || i == 3 || i == 6
            //   //|| i == 74 || i == 77 || i == 80
            //  ) {
            //    ctx.beginPath();
            //    ctx.arc(p1.x, p1.y, 4, 0, Math.PI*2, true); 
            //    ctx.closePath();
            //    ctx.fill();
            //}
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            if(p2) {
                ctx.strokeStyle = opts.strokeStyle(p1.point, p2.point);
                ctx.lineWidth = (defaultLineWidth + lineWidthAddition);
                ctx.lineWidth *= opts.lineWidthMultiplier(p1.point, p2.point);
                ctx.lineTo(p2.x, p2.y);

                if(p1.neighbours.indexOf(i2) == -1) {
                    p1.neighbours.push(i2);
                }
                if(p2.neighbours.indexOf(i) == -1) {
                    p2.neighbours.push(i);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        // todo: merge these for loops into 1
        for(var i=0; i<points.length; i++) {
            ctx.beginPath();
            var p1 = points[i];
            var i2 = (i+n)%n == 0 ? i+n+n-1 : i+n-1;
            var p2 = points[i2];
            ctx.moveTo(p1.x, p1.y);
            if(p2) {
                ctx.strokeStyle = opts.strokeStyle(p1.point, p2.point);
                ctx.lineTo(p2.x, p2.y);
                if(p1.neighbours.indexOf(i2) == -1) {
                    p1.neighbours.push(i2);
                }
                if(p2.neighbours.indexOf(i) == -1) {
                    p2.neighbours.push(i);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
    };

    var hideGhostElements = function() {
        for(var k in ghostElements) {
            ghostElements[k].remove();
        }
    };

    draw();
    var fit = function() {
        hideGhostElements();
        ctx.clearRect(0, 0, width, height);
        recalculateSize();
        canvas.attr('width', width);
        canvas.attr('height', height);
        element.css({
            width: width,
            height: height
        });
        draw();
        if(lastFocusedPoint) {
            repositionElement(lastFocusedOverlay.element, lastFocusedPoint);
        }
    };

    var setPointOverlay = function(pointIndex, overlayFun) {
        var point = points[pointIndex];
        if(point.overlay) {
            point.overlay.element.remove();
            point.overlay = null;
        }
        var overlay = overlayFun(point.stone);
        var diameter = point.radius * 2;
        overlay.element.width(diameter);
        overlay.element.height(diameter);
        overlay.element.css({
            left: point.x - point.radius,
            top: point.y - point.radius
        });
        element.append(overlay.element);
        point.overlay = overlay;
    };

    return {
        type: 'round',
        size: function() {
            return n;
        },
        stateEditable: function() {
            stateEditable = true;
        },
        stateEdit: callbacks.callback('stateEdit'),
        setTurn: function(nextTurn) {
            turn = nextTurn;
        },
        disable: function() {
            enabled = false;
            stateEditable = false;
        },
        enable: function() {
            enabled = true;
        },
        placed: callbacks.callback('placed'),
        removeCallback: callbacks.removeCallback,
        clear: clear,
        defocusPoint: function(pointIndex) {
            if(lastFocusedPoint) {
                lastFocusedOverlay.element.remove();
                lastFocusedOverlay = null;
                lastFocusedPoint = null;
            }
            var point = points[pointIndex];
            if(point.overlay) {
                point.overlay.element.remove();
                delete point.overlay;
            }
        },
        setPointOverlay: setPointOverlay,
        resetToSize: function(toSize) {
            // todo: support other sizes other than 9
        },
        place: place,
        hide: function() {
            element.hide();
            hideGhostElements();
        },
        fit: fit,
        show: function() {
            element.show();
            fit();
        },
        remove: function() {
            element.remove();
            element = null;
        },

        pointToCoord: pointToCoord
    };
};
*/
