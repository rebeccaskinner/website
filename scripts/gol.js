function Exception(str) {
    this.errString = str;
    Exception.prototype.toString = function() { this.errString }
}

function GOLException()
{
    GOLException.InvalidParameterException = new Exception("Invalid Parameter");
    GOLException.InvalidObjectException    = new Exception("Requested object is not valid");
    GOLException.RangeException            = new Exception("Value out of range");
}

function valid(v) { return ((typeof v != 'undefined') && (null != v)); }
function inRange(val,min,max) { return (val >= min && val <= max); }
function betweenRange(val,min,max) { return (val > min && val < max); }

function zipWith(f,a1,a2)
{
    var out = [];
    for(var i = 0; i < a1.length && i < a2.length; i++) {
        out.push(f(a1[i],a2[i]));
    }
    return out;
}

function zip(a1,a2)
{
    return zipWith(function(a,b){return new Tuple(a,b);},a1,a2);
}

function range(start,end,amount)
{
    var r = [];
    if(!valid(amount)) amount = 1;
    amount = start < end ? amount : -amount;
    if (start < end) {
        cmp = function(x,y){ return (x <= y); };
    }
    else {
        amount = -amount;
        cmp = function(x,y){ return (x >= y); };
    }
    for(var i = start; cmp(i,end); i += amount) {
        r.push(i);
    } return r;
}

function mapPure(data,f) {
    if(!valid(data) || !valid(f)) throw GOLException.InvalidParameterException;
    var tmp_ar = data.slice(0,data.length);
    return tmp_ar.map(f);
}

function mapRowPure(data,width,height,f) {
    if(!valid(data) || !valid(width) || !valid(height) || !valid(f)) {
        throw GOLException.InvalidParameterException;
    }
    var tmp_arr = data.slice(0,data.length);
    var out_arr = [];
    for(var i = 0; i < height; i++) {
        var row = tmp_arr.slice(i * width, (i+1)*width);
        var filtered = f(row);
        out_arr = out_arr.concat(filtered);
    }
    return out_arr;
}

function transposeGrid(data,width,height) {
    var tmp_arr = data.slice(0,data.length);
    var cols = [];
    for(var j = 0; j < width; j++)
    {
        for(var i = 0; i < height; i++)
        {
            cols.push(tmp_arr[(i * width) + j]);
        }
    }
    return cols;
}

function mapColPure(data,width,height,f) {
    if(!valid(data) || !valid(width) || !valid(height) || !valid(f)) {
        console.log("mapColPure: Invalid Parameter (data=" + data + ", width = " + width + ", height = " + height + ")");
        throw GOLException.InvalidParameterException;
    }
    var tmp_arr = transposeGrid(data,width,height);
    var tmp = width;
    width   = height;
    height  = tmp;
    var out_arr = mapRowPure(tmp_arr,width,height,f);
    width = out_arr.length / height;
    out_arr = transposeGrid(out_arr,width,height);
    return out_arr;
}

function logGrid(data, width, height)
{
    if(!valid(data) || !valid(width) || !valid(height)) {
        throw GOLException.InvalidParameterException;
    }

    for(var i = 0; i < (width * height); i+=width)
    {
        var arr = data.slice(i,i + width);
        console.log(arr.join());
    }
}

function Tuple(a,b)
{
    this.fst = a;
    this.snd = b;
    Tuple.prototype.toString = function() {return ("(" + this.fst + "," + this.snd + ")");}
}

