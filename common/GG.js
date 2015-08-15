///////////////////////////////////////////////
//////////Author: Luke Bermingham//////////////
//Framework for simple gfx: "Ground Graphics"//
///////////////////////////////////////////////

function GG(){};

///////////////////////////////
////////STATIC VARIABLES///////
///////////////////////////////
GG.deltaTime = 1;

///////////////////////////////
////////CONSTANTS//////////////
///////////////////////////////
GG.SIZE_OF_FLOAT = new Float32Array([137]).byteLength;

////////////////////////////////
//////GENERAL///////////////////
////////////////////////////////
GG.isA = function(childClass, baseClass){
	childClass.prototype = Object.create(baseClass.prototype);
	childClass.prototype.constructor = childClass;
};

////////////////////////////////
//////INPUTS////////////////////
////////////////////////////////

GG.leftKey = 37;
GG.upKey = 38;
GG.rightKey = 39;
GG.downKey = 40;

GG.addKeyListener = function(keyCode, callback){
	if(typeof keyCode == "number"){
		window.addEventListener("keydown", function(evt){
			if(evt.keyCode == keyCode){
				if(callback != null){
					callback();
				}
			}
		});
	}
};

////////////////////////////////
//////////Color/////////////////
////////////////////////////////
GG.nextRgb = function(){
	//use golden ratio conjugate
	var goldenConj = 0.618033988749895;
	var hue = Math.random();
	hue += goldenConj;
	hue %= 1;
	return GG.hsv2Rgb(hue, 0.5, 0.95);
};

GG.hsv2Rgb = function(h, s, v){
	//from: http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
	var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return new Float32Array([r,g,b,1]);
};

GG.rgbToInt = function(r, g, b){
	var rgb = r;
	rgb = (rgb << 8) + g;
	rgb = (rgb << 8) + b;
	return rgb;
};

////////////////////////////////
//////////Shaders///////////////
////////////////////////////////
GG.shaderTypes = {vertex: "VERTEX", fragment: "FRAGMENT"};

GG.simpleVertShader = "attribute vec4 vPosition;" +
					  "uniform mat4 mvp;" +
					  "uniform mat4 transform;" +
					  "void main(){" +
							"gl_Position = mvp * transform * vPosition;" +
					  "}";

GG.simpleFragShader = "precision mediump float;" +
					  "uniform vec4 uColor;" +
					  "void main(){" +
							"gl_FragColor = uColor;" +
					  "}";

GG.getShaderText = function(shaderScriptId, shaderType){
	if(shaderScriptId == null){
		return (shaderType == GG.shaderTypes.vertex) ? GG.simpleVertShader : GG.simpleFragShader;
	}
	var elem = document.getElementById( shaderScriptId );
	if(elem == null || typeof elem.getAttribute("type") != "string"){
		throw "There was no " + shaderType + " shader with the id: " + shaderScriptId;
	}
	return elem.text;
};

GG.compileShader = function(gl, shaderText, shaderType){
    var shader = gl.createShader( shaderType == GG.shaderTypes.vertex ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER );
    gl.shaderSource( shader, shaderText );
    gl.compileShader( shader );
	if ( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
		throw "Vertex shader failed to compile.  The error log is:" + gl.getShaderInfoLog( shader );
	}
	return shader;
};

GG.initShaders = function initShaders( gl, vertShaderText, fragmentShaderText ){
    var vertShdr = GG.compileShader(gl, vertShaderText, GG.shaderTypes.vertex);
    var fragShdr = GG.compileShader(gl, fragmentShaderText, GG.shaderTypes.fragment);
    var program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );
    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        throw "Shader program failed to link.  The error log is:" + gl.getProgramInfoLog( program );
    }
    return program;
}

////////////////////////////////
///////////Camera///////////////
////////////////////////////////
GG.camera = function(eye, camSpeed, projection){
	this.eye = (eye != null && Array.isArray(eye)) ? eye : [0,0,-5];
	this.camSpeed = (camSpeed != null && typeof camSpeed == "number") ? camSpeed : 0.02;
	this.rotSpeed = 2;
	this.projection = (Array.isArray(projection) && projection.length == 16) ? projection : perspective(90, 1, 0.5, 100);
	//rotation around x
	this.pitch = 0;
	//rotation around y
	this.yaw = 0;
	this.update();
};

