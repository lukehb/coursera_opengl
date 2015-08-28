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
	var renderer = new Assignment4(gl);
	
	//set-up gui now that the renderer is ready
	new Gui(gl, renderer);
	
};

///////////////////////////////////////////////////////////////
////////GUI////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Gui(gl, renderer){
	this.setupDrawingState(gl, renderer);
	this.hookupMaterials(renderer);
	this.hookupLights(renderer);
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
		offsetY = target.height - (evt.clientY - rect.top);
		var renderable = renderer.scene.pick(gl, offsetX, offsetY, target.width, target.height);
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

Gui.prototype.hookupLights = function(renderer){
	var that = this;
	var updateLight = function(i){
		return function(){renderer.scene.lights[i] = that.getLight(i + 1);};
	};
		
	var prefixes = ["light1", "light2"];
	for(var i = 0; i < prefixes.length; i++){
		var prefix = prefixes[i];
		var f = updateLight(i);
		var sliderFunc = function(evt){
			var target = (evt.target || evt.srcElement);
			document.getElementById(target.id + "Label").innerHTML = target.value;
			f();
		};
		
		document.getElementById(prefix + "Enabled").addEventListener("change",  f);
		document.getElementById(prefix + "AmbientColorPicker").addEventListener("change",  f);
		document.getElementById(prefix + "DiffuseColorPicker").addEventListener("change", f);
		document.getElementById(prefix + "SpecularColorPicker").addEventListener("change", f);
		
		var cAttLabel = document.getElementById(prefix + "CAttenuationLabel");
		document.getElementById(prefix + "CAttenuation").addEventListener("input", sliderFunc);
		var lAttLabel = document.getElementById(prefix + "LAttenuationLabel");
		document.getElementById(prefix + "LAttenuation").addEventListener("input", sliderFunc);
		var qAttLabel = document.getElementById(prefix + "QAttenuationLabel");
		document.getElementById(prefix + "QAttenuation").addEventListener("input", sliderFunc);
	}
};

Gui.prototype.getLight = function(lightNumber){
	var prefix = "light" + lightNumber;
	var light = new GG.pointLight();
	light.enabled = document.getElementById(prefix + "Enabled").checked;
	light.ambient = GG.hex2Rgb(document.getElementById(prefix + "AmbientColorPicker").value);
	light.diffuse = GG.hex2Rgb(document.getElementById(prefix + "DiffuseColorPicker").value);
	light.specular = GG.hex2Rgb(document.getElementById(prefix + "SpecularColorPicker").value);
	light.constantAttenutation = document.getElementById(prefix + "CAttenuation").value;
	light.linearAttenutation = document.getElementById(prefix + "LAttenuation").value;
	light.quadraticAttenutation = document.getElementById(prefix + "QAttenuation").value;
	return light;
};

Gui.prototype.hookupMaterials = function(renderer){
	var that = this;
	var updateMaterial = function(){
		if(renderer.currentRenderable != null){
			renderer.currentRenderable.material = that.getMaterial();
		}
	};
	document.getElementById("diffuseColorPicker").addEventListener("change", function(evt){updateMaterial();});
	document.getElementById("ambientColorPicker").addEventListener("change", function(evt){updateMaterial();});
	document.getElementById("specularColorPicker").addEventListener("change", function(evt){updateMaterial();});
	var shininessLabel = document.getElementById("shininessLabel");
	document.getElementById("shininess").addEventListener("input", function(evt){
		updateMaterial();
		var target = evt.target || evt.srcElement;
		shininessLabel.innerHTML = target.value;
	});
};

Gui.prototype.getMaterial = function(){
	var mat = new GG.material();
	mat.diffuse = GG.hex2Rgb(document.getElementById("diffuseColorPicker").value);
	mat.ambient = GG.hex2Rgb(document.getElementById("ambientColorPicker").value);
	mat.specular = GG.hex2Rgb(document.getElementById("specularColorPicker").value);
	mat.shininess = document.getElementById("shininess").value;
	return mat;
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
				var target = evt.target || evt.srcElement;
				var label = document.getElementById(target.id + "Label");
				label.innerHTML = target.value;
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
			that.resetSliders(renderer);
			renderable.transform = that.getTransformFromSliders();
			that.makeSelection(renderer, renderable);
			
			//assign shaders
			var vertShaderText = GG.getShaderText("vertex-shader");
			var fragShaderText = GG.getShaderText("fragment-shader");
			renderable.vertShaderText = vertShaderText;
			renderable.fragShaderText = fragShaderText;
			
			//assign material
			renderable.material = that.getMaterial();
			
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
	return transform;
};

