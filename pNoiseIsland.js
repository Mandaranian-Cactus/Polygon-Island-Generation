class Island{
  constructor(noiseScale, startX, startY, w, h){
    this.startX = startX; // Starting position to record the perlin noise
    this.startY = startY; // Starting position to record the perlin noise
    this.noiseScale = noiseScale;  // Increment in which we record the next noise value
    this.w = w; // Width in terms of pixels. Used for 2D perlin noise map  
    this.h = h; // Height in terms of pixels. Used for 2D perlin noise map
    this.map = [];  // Contains the 2D perlin noise map
    this.polygons = [];  // Contains all polygons which are "land" or "lake" tiles
  }
  
  constructIsland(){  // Constructs an island-biased 2D noise map
    // The method involves looking at a standard 2D perlin noise map and increasing/decreasing the values of pixels which lie either closer or further away from the middle of the screen. This way, pixels closer to the center are elevated and form mountains, pixels on the outskirts are pushed down and form ocean, and pixels somewhere in between form forests and plains.
    
    // Construct map
    for (let i =0; i < this.h; i++) this.map.push([]);
    
    let mid = createVector(this.w/2, this.h/2); // Mid point of screen (Used for island bias)
    for (let y=0; y<this.h;y++){
      for (let x=0; x < this.w; x++) {
        let noiseVal = noise(x*this.noiseScale+this.startX, y*this.noiseScale+this.startY);
        // let d = abs(x/this.w -1/2) + abs(y/this.h - 1/2);
        let d = dist(x,y,mid.x,mid.y) / width;
        let val = this.bias(d) + noiseVal  // Formula to add island bias
        let color = 255 * val;
        color = min(max(0, color), 255);  // Limit the color to be from 0 - 255 (inclusively)
        stroke(color);
        this.map[y].push(val);
      }
    } 
  }
  
  bias(x){  // Helper func for island bias (Hard to explain how it work)
    return -1.7 * pow(x, 1.6) + 0.3;
  }
  
  setupTerrain(vornoiRegions){
    this.polygons = [];  // Reset data (Look for BETTER SOLUTION in the future)
    
    // Record terrain data
    // Ocean - Water that exists outside of the island's borders
    // Lake - Water that exists inside of the island's borders
    // Land - Tile above water level/height
    for (let i = 3; i < vornoiRegions.length; i++) {
      let x = int(vornoiRegions[i].seed.x);
      let y = int(vornoiRegions[i].seed.y);
      if (I.map[y][x] > 0.5) {  // Note that we only look at the height given by the noise map
        vornoiRegions[i].land = true;  // Tile's terrain name is "land"
        vornoiRegions[i].visited = true;  // Marks it so that we have assigned this tile a terrain name
        // Check to see if below line is removable
        if (vornoiRegions[i].vertices.length == 0) continue; // There still seems to be a bug where undefined vertices appear or the orientation flips horizontally
      }
    }
    
    // Perform a flood fill algorithim in order to find lake and ocean tiles   
    // In order to find ocean tiles, we start flood filling at tiles touching the screen border
    for (let i = 3; i < vornoiRegions.length; i++){
      let region = vornoiRegions[i];
      if (!region.visited && !region.land){
        // We now have a vornoi region which hasn't been visited and isn't land
        for (let j =0; j < region.vertices.length; j++){
          let v1 = region.vertices[j];
          let v2;
          if (j == region.vertices.length - 1) v2 = region.vertices[0];
          else v2 = region.vertices[j + 1];
          
          // We check to see if the edge is attatched to a screen edge
          // 0.1 used in order to account for round off errors
          if ((abs(v1.x) < 0.1  && abs(v2.x) < 0.1) || (abs(v1.y - height) < 0.1 && abs(v2.y - height) < 0.1) || (abs(v1.y) < 0.1  && abs(v2.y) < 0.1) || (abs(v1.x - width) < 0.1  && abs(v2.x - width) < 0.1)){
            // We have just found an ocean vornoi region touching the border 
            // Now begin flood fill
            this.floodFill(region);
            continue;
          }
        }
      }
    }
    
    // At this point, we should have all ocean and land tiles recorded. Now we find all lake tiles.
    for (let i = 3; i < vornoiRegions.length; i++){
      let region = vornoiRegions[i];
      if (!region.visited) region.lake = true;
    }
    
    // Determine which vornoi regions belong to this.polygons
    for (let i = 3; i < vornoiRegions.length; i++){
      let region = vornoiRegions[i];
      if (region.land || region.lake) this.polygons.push(region); 
    }
  }
  
  setupElevation(vornoiRegions){
    // Use bfs approach to sweep layer by layer
    // The further a tile is away from the coast, the greater elevation it has
    let elevationCnt = 0;  // Represents the elevation of a given polygon (-1 is ocean and anything 0 or greater is a form of land or just lake)
    while (true){
      let flag = true;
      if (elevationCnt == 0){
        for (let i = 3; i < vornoiRegions.length; i++){
          let region = vornoiRegions[i];
          if (!region.land) region.elevationCnt = -1;  // We have an ocean tile (elevation is -1)
          else{
            // We are on a land tile
            // Now we check for any coastal land tiles
            for(let n of region.neighbors){
              if (!n.land){
                // We have found a coast tile (tile right next to ocean)
                region.elevationCnt = 0;  // Coastal tile elevation is 0
                flag = false;
                break;
              }
            }
          }
        }
      }
      else{
        for (let i = 3; i < vornoiRegions.length; i++){
          let region = vornoiRegions[i];
          if (region.land){
            for (let n of region.neighbors){
              
              
              if (n.elevationCnt == elevationCnt-1 && region.elevationCnt == null){
                region.elevationCnt = elevationCnt;
                flag = false;
                break;
              }
            }
          }
        }
      }
      if (flag) break;
      elevationCnt++;
    }

    // Combine the bfs height and noise map heights together
    for (let i = 3; i < vornoiRegions.length; i++){
      // In order to find the height with respect to the noise map, we look at the values at the region's given coners and average them out. (Note that we could instead find the centroid value instead of averaging corners equally if we want to have a weighted average)
      let region = vornoiRegions[i];
      let h = 0;  // Height/Elevation of that given vornoi region
      let vCnt = 0;  // # of vertices for the given polygon
      for (let v of region.vertices){
        let x = int(v.x);
        let y = int(v.y);
        h += this.map[y][x];
        vCnt++;
      }
      h /= vCnt;
      h += region.elevationCnt * 0.1;
      region.elevationCnt = null;  // Clean out data (no longer useful)
      region.elevation = h;
    }
  }
  
  floodFill(region){
    region.ocean = true;
    region.visited = true;
    for (let n of region.neighbors){
      if (!n.visited && !n.land) this.floodFill(n);
    }
  }
  
  renderVornoiIsland(vornoiRegions, color){
    for (let i= 3; i < vornoiRegions.length; i++){
      let region = vornoiRegions[i];
      
      if (region.ocean) fill(55, 117, 189);
      else if (region.lake) fill (138, 192, 255);
      else if (region.land){
        fill(region.elevation * 255, region.elevation*255 + 75, region.elevation*255);
      }
      else (fill(225,160, 0))
      beginShape();
      for (let v of region.vertices){
        vertex(v.x, v.y); 
      }
      vertex(region.vertices[0], region.vertices[1]);
      endShape();
    }
  }
}