GG.camera.prototype.update = function(){
	var rot = mult( rotate(this.pitch, [1,0,0]), rotate(this.yaw, [0,1,0]) );
	var trans = translate(this.eye[0], this.eye[1], this.eye[2]);
	var m = mult(rot, trans);
	var out = mult(this.projection, m);
	this.mvp = flatten(out);
};

GG.camera.prototype.getMVP = function(){
	return this.mvp;
};

GG.camera.prototype.unproject = function(x,y,z){
	  // Compute the inverse of the perspective x model-view matrix.
	  var iMVP = inverse(this.mvp);
	  var normalisedClick = vec4(x,y,z,1);
	  //take click in clip coordinates to perspective x model-view coordinates.
	  var forward = mult(iMVP, normalisedClick);

	  if (forward[3] == 0.0) {
		return false;
	  }
	  //normalise the forward vector
	  return vec3(normalize(forward));
};

GG.camera.prototype.rotate = function(yaw, pitch){
	this.pitch += pitch * this.rotSpeed * GG.deltaTime;
	this.yaw += yaw * this.rotSpeed * GG.deltaTime;
	this.update();
};

//move camera forward or backwards
GG.camera.prototype.drive = function(unitDirectionVec, dir){

	var drive = this.camSpeed * dir * GG.deltaTime;
	
	var movement = scale(drive, unitDirectionVec);
	var rot = mult( rotate(this.pitch, [1,0,0]), rotate(this.yaw, [0,1,0]) );
	var rotatedMovement = mult(rot, movement);
	var movementLength = length(movement);
	rotatedMovement = scale(movementLength/length(rotatedMovement), rotatedMovement);
	
	this.eye[0] += rotatedMovement[0];
	this.eye[1] += rotatedMovement[1];
	this.eye[2] += rotatedMovement[2];
	this.update();
};

////////////////////////////////
///////////Scene////////////////
////////////////////////////////
GG.scene = function(){
	this.renderables = {};
	this.camera = new GG.camera();
	this.initialised = false;
	//a method passed to renderables to bind them to the scene
	var that = this;
	this.bindToScene = function(gl, shaderProgram){
		var uMVP = gl.getUniformLocation(shaderProgram, "mvp");
		gl.uniformMatrix4fv(uMVP, false, that.camera.getMVP());
	};
};

GG.scene.prototype.init = function(gl){
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 2.0);
	//for reading pixels
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
};

GG.scene.prototype.pick = function(gl, x, y){
	var pixels = new Uint8Array(4);
	this.render(gl);
	gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	var rgbInt = GG.rgbToInt(pixels[0], pixels[1], pixels[2]);
	if(rgbInt in this.renderables){
		return this.renderables[rgbInt];
	}
};

GG.scene.prototype.remove = function(renderable){
	var rgb = renderable.color;
	var rgbInt = GG.rgbToInt(Math.round(rgb[0]*255), Math.round(rgb[1]*255), Math.round(rgb[2]*255));
	delete this.renderables[rgbInt];
};

GG.scene.prototype.render = function(gl){
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	if(!this.initialised){
		this.init(gl);
		this.initialised = true;
	}
	
	for(var key in this.renderables){
		var toRender = this.renderables[key];
		if("render" in toRender){
			toRender.render(gl);
		}
	}
};

GG.scene.prototype.addRenderable = function(renderable){
	//give the renderable the bind to scene function
	renderable.bindToScene = this.bindToScene;
	//generate a new color for the renderable
	var makeColor = true;
	while(makeColor){
		var rgb = GG.nextRgb();
		var rgbInt = GG.rgbToInt(Math.round(rgb[0]*255), Math.round(rgb[1]*255), Math.round(rgb[2]*255));
		//check if we already have this color
		if(!this.renderables.hasOwnProperty(rgbInt)){
			renderable.color = rgb;
			this.renderables[rgbInt] = renderable;
			makeColor = false;
		}
	}
};

