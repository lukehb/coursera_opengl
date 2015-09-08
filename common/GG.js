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

GG.hex2Rgb = function(hex) {
	hex = hex.replace(/[^0-9A-F]/gi, '');
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return new Float32Array([r/255.0, g/255.0, b/255.0, 1.0]);
};

GG.rgb2Hex = function(red, green, blue) {
    var rgb = blue | (green << 8) | (red << 16);
    return '#' + (0x1000000 + rgb).toString(16).slice(1)
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
					  "uniform mat4 m;" +
					  "uniform mat4 v;" +
					  "uniform mat4 p;" +
					  "void main(){" +
							"gl_Position = p * v* m * vPosition;" +
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
	this.eye = (eye != null && Array.isArray(eye)) ? eye : [0,-3,-5];
	this.camSpeed = (camSpeed != null && typeof camSpeed == "number") ? camSpeed : 0.02;
	this.rotSpeed = 2;
	this.projection = (Array.isArray(projection) && projection.length == 16) ? projection : perspective(90, 1, 0.5, 100);
	//rotation around x
	this.pitch = 20;
	//rotation around y
	this.yaw = 0;
	this.update();
};

GG.camera.prototype.update = function(){
	var rot = mult( rotate(this.pitch, [1,0,0]), rotate(this.yaw, [0,1,0]) );
	var trans = translate(this.eye[0], this.eye[1], this.eye[2]);
	var v = mult(rot, trans);
	this.v = v;
};

GG.camera.prototype.getV = function(){
	return flatten(this.v);
};

GG.camera.prototype.getP = function(){
	return flatten(this.projection);
};

GG.camera.prototype.unproject = function(x,y,z){
	  // Compute the inverse of the perspective x model-view matrix.
	  var iMVP = inverse(mult(this.p, this.v));
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
	this.pickTexture = null;
	this.pickBuffer = null;
	this.pickDepthBuffer = null;

	//a method passed to renderables to bind them to the scene
	var that = this;
	this.bindToScene = function(gl, renderable){
		
		var shaderProgram = (renderable.useUnlit) ? renderable.unlitShader : renderable.shaderProgram;
		var p = that.camera.projection;
		var v = that.camera.v;
		var m = renderable.transform;
		
		//pass eye and projection matrices
		var uView = gl.getUniformLocation(shaderProgram, "v");
		gl.uniformMatrix4fv(uView, false, flatten(v));
		
		var uProj = gl.getUniformLocation(shaderProgram, "p");
		gl.uniformMatrix4fv(uProj, false, flatten(p));
		
		var uModel = gl.getUniformLocation(shaderProgram, "m");
		gl.uniformMatrix4fv(uModel, false, flatten(m));
		
		if(!renderable.useUnlit){
			var uNormalMatrix = gl.getUniformLocation(shaderProgram, "normalMatrix");
			var nMatrix = normalMatrix(mult(v,m));
			gl.uniformMatrix4fv(uNormalMatrix, false, flatten(nMatrix));
			
			//pass lights
			for(var i = 0; i < that.lights.length; i++){
				var light = that.lights[i];
				var prefix = "lights[" + i + "].";
				
				var uLightEnabled = gl.getUniformLocation(shaderProgram, prefix + "enabled");
				gl.uniform1i(uLightEnabled, light.enabled);
				
				var uLightPos = gl.getUniformLocation(shaderProgram, prefix + "position");
				gl.uniform4fv(uLightPos, light.position);
				
				var uLightAmbient = gl.getUniformLocation(shaderProgram, prefix + "ambient");
				gl.uniform4fv(uLightAmbient, light.ambient);
				
				var uLightDiffuse = gl.getUniformLocation(shaderProgram, prefix + "diffuse");
				gl.uniform4fv(uLightDiffuse, light.diffuse);
				
				var uLightSpecular = gl.getUniformLocation(shaderProgram, prefix + "specular");
				gl.uniform4fv(uLightSpecular, light.specular);
				
				var uLightConstantAtt = gl.getUniformLocation(shaderProgram, prefix + "constantAttenuation");
				gl.uniform1f(uLightConstantAtt, light.constantAttenuation);
				
				var uLightLinearAtt = gl.getUniformLocation(shaderProgram, prefix + "linearAttenuation");
				gl.uniform1f(uLightLinearAtt, light.linearAttenuation);
				
				var uLightQuadraticAtt = gl.getUniformLocation(shaderProgram, prefix + "quadraticAttenuation");
				gl.uniform1f(uLightQuadraticAtt, light.quadraticAttenuation);
			}
		}
	};
};