function Automata(width,height)
{
    function Cell(x,y,st)
    {
        Cell.ACTIVE = true;
        Cell.INACTIVE  = false;
        this.x = x;
        this.y = y;
        this.state = valid(st)?st:Cell.INACTIVE;
        Cell.prototype.makeActive   = function(){this.state = Cell.ACTIVE;}
        Cell.prototype.makeInactive = function(){this.state = Cell.INACTIVE;}
        Cell.prototype.toggleState  = function(){if(this.isActive()) this.makeInactive; else this.makeActive();}
        Cell.prototype.isActive     = function(){return (this.state == Cell.ACTIVE);}
        Cell.prototype.toString     = function(){return this.isActive()?"1":"0";};
    }

    function initCells(x,y)
    {
        var tmp_cells = [];
        for(var i = 0; i < y; i++) {
            for(var j = 0; j < x; j++) {
                var cell = new Cell(j,i,Cell.INACTIVE);
                tmp_cells.push(cell);
            }
        }
        return tmp_cells;
    }

    this.width  = width;
    this.height = height;
    this.data   = initCells(this.width, this.height);

    Automata.prototype.activeCells = function() {
        return this.data.filter(function(c){return c.isActive();});
    }

    Automata.prototype.inactiveCells = function() {
        return this.data.filter(function(c){return c.isInactive();});
    }

    Automata.prototype.randomizeCells = function(activeChance) { 
        if(!inRange(activeChance,0,100)) throw GOLException.RangeException;
        this.map(function(v){if((Math.random()*100)<activeChance)v.makeActive();return v;});
    }

    Automata.prototype.tick = function() {
        this.data = this.tickPure(1, this.data, this.width, this.height);
    }

    Automata.prototype.tickPure = function(radius, d, width, height) {
        var toroidal  = [];
        var torWidth  = 0;
        var torHeight = 0;
        var data = d.slice(0, d.length);

        var splice = function(row) {
            var head    = row.slice(0,radius);
            var tail    = row.slice(row.length-radius,row.length);
            var spliced = tail.concat(row.concat(head));
            return spliced;
        }

        var countNeighbor = function(x,y) {
            var count = 0;
            for(var i = x; i <= (x + (2*radius)); i++)
            {
                for(var j = y; j <= (y + (2*radius)); j++)
                {
                    count += toroidal[(i * torWidth) + j].isActive()?1:0;
                }
            }
            return Math.max(0,(count - (toroidal[((x + radius) * torWidth) + y + radius].isActive()?1:0)));
        }

        if(!valid(radius)) {
            throw GOLException.InvalidParameterException;
        }
        if(radius <= 0) {
            throw GOLException.RangeException;
        }
        
        toroidal  = mapRowPure(data,width,height,splice);
        toroidal  = mapColPure(toroidal,width+(2*radius),height,splice);
        torWidth  = width  + (2*radius);
        torHeight = height + (2*radius);

        for(var x = 0; x < this.width; x++)
        {
            for(var y = 0; y < this.height; y++)
            {
                var count = countNeighbor(x,y);
                if(count < 2) {
                    data[(x * width) + y].makeInactive();
                }
                else if(count == 3) {
                    data[(x * width) + y].makeActive();
                }
                else if(count > 3) {
                    data[(x*width)+y].makeInactive();
                }
            }
        }
        return data;
    }

    Automata.prototype.map = function(f) {
        this.data = this.mapPure(f);
    }

    Automata.prototype.mapRow = function(f) {
        this.data = this.mapRowPure(this.data, this.width, this.height, f);
    }

    Automata.prototype.mapCol = function(f) {
        this.data = this.mapColPure(this.data, this.width, this.height, f);
    }

    Automata.prototype.mapPure = function(f) {
        return mapPure(this.data,f);
    }

    Automata.prototype.mapRowPure = function(f) {
        return mapRowPure(this.data, this.width, this.height, f);
    }

    Automata.prototype.mapColPure = function(f) {
        return mapColPure(this.data, this.width, this.height, f);
    }

    Automata.prototype.toString = function() {
        var convertRow = function(row){return row.map(function(elem){return elem.toString();});};
        var rowStrings = this.mapRowPure(convertRow);
        return rowStrings.join("|");
    }

    Automata.prototype.HTMLTable = function() {
        var convertCell = function(elem) {}
        var tableData = "<table>";
    }
}

