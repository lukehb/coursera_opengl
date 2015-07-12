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
	var renderer = new Assignment1(gl);
	
	//set-up gui now that the renderer is ready
	new Gui(renderer);
	
};

///////////////////////////////////////////////////////////////
////////GUI////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Gui(renderer){
	this.setupDivisionsSlider(renderer);
	this.setupRotationSlider(renderer);
	this.setupGasketCheckbox(renderer);
	this.setupRadioGroup(renderer);
};

Gui.prototype.setupRadioGroup = function(renderer){
	var radioTri = document.getElementById("radioTri");
	radioTri.addEventListener("click", function(){
		renderer.setIsTri(true);
	});
	var radioSquare = document.getElementById("radioSquare");
	radioSquare.addEventListener("click", function(){
		renderer.setIsTri(false);
	});
};

Gui.prototype.setupGasketCheckbox = function(renderer){
	//get the gasket check-box
	var gasketCheckbox = document.getElementById("gasketCheckbox");
	gasketCheckbox.addEventListener("change", function(evt){
		var checkbox = evt.target;
		renderer.setGasketMode(checkbox.checked);
	});
};

Gui.prototype.setupDivisionsSlider = function(renderer){
	//update the number of divisions our rendering has based on slider value
	var slider = document.getElementById("nDivisionsSlider");
	var label = document.getElementById("nSubDivisionsLabel");
	
	label.innerHTML = slider.value;
	
	var update = function(){
		renderer.setNDivisions(slider.value);
		label.innerHTML = slider.value;
	};

	//when mouse is released
	slider.addEventListener("change", update);
	//while dragging
	slider.addEventListener("input", update);
	
};

Gui.prototype.setupRotationSlider = function(renderer){
	//update the number of divisions our rendering has based on slider value
	var slider = document.getElementById("rotationSlider");
	var label = document.getElementById("rotationLabel");
	
	label.innerHTML = slider.value;
	
	var update = function(){
		renderer.setRotation(slider.value);
		label.innerHTML = slider.value;
	};

	//when mouse is released
	slider.addEventListener("change", update);
	//while dragging
	slider.addEventListener("input", update);
	
};

///////////////////////////////////////////////////////////////
//////////Renderer/////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function Assignment1(gl){
	
	this.gl = gl;
	this.nDivisions = 7;
	this.theta = 1;
	this.gasketMode = false;
	this.isTri = true;
	this.init(gl);
	
};

//getters and setters
Assignment1.prototype.setNDivisions = function(nDivisions){
	this.nDivisions = nDivisions;
	//if divisions were changed update the rendering
	this.doRender(this.gl);
};

Assignment1.prototype.setIsTri = function(isTri){
	this.isTri = isTri;
	//if divisions were changed update the rendering
	this.doRender(this.gl);
};

Assignment1.prototype.setRotation = function(theta){
	this.theta = theta;
	//if divisions were changed update the rendering
	this.doRender(this.gl);
};

Assignment1.prototype.setGasketMode = function(isEnabled){
	this.gasketMode = isEnabled;
	//if divisions were changed update the rendering
	this.doRender(this.gl);
};

Assignment1.prototype.init = function(gl){
	//  Configure WebGL
    gl.clearColor( 0, 0, 0, 1.0 );
	//set-up and render vertices
	this.doRender(gl);
};

Assignment1.prototype.render = function(gl, vertices){
	gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, vertices.length/2 );
};

Assignment1.prototype.doRender = function(gl){
	this.render(gl, this.initVerts(gl));
};

Assignment1.prototype.initVerts = function(gl){	
	var vertices = this.isTri ? 
		this.subdivideTri(vec2(-0.5, -0.5),vec2(0, 0.5),vec2(0.5, -0.5),this.nDivisions) :
		this.subdivideSquare(vec2(-0.5, -0.5),vec2(-0.5, 0.5),vec2(0.5, 0.5),vec2(0.5, -0.5),this.nDivisions);
	
	//rotate each vertex
	this.rotateVertices(vertices);
	
	//convert the vertices to Float32Array
	vertices = flatten(vertices);
	
	// Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW );
	
	//  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
	
    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	return vertices;
};

