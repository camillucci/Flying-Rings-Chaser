import { default as GameObject } from "./gameObject.js";
import { CockpitShaderClass } from "../../shaders/shaderClasses.js";
import { default as SphericalCollider } from "../colliders/sphericalCollider.js"
import { default as MathUtils } from "../math_utils.js"

class Cockpit extends GameObject {
	static objFilename = "resources/cockpit/Cockpit.obj";
	static textureFilename = "resources/cockpit/Cockpit_Texture.png";
	static shaderClass = new CockpitShaderClass();
    static #colliderRadius;
	static #centerOfGravity;

    #gameSettings;
	#health = 100;
	#healthDisplay;
	#points = 0;
	#pointsDisplay;
	#lasers = [];
	#lastLaser = 9;
	#canShoot = true;

	_materialColor = [0.5, 0.5, 0.5];
    position = [0, 0, 0];
    scale = 2;
    orientation = [0, 180, 0];
    deltaSpeed;
    up = 0;
    down = 0;
    left = 0;
    right = 0;

    // Initialization
	constructor(window, gameSettings) {
		super();
		this.collider = new SphericalCollider();
		this.collider.radius = Cockpit.#colliderRadius;
        this.#gameSettings = gameSettings;

		this.deltaSpeed = gameSettings.cockpitSpeed;
		this.#healthDisplay = document.getElementById("health");
		this.#pointsDisplay = document.getElementById("points");
		for (let i = 0; i < gameSettings.maxLasers; ++i) {
			this.#lasers[i] = document.getElementById("laser" + i);
		}

        window.addEventListener("keydown", this.#keyFunctionDown(this), false);
        window.addEventListener("keyup", this.#keyFunctionUp(this), false);
	}

    // properties
	get localCenterOfGravity() {
		return Cockpit.#centerOfGravity;
	}

	static loadInfoFromObjModel(objModel) {
		Cockpit.#centerOfGravity = GameObject._computeCenterOfGravity(objModel);
		Cockpit.#colliderRadius = GameObject._computeRadius(objModel, Cockpit.#centerOfGravity);
	}

    update() {
		super.update();

		// Adjust collider towards the front of the cockpit
		this.collider.center[2] += 2; 

		// Move cockpit
		const horizontal = (this.left - this.right) * this.#gameSettings.gameSpeed / this.#gameSettings.fpsLimit;
		const vertical = (this.up - this.down) * this.#gameSettings.gameSpeed / this.#gameSettings.fpsLimit;
		this.position = MathUtils.sum(this.position, [horizontal, vertical, 0]);

		// Clamp position to borders
		this.position[0] = Math.min(Math.max(this.position[0], -this.#gameSettings.maxHalfX), this.#gameSettings.maxHalfX);
		this.position[1] = Math.min(Math.max(this.position[1], -this.#gameSettings.maxHalfY), this.#gameSettings.maxHalfY);

		// Add points
		this.#points += this.#gameSettings.pointsPerSecond * this.#gameSettings.gameSpeed / this.#gameSettings.fpsLimit;
		this.#pointsDisplay.textContent = parseInt(this.#points).toString().padStart(8, "0");
		
		// Reduce health
		this.#health -= this.#gameSettings.damagePerSecond * this.#gameSettings.gameSpeed / this.#gameSettings.fpsLimit;
		this.#health = Math.max(0, this.#health);
		this.#healthDisplay.style.width = this.#health.toString() + '%';
	}

	onRingCollided(ring) {
		console.log("Cockpit: ring hit");
		// Add health
		this.#health += this.#gameSettings.ringRestoreHealth;
		this.#health = Math.min(100, this.#health);
		this.#healthDisplay.style.width = this.#health.toString() + '%';

		// Add points
		this.#points += this.#gameSettings.ringPoints;
		this.#pointsDisplay.textContent = parseInt(this.#points).toString().padStart(8, "0");
	}

	onAsteroidCollided(asteroid) {
		console.log("Cockpit: asteroid hit");
		// Reduce health
		this.#health -= this.#gameSettings.asteroidDamage;
		this.#health = Math.max(0, this.#health);
		this.#healthDisplay.style.width = this.#health.toString() + '%';

		// Reduce points
		this.#points -= this.#gameSettings.asteroidPoints;
		this.#points = Math.max(0, this.#points);
		this.#pointsDisplay.textContent = parseInt(this.#points).toString().padStart(8, "0");
	}

	onGroundCollided() {
		console.log("Cockpit: ground hit");
		// Reduce health
		this.#health -= this.#gameSettings.terrainDamage;
		this.#health = Math.max(0, this.#health);
		this.#healthDisplay.style.width = this.#health.toString() + '%';

		// Reduce points
		this.#points -= this.#gameSettings.terrainPoints;
		this.#points = Math.max(0, this.#points);
		this.#pointsDisplay.textContent = parseInt(this.#points).toString().padStart(8, "0");
	}

	shoot() {
		if (this.#canShoot && this.#lastLaser >= 0) {
			this.#lasers[this.#lastLaser].style.opacity = 0;
			if (this.#lastLaser == this.#lasers.length - 1)
				this.#delayedReload();
			this.#lastLaser--;
			this.#canShoot = false;
			this.#delayedCooldown();
		}
	}

	async #delayedReload() {
		await this.#sleep(this.#gameSettings.laserReloadPerSecond * 1000);
		this.#lastLaser++;
		this.#lasers[this.#lastLaser].style.opacity = 1;
		if (this.#lastLaser < this.#lasers.length - 1) {
			this.#delayedReload();
		}
	}

	async #delayedCooldown() {
		await this.#sleep(this.#gameSettings.laserCooldown * 1000);
		this.#canShoot = true;
	}

	#sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

    #keyFunctionDown(cockpit) {
		return function(e) {
			if (e.keyCode == 87) {	// W
				cockpit.up = cockpit.deltaSpeed;
			}
            if (e.keyCode == 83) {	// S
                cockpit.down = cockpit.deltaSpeed;
            }
			if (e.keyCode == 65) {	// A
				cockpit.left = cockpit.deltaSpeed;
			}
			if (e.keyCode == 68) {	// D
				cockpit.right = cockpit.deltaSpeed;
			}
			if (e.keyCode == 32) {	// Space
				cockpit.shoot();
			}
		}
	}

	#keyFunctionUp(cockpit) {
		return function(e) {
			if (e.keyCode == 87) {	// W
				cockpit.up = 0;
			}
            if (e.keyCode == 83) {	// S
                cockpit.down = 0;
            }
			if (e.keyCode == 65) {	// A
				cockpit.left = 0;
			}
			if (e.keyCode == 68) {	// D
				cockpit.right = 0;
			}
		}
	}
}

export default Cockpit;