////////////////////////////////
//////////Node//////////////////
////////////////////////////////
GG.node = function(transform){
	if(!Array.isArray(transform)){
		//just use identity matrix
		transform = flatten(mat4(1));
	}
	this.transform = transform;
};
GG.node.prototype.getTransform = function(){
	return this.transform;
};


////////////////////////////////
////////RENDERABLE//////////////
////////////////////////////////
GG.renderable = function(vertShaderId, fragShaderId, transform){
	//call base constructor
	GG.node.apply(this, [transform]);
	this.vertShaderText = GG.getShaderText(vertShaderId, GG.shaderTypes.vertex);
	this.fragShaderText = GG.getShaderText(fragShaderId, GG.shaderTypes.fragment);
	//-1 bufferId and null shaderProgram indicates it is uninitialised
	this.bufferId = -1;
	this.shaderProgram = null;
	this.color = new Float32Array([0.4, 0.4, 0.4, 1.0]);
	this.drawOutline = false;
	this.outlineColor = new Float32Array([0, 0, 0, 1.0]);
	this.initialised = false;
	this.faces = 0;
	this.vertsPerFace = 3;
}; 
//make renderables extend nodes
GG.isA(GG.renderable, GG.node);

GG.renderable.prototype.useShader = function(gl){
	if(this.shaderProgram == null){
		this.shaderProgram = GG.initShaders(gl, this.vertShaderText, this.fragShaderText);
	}
	gl.useProgram(this.shaderProgram);
};

GG.renderable.prototype.initialise = function(gl){
	throw "Concrete class of renderable must implement initialisation behaviour.";
};

GG.renderable.prototype.bind = function(gl, outlineMode){
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferId);
	var vPosition = gl.getAttribLocation( this.shaderProgram, "vPosition" );
	//set-up pointer for vertexPosition
	gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray( vPosition );
	//set-transform
	var uTransform = gl.getUniformLocation(this.shaderProgram, "transform");
	gl.uniformMatrix4fv(uTransform, false, this.transform);
	//set-up the colour location
	var uColor = gl.getUniformLocation(this.shaderProgram, "uColor");
	//depends whether we are drawing the poly or the outline
	gl.uniform4fv(uColor, (outlineMode) ? this.outlineColor : this.color);
};

GG.renderable.prototype.bindFor

GG.renderable.prototype.draw = function(gl, outlineMode){
	for(var face = 0; face < this.faces; face++){
		var offset = face * this.vertsPerFace;
		if(outlineMode){
			gl.drawArrays(gl.LINE_LOOP, offset, this.vertsPerFace);
		}else{
			gl.drawArrays(gl.TRIANGLE_FAN, offset, this.vertsPerFace);
		}
	}
};

GG.renderable.prototype.render = function(gl){
	this.useShader(gl);
	//if not initialised, initialise the buffer
	if(this.bufferId == -1){
		this.bufferId = gl.createBuffer();
	}
	this.bind(gl, false);
	//if scene binding has been passed in
	if("bindToScene" in this){
		this.bindToScene(gl, this.shaderProgram);
	}
	if(!this.initialised){
		this.initialise(gl);
		this.initialised = true;
	}
	this.draw(gl, false);
	
	//then draw outline, requires rebind and second draw call
	if(this.drawOutline){
		this.bind(gl, true);
		this.draw(gl, true);
	}
};

////////////////////////////////
////////SHAPE FACTORY///////////
////////////////////////////////

//cube
GG.cube = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.faces = 6;
	this.vertsPerFace = 4;
	this.name = "cube";
};
GG.isA(GG.cube, GG.renderable);

GG.cube.prototype.initialise = function(gl){
	var verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1]];
	//36 vertices because we draw each triangle redundantly (using gl.TRIANGLES)
	var cubeVerts = new Float32Array([].concat(
		verts[0], verts[1], verts[2], verts[3], //front
		verts[4], verts[5], verts[6], verts[7], //back
		verts[1], verts[4], verts[7], verts[2], //right
		verts[5], verts[0], verts[3], verts[6], //left
		verts[3], verts[2], verts[7], verts[6], //top
		verts[5], verts[4], verts[1], verts[0] //bottom
	));
	gl.bufferData( gl.ARRAY_BUFFER, cubeVerts, gl.STATIC_DRAW );
};

