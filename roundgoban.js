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
            /*if(i == 37 || i == 40 || i == 43
               //|| i == 0 || i == 3 || i == 6
               //|| i == 74 || i == 77 || i == 80
              ) {
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 4, 0, Math.PI*2, true); 
                ctx.closePath();
                ctx.fill();
            }*/
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
