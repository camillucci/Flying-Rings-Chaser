import {default as WebGlManager} from "./source/webgl-manager.js"
import {default as GameEngine} from "./source/engine.js"
import {default as Cube} from "./source/gameObjects/cube.js"
import {default as Spaceship} from "./source/gameObjects/spaceship.js"
import {default as utils} from "./source/utils.js"
import {
	CockpitShaderClass,
	DefaultShaderClass,
	RingShaderClass,
	SkyboxShaderClass,
	TerrainShaderClass
} from "./shaders/shaderClasses.js";
import {default as Asteroid} from "./source/gameObjects/asteroid.js";
import {default as Ring} from "./source/gameObjects/ring.js";
import {default as Terrain} from "./source/gameObjects/terrain.js";
import {default as Cockpit} from "./source/gameObjects/cockpit.js";
import {default as Skybox} from "./source/skybox.js";


async function setupGlObjects(glManager, gl, gameSettings) {
	const info =
		[
			[Cube, "Cube"],
			[Spaceship, "Spaceship"],
			[Cockpit, "Cockpit"],
			[Asteroid, "Asteroid"],
			[Terrain, "Terrain"],
			[Ring, "Ring"]
		];

	for (const [objClass, className] of info) {
		// load the obj file
		const objModel = objClass.meshGenerator
			? objClass.meshGenerator(gameSettings)
			: new OBJ.Mesh(await utils.get_objstr(objClass.objFilename));

		// load the texture
		const texture = objClass.textureFilename != null
			? utils.getTextureFromImage(gl, await utils.loadImage(objClass.textureFilename))
			: null;
		if (objClass.loadInfoFromObjModel)
			objClass.loadInfoFromObjModel(objModel);

		glManager.bindGlModel(objModel, texture, objClass.shaderClass, className);
	}
}

async function setupGlShaders(glManager) {
	const info =
		[
			DefaultShaderClass,
			RingShaderClass,
			TerrainShaderClass,
			CockpitShaderClass
		];

	for (const shaderClass of info) {
		// load the shader files
		const shaderText = await utils.loadFilesAsync([shaderClass.vertexShaderFilename, shaderClass.fragmentShaderFilename]);
		const vertexShaderSource = shaderText[0];
		const fragmentShaderSource = shaderText[1];

		glManager.bindGLShader(shaderClass, vertexShaderSource, fragmentShaderSource);
	}
}

async function setupGlSkybox(glManager, gl) {
	const shaderText = await utils.loadFilesAsync([SkyboxShaderClass.vertexShaderFilename, SkyboxShaderClass.fragmentShaderFilename]);
	const vertexShaderSource = shaderText[0];
	const fragmentShaderSource = shaderText[1];
	glManager.bindGLShader(SkyboxShaderClass, vertexShaderSource, fragmentShaderSource);

	const skyboxVertices = new Float32Array(
		[
			-1, -1, 1.0,
			1, -1, 1.0,
			-1, 1, 1.0,
			-1, 1, 1.0,
			1, -1, 1.0,
			1, 1, 1.0,
		]);
	const skyboxTexture = gl.createTexture();
	const faceInfos = Skybox.getFaceInfos(gl);
	for (const faceInfo of faceInfos) {
		faceInfo.image = await utils.loadImage(faceInfo.url)
	}
	utils.fillSkyboxTextureFromImage(gl, skyboxTexture, faceInfos);

	glManager.createSkybox(skyboxVertices, skyboxTexture);
}

function logGLCall(functionName, args) {
	console.log("gl." + functionName + "(" +
		WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
}

async function init() {
	// Get A WebGL context
	const canvas = document.getElementById("webglCanvas");
	const gl = canvas.getContext("webgl2");
	if (!gl) {
		document.write("GL context not opened");
		return;
	}

	// de-comment to enable webgl debug (just print errors)
	//gl = WebGLDebugUtils.makeDebugContext(gl);
	// de-comment to enable webgl debug (with verbose logging of every function call)
	//gl = WebGLDebugUtils.makeDebugContext(gl, undefined, logGLCall);

	// create the setting of the game
	const gameSetting = {
		maxHalfX: 100,
		maxHalfY: 50,
		maxZ: 500,
		fpsLimit: 60,
		gameSpeed: 1,
		numberOfAsteroids: 20,
		asteroidScaleRange: [0.1, 0.1],
		asteroidSpeedRange: [20, 40],
		asteroidRotationSpeedRange: [0, 30],
		numberOfRings: 15,
		minRingDistance: 35,
		ringScaleRange: [12, 12],
		ringSpeedRange: [20, 20],
		terrainChunkSize: 500,
		terrainChunkResolution: 32,
		halfNumberTerrainChunksColumns: 2,
		numberTerrainChunksRows: 3,
		terrainSpeed: 60,
		skyboxDefaultPosition: [0, -200, 0],
		skyboxOscillatingSpeed: 0.6,
		skyboxTwoTimesMaxOscillation: 10,
		skyboxParallaxFactor: 0.5, // between 1 and 0 (1->disabled)
		cockpitSpeed: 80,
		maxLasers: 10,
		laserSpeed: 5,
		laserReloadPerSecond: 1,
		laserCooldown: 2,
		ringPoints: 1000,
		ringRestoreHealth: 25,
		asteroidPoints: 100,
		asteroidDamage: 10,
		asteroidHealth: 2,
		pointsPerSecond: 50,
		damagePerSecond: 1,
		terrainDamage: 5,
		terrainPoints: 100,
	} //maybe load this from a json in the future?

	// create and initialize the WebGL manager
	const webGlManager = new WebGlManager(gl, gameSetting);
	webGlManager.initialize();
	await setupGlShaders(webGlManager);
	await setupGlObjects(webGlManager, gl, gameSetting);
	await setupGlSkybox(webGlManager, gl);

	// create and start the game engine
	const gameEngine = new GameEngine(webGlManager, window, gameSetting);
	gameEngine.setup();
}

window.onload = init;
