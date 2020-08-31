function ccwTriangle(l, r, combo, triangle){
  // Given a set of 3 points, form a triangle in counter-clockwise orientation
  // The solution is to compute all permutations of the 3 points and check if any permutations fulfill the CCW property
  // We know that the property is fulfilled using right hand-rule where 2 line segments from the 3 points create a CCW orientation (finger points up or z-component is above 0)
  
  
  if (l == r){
    // We have found a permutation
    // Determine if permutation forms a CCW orientation
    let v1 = vornoiRegions[combo[0]].seed;
    let v2 = vornoiRegions[combo[1]].seed;
    let v3 = vornoiRegions[combo[2]].seed;
    if (ccw(v1, v2, v3) > 0){
      // Set up ordered vertices (Store indexes and not actual values)
      triangle.vertices = [combo[0], combo[1], combo[2]];
      // Set up the "directed" half edges
      adjM[combo[0]][combo[1]] = triangle;
      adjM[combo[1]][combo[2]] = triangle;
      adjM[combo[2]][combo[0]] = triangle;
    }
  }
  
  else{
    // Continue recursion to construct pemutations
    for (let i = l; i < r + 1; i++){
      [combo[i], combo[l]] = [combo[l], combo[i]];
      ccwTriangle(l + 1, r, combo, triangle);
      [combo[i], combo[l]] = [combo[l], combo[i]];
    }
  }
}

function ccw(a, b, c){ // We assume that the order is a --> b --> c
  // Given 3 ordered points, determine their orientation
  let e1 = p5.Vector.sub(b, a);  // Find the edge vectors
  let e2 = p5.Vector.sub(c, b);
  // The z-component of the cross product will show orientation
  let z = e1.cross(e2).z;
  
  return z;
}

function inCircle (ax, ay, bx, by, cx, cy, dx, dy) {
    // Given 3 points to represent a CCW triangle and a 4th point, determine if the 4th point lies inside the circumfircle of the CCW triangle
    // Determinant is used (I don't understand the math behind it). If determinant greater than 0, then the 4th point lies in the circumcircle.
    let ax_ = ax-dx;
    let ay_ = ay-dy;
    let bx_ = bx-dx;
    let by_ = by-dy;
    let cx_ = cx-dx;
    let cy_ = cy-dy;
    return (
        (ax_*ax_ + ay_*ay_) * (bx_*cy_-cx_*by_) -
        (bx_*bx_ + by_*by_) * (ax_*cy_-cx_*ay_) +
        (cx_*cx_ + cy_*cy_) * (ax_*by_-bx_*ay_)
    ) > 0;
}
function intersect(s1, v1, s2, v2){
  // Given 2 lines and assuming that they intersect, find the intersection point
  // Equation of a given line is: x = s1.x + v1.x(t1) | y = s1.y + v1.y(t1) 
  let t2 = (v1.x * s1.y + v1.y * ( s2.x - s1.x) - s2.y * v1.x) / (v2.y * v1.x  - v2.x * v1.y)  // Got this from a lot of algebra
  let x = s2.x + v2.x * t2;
  let y = s2.y + v2.y * t2;
  return [x, y];  // Segments collide and return the position
}


function insideRect(point, topLeft, w, h){
  // Find if point on/inside a rectangle
  if (topLeft.x <= point.x && point.x <= topLeft.x + w && topLeft.y <= point.y && point.y <= topLeft.y + h) return true;
  else return false;
}

function wallIntersect(vStart, vD, wallStart, wallD, wallEnd){  // Special function different from "intersect"
  // Given a directed edge and either "horizontal" or "vertical" line seg, compute the intersection IF THERE IS ANY
  
  if (wallD.y == 0){
    let t = (wallStart.y - vStart.y) / vD.y;
    if (t < 0) return false; // No collision (Arrow pointing in opposite direction in y-axis)
    else{
      let x = vStart.x + vD.x * t;
      if (wallStart.x <= x && x <= wallEnd.x){
        let y = vStart.y + vD.y * t;
        return createVector(x, y);
      }
      else return false;  // No collision (Arrow's intersection went past the line segment in x-axis)
    }
  }
  else if (wallD.x == 0){
    let t = (wallStart.x - vStart.x) / vD.x;
    if (t < 0) return false; // No collision (Arrow pointing in opposite direction in x-axis)
    else{
      let y = vStart.y + vD.y * t;
      if (wallStart.y <= y && y <= wallEnd.y){
        let x = vStart.x + vD.x * t;
        return createVector(x, y);
      }
      else return false;  // No collision (Arrow's intersection went past the line segment in y-axis)
    }
  }        
  else return "error";
}