function Canvas( width      // canvas width in px
               , height     // canvas height in px
               , sizeX      // number of cells in x
               , sizeY      // number of cells in y
               , parentElem // parent node
               ) {

    Canvas.FGColor   = "#000000";
    Canvas.BGColor   = "#FFFFFF";
    Canvas.GridColor = "#CCCCCC";

    function getGridID()
    {
        if(typeof getGridID.lastID == 'undefined') {
            getGridID.lastID = 0;
        }
        return (getGridID.lastID++).toString(16).toUpperCase();
    }

    function addToDOM(obj)
    {
        obj.elem = document.createElement("canvas");
        obj.elem.setAttribute("id",obj.id);
        obj.parentObj.appendChild(obj.elem);
        obj.parentObj.style.width  = obj.width  + "px";
        obj.parentObj.style.height = obj.height + "px";
        obj.resize();
    }

    function calcGridDimensions(width,height,sizeX,sizeY)
    {
        if(sizeX > width || sizeY > height) throw GOLException.RangeException;
        return new Tuple(Math.floor(width/sizeX), Math.floor(height/sizeY));
    }

    function checkDimensions(x,y) { return (x && x > 0 && y && y > 0); }

    if(!checkDimensions(width,height)) {
        console.log("Geometry " + width + "x" + height + " is invalid");
        throw GOLException.InvalidParameterException;
    }

    Canvas.prototype.toString = function() {
        return ("<span class=GOLCanvas><canvas width=" +
               this.width + " height="+this.height+" id='"+this.id+"'></canvas></span>");
    }

    Canvas.prototype.resize = function(x,y) {
        this.x = valid(x)?x:this.x;
        this.y = valid(y)?y:this.y;
    }

    Canvas.prototype.draw = function() {
        var cellGeometry = calcGridDimensions(this.width, this.height, this.CA.width, this.CA.height);
        var ctx    = this.ctx;
        var width  = this.width;
        var height = this.height;

        var cellFunc = function(cell) {
            ctx.fillRect( cell.x * cellGeometry.fst
                        , cell.y * cellGeometry.snd
                        , cellGeometry.fst
                        , cellGeometry.snd
                        );
        }

        var makeLine = function(startX,startY,endX,endY)
        {
            ctx.moveTo(startX,startY);
            ctx.lineTo(endX,endY);
            ctx.stroke();
        }

        this.elem.setAttribute("width",width + "px");
        this.elem.setAttribute("height",height + "px");

        this.ctx.fillStyle = Canvas.BGColor;
        this.ctx.fillRect(0,0,width,height);

        this.ctx.fillStyle = Canvas.FGColor;
        this.CA.activeCells().map(cellFunc);

        this.ctx.strokeStyle = Canvas.GridColor;
        range(0,width,cellGeometry.fst).map(function(x){makeLine(x,0,x,height);});
        range(0,height,cellGeometry.snd).map(function(y){makeLine(0,y,width,y);});
        this.CA.tick();
    }

    this.width      = width;
    this.height     = height;
    this.id         = ("canvas-"+getGridID());
    this.parentObj  = parentElem;
    this.elem       = null;
    this.CA         = new Automata(sizeX, sizeY);
    this.CA.randomizeCells(15);
    addToDOM(this);
    this.ctx        = this.elem.getContext('2d');
}

function fetchParentElem(parentID)
{
    var canvasParent = null;
    if(valid(parentID)) {
        canvasParent = document.getElementById(parentID);
    }
    else {
        canvasParent = document.getElementsByTagName("body")[0];
    }
    if(!valid(canvasParent)) {
        throw GOLException.InvalidObjectException;
    }
    return canvasParent;
}

function makeGOL(width,height,sizeX,sizeY,parentID)
{
    var canvas = new Canvas(width,height,80,80,fetchParentElem(parentID));
    setInterval(function(){canvas.draw();},75);
}