GG.scene.prototype.init = function(gl){
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 2.0);
	//for reading pixels
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	//cull back faces
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	gl.frontFace(gl.CCW);
};

GG.scene.prototype.pick = function(gl, x, y, width, height){
	
	//initialise pick texture and buffer
	if(this.pickBuffer == null || this.pickTexture == null){
		this.pickTexture = gl.createTexture();
		this.pickBuffer = gl.createFramebuffer();
		this.pickDepthBuffer = gl.createRenderbuffer();
		// Create a framebuffer and 
	}
	
	//bind pick buffer and texture
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickBuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepthBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.pickTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	//attach the texture to the pick buffer, and set-up pick depth buffer
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTexture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepthBuffer);
	
	var pixels = new Uint8Array(4);
	
	//make them all use unlit shader
	for(var key in this.renderables){
		var toRender = this.renderables[key];
		toRender.useUnlit = true;
	}
	
	this.render(gl);
	gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	
	//unbind from frame-buffer and pick depth buffer so we can do normal rendering
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	//revert to using lit shader
	for(var key in this.renderables){
		var toRender = this.renderables[key];
		toRender.useUnlit = false;
	}
	
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
//////////Material//////////////
////////////////////////////////
GG.material = function(){
	this.ambient = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	this.diffuse = new Float32Array([1.0, 0.8, 0.0, 1.0]);
	this.specular = new Float32Array([0.8, 0.8, 0.8, 1.0]);
	this.shininess = 5;
};

////////////////////////////////
/////TEXTURE MANAGER////////////
////////////////////////////////
GG.textureManager = function(){
	this.curTexUnit = 0;
};

GG.textureManager.prototype.requestTexUnit = function(){
	var toReturn = this.curTexUnit;
	this.curTexUnit++;
	return toReturn;
};

GG.textureManager.prototype.resolveTextureUnit = function(gl, texUnit){
	var glTexUnit = "gl.TEXTURE" + texUnit;
	return eval(glTexUnit);
};

////////////////////////////////
//////////TEXTURE///////////////
////////////////////////////////
GG.texture = function(image, width, height){
	this.tmpImage = image;
	this.width = width;
	this.height = height;
	this.tex = null;
	this.texUnit = null;
};

GG.texture.prototype.init = function(gl){
	this.tex = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, this.tex );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	if(this.tmpImage instanceof Uint8Array){ //procedurally generated
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.tmpImage);
	}else{ //image or element
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.tmpImage);
	}
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.bindTexture( gl.TEXTURE_2D, null );
	this.tmpImage = null;
};

GG.texture.prototype.bind = function(gl, textureManager){
	if(this.tex == null){
		if(this.tmpImage == null){
			throw "Texture must have image assigned to it.";
		}
		this.init(gl);
	}
	if(this.texUnit == null){
		this.texUnit = textureManager.requestTexUnit();
	}
	gl.activeTexture( textureManager.resolveTextureUnit(gl, this.texUnit) );
	gl.bindTexture( gl.TEXTURE_2D, this.tex );
};

////////////////////////////////
//////////LIGHTS////////////////
////////////////////////////////
GG.pointLight = function(){
	this.enabled = true;
	this.position = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	this.ambient = new Float32Array([0.2, 0.2, 0.2, 1.0]);
	this.diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	this.specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	this.constantAttenuation = 0; 
	this.linearAttenuation = 0.731;
	this.quadraticAttenuation = 0;
};

////////////////////////////////
//////////Node//////////////////
////////////////////////////////
GG.node = function(transform){
	if(!Array.isArray(transform)){
		//just use identity matrix
		transform = mat4(1);
	}
	this.transform = transform;
};

GG.node.prototype.getTransform = function(){
	return flatten(this.transform);
};

GG.node.prototype.getTranslation = function(){
	var transform = this.getTransform();
	return [transform[12], transform[13], transform[14]];
};

