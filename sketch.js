// It seems that there is a problem where the triangle isn't fully forming
// Okay, so there is a problem with Bowyer Watson Algorithim where inaccurate results come from the super triangle's boarder(s) being too close to the player-inputs. So for exp, a super triangle with points at (0,0), (0, 1000000), (1000000, 0) will lead to errors. The error itself is a little hard to explain but what happens is that some triangulations are made with
// https://stackoverflow.com/questions/30741459/bowyer-watson-algorithm-how-to-fill-holes-left-by-removing-triangles-with-sup

// NOTE THAT THE NEIGHBORS OF THE VORNOI REGIONS MAY SEEM INCORRECT. This is not really a "bug" or a "feature" but somewhere inbetween. Sometimes, a delunary triangle's circumcenter is outside of the screen so the vornoi diagram on screen looks incomplete. As a result, two seeds which appear non-neighbors on screen are actually neighbors is the screen size were to be expanded.

// With respect to the above paragraph, I went with a different method when working with the border seperating vornoi regions. In that case, I just recorded the borders up to their intersection with the screen and didn't allow them to extend super far. This may lead to future errors tho.

let vertices;
let adjM;
let triangulation;

function setup() {
  createCanvas(800, 800);
  
  // Initially, the vertices are only the superTriangle points (Super Triangle is assumed to be HUGE)
  // Note that dimensions for the supertriangle may lead to errors
  vertices = [new vornoiRegion(createVector(-2 * width,-height)), new vornoiRegion(createVector(2 * width, -height)), new vornoiRegion(createVector(width, 2 * height))];
}