function ccwSort(points){
  // Given a set of points, arrange them in CCW orientation order
  // Assume that we are constructing a convex polygon
  // The solution is to find polar angles for each point and sort accordingly
  // We find the midpoint (Avg of all points) and compare all angles relative to an upwards (0, 1) vector
  
  let midPoint = createVector();
  for (let point of points){
    midPoint.add(point);
  }
  midPoint.div(points.length);
  
  let sorted = [];
  for (let point of points){
    let v1 = createVector(0, 1);  // Base/Reference vector (if v1 == v2, we get 0 degrees)
    let v2
    try {
    v2 = p5.Vector.sub(point, midPoint);
} catch (TypeError) {
  background(200)
  for (let p of points) if (p != undefined) circle(p.x, p.y, 15)
}
    let agl = degrees(acos(v2.dot(v1)/(v1.mag() * v2.mag())));
    if (point.x > midPoint.x) agl = 360 - agl;
    sorted.push([agl, point]);
  }
  
  sorted.sort(function(x, y){  // Sort by 0th index (The angle)
    if (x[0] < y[0]) {
      return -1;
    }
    if (x[0] > y[0]) {
      return 1;
    }
    return 0;
  });
  
  for (let i = 0; i < sorted.length; i++) sorted[i] = sorted[i][1];
  return sorted;
}

function addCorners(vertices, screenW, screenH){
  // Given a point set, determine if any of the 4 screen corners can be added into the point set
  // Point set is arranged in CCW order
  // Solution involes comparing points along a given screen wall. If a point goes from being a part of one wall to another, we assume that corner(s) can be added
  // 1/0 - Left Wall
  // 2 - Bottom Wall
  // 3 - Right Wall
  // 4 - Top Wall
  let prevWallTouch = null;
  let prevWallTouchState = null;
  let addedCorners = [];
  
  // Point set must at least contain 3 points
  if (vertices.length < 3) return vertices;
  
  for (let j = 0; j < vertices.length + 1; j++){  // "+1" needed to account for the transition from the last to the first point
    let i;  // We need a "i" and "j" to avoid infinite-loop
    if (j == vertices.length) i = 0;  // Accounts for "full-circle" indexing
    else i = j;
    let v = vertices[i];
    if (abs(v.x - screenW) < 0.1 || abs(v.x) < 0.1 ||  abs(v.y) < 0.1 || abs(v.y - screenH) < 0.1){
      if (prevWallTouch == null){  // Rounding if used to eliminate computer rounding calculations
        prevWallTouch = v;
        // Determine which wall the point belongs to 
        // Note that cases where the point lies on a corner may lead to errors
        // NOTE THAT THE ORDER OF THE IF AND ELSE IF STATEMENTS ARE VERY SPECIFIC TO BYPASS CASES WHERE THE POINT LIES ON A CONER
        if (abs(v.y) < 0.1) prevWallTouchState = 2;
        else if (abs(v.x - screenW) < 0.1) prevWallTouchState = 3;
        else if (abs(v.y - screenH) < 0.1) prevWallTouchState = 4;
        else if (abs(v.x) < 0.1) prevWallTouchState = 1;
      }
      else{
        let curWallTouchState;
        // Note that cases where the point lies on a corner may lead to errors
        // NOTE THAT THE ORDER OF THE IF AND ELSE IF STATEMENTS ARE VERY SPECIFIC TO BYPASS CASES WHERE THE POINT LIES ON A CONER
        if (abs(v.y) < 0.1) curWallTouchState = 2;
        else if (abs(v.x - screenW) < 0.1) curWallTouchState = 3;
        else if (abs(v.y - screenH) < 0.1) curWallTouchState = 4;
        else if (abs(v.x) < 0.1) curWallTouchState = 1;
        while (curWallTouchState != prevWallTouchState){
          prevWallTouchState += 1;
          if (prevWallTouchState == 5) prevWallTouchState = 1;  // Accounts for going from top to left wall
          // Decide which corner to add
          if (prevWallTouchState == 1) addedCorners.push([i, createVector(0, height)]);
          else if (prevWallTouchState == 2) addedCorners.push([i, createVector(0, 0)]);
          else if (prevWallTouchState == 3) addedCorners.push([i, createVector(width, 0)]);
          else if (prevWallTouchState == 4) addedCorners.push([i, createVector(width, height)]);
        }
        prevWallTouch = v;
        prevWallTouchState = curWallTouchState;
      }
    }
    else{  // Corners can only be drawn when we have 2 consecutive points which long to at least one wall
      prevWallTouch = null;
      prevWallTouchState = null;
    }
  }
  
  // Add the corner(s) into the point set
  let idxAdjust = 0;
  for (let vals of addedCorners){
    let c = vals[1];
    let i = vals[0];
    vertices.splice(i + idxAdjust, 0, c);
    idxAdjust += 1
  }
  return vertices;
}

class Triangle{
  constructor(){
    this.vertices = [];
    this.circumCenter = null;
    this.circumCenterInside = null;
  }
}

class vornoiRegion{
  constructor(seed){
    this.seed = seed;
    this.vertices = [];
    this.neighbors = [];
  }
}

class Edge{
  constructor(v1, v2){
    this.vertices = [v1, v2];
  }
}

