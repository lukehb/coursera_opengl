///////////////////////////////////////////////
//////////Author: Luke Bermingham//////////////
///////////////////////////////////////////////

"use strict";

////////////////////////////////////////////////////////////////
//////ON LOAD///////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

//hook onto on-load event for the window, i.e. page is loaded now, so do stuff
window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    var gl = WebGLUtils.setupWebGL( canvas );
	//make our graphics view-port same size as the canvas
	gl.viewport( 0, 0, canvas.width, canvas.height );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	//set-up our renderer
	var renderer = new Assignment2(gl);
	
	//set-up gui now that the renderer is ready
	new Gui(renderer);
	
};

///////////////////////////////////////////////////////////////
////////GUI////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Gui(renderer){
	this.setupDrawingState(renderer);
	this.setupDrawingModeMenu(renderer);
	this.setupThicknessSlider(renderer);
	this.setupColorPicker(renderer);
};

Gui.prototype.setupDrawingState = function(renderer){
	//update the drawing state of mouse up/down
	var that = this;
	var canvas = document.getElementById("gl-canvas");
	var label = document.getElementById("drawingLabel");
	
	var update = function(evt, isDrawing){
		renderer.setDrawingState(isDrawing);
		label.innerHTML = (isDrawing) ? "[Drawing]" : "[Not Drawing]";
		//start or end drawing 
		var xy = that.extractXY(evt, canvas);
		if(renderer.drawingMode == "line"){
			renderer.startOrEndDrawingLine(xy);
		}
		else if(renderer.drawingMode == "poly"){
			//add start end poly line
			renderer.startOrEndDrawingPoly(xy);
		}
		
	};
	
	var coordsLabel = document.getElementById("coordsLabel");
	
	//listen for mouse up/down on canvas
	canvas.addEventListener("mousedown", function(evt){update(evt, true);});
	canvas.addEventListener("mouseup", function(evt){update(evt, false);});
	canvas.addEventListener("mousemove", function(evt){
		
		var xy = that.extractXY(evt, canvas);
		coordsLabel.innerHTML = "(" + xy[0] + "," + xy[1] + ")";
		
		//only draw points using mouse if we are in drawing mode
		if(renderer.drawing){
			if(renderer.drawingMode == "line"){
				//add some more verts to the lines
				renderer.addLinePos(xy);
			}
			else if(renderer.drawingMode == "poly"){
				//add this vert to 
				renderer.addPolyPos(xy);
			}
		}
	});
	
};

Gui.prototype.extractXY = function(evt, canvas){
	//get offset x/y in a cross browser way
	var target = evt.target || evt.srcElement,
	rect = target.getBoundingClientRect(),
	offsetX = evt.clientX - rect.left,
	offsetY = evt.clientY - rect.top;
	
	var x = -1 + 2*offsetX/canvas.width;
	var y = -1 + 2*(canvas.height-offsetY)/canvas.height;
	return [x,y];
};

Gui.prototype.setupColorPicker = function(renderer){
	//https://github.com/DavidDurman/FlexiColorPicker
	var cp = ColorPicker(document.getElementById('myColorPicker'), function(hex, hsv, rgb) {
		document.getElementById("colorRect").style.backgroundColor = hex;
		//update brush color
		renderer.setColor(vec4(rgb.r/255.0, rgb.g/255.0, rgb.b/255.0, 1.0));
	});
	cp.setRgb({ r: 0, g: 0, b: 0 });
};

Gui.prototype.setupDrawingModeMenu = function(renderer){
	//update the drawing mode
	var menu = document.getElementById("drawingModeMenu");

	var update = function(){
		//set drawing mode
		renderer.drawingMode = menu.options[menu.selectedIndex].value;
	};

	//when menu item is selected
	menu.addEventListener("change", update);
};

Gui.prototype.setupThicknessSlider = function(renderer){
	//update the number of divisions our rendering has based on slider value
	var slider = document.getElementById("thicknessSlider");
	var label = document.getElementById("thicknessLabel");
	
	label.innerHTML = slider.value;
	var canvas = document.getElementById("gl-canvas");
	
	var update = function(){
		//do something here in the renderer
		//renderer.setRotation(slider.value);
		label.innerHTML = slider.value;
		renderer.thickness = slider.value/canvas.width; 
	};

	//when mouse is released
	slider.addEventListener("change", update);
	//while dragging
	slider.addEventListener("input", update);
	
};

///////////////////////////////////////////////////////////////
//////////Renderer/////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Assignment2(gl){
	
	this.gl = gl;
	//set-up shaders and use them
	this.program = initShaders( gl, "vertex-shader", "fragment-shader" );
    this.gl.useProgram( this.program );
	this.color = vec4(0,0,0,1);
	this.drawing = false;
	this.drawingMode = "poly";
	this.sizeOfFloat = new Float32Array([137]).byteLength;
	
	this.colorComponents = 4;
	this.vertexComponents = 2;

	this.lineBufferId = null;
	this.polyBufferId = null;
	this.prevPt = vec2([0,0]);
	this.maxPts = 10000;
	this.nLinePts = 0;
	this.nPolyPts = 0;
	this.thickness = 1/512.0;
	
	this.init(gl);
	
};

Assignment2.prototype.setDrawingState = function(state){
	this.drawing = state;
};