function delTrig(){
  // Perform delunary trianglulation (and a little vornoi diagram processing)
  triangulation = new Deque();  // Stores all triangles in CCW orientation
  adjM = [];  // Adjacency matrix. Records DIRECTED edges of triangles
  
  // Construct empty adjM
  for (let i = 0 ;i < vertices.length; i++){
    let row = [];
    for (let j = 0; j < vertices.length; j++){
      row.push(false); 
    }
    adjM.push(row);
  }
  
  // Setup super triangle (Asusmed to be just really big)
  let superTriangle = new Triangle();
  ccwTriangle(0, 2, [0, 1, 2], superTriangle);
  triangulation.pushFront(new DequeEl(superTriangle));
  
  // Main code for delunary triangulation
  for (let newPointIndex = 3; newPointIndex < vertices.length; newPointIndex++){
    let point = vertices[newPointIndex].seed;
    let badTriangles = [];  // Contains triangles that contain the new point (a.k.a  triangles who breaks the delunary triangulation property)
    let polygon = [];  // Contains edges which are to make new triangles with the new point
    
    // Find all bad triangles and remove from triangulation
    // O(n) time where n is the length of vertices. (Max length of triangulation is n)
    let length = triangulation.length;
    for (let i = length - 1; i >= 0; i--){
      let triangle = triangulation.popFront();
      let a = vertices[triangle.vertices[0]].seed;
      let b = vertices[triangle.vertices[1]].seed;
      let c = vertices[triangle.vertices[2]].seed;
      let d = point;
      
      // Use determinant to find if point lies inside circle
      if (inCircle(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)){
        badTriangles.push(triangle); // Add to badTriangles
      }
      else triangulation.pushBack(new DequeEl(triangle));  // Triangle is outside of circumcircle (So we keep it inside of triangulation array unneeded to be changed)
    }
    
    // Create "polygon" with info from badTriangles
    // Check for any shared edges between triangles of badTriangles. Any edges that are unshared should be appended into the polygon array
    for (let triangle of badTriangles){
      for (let i = 0; i < triangle.vertices.length; i++){ // ALWAYS ONLY 3 VERTICES PER TRIANGLE
        // Find the current vertex and next vertex of the directed triangle. (The variables only store the indexes btw)
        let curV = triangle.vertices[i];
        let nextV;
        if (i == 2) nextV = triangle.vertices[0];
        else nextV = triangle.vertices[i + 1];

        // Check to see if there is a shared edge. Since edges are directed and CCW oriented, we can rely on checking the reversed order of the adjM. For exp, assume vertices 1 and 2. If adjM[1][2] and adjM[2][1] both aren't false, then there is a shared edge,
        // Special case: edge is shared but not with any badTriangle
        // Conclusion: we consider the edge as not being shared
        if (!adjM[nextV][curV] || badTriangles.includes(adjM[nextV][curV]) == false){
          polygon.push(new Edge(curV, nextV));

          // In the case of a shared edge, we need to immediately remove all info of the edge from the adjacency matrix. (Going in both directions) If we didn't alter the adjM immediately, there would be 2 instances of a shared edge being recorded. Having basically a duplicate within our "polygon" array is meaningless and to remove it directly from the "polygon" array afterwards is just a pain to do.
          // HOWEVER we must remember to only remove info of both directed edges when we are sure that both edges are from "badTriangles". Otherwise, we might be deleting info from a triangle which is valid (In that instance, we also wouldn't consider both triangles to have a "shared edge" neccesarily. I mean they share and edge but they aren't both bad triangles)
          if (badTriangles.includes(adjM[nextV][curV])){ 
            adjM[curV][nextV] = false;
            adjM[nextV][curV] = false;
          }
        }
      }
    } 
    
    // Remove old triangles' (badTriangles) edge connections
    // We do this by checking every current vertex "curV" and removing the edge from "curV" to the next vertex "nextV" from the directed adjacency matrix
    // We remove only the edges as the triangulation removal should have already occured
    for (let triangle of badTriangles){
      for (let i = 0; i < triangle.vertices.length; i++){
        
        // Remove edge connections from adjacency matrix
        let curV = triangle.vertices[i];
        let nextV;
        if (i == 2) nextV = triangle.vertices[0];
        else nextV = triangle.vertices[i + 1];
        adjM[curV][nextV] = false;
      }
    }
    
    // Import new triangles
    // Runs in O(n) time where n is the # of vertices (It's actually smt like O(3n) since every vertex has 3 edges)
    for (let edge of polygon){
      // Indexed based vertices btw (Stores indexes which are referenced by "vertices" list)
      let v1 = edge.vertices[0];
      let v2 = edge.vertices[1];
      let v3 = newPointIndex;
      let newTriangle = new Triangle();
      
      // Might be a little unoptimized but here we are finding all permutations of the vertices and accepting any permutation which fulfills a CCW orientation
      // I think this runs in O(1) time since we wil always be using onyl 3 vertices
      ccwTriangle(0, 2, [v1, v2, v3], newTriangle); 
      triangulation.pushFront(new DequeEl(newTriangle));
    }
  }
  
  // Remove any triangles with a point belonging to the original Super Triangle
  let length = triangulation.length;
  for (let i = length - 1; i >= 0; i--){
    let triangle = triangulation.popFront();
    let flag = false; // true --> belongs to super triangle | false --> doesn't blong to super triangle 
    for (let v of triangle.vertices){
      if (superTriangle.vertices.indexOf(v) != -1){ // Check if vertex is shared by the superTriangle
        // Remove triangle from triangulation and remove directed edges from AdjM
        for (let j = 0; j < triangle.vertices.length; j++){
          let curV = triangle.vertices[j];
          let nextV;
          if (j == 2) nextV = triangle.vertices[0];
          else nextV = triangle.vertices[j + 1];
          adjM[curV][nextV] = false;
        }
        flag = true;
        break;  // Since we fully removed the triangle, we don't need to continue searching it
      }
    }
    if (!flag) triangulation.pushBack(new DequeEl(triangle));  // If no vertices belong to super triangle, we don't delete the triangle
  }
  
  
  // Calculate circum-centers of every triangle
  length = triangulation.length;
  for (let i = 0; i < length; i++){
    let triangle = triangulation.popFront();
    triangulation.pushBack(new DequeEl(triangle))
    let v1 = vertices[triangle.vertices[0]].seed;
    let v2 = vertices[triangle.vertices[1]].seed;
    let v3 = vertices[triangle.vertices[2]].seed;
    let e1 = p5.Vector.sub(v2, v1);
    let dx = e1.x; let dy = e1.y;
    e1.x = -dy; e1.y = dx;
    let m1 = p5.Vector.add(v1, v2).div(2);
    let e2 = p5.Vector.sub(v3, v2);
    dx = e2.x; dy = e2.y;
    e2.x = -dy; e2.y = dx;
    let m2 = p5.Vector.add(v2, v3).div(2);
    let point = intersect(m1, e1, m2, e2);
    triangle.circumCenter = createVector(point[0], point[1]);
    if (insideRect(triangle.circumCenter, createVector(0,0), width, height)) triangle.circumCenterInside = true
    else triangle.circumCenterInside = false
  }

  
  // print("done")
  // print(triangulation)
  // print("")
  // for (let row of adjM) print(row)
}