GG.node.prototype.getScale = function(){
	var transform = this.getTransform();
	var x = length([transform[0], transform[1], transform[2]]);
	var y = length([transform[4], transform[5], transform[6]]);
	var z = length([transform[8], transform[9], transform[10]]);
	return [x,y,z];
};

GG.node.prototype.getRotation = function(){
	var scale = this.getScale();
	var m = this.getTransform();
	
	//un-scale the transformation matrix
	var r11 = m[0]/scale[0];
	var r12 = m[4]/scale[1];
	var r13 = m[8]/scale[2];
	var r21 = m[1]/scale[0];
	var r22 = m[5]/scale[1];
	var r23 = m[9]/scale[2];
	var r31 = m[2]/scale[0];
	var r32 = m[6]/scale[1];
	var r33 = m[10]/scale[2];
	var theta, psi, phi;
	if(r31 != 1 && r31 != -1){
		theta = -Math.asin(r31);
		var cTheta = Math.cos(theta);
		psi = Math.atan2(r32/cTheta, r33/cTheta);
		phi = Math.atan2(r21/cTheta, r11/cTheta);
	}else{
		var phi = 0;
		if(r31 == -1){
			theta = Math.PI/2;
			psi = phi + Math.atan2(r12, r13);
		}else{
			theta = -Math.PI/2;
			psi = -phi + Math.atan2(-r12, -r13);
		}
	}
	return [degrees(psi), degrees(theta), degrees(phi)];
};

////////////////////////////////
////////RENDERABLE//////////////
////////////////////////////////
GG.renderable = function(vertShaderId, fragShaderId, transform){
	//call base constructor
	GG.node.apply(this, [transform]);
	this.vertShaderText = GG.getShaderText(vertShaderId, GG.shaderTypes.vertex);
	this.fragShaderText = GG.getShaderText(fragShaderId, GG.shaderTypes.fragment);
	//-1 vBufferId and null shaderProgram indicates it is uninitialised
	this.vBufferId = -1;
	this.shaderProgram = null;
	this.material = new GG.material();
	this.unlitShader = null;
	this.useUnlit = false;
	this.color = new Float32Array([0.4, 0.4, 0.4, 1.0]);
	this.initialised = false;
	this.textureManager = new GG.textureManager();
	this.textures = [];
	this.faces = 0;
	this.vertsPerFace = 3;
}; 
//make renderables extend nodes
GG.isA(GG.renderable, GG.node);

GG.renderable.prototype.useShader = function(gl){
	if(this.shaderProgram == null){
		this.shaderProgram = GG.initShaders(gl, this.vertShaderText, this.fragShaderText);
	}
	if(this.useUnlit && this.unlitShader == null){
		this.unlitShader = GG.initShaders(gl, GG.simpleVertShader, GG.simpleFragShader);
	}
	if(this.useUnlit){
		gl.useProgram(this.unlitShader);
	}else{
		gl.useProgram(this.shaderProgram);
	}
};

GG.renderable.prototype.initialise = function(gl){
	throw "Concrete class of renderable must implement initialisation behaviour.";
};