//getters and setters
Assignment2.prototype.setColor = function(color){
	this.color = color;
	//if divisions were changed update the rendering
	this.doRender(this.gl);
};

Assignment2.prototype.init = function(gl){
	//  Configure WebGL
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
	//set-up buffers and shaders
	this.initBuffers(gl);
	//set-up and render vertices
	this.doRender(gl);
};

Assignment2.prototype.doRender = function(gl){
	gl.clear( gl.COLOR_BUFFER_BIT );
	
	//check for line buffer
	if(this.lineBufferId != null){
			this.setupShaderAttribs(gl, this.lineBufferId);
			//now draw the buffer contents
			gl.drawArrays( gl.LINE_STRIP, 0, this.nLinePts);
	}
	//poly line buffer
	if(this.polyBufferId != null){
			this.setupShaderAttribs(gl, this.polyBufferId);
			//now draw the buffer contents
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, this.nPolyPts);
	}
};

Assignment2.prototype.setupShaderAttribs = function(gl, bufferId){
	//bind to it, we might be using something else
	gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
	//tell open-gl what to do with the data in this buffer
	
	//point to vertex bytes
	var vPosition = gl.getAttribLocation( this.program, "vPosition" );
	//the verts begin from the start of the buffer and they are xy, and have to stride over rgba to get the next xy
	gl.vertexAttribPointer( vPosition, this.vertexComponents, gl.FLOAT, false, this.sizeOfFloat*(this.vertexComponents +this.colorComponents), 0);
	gl.enableVertexAttribArray( vPosition );
	
	//point to color bytes
	var vColor = gl.getAttribLocation( this.program, "vColor" );
	//the color components are packed right after the verts and they are rgba, so stride over verts and offset by verts
	gl.vertexAttribPointer( vColor, this.colorComponents, gl.FLOAT, false, this.sizeOfFloat*(this.vertexComponents +this.colorComponents), this.sizeOfFloat*this.vertexComponents);
	gl.enableVertexAttribArray( vColor );
};

Assignment2.prototype.startOrEndDrawingLine = function(xy){
	//draw line with alpha zero
	var curColor = this.color;
	//draw using transparent line (this way it looks like a seperate line segment)
	this.color = vec4(0,0,0,0);
	this.addLinePos(xy);
	//reset the drawing color
	this.color = curColor;
};

Assignment2.prototype.addLinePos = function(xy){
	var gl = this.gl;
	//check if line buffer has be bound yet 
	if(this.lineBufferId != null){
		//bind to it, we may be using another buffer 
		gl.bindBuffer( gl.ARRAY_BUFFER, this.lineBufferId );
		var byteOffset = this.nLinePts * this.sizeOfFloat * (this.vertexComponents + this.colorComponents);
		//data to push
		var toPush = xy.concat(this.color);
		gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, flatten(toPush));
		//increment this, we added a new point (this is actually our index into the buffer)
		this.nLinePts++;
		this.doRender(gl);
	}
};

Assignment2.prototype.startOrEndDrawingPoly = function(xy){
	//draw line with alpha zero
	var curColor = this.color;
	//draw using transparent line (this way it looks like a seperate line segment)
	this.color = vec4(0,0,0,0);
	this.addPolyPos(xy);
	//reset the drawing color
	this.color = curColor;
};

Assignment2.prototype.addPolyPos = function(xy){
	var gl = this.gl;
	//check if line buffer has be bound yet 
	if(this.polyBufferId != null){
		//bind to it, we may be using another buffer 
		gl.bindBuffer( gl.ARRAY_BUFFER, this.polyBufferId );
		var byteOffset = this.nPolyPts * this.sizeOfFloat * (this.vertexComponents + this.colorComponents);
		
		//we have a new point, we must consider the thickness either side, then add pts allows t then b 
		//	*t1 \	*t2
		//	*p1	 \	*p2
		//	*b1   \ *b2
		var p2 = vec2(xy);
		//direction vector P1->P2
		var dir = normalize(subtract( p2, this.prevPt ));
		
		var dirB = mult(vec2(1,-1), dir).reverse();
		var dirT = mult(vec2(-1,1), dir).reverse();
		var b2 = add(p2, scale(this.thickness, dirB));
		var t2 = add(p2, scale(this.thickness, dirT));
		
		//data to push
		var toPush = t2.concat(this.color, b2, this.color);
		gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, flatten(toPush));
		//increment this, we just added two new points (this is actually our index into the buffer)
		this.nPolyPts += 2;
		this.prevPt = p2;
		this.doRender(gl);
	}
};

Assignment2.prototype.initBuffers = function(gl){	
	// Create some buffers: 1 for line drawing, and 1 for poly drawing
	
	//First buffer, the one for line drawing
    this.lineBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, this.lineBufferId );
	//make a big buffer
    gl.bufferData( gl.ARRAY_BUFFER, this.sizeOfFloat * (this.vertexComponents + this.colorComponents) * this.maxPts, gl.STATIC_DRAW );
	
	//Second buffer, the one for poly line drawing
	this.polyBufferId = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, this.polyBufferId );
	gl.bufferData( gl.ARRAY_BUFFER, this.sizeOfFloat * (this.vertexComponents + this.colorComponents) * this.maxPts, gl.STATIC_DRAW );

};



