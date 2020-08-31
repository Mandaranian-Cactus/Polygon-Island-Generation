class Island{
  constructor(noiseScale, startX, startY, w, h){
    this.startX = startX;
    this.startY = startY;
    this.noiseScale = noiseScale;
    this.w = w;
    this.h = h;
    this.map = [];
  }
  constructIsland(){  // Constructs an island-biased 2D noise map
    // Construct map
    for (let i =0; i < this.h; i++) this.map.push([]);
    
    let noiseScale=0.02;
    let startX = 3.1;
    let startY = 10;
    let mid = createVector(this.w/2, this.h/2);
    for (let y=0; y<this.h;y++){
      for (let x=0; x < this.w; x++) {
        let noiseVal = noise(x*noiseScale+this.startX, y*noiseScale+this.startY);
        let d = abs(x/this.w -1/2) + abs(y/this.h - 1/2);
        // let d = dist(x,y,mid.x,mid.y) / width;
        let val = (this.lower(d) + noiseVal * (this.upper(d)-this.lower(d))); // Formula for calculating the island bias (Pushes down on outskirts and raises center)
        let color = 255 * val;
        color = min(max(0, color), 255);  // Limit the color to be from 0 - 255 (inclusively)
        stroke(color);
        this.map[y].push(val);
      }
    } 
  }
  
  drawVornoiIsland(vornoiRegions){  // Draws noise map with vornoi diagram as medium
    translate(0, height);
    scale(1, -1);
    for (let i = 3; i < vornoiRegions.length; i++) {
    let x = int(vornoiRegions[i].seed.x);
    let y = int(vornoiRegions[i].seed.y);
    if (I.map[y][x] > 0.05) {
      beginShape();
      stroke(200, 150, 200);
      if (vornoiRegions[i].vertices.length == 0) continue; // There still seems to be a bug where undefined vertices appear or the orientation flips horizontally
      for (let v of vertices[i].vertices) {
        vertex(v.x, v.y);
      }
      vertex(vornoiRegions[i].vertices[0].x, vornoiRegions[i].vertices[0].y);
      endShape();
      }
    }
  }
  
  drawNoiseIsland(){  // Draws noise map with pixels and color as medium
    for (let y=0; y<this.h;y++){
      for (let x=0; x < this.w; x++) {
        let val = this.map[y][x];
        let color = 255 * val;
        stroke(color);
        point(x, y);
      }
    }
  }
  
  upper(x){  // Helper func for island bias (Hard to explain how it work)
    return -0.6 * pow(x, 0.4) + 0.6;
  }

  lower(x){  // Helper func for island bias (Hard to explain how it work)
    // return 0;
    return -0.5 * pow(x, 1.9);
  }
}
