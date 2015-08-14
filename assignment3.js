///////////////////////////////////////////////
//////////Author: Luke Bermingham//////////////
///////////////////////////////////////////////

"use strict";

////////////////////////////////////////////////////////////////
//////ON LOAD///////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

//hook onto on-load event for the window, i.e. page is loaded now, so do stuff
var gl;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
	//make our graphics view-port same size as the canvas
	gl.viewport( 0, 0, canvas.width, canvas.height );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	//set-up our renderer
	var renderer = new Assignment3(gl);
	
	//set-up gui now that the renderer is ready
	new Gui(renderer);
	
};

///////////////////////////////////////////////////////////////
////////GUI////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Gui(renderer){
	this.setupDrawingState(renderer);
};

Gui.prototype.setupDrawingState = function(renderer){
	//update the drawing state of mouse up/down
	var that = this;
	var canvas = document.getElementById("gl-canvas");
	var label = document.getElementById("drawingLabel");
	
	
	var coordsLabel = document.getElementById("coordsLabel");
	var dragging = false;
	var lastMousePos = [];
	
	//listen for mouse up/down on canvas
	canvas.addEventListener("mousedown", function(evt){
		dragging = true;
		lastMousePos = that.extractXY(evt, canvas);
	});
	canvas.addEventListener("mouseup", function(evt){
		dragging = false;
	});
	canvas.addEventListener("mousemove", function(evt){
		var xy = that.extractXY(evt, canvas);
		coordsLabel.innerHTML = "(" + xy[0] + "," + xy[1] + ")";
		if(dragging){
			var deltaXY = [ xy[0] - lastMousePos[0], xy[1] - lastMousePos[1] ];
			renderer.scene.camera.rotate(-deltaXY[0], deltaXY[1]);
			lastMousePos = xy;
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

///////////////////////////////////////////////////////////////
//////////Assignment///////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Assignment3(gl){
	this.gl = gl;
	
	var canvas = document.getElementById( "gl-canvas" );
	this.scene = new GG.scene();
	
	this.init(gl);
	
	this.lastTime = Date.now();
	this.render(gl);
};

Assignment3.prototype.init = function(gl){
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
	
	//key controls
	var scene = this.scene;
	GG.addKeyListener(GG.upKey, function(){scene.camera.drive([0,0,1,0], 1);})
	GG.addKeyListener(GG.downKey, function(){scene.camera.drive([0,0,1,0], -1);})
	GG.addKeyListener(GG.rightKey, function(){scene.camera.drive([1,0,0,0], -1);})
	GG.addKeyListener(GG.leftKey, function(){scene.camera.drive([1,0,0,0], 1);})
	
	//var cube = new GG.cube();
	//cube.drawOutline = true;
	
	//var cone = new GG.cone();
	//cone.drawOutline = true;
	
	//var cylinder = new GG.cylinder();
	//cylinder.drawOutline = true;
	
	var sphere = new GG.sphere();
	sphere.drawOutline = true;
	
	this.scene.addRenderable(sphere);
};

Assignment3.prototype.render = function(gl){
	
	var that = this;
	
	window.requestAnimFrame(function(){that.render(gl);});

	//compute delta time
	var currentTime = Date.now();
	GG.deltaTime = currentTime - this.lastTime;
	this.lastTime = currentTime;
	//render
	this.scene.render(gl);
	
};