//cone
GG.cone = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.divisions = 12;
	this.name = "cone";
};
GG.isA(GG.cone, GG.renderable);

GG.cone.prototype.initialise = function(gl){
	//starting vert - top center
	var data = [];
	//top of cone
	var angleIncrement = 360/this.divisions;
	
	var addVert = function(vert){
		data = data.concat(vert);
	};
	
	for(var part = 0; part < 2; part++){
		var mid = [0, part, 0];
		addVert(mid);
		for(var angle = 0; angle < 360; angle += angleIncrement){
			var theta = radians(angle);
			//note we don't do r * cos(a), because we assume radius is 1
			var edge = [Math.cos(theta),1,Math.sin(theta)];
			addVert(edge);
			if(angle != 0){
				addVert(edge);
				addVert(mid);
			}
		}
		//loop back to the vert at zero degrees
		addVert([Math.cos(0),1,Math.sin(0)]);
	}
	this.faces = data.length/9;
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};


//cylinder
GG.cylinder = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.divisions = 12;
	this.name = "cylinder";
};
GG.isA(GG.cylinder, GG.renderable);

GG.cylinder.prototype.initialise = function(gl){
	var data = [];
	var angleIncrement = 360/this.divisions;
	
	var addVert = function(vert){
		data = data.concat(vert);
	};

	var top = [0, 1, 0];
	var bottom = [0, 0, 0];
	
	//do top first
	for(var angle = 0; angle < 360; angle += angleIncrement){
		addVert(top);
		var theta1 = radians(angle);
		var theta2 = radians(angle + angleIncrement);
		//note we don't do r * cos(a), because we assume radius is 1
		var topedge1 = [Math.cos(theta1),1,Math.sin(theta1)];
		var topedge2 = [Math.cos(theta2),1,Math.sin(theta2)];
		var botedge1 = [topedge1[0], 0, topedge1[2]];
		var botedge2 = [topedge2[0], 0, topedge2[2]];
		addVert(topedge1);
		addVert(topedge2);
		//go down
		addVert(topedge2);
		addVert(botedge2);
		addVert(botedge1);
		//bottom
		addVert(botedge1);
		addVert(bottom);
		addVert(botedge2);
		//go back up
		addVert(botedge1);
		addVert(topedge1);
		addVert(topedge2);
	}
	
	this.faces = data.length/9;
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};

//sphere
GG.sphere = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.divisions = 12;
	this.vertsPerFace = 4;
	this.name = "sphere";
};
GG.isA(GG.sphere, GG.renderable);


GG.sphere.prototype.initialise = function(gl){
	var data = [];
	
    var dtheta = 180/this.divisions;
	var dphi = 360/this.divisions;
	var latitude = 90;
	var longitude = 360;

    for(var theta = -latitude; theta <= latitude - dtheta; theta += dtheta) {
        for(var phi = 0; phi <= longitude - dphi; phi += dphi) {
			var theta1 = radians(theta);
			var theta2 = radians(theta + dtheta);
			var phi1 = radians(phi);
			var phi2 = radians(phi + dphi);
			var cTheta1 = Math.cos(theta1);
			var cTheta2 = Math.cos(theta2);
			var sTheta1 = Math.sin(theta1);
			var sTheta2 = Math.sin(theta2);
			var sPhi1 = Math.sin(phi1);
			var sPhi2 = Math.sin(phi2);
			var cPhi1 = Math.cos(phi1);
			var cPhi2 = Math.cos(phi2);
			data = data.concat(cTheta1 * cPhi1, cTheta1 * sPhi1, sTheta1);
			data = data.concat(cTheta2 * cPhi1, cTheta2 * sPhi1, sTheta2);
			data = data.concat(cTheta2 * cPhi2, cTheta2 * sPhi2, sTheta2);
			data = data.concat(cTheta1 * cPhi2, cTheta1 * sPhi2, sTheta1);
       }
    }
	
	this.faces = data.length/12;
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};