GG.renderable.prototype.bind = function(gl, outlineMode){
	
	var shaderProgram = (this.useUnlit) ? this.unlitShader : this.shaderProgram;
	
	//VERTEX BUFFER
	if(this.vBufferId == -1){
		this.vBufferId = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vBufferId);
	var vPosition = gl.getAttribLocation(shaderProgram, "vPosition");
	//set-up pointer for vertexPosition
	gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, GG.SIZE_OF_FLOAT * 8, 0);
	gl.enableVertexAttribArray( vPosition );
	
	//unlit shader
	if(this.useUnlit){
		//use this color for picking most likely
		var uColor = gl.getUniformLocation(shaderProgram, "uColor");
		gl.uniform4fv(uColor, this.color);
	}
	//lit shader
	else{
		//NORMAL data is interleaved with vertex data in the buffer, {vx,vy,vz,nx,ny,nz...etc}
		var vNormal = gl.getAttribLocation( shaderProgram, "vNormal" );
		//set-up pointer for vertex normal in shader
		gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, GG.SIZE_OF_FLOAT * 8, GG.SIZE_OF_FLOAT * 3);
		gl.enableVertexAttribArray( vNormal );
		
		//set up frontMaterial
		var uAmbient = gl.getUniformLocation( shaderProgram, "frontMaterial.ambient" );
		gl.uniform4fv(uAmbient, this.material.ambient);
		
		var uDiffuse = gl.getUniformLocation( shaderProgram, "frontMaterial.diffuse" );
		gl.uniform4fv(uDiffuse, this.material.diffuse);
		
		var uSpecular = gl.getUniformLocation( shaderProgram, "frontMaterial.specular" );
		gl.uniform4fv(uSpecular, this.material.specular);
		
		var uShininess = gl.getUniformLocation( shaderProgram, "frontMaterial.shininess" );
		gl.uniform1f(uShininess, this.material.shininess);
		
		//textures
		if(this.textures.length > 0){
			//texture coords
			var vTexCoord = gl.getAttribLocation( shaderProgram, "vTexCoord" );
			//set-up pointer for vertex normal in shader
			gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, GG.SIZE_OF_FLOAT * 8, GG.SIZE_OF_FLOAT * 6);
			gl.enableVertexAttribArray( vTexCoord );
			//texture uniforms for texture units
			var uTexPrefix = "Tex";
			for(var i = 0; i < this.textures.length; i++){
				var texture = this.textures[i];
				texture.bind(gl, this.textureManager);
				gl.uniform1i(gl.getUniformLocation( shaderProgram, uTexPrefix + texture.texUnit), texture.texUnit);
			}
		}
		
	}
};

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
	this.bind(gl, false);
	//if scene binding has been passed in
	if("bindToScene" in this){
		this.bindToScene(gl, this);
	}
	if(!this.initialised){
		this.initialise(gl);
		this.initialised = true;
	}
	this.draw(gl, false);
};

////////////////////////////////
////////SHAPE FACTORY///////////
////////////////////////////////

//plane
GG.plane = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.rowsCols = 10;
	this.faces = this.rowsCols * this.rowsCols;
	this.vertsPerFace = 4;
	this.name = "plane";
};
GG.isA(GG.plane, GG.renderable);

//plane
GG.plane.prototype.initialise = function(gl){
	var normal = [0,1,0];
	var tiling = 10.0;
	var data = [];
	var cellSize = 1.0/this.rowsCols;
	for(var x = -0.5; x < 0.5; x += cellSize){
		for(var z = -0.5; z < 0.5; z += cellSize){
			var v1 = [x,0,z];
			var v2 = [x+cellSize,0,z];
			var v3 = [x+cellSize,0,z+cellSize];
			var v4 = [x,0,z+cellSize];
			data = data.concat(
				v4, normal, [v4[0]*tiling, v4[2]*tiling],
				v3, normal, [v3[0]*tiling, v3[2]*tiling],
				v2, normal, [v2[0]*tiling, v2[2]*tiling],
				v1, normal, [v1[0]*tiling, v1[2]*tiling]
			);
		}
	}
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};

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
	var normals = [ [0,0,-1], [0,0,1], [1,0,0], [-1,0,0], [0,1,0], [0,-1,0] ];
	var cubeVerts = new Float32Array([].concat(
		verts[3], normals[0], verts[2], normals[0], verts[1], normals[0], verts[0], normals[0], //front
		verts[7], normals[1], verts[6], normals[1], verts[5], normals[1], verts[4], normals[1], //back
		verts[2], normals[2], verts[7], normals[2], verts[4], normals[2], verts[1], normals[2], //right
		verts[6], normals[3], verts[3], normals[3], verts[0], normals[3], verts[5], normals[3],//left
		verts[6], normals[4], verts[7], normals[4], verts[2], normals[4], verts[3], normals[4], //top
		verts[0], normals[5], verts[1], normals[5], verts[4], normals[5], verts[5], normals[5] //bottom 
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
	
	var addTri = function(v1, v2, v3){
		var normal = normalize( cross(subtract(v2, v1), subtract(v3, v1)) );
		data = data.concat(v1, normal, v2, normal, v3, normal);
	};
	
	for(var part = 0; part < 2; part++){
		var mid = [0, part, 0];
		for(var angle = 0; angle < 360; angle += angleIncrement){
			var theta = radians(angle);
			var theta2 = radians(angle + angleIncrement);
			//note we don't do r * cos(a), because we assume radius is 1
			var edge = [Math.cos(theta),1,Math.sin(theta)];
			var edge2 = [Math.cos(theta2),1,Math.sin(theta2)];
			if(part == 0){
				addTri(mid, edge, edge2);
			}else{
				addTri(mid, edge2, edge);
			}
		}
	}
	this.faces = data.length/ (3 * this.vertsPerFace * 2);
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};


//cylinder
GG.cylinder = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.divisions = 15;
	this.name = "cylinder";
};
GG.isA(GG.cylinder, GG.renderable);