Gui.prototype.setSliderValues = function(translation, rotation, scale){
	document.getElementById("xTrans").value = translation[0];
	document.getElementById("yTrans").value = translation[1];
	document.getElementById("zTrans").value = translation[2];
	document.getElementById("xTransLabel").innerHTML = translation[0];
	document.getElementById("yTransLabel").innerHTML = translation[1];
	document.getElementById("zTransLabel").innerHTML = translation[2];
	
	document.getElementById("xRot").value = rotation[0];
	document.getElementById("yRot").value = rotation[1];
	document.getElementById("zRot").value = rotation[2];
	document.getElementById("xRotLabel").innerHTML = rotation[0];
	document.getElementById("yRotLabel").innerHTML = rotation[1];
	document.getElementById("zRotLabel").innerHTML = rotation[2];
	
	document.getElementById("xScale").value = scale[0];
	document.getElementById("yScale").value = scale[1];
	document.getElementById("zScale").value = scale[2];
	document.getElementById("xScaleLabel").innerHTML = scale[0];
	document.getElementById("yScaleLabel").innerHTML = scale[1];
	document.getElementById("zScaleLabel").innerHTML = scale[2];
};

Gui.prototype.setMaterialValues = function(material){
	
	document.getElementById("ambientColorPicker").value = GG.rgb2Hex(Math.round(material.ambient[0]*255), Math.round(material.ambient[1] * 255), Math.round(material.ambient[2] * 255));
	
	document.getElementById("diffuseColorPicker").value = GG.rgb2Hex(Math.round(material.diffuse[0]*255), Math.round(material.diffuse[1]*255), Math.round(material.diffuse[2]*255));
	
	document.getElementById("specularColorPicker").value = GG.rgb2Hex(Math.round(material.specular[0]*255), Math.round(material.specular[1]*255), Math.round(material.specular[2]*255));
	
	document.getElementById("shininess").value = material.shininess;
	document.getElementById("shininessLabel").innerHTML = material.shininess;
};

Gui.prototype.makeSelection = function(renderer, renderable){
	if(renderable != null && "name" in renderable){
		document.getElementById("selectedPolygon").innerHTML = renderable.name;
		//set sliders from transform
		var translation = renderable.getTranslation();
		var scale = renderable.getScale();
		var rotation = renderable.getRotation();
		this.setSliderValues(translation, rotation, scale);
		this.setMaterialValues(renderable.material);
	}else{
		document.getElementById("selectedPolygon").innerHTML = "none";
	}
	renderer.currentRenderable = renderable;
};

///////////////////////////////////////////////////////////////
//////////Assignment///////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Assignment4(gl){
	this.gl = gl;
	var canvas = document.getElementById( "gl-canvas" );
	this.scene = new GG.scene();
	this.currentRenderable = null;
	this.init(gl);
	this.lastTime = Date.now();
	this.render(gl);
};

Assignment4.prototype.init = function(gl){
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
	
	//key controls
	var scene = this.scene;
	GG.addKeyListener(GG.upKey, function(){scene.camera.drive([0,0,1,0], 1);})
	GG.addKeyListener(GG.downKey, function(){scene.camera.drive([0,0,1,0], -1);})
	GG.addKeyListener(GG.rightKey, function(){scene.camera.drive([1,0,0,0], -1);})
	GG.addKeyListener(GG.leftKey, function(){scene.camera.drive([1,0,0,0], 1);})
	
	//ground
 	var plane = new GG.plane();
	var vertShaderText = GG.getShaderText("vertex-shader");
	var fragShaderText = GG.getShaderText("fragment-shader");
	plane.vertShaderText = vertShaderText;
	plane.fragShaderText = fragShaderText;
	plane.transform = mult(scalem(100, 1, 100), mult(translate(0,-1,0), plane.transform));
	var groundMat = new GG.material();
	groundMat.diffuse = new Float32Array([0.2, 0.2, 0.2, 1.0]);
	groundMat.specular = new Float32Array([0.9, 0.9, 0.9, 1.0]);
	groundMat.ambient = new Float32Array([0.8, 0.8, 0.8, 1.0]);
	groundMat.shininess = 100;
	plane.material = groundMat;
	this.scene.addRenderable(plane);
	
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

Assignment4.prototype.render = function(gl){
	
	var that = this;
	
	window.requestAnimFrame(function(){that.render(gl);});

	//compute delta time
	var currentTime = Date.now();
	GG.deltaTime = currentTime - this.lastTime;
	this.lastTime = currentTime;
	
	//move lights
	this.moveLightAroundCircle(this.scene.lights[0], 37, 1, 5, GG.deltaTime);
	this.moveLightAroundCircle(this.scene.lights[1], 137, -1, 5, GG.deltaTime);
	
	//render
	this.scene.render(gl);
	
};

Assignment4.prototype.moveLightAroundCircle = function(light, degreesPerSecond, direction, radius, deltaTime){
	//determine current degrees
	var curDegrees = Math.atan2(light.position[2], light.position[0]);
	var degrees = deltaTime/1000.0 * degreesPerSecond * direction;
	var rads = curDegrees + radians(degrees);
	var x = radius * Math.cos(rads);
	var z = radius * Math.sin(rads);
	light.position[0] = x;
	light.position[2] = z;
};