Assignment1.prototype.rotateVertices = function(vertices){
	
	for(var i=0; i < vertices.length; i+=2){
		var x = vertices[i];
		var y = vertices[i+1];
		//rotate using: (x′=xcosθ−ysinθ) (y′=xsinθ+ycosθ)
		var dtheta = this.theta * Math.sqrt( Math.pow(x,2) + Math.pow(y,2) );
		//set x' and y'
		var cosDTheta = Math.cos(dtheta);
		var sinDTheta = Math.sin(dtheta);
		vertices[i] = x*cosDTheta - y*sinDTheta;
		vertices[i+1] = x*sinDTheta + y*cosDTheta;
	}
	
};

Assignment1.prototype.subdivideSquare = function(ptA, ptB, ptC, ptD, nDivisions){
	
	var verts = [];
	var that = this;
	
	//no need to subdivide, we are at the appropriate depth, store this triangle
	if(nDivisions == 0){
		//triangle ABC and triangle BCD
		verts = verts.concat(ptA, ptB, ptC, ptB, ptC, ptD);
	}else{
		//keep subdividing - decrement because this is one subdivision
		nDivisions--;
		//find the bisector of each triangle edge
		var ptAB = mix(ptA, ptB, 0.5);
		var ptAD = mix(ptA, ptD, 0.5);
		var ptBC = mix(ptB, ptC, 0.5);
		var ptCD = mix(ptC, ptD, 0.5);
		var mid = mix(ptAB, ptCD, 0.5);
		//add new triangles to output verts
		var subDivideOrNot = function(squareVerts){
			return (nDivisions > 0) ? that.subdivideSquare(squareVerts[0], squareVerts[1], squareVerts[2], squareVerts[3], nDivisions) : 
			[].concat(squareVerts[0], squareVerts[1], squareVerts[2], squareVerts[2], squareVerts[3], squareVerts[0]);
		};

		//rect A-AB-mid-AD
		verts = verts.concat( subDivideOrNot([ptA, ptAB, mid, ptAD], nDivisions) );
		//rect AB-B-BC-mid
		verts = verts.concat( subDivideOrNot([ptAB, ptB, ptBC, mid], nDivisions) );
		//rect mid-BC-C-CD
		verts = verts.concat( subDivideOrNot([mid, ptBC, ptC, ptCD], nDivisions) );
		//rect AD-mid-CD-D
		if(!this.gasketMode){
			verts = verts.concat( subDivideOrNot([ptAD, mid, ptCD, ptD], nDivisions) );
		}
	}
	return verts;
};


Assignment1.prototype.subdivideTri = function(ptA, ptB, ptC, nDivisions){
	
	var verts = [];
	var that = this;
	
	//no need to subdivide, we are at the appropriate depth, store this triangle
	if(nDivisions == 0){
		verts = verts.concat(ptA, ptB, ptC);
	}else{
		//keep subdividing - decrement because this is one subdivision
		nDivisions--;
		//find the bisector of each triangle edge
		var ptAB = mix(ptA, ptB, 0.5);
		var ptAC = mix(ptA, ptC, 0.5);
		var ptBC = mix(ptB, ptC, 0.5);
		//add new triangles to output verts
		var subDivideOrNot = function(triVerts){
			return (nDivisions > 0) ? that.subdivideTri(triVerts[0], triVerts[1], triVerts[2], nDivisions) : [].concat(triVerts[0], triVerts[1], triVerts[2]);
		};

		//tri AB-B-BC
		verts = verts.concat( subDivideOrNot([ptAB, ptB, ptBC], nDivisions) );
		//tri A-AB-AC
		verts = verts.concat( subDivideOrNot([ptA, ptAB, ptAC], nDivisions) );
		//tri AC-BC-C
		verts = verts.concat( subDivideOrNot([ptAC, ptBC, ptC], nDivisions) );
		//tri AC-AB-BC
		if(!this.gasketMode){
			verts = verts.concat( subDivideOrNot([ptAC, ptAB, ptBC], nDivisions) );
		}
	}
	return verts;
};