function drawVisual(){
  background(220);
  translate(0, height);
  scale(1, -1);
  
  drawCircumCircle();
  // drawDirectedEdges();
  drawVornoiDiagram();
  
  // Draw circles
  fill(255, 163, 230);
  for (let v of vertices) circle(v.seed.x, v.seed.y, 15);
}

function draw() {
  let newPoints = [vertices[0], vertices[1], vertices[2]];
  if (keyIsDown(69)) {
    for (let i = 3; i < vertices.length; i++){
      let region = vertices[i];
      newPoints.push(new vornoiRegion(findCentroid(region.vertices))); 
    }
    vertices = [];
    for (let el of newPoints) vertices.push(el)
    delTrig();
    drawVisual();
  }
}

function drawCircumCircle(){
  // Draw the circumcircles and circumcenters
  let length = triangulation.length;
  for (let i = 0; i < length; i++){
    let triangle = triangulation.popFront();
    triangulation.pushBack(new DequeEl(triangle));
    let r = dist(triangle.circumCenter.x, triangle.circumCenter.y, vertices[triangle.vertices[0]].seed.x, vertices[triangle.vertices[0]].seed.y);
    stroke(50, 50, 255)
    noFill();
    
    circle(triangle.circumCenter.x, triangle.circumCenter.y, r * 2);

    fill(255, 150, 150);
    circle(triangle.circumCenter.x, triangle.circumCenter.y, 10);
  }
}

function drawDirectedEdges(){
  // Draw directed edges
  stroke(100, 255, 100);
  let length = triangulation.length;
  for (let i = 0; i < length; i++){
    let t = triangulation.popFront();
    triangulation.pushBack(new DequeEl(t));
    for (let i = 0; i < t.vertices.length; i++){
      if (i == 2) nextP = vertices[t.vertices[0]].seed;
      else nextP = vertices[t.vertices[i + 1]].seed;
      
      curP = vertices[t.vertices[i]].seed;
      line(curP.x, curP.y, nextP.x, nextP.y);
    }
  }
}

