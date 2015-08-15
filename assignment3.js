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
	new Gui(gl, renderer);
	
};

///////////////////////////////////////////////////////////////
////////GUI////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Gui(gl, renderer){
	this.setupDrawingState(gl, renderer);
	this.hookUpSliders(renderer);
	this.hookupButtons(renderer);
	this.hookupMenu(renderer);
};

Gui.prototype.setupDrawingState = function(gl, renderer){
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
	canvas.addEventListener("click", function(evt){
		var target = evt.target || evt.srcElement,
		rect = target.getBoundingClientRect(),
		offsetX = evt.clientX - rect.left,
		offsetY = evt.srcElement.height - (evt.clientY - rect.top);
		var renderable = renderer.scene.pick(gl, offsetX, offsetY);
		if(renderable != null){
			that.makeSelection(renderer, renderable);
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

Gui.prototype.hookupMenu = function(renderer){
	var polygonDropDown = document.getElementById("polygonMenu");
	var that = this;
	polygonDropDown.addEventListener("change", function(evt){
		that.makeSelection(renderer, null);
		that.resetSliders();
	});
};

Gui.prototype.hookUpSliders = function(renderer){
	var dimensions = ["x", "y", "z"];
	var transformNames = ["Trans", "Rot", "Scale"];
	var that = this;
	for(var i = 0; i < transformNames.length; i++){
		var transform = transformNames[i];
		for(var j = 0; j < dimensions.length; j++){
			var dimension = dimensions[j];
			var slider = document.getElementById(dimension + transform);
			slider.addEventListener("input", function(evt){
				var label = document.getElementById(evt.srcElement.id + "Label");
				label.innerHTML = evt.srcElement.value;
				if(renderer.currentRenderable != null){
					renderer.currentRenderable.transform = that.getTransformFromSliders();
				}
			});
		}
	}
};

Gui.prototype.resetSliders = function(renderer){
	var dimensions = ["x", "y", "z"];
	var transformNames = ["Trans", "Rot", "Scale"];
	var that = this;
	for(var i = 0; i < transformNames.length; i++){
		var transform = transformNames[i];
		for(var j = 0; j < dimensions.length; j++){
			var dimension = dimensions[j];
			var slider = document.getElementById(dimension + transform);
			slider.value = slider.getAttribute("data-initial");
			var label = document.getElementById(slider.id + "Label");
			label.innerHTML = slider.value;
		}
	}
};

Gui.prototype.hookupButtons = function(renderer){
	var placePolygonBtn = document.getElementById("placePolygonBtn");
	var that = this;
	placePolygonBtn.addEventListener("click", function(evt){
		var polygonDropDown = document.getElementById("polygonMenu");
		var polygonMode = polygonDropDown.options[polygonDropDown.selectedIndex].text;
		var renderable = null;
		switch(polygonMode){
			case "cube":
				renderable = new GG.cube();
				break;
			case "sphere":
				renderable = new GG.sphere();
				break;
			case "cylinder":
				renderable = new GG.cylinder();
				break;
			case "cone":
				renderable = new GG.cone();
				break;
		}
		if(renderable != null){
			renderable.drawOutline = true;
			renderable.transform = that.getTransformFromSliders();
			that.makeSelection(renderer, renderable);
			renderer.scene.addRenderable(renderable);
		}
	});
	
	//hook up delete button
	var deleteBtn = document.getElementById("removePolygonBtn");
	deleteBtn.addEventListener("click", function(evt){
		if(renderer.currentRenderable != null){
			renderer.scene.remove(renderer.currentRenderable);
			that.makeSelection(renderer, null);
			that.resetSliders(renderer);
		}
	});
};

Gui.prototype.getTransformFromSliders = function(){
	var xTrans = document.getElementById("xTrans").value;
	var yTrans = document.getElementById("yTrans").value;
	var zTrans = document.getElementById("zTrans").value;
	var xRot = document.getElementById("xRot").value;
	var yRot = document.getElementById("yRot").value;
	var zRot = document.getElementById("zRot").value;
	var xScale = document.getElementById("xScale").value;
	var yScale = document.getElementById("yScale").value;
	var zScale = document.getElementById("zScale").value;
	var translation = translate(xTrans, yTrans, zTrans);
	var rotationX = rotate(xRot, [1,0,0]);
	var rotationY = rotate(yRot, [0,1,0]);
	var rotationZ = rotate(zRot, [0,0,1]);
	var rotation = mult(mult(rotationZ, rotationY), rotationX);
	var scale = scalem(xScale, yScale, zScale);
	var transform = mult(mult(translation, rotation), scale);
	return flatten(transform);
};

Gui.prototype.makeSelection = function(renderer, renderable){
	if(renderable != null && "name" in renderable){
		document.getElementById("selectedPolygon").innerHTML = renderable.name;
	}else{
		document.getElementById("selectedPolygon").innerHTML = "none";
	}
	renderer.currentRenderable = renderable;
};

///////////////////////////////////////////////////////////////
//////////Assignment///////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Assignment3(gl){
	this.gl = gl;
	var canvas = document.getElementById( "gl-canvas" );
	this.scene = new GG.scene();
	this.currentRenderable = null;
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
	
	//var sphere = new GG.sphere();
	//sphere.drawOutline = true;
	
	//this.scene.addRenderable(sphere);
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





