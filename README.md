```html
<div id="#goban"></div>
```
```javascript
var goban = RoundGoban('#goban');
```

![Round Goban](mokele.co.uk/roundgoban/roundgoban.png)

I was asked by a friend to adapt this into a piece of art to hang on a wall,
so there are now some options for playing about with.

```javascript
var goban = RoundGoban('#goban', {
    labels: false,
    outerCircle: true,
    lineWidthMultiplier: function(from, to) {
        if(outer(from, to)) {
            return 3;
        } else if(inner(from, to)) {
            return 2;
        } else {
            return 1;
        }
    },
    strokeStyle: function(from, to) {
        if(outer(from, to)) {
            return '#BBBBBB';
        } else if(inner(from, to)) {
            return '#BBBBBB';
        } else if(spiral(from, to, 3, 0)) {
            return '#555555';
        } else if(spiral(from, to, 3, 1)) {
            return '#AA0000';
        } else if(spiral(from, to, 3, 2)) {
            return '#FF0000';
        } else {
            return '#BBBBBB';
        }
    }
};
```