function drawVornoiDiagram(){
  // Draw the vornoi diagram
  
  // Start off by reseting info
  for (let v of vertices){
    v.neighbors = [];
    v.vertices = [];
  }
    
  // We do this by drawing lines from circumcenters of triangles which share an edge with one another. Note that there will be special cases where a more tedious method is used
  stroke(255, 50, 50);
  let length = triangulation.length;
  for (let i = 0; i < length; i++){
    let triangle = triangulation.popFront();
    triangulation.pushBack(new DequeEl(triangle));
    for (let i = 0; i < triangle.vertices.length; i++){
      let curV = triangle.vertices[i];
      let nextV;
      if (i == 2) nextV = triangle.vertices[0];
      else nextV = triangle.vertices[i + 1];
      if (adjM[nextV][curV]){
        // We have a shared edge
        let otherTriangle = adjM[nextV][curV];
        // Setup the neighbors of the vornoi region
        // We don't given any info to the "nextV" since edge is shared so "nextV" will be "curV" in another iteration
        vertices[curV].neighbors.push(vertices[nextV]);
        
        // Here, we will encounter one of 3 seperate cases: out-out, in-in, out-in
        // A circumcenter is considered "out" if it lies outside of the screen
        // A circumcenter is considered "in" if it lines inside or on the screen
        // An out case is bad bc the circumcenter may lie extremely outside of the screen which screws up processes such as lloyd relaxation. In this case, we would have a line that cn go from the center of the screen to smt like (-1000000000, 10000000). To fix this, we snip of the line at the point where is intersects with the box
        // in-in: both circumcenters lie in side screen. Simpist case so where we just connect the circumcenters directly
        
        let p1 = null; let p2 = null;  // Points to draw the "contained" line
        let v; // Vector extending from p1 to p2
        
        if (triangle.circumCenterInside && otherTriangle.circumCenterInside){
          p1 = triangle.circumCenter; p2 = otherTriangle.circumCenter
        }
        
        else if (triangle.circumCenterInside == false && otherTriangle.circumCenterInside == false){
          let a = triangle.circumCenter;
          let b = otherTriangle.circumCenter;
          let intersects = [];
          v = p5.Vector.sub(b, a);
          // Find intersection of vector with one of the screen borders
          let result = wallIntersect(a, v, createVector(0,0), createVector(1,0), createVector(width, 0));
          if (result != false) intersects.push(result);
          result = wallIntersect(a, v, createVector(0,0), createVector(0,1), createVector(0, height));
          if (result != false) intersects.push(result);
          result = wallIntersect(a, v, createVector(width,0), createVector(0,1), createVector(width, height));
          if (result != false) intersects.push(result);
          result = wallIntersect(a, v, createVector(0,height), createVector(1,0), createVector(width, height));
          if (result != false) intersects.push(result);
          
          if (intersects.length > 0){
            if (p5.Vector.sub(intersects[0], a).mag() < v.mag() && p5.Vector.sub(intersects[1], a).mag() < v.mag()){
                p1 = intersects[0];
                p2 = intersects[1];
              }
            }  
          }
        
        // out-out: both circumcenters are outside of the screen. Send arrow pointing from one circumcenter to other. Record intersections along the way
        // out-in: one circumcenter is outside of screen while other is inside. Send arrow pointing from on circumcenter to other. Record intersections along the way
        else{
          if (triangle.circumCenterInside){ // Out-In Case
            p1 = triangle.circumCenter;
            v = p5.Vector.sub(otherTriangle.circumCenter, triangle.circumCenter);
            // Find intersection of vector with one of the screen borders
            let result = wallIntersect(p1, v, createVector(0,0), createVector(1,0), createVector(width, 0));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(0,0), createVector(0,1), createVector(0, height));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(width,0), createVector(0,1), createVector(width, height));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(0,height), createVector(1,0), createVector(width, height));
            if (result != false) p2 = result;
          }
          else if (otherTriangle.circumCenterInside){ // Out-In Case
            v = p5.Vector.sub(triangle.circumCenter, otherTriangle.circumCenter);
            p1 = otherTriangle.circumCenter
            // Find intersection of vector with one of the screen borders
            let result = wallIntersect(p1, v, createVector(0,0), createVector(1,0), createVector(width, 0));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(0,0), createVector(0,1), createVector(0, height));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(width,0), createVector(0,1), createVector(width, height));
            if (result != false) p2 = result;
            result = wallIntersect(p1, v, createVector(0,height), createVector(1,0), createVector(width, height));
            if (result != false) p2 = result;
          }
        }
        if (p1 != null && p2 != null){
          line(p1.x, p1.y, p2.x, p2.y)  // Draw line
          // Setup vertices for vornoi region border
          // We don't give any info to "nextV" since edge is shared
          if (vertices[curV].vertices.indexOf(p1) == -1) vertices[curV].vertices.push(p1);
          if (vertices[curV].vertices.indexOf(p2) == -1) vertices[curV].vertices.push(p2);
      
        }
      }
      else{
        // The edge is unshared so we assume that it extends to a screen edge
        // We call these edges "infinite edges". They are special since they will got on indefenitly
        // "infinite edges" will always point outwards to the boarders so we use our triangle's ccw property alongside cross product in order to consturct vectors that point outwards
        // In this case, we are desiring a clockwise orientation
        // In addition, we would also convert the "infinite edge" into a line segment by finding its intersection with one of the screen's border
        let edgeMid = p5.Vector.add(vertices[curV].seed, vertices[nextV].seed).div(2);
        // circle(edgeMid.x, edgeMid.y, 20);
        let e1 = p5.Vector.sub(edgeMid, triangle.circumCenter);  // Vector from circumCenter to edgeMid (Or the vector that points outwards to screen edge)
        let e2 = p5.Vector.sub(vertices[nextV].seed, vertices[curV].seed);  // Vector from curV to nextV
        if (e2.cross(e1).z > 0){
          // Orientation was counter clockwise orientation so we multiply by -1 to get clockwise orientation
          e1.mult(-1);
        }
        
        // Find intersection between the "infinite edge" and a wall
        // Here, we use a custom intersect function different from the previous one
        // This version focuses on the intersection between a directed edge (arrow) and a HORIZONTAL or VERTICAL line segmnet
        // Note that issues may arise when the directed edge is parallel to a wall
        // This issue was looked into and I doubt actually bugs will occur (Just a footnote incase)
        
        let intersects = [];  
        
        // Compare possible intersections with all 4 walls
        let result = wallIntersect(triangle.circumCenter, e1, createVector(0,0), createVector(1,0), createVector(width, 0));
        if (result != false) intersects.push(result);
        result = wallIntersect(triangle.circumCenter, e1, createVector(0,0), createVector(0,1), createVector(0, height));
        if (result != false) intersects.push(result);
        result = wallIntersect(triangle.circumCenter, e1, createVector(width,0), createVector(0,1), createVector(width, height));
        if (result != false) intersects.push(result);
        result = wallIntersect(triangle.circumCenter, e1, createVector(0,height), createVector(1,0), createVector(width, height));
        if (result != false) intersects.push(result);
        
        // Draw the line 
        // For this part, we rely on a "tedious" method
        // There can be a case where the circumcenter is outside of the screen which yeilds 2 intercepts
        // We draw the line to the longest intercept however I'm lazy so I just draw all possible line (Shouldn't be that bad since we only have 2 lines to draw max)
        // Note that it is also possible to have no intercept (When the circumcenter is outside and directed edge points away from screen)
        for (let intersection of intersects){
          line(triangle.circumCenter.x, triangle.circumCenter.y, intersection.x, intersection.y) 
        }
        // Setup the neighbors of the vornoi region
        vertices[curV].neighbors.push(vertices[nextV]);
        vertices[nextV].neighbors.push(vertices[curV]);
         
        // Setup vertices for vornoi region border
        // Since edge is unshared, we provide info to "nextV" as well as "curV"
        for (let intersection of intersects){
          if (vertices[curV].vertices.indexOf(triangle.circumCenter) == -1) vertices[curV].vertices.push(triangle.circumCenter);
          if (vertices[curV].vertices.indexOf(intersection) == -1) vertices[curV].vertices.push(intersection);

          if (vertices[nextV].vertices.indexOf(triangle.circumCenter) == -1) vertices[nextV].vertices.push(triangle.circumCenter);
          if (vertices[nextV].vertices.indexOf(intersection) == -1) vertices[nextV].vertices.push(intersection);
        }
      }
    } 
  }
  
  // Sort the vornoi vertices in CCW order
  for (let i = 3; i < vertices.length; i++){ // We start at index 3 to avoid the super Triangle
    vertices[i].vertices = ccwSort(vertices[i].vertices);
  }
  
  // Fill in corners
  for (let i = 3; i< vertices.length; i++){
    vertices[i].vertces = addCorners(vertices[i].vertices,width, height); 
  }
}

function mouseClicked(){
  let mx = mouseX; let my = height - mouseY;
  vertices.push(new vornoiRegion(createVector(mx, my)));
  delTrig();
  drawVisual();
}

function keyPressed(){
  let newPoints = [vertices[0], vertices[1], vertices[2]];
  if (key == "e"){
    for (let i = 3; i < vertices.length; i++){
      let region = vertices[i];
      newPoints.push(new vornoiRegion(findCentroid(region.vertices))); 
    }
    vertices = [];
    for (let el of newPoints) vertices.push(el)
    delTrig();
    drawVisual();
  }
  if (key == " "){
    translate(0, height)
    scale(1, -1)
    for (let r of vertices){
      for (let v of r.vertices){
        fill(50,50, 50)
        circle(v.x, v.y, 30)
      }
    }
  }
  // print(newPoints)
}
