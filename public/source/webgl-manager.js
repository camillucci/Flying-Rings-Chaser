import {default as utils} from "./utils.js"

class WebGlManager
{
    #gl;
    #vertexShaderSource;
    #fragmentShaderSource;

    #positionAttributeLocation;
    #normalAttributeLocation;

    #positionMatrixUniformLocation;
    #normalMatrixUniformLocation;

    #materialDiffColorHandle;
    #lightDirectionHandle;
    #lightColorHandle;
    #directionalLightColor;

    #program;
    #positionBuffer;
    #normalBuffer;
    #texcoordBuffer;
    #indexBuffer;

    #vao;
    #instantiatedObjects = [];
    
    // Public variables
    camera;


    // Initialization
    constructor(context, vertexShaderSource, fragmentShaderSource)
    {
        this.#gl = context;        
        this.#vertexShaderSource = vertexShaderSource;
        this.#fragmentShaderSource = fragmentShaderSource;
    }

    initialize() 
    {
        // Create GLSL shaders, upload the GLSL source, compile the shaders
        var vertexShader = this.#createShader(this.#gl, this.#gl.VERTEX_SHADER, this.#vertexShaderSource);
        var fragmentShader = this.#createShader(this.#gl, this.#gl.FRAGMENT_SHADER, this.#fragmentShaderSource);

        // Link the two shaders into a program
        this.#program = this.#createProgram(this.#gl, vertexShader, fragmentShader);
        this.#gl.useProgram(this.#program);

        // Deep test
        this.#gl.enable(this.#gl.DEPTH_TEST);

        // Look up where the vertex data needs to go.
        this.#positionAttributeLocation = this.#gl.getAttribLocation(this.#program, "inPosition");
        this.#normalAttributeLocation = this.#gl.getAttribLocation(this.#program, "inNormal");

        this.#positionMatrixUniformLocation = this.#gl.getUniformLocation(this.#program, "matrix");
        this.#normalMatrixUniformLocation = this.#gl.getUniformLocation(this.#program, "nMatrix");

        this.#materialDiffColorHandle = this.#gl.getUniformLocation(this.#program, "mDiffColor");
        this.#lightDirectionHandle = this.#gl.getUniformLocation(this.#program, "lightDirection");
        this.#lightColorHandle = this.#gl.getUniformLocation(this.#program, "lightColor");

        this.#positionBuffer = this.#gl.createBuffer();
        this.#normalBuffer = this.#gl.createBuffer();
        this.#texcoordBuffer = this.#gl.createBuffer();
        this.#indexBuffer = this.#gl.createBuffer();

        this.#vao = this.#gl.createVertexArray();

        // Lights
        this.#directionalLightColor = [0.1, 1.0, 1.0];
        this.#gl.uniform3fv(this.#lightDirectionHandle, this.#directionalLight());
        this.#gl.uniform3fv(this.#lightColorHandle, this.#directionalLightColor);
    }    

    // Public Methods
    instantiate(gameObject) 
    {
        this.#instantiatedObjects.push(gameObject);
    }
    
    destroy(gameObject)
    {
        var index = this.#instantiatedObjects.indexOf(gameObject);
        this.#instantiatedObjects.splice(index, 1);
    }


    draw()
    {
        var canvas = this.#gl.canvas;

        // canvas full screen
        this.#resizeCanvasToDisplaySize(canvas);

        // Tell WebGL how to convert from clip space to pixels
        this.#gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Clear the canvas
        this.#gl.clearColor(0, 0, 0, 0);
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

        this.#drawGameObjects();
    }


    // Private Methods
    #drawGameObjects()
    {
        var viewMatrix = this.camera?.viewMatrix() ?? utils.MakeView(3.0, 3.0, 2.5, -45.0, -40.0); // default viewMatrix 
        // setup transformation matrix from local coordinates to Clip coordinates
        for(var gameObject of this.#instantiatedObjects)
        {
            this.#gl.bindVertexArray(this.#vao);

            // Add the vertices to the buffer
            this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#positionBuffer);
            this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(gameObject.vertices), this.#gl.STATIC_DRAW);
            this.#gl.enableVertexAttribArray(this.#positionAttributeLocation);
            this.#gl.vertexAttribPointer(this.#positionAttributeLocation, 3, this.#gl.FLOAT, false, 0, 0);

            // Add the normals to the buffer
            this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#normalBuffer);
            this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(gameObject.normals), this.#gl.STATIC_DRAW);
            this.#gl.enableVertexAttribArray(this.#normalAttributeLocation);
            this.#gl.vertexAttribPointer(this.#normalAttributeLocation, 3, this.#gl.FLOAT, false, 0, 0);

            // Add the texture coordinates to the buffer
            //this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#texcoordBuffer);
            //this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(gameObject.texcoords), this.#gl.STATIC_DRAW);

            // Add the indices to the buffer
            this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
            this.#gl.bufferData(this.#gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gameObject.indices), this.#gl.STATIC_DRAW);

            // Computing transformation matrix
            var matrix = this.#computeMatrix(gameObject, viewMatrix);

            // Passing the matrix as a uniform to the vertex shader
            this.#gl.uniformMatrix4fv(this.#positionMatrixUniformLocation, this.#gl.FALSE, utils.transposeMatrix(matrix));
            this.#gl.uniformMatrix4fv(this.#normalMatrixUniformLocation, this.#gl.FALSE, utils.transposeMatrix(gameObject.worldMatrix()));

            // GameObject Color
            this.#gl.uniform3fv(this.#materialDiffColorHandle, gameObject.materialColor);

            // Drawing the gameObject
            this.#gl.drawElements(this.#gl.TRIANGLES, gameObject.indices.length, this.#gl.UNSIGNED_SHORT, 0);
        }
    }


    #computeMatrix(gameObject, viewMatrix)
    {
        var canvas = this.#gl.canvas;
        var worldMatrix = gameObject.worldMatrix();
        var perspectiveMatrix = utils.MakePerspective(90, canvas.width/canvas.height, 0.1, 100.0);
        return utils.multiplyAllMatrices(perspectiveMatrix, viewMatrix, worldMatrix)
    }

    #createProgram(gl, vertexShader, fragmentShader)
    {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) 
        {
            gl.deleteProgram(program);
            throw Error("Program filed to link:" + gl.getProgramInfoLog (program));
        }
        return program;
    }

    #createShader(gl, type, source)
    {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success)
        {
            console.log(gl.getShaderInfoLog(shader));
            if (type == gl.VERTEX_SHADER)
                alert("Error in Vertex Shader: " + gl.getShaderInfoLog(vertexShader));
            else if (type == gl.FRAGMENT_SHADER)
                alert("Error in Fragment Shader: " + gl.getShaderInfoLog(fragmentShader));
            gl.deleteShader(shader);
            throw Error("Could not compile shader:" + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    #resizeCanvasToDisplaySize(canvas, multiplier)
    {
        multiplier = multiplier || 1;
        const width  = canvas.clientWidth  * multiplier | 0;
        const height = canvas.clientHeight * multiplier | 0;
        if (canvas.width !== width ||  canvas.height !== height) {
          canvas.width  = width;
          canvas.height = height;
          return true;
        }
        return false;
    }

    #directionalLight()
    {
        var dirLightAlpha = -utils.degToRad(60);
        var dirLightBeta  = -utils.degToRad(120);

        return [
            Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
            Math.sin(dirLightAlpha),
            Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
        ];
    }
}

export default WebGlManager;