GG.cylinder.prototype.initialise = function(gl){
	var data = [];
	var angleIncrement = 360/this.divisions;
	
	var addTri = function(v1, v2, v3){
		var normal = normalize( cross(subtract(v2, v1), subtract(v3, v1)) );
		data = data.concat(v1, normal, v2, normal, v3, normal);
	};

	var top = [0, 1, 0];
	var bottom = [0, 0, 0];
	
	//do top first
	for(var angle = 0; angle < 360; angle += angleIncrement){
		var theta1 = radians(angle);
		var theta2 = radians(angle + angleIncrement);
		//note we don't do r * cos(a), because we assume radius is 1
		var topedge1 = [Math.cos(theta1),1,Math.sin(theta1)];
		var topedge2 = [Math.cos(theta2),1,Math.sin(theta2)];
		var botedge1 = [topedge1[0], 0, topedge1[2]];
		var botedge2 = [topedge2[0], 0, topedge2[2]];
		addTri(top, topedge2, topedge1);
		//go down
		addTri(topedge2, botedge2, botedge1);
		//bottom
		addTri(botedge2, bottom, botedge1);
		//go back up
		addTri(botedge1, topedge1, topedge2);
	}
	
	this.faces = data.length/ (3 * this.vertsPerFace * 2);
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};

//sphere
GG.sphere = function(vertShaderId, fragShaderId, transform){
	GG.renderable.apply(this, arguments);
	this.divisions = 13;
	this.vertsPerFace = 4;
	this.name = "sphere";
	this.uvProjection = GG.sphere.UVProjections.SPHERICAL;
};
GG.isA(GG.sphere, GG.renderable);

GG.sphere.UVProjections = {
	PLANAR : "PLANAR",
	SPHERICAL : "SPHERICAL"
};

GG.sphere.prototype.initialise = function(gl){
	var data = [];
	var that = this;
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
			var v1 = [cTheta1 * cPhi2, cTheta1 * sPhi2, sTheta1];
			var v2 = [cTheta2 * cPhi2, cTheta2 * sPhi2, sTheta2];
			var v3 = [cTheta2 * cPhi1, cTheta2 * sPhi1, sTheta2];
			var v4 = [cTheta1 * cPhi1, cTheta1 * sPhi1, sTheta1];
			var polar = (this.uvProjection == GG.sphere.UVProjections.POLAR);
			var uv1 = (polar) ? [theta1 / (2 * Math.PI), phi2 / Math.PI] : this.generateUVs(v1);
			var uv2 = (polar) ? [theta2 / (2 * Math.PI), phi2 / Math.PI] : this.generateUVs(v2);
			var uv3 = (polar) ? [theta2 / (2 * Math.PI), phi1 / Math.PI] : this.generateUVs(v3);
			var uv4 = (polar) ? [theta1 / (2 * Math.PI), phi1 / Math.PI] : this.generateUVs(v4);
			data = data.concat(
						v1, normalize(v1), uv1,
						v2, normalize(v2), uv2,
						v3, normalize(v3), uv3,
						v4, normalize(v4), uv4
			);
       }
    }
	
	//8 because [x,y,z,nx,ny.nz,u,v]
	this.faces = data.length/ (8 * this.vertsPerFace);
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW );
};

GG.sphere.prototype.generateUVs = function(vert){
	if(this.uvProjection == GG.sphere.UVProjections.PLANAR){
		return [vert[0], vert[2]];
	}
	else if(this.uvProjection == GG.sphere.UVProjections.SPHERICAL){
		return [ Math.atan2(vert[2], vert[0]) / (2.0 * Math.PI) + 0.5, 0.5 - Math.asin(vert[1])/Math.PI ];
	}
};





