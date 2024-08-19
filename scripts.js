let myp5 = new p5((p) => {
  // Constants for easy modification
  const HEX_SIZE = 15;
  const COOLDOWN_TIME = 3000;
  const BUBBLE_RADIUS = 15;
  const START_COLOR = "#FF9500";
  const END_COLOR = "#D5D5DC";
  const HEXAGON_STROKE_COLOR = "rgba(220, 220, 220, 0.08)"; // New hexagon stroke color
  const HEXAGON_FILL_COLOR = "rgba(0, 0, 0, 0.39)"; // New hexagon fill color
  const HOVER_INTERVAL = 5000; // 5 seconds
  const MAX_BLOBS = 6; // Limit the number of blobs

  let cols, rows;
  let hexagons = [];
  let blobs = [];
  let blobMode = true; // Set to true by default

  p.setup = function () {
    p.createCanvas(p.windowWidth, p.windowHeight); // Set canvas to full window size
    updateHexagons();
    createInitialBlobs();
    setInterval(simulateHover, HOVER_INTERVAL); // Call simulateHover every 5 seconds
  };

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight); // Resize canvas to full window size
  };

  function createInitialBlobs() {
    // Create some initial blobs, limited to MAX_BLOBS
    for (let i = 0; i < MAX_BLOBS; i++) {
      blobs.push(new Blob());
    }
  }

  function updateHexagons() {
    let hexWidth = HEX_SIZE * 2;
    let hexHeight = p.sqrt(3) * HEX_SIZE;

    // Calculate the number of columns and rows needed to cover the viewport
    cols = p.ceil((p.width + hexWidth) / (hexWidth * 0.75)); // Extend beyond the right edge
    rows = p.ceil((p.height + hexHeight) / hexHeight); // Extend beyond the bottom edge

    hexagons = [];
    for (let y = -1; y <= rows; y++) {
      // Start from -1 to ensure coverage above
      for (let x = -1; x <= cols; x++) {
        // Start from -1 to ensure coverage to the left
        let xPos = x * hexWidth * 0.75;
        let yPos = y * hexHeight + (x % 2) * (hexHeight / 2);
        hexagons.push(new Hexagon(xPos, yPos));
      }
    }
  }

  p.draw = function () {
    p.clear();

    // Throttle updates to every frame
    if (p.frameCount % 1 === 0) {
      for (let hexagon of hexagons) {
        hexagon.update();
        hexagon.display();
      }

      if (blobMode) {
        updateBlobs();
      } else if (
        p.mouseX >= 0 &&
        p.mouseX < p.width &&
        p.mouseY >= 0 &&
        p.mouseY < p.height
      ) {
        triggerHexagons(p.mouseX, p.mouseY, HEX_SIZE * (BUBBLE_RADIUS + 1));
      }
    }
  };

  function updateBlobs() {
    blobs = blobs.filter((blob) => {
      blob.update();
      triggerHexagons(blob.x, blob.y, blob.size);
      return !blob.shouldBeRemoved; // Keep only blobs that should not be removed
    });
  }

  function triggerHexagons(x, y, radius) {
    for (let hexagon of hexagons) {
      let d = p.dist(x, y, hexagon.x, hexagon.y);
      if (d < radius) {
        let intensity = p.map(d, 0, radius, 1, 0);
        hexagon.trigger(intensity);
      }
    }
  }

  function simulateHover() {
    // Select a random list item (assuming they have a class of 'list__item')
    const items = document.querySelectorAll(".list__item");
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      const randomItem = items[randomIndex];

      // Trigger the hover effect by dispatching a mouseenter event
      const mouseEnterEvent = new Event("mouseenter");
      randomItem.dispatchEvent(mouseEnterEvent);

      // Optionally, you can also add a class for visual feedback
      randomItem.classList.add("hover"); // Add hover class
      setTimeout(() => {
        randomItem.classList.remove("hover"); // Remove hover class after a short duration
      }, 1000); // Duration of hover effect
    }
  }

  class BlobPool {
    constructor() {
      this.pool = [];
      this.maxSize = MAX_BLOBS; // Maximum number of blobs
    }

    getBlob() {
      if (this.pool.length > 0) {
        return this.pool.pop(); // Reuse an existing blob
      } else {
        return new Blob(); // Create a new one if pool is empty
      }
    }

    releaseBlob(blob) {
      if (this.pool.length < this.maxSize) {
        this.pool.push(blob); // Return blob to pool
      }
    }
  }

  const blobPool = new BlobPool();

  class Blob {
    constructor() {
      this.x = p.random(p.width);
      this.y = p.random(p.height);
      this.vx = p.random(-1, 1);
      this.vy = p.random(-1, 1);
      this.size = p.random(50, 150);
      this.targetSize = this.size;
      this.targetVx = this.vx;
      this.targetVy = this.vy;
      this.opacity = 255;
      this.shouldBeRemoved = false; // Flag to track if blob should be removed
    }

    update() {
      // Smoothly transition to target velocity
      this.vx = p.lerp(this.vx, this.targetVx, 0.1);
      this.vy = p.lerp(this.vy, this.targetVy, 0.1);

      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges
      this.x = (this.x + p.width) % p.width;
      this.y = (this.y + p.height) % p.height;

      // Smoothly transition to target size
      this.size = p.lerp(this.size, this.targetSize, 0.1);

      // Occasionally change direction and size
      if (p.random(1) < 0.02) {
        this.targetVx = p.random(-1, 1);
        this.targetVy = p.random(-1, 1);
        this.targetSize = p.random(50, 150);
      }

      // Check if blob is off-screen or too small
      if (
        this.x < 0 ||
        this.x > p.width ||
        this.y < 0 ||
        this.y > p.height ||
        this.size < 10
      ) {
        this.shouldBeRemoved = true; // Flag for removal
      }
    }
  }

  class Hexagon {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.triggered = false;
      this.triggerTime = 0;
      this.intensity = 0;
    }

    trigger(intensity) {
      this.triggered = true;
      this.triggerTime = p.millis();
      this.intensity = p.max(this.intensity, intensity);
    }

    update() {
      if (this.triggered && p.millis() - this.triggerTime > COOLDOWN_TIME) {
        this.triggered = false;
        this.intensity = 0;
      }
    }

    display() {
      p.push();
      p.translate(this.x, this.y);

      if (this.triggered) {
        let progress = (p.millis() - this.triggerTime) / COOLDOWN_TIME;
        let currentColor = p.lerpColor(
          p.color(START_COLOR),
          p.color(END_COLOR),
          progress
        );
        p.fill(
          p.red(currentColor),
          p.green(currentColor),
          p.blue(currentColor),
          120 * this.intensity
        );
      } else {
        p.fill(HEXAGON_FILL_COLOR); // Semi-opaque white
      }

      p.stroke(HEXAGON_STROKE_COLOR);
      p.strokeWeight(1);

      p.beginShape();
      for (let i = 0; i < 6; i++) {
        let angle = (p.TWO_PI / 6) * i;
        let px = p.cos(angle) * HEX_SIZE;
        let py = p.sin(angle) * HEX_SIZE;
        p.vertex(px, py);
      }
      p.endShape(p.CLOSE);

      p.pop();
    }
  }
});

mapboxgl.accessToken =
  "pk.eyJ1IjoiYnVnbWFuZ28iLCJhIjoiY2ozZGxidG84MDAwNzJ4cHB1ZzhxMTZnMiJ9.hTyyNniMqZiWXLy3yQn6mA";
// Set the map to Kharkiv, Ukraine
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/bugmango/clz436fjx02es01pecvjye56g",
  center: [36.2528, 49.9935], // Set to Kharkiv, Ukraine coordinates
  zoom: 10,
  interactive: false, // Disable all interactions
});

map.scrollZoom.disable();
map.dragPan.disable();
map.keyboard.disable();
map.touchZoomRotate.disable();
map.boxZoom.disable(); // Disable box zoom
map.doubleClickZoom.disable(); // Disable double-click zoom
map.touchPitch.disable(); // Disable touch pitch
