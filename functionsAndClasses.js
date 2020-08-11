function ccwTriangle(l, r, combo, triangle){
  // Given a set of 3 points, form a triangle in counter-clockwise orientation
  // The solution is to compute all permutations of the 3 points and check if any permutations fulfill the CCW property
  // We know that the property is fulfilled using right hand-rule where 2 line segments from the 3 points create a CCW orientation (finger points up or z-component is above 0)
  
  
  if (l == r){
    // We have found a permutation
    // Determine if permutation forms a CCW orientation
    let v1 = vertices[combo[0]];
    let v2 = vertices[combo[1]];
    let v3 = vertices[combo[2]];
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
  // Assume that both lines are not collinear
  // Equation of a given line is: x = s1.x + v1.x(t1) | y = s1.y + v1.y(t1) 
  let t2 = (v1.x * s1.y + v1.y * ( s2.x - s1.x) - s2.y * v1.x) / (v2.y * v1.x  - v2.x * v1.y)  // Got this from a lot of algebra
  let x = s2.x + v2.x * t2;
  let y = s2.y + v2.y * t2;
  return [x, y];
}

class Triangle{
  constructor(){
    this.vertices = [];
    this.circumCenter = null;
  }
}

class Edge{
  constructor(v1, v2){
    this.vertices = [v1, v2];
  }
}
