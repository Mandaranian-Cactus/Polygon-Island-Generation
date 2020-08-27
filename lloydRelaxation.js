
function findCentroid(polygon){
  // Given a CONVEX polygon sorted in CCW order, find its centroid
  // Solution is: break up polygon into several triangles --> Find centroid of each triangle --> Average the centroids with their respective triangle's area as weights
  let start = polygon[0];
  let data = [];
  for (let i = 2; i < polygon.length; i++){
    let p1 = start;
    let p2 = polygon[i];
    let p3 = polygon[i - 1];
    // let triangleCentroid = ((p1.add(p2)).add(p3)).div(3);
    let triangleCentroid = p5.Vector.add(p5.Vector.add(p1, p2), p3).div(3);
    let area = triangleArea(p1, p2, p3);
    data.push(new WeightedValue(triangleCentroid, area));
  }
  let polygonCentroid = addWeightedValues(data);
  return polygonCentroid
}

class WeightedValue{
  constructor(value, weight){
    this.val = value;
    this.weight = weight;
  }
}

function triangleArea(p1, p2, p3){
  // Given the 3 vertices of a triangle, find the area of the triangle
  // Solution here is to use cross product. S ince the area of a triangle is 1/2 of its parallelogram representation, we really only need to find the area of the parallelogram. Now, revisualize the parallelogram as a rectangle (Shift the diagnol until it makes a right angle with the base). If we half the area of this rectangle, we still get the area of the triangle. To find the rectangle's area, we use cross product: A X B = |A||B|sin(theta). Since we have a rectangle, theta = 90 degrees and sin(theta) = 1
  let a = p5.Vector.sub(p2, p1);
  let b = p5.Vector.sub(p3, p1);
  let area = a.cross(b).mag()/2;
  return area;
}

function addWeightedValues(weightedVals){
  // Given elements each with a value and weight, find the weighted sum value
  // Solution involves using ratios where larget weights have more influence
  let totWeight = 0
  let weightedSumVal = createVector();
  
  for (let weightedVal of weightedVals){
    let weight = weightedVal.weight;
    totWeight += weight;
  }
  
  for (let weightedVal of weightedVals){
    let val = weightedVal.val;
    let weight = weightedVal.weight;
    weightedSumVal.add(val.mult(weight/totWeight));
  }
  return weightedSumVal;
}
