// It seems that there is a problem where the triangle isn't fully forming
// Okay, so there is a problem with Bowyer Watson Algorithim where inaccurate results come from the super triangle's boarder(s) being too close to the player-inputs. So for exp, a super triangle with points at (0,0), (0, 1000000), (1000000, 0) will lead to errors. The error itself is a little hard to explain but what happens is that some triangulations are made with
// https://stackoverflow.com/questions/30741459/bowyer-watson-algorithm-how-to-fill-holes-left-by-removing-triangles-with-sup

let vertices;
let adjM;
let triangulation;

function setup() {
  createCanvas(800, 800);
  
  // Initially, the vertices are only the superTriangle points (Super Triangle is assumed to be HUGGGGGGE)
  // Note that dimensions for the supertriangle may lead to errors
  vertices = [createVector(-2 * width,-height), createVector(2 * width, -height), createVector(width, 2 * height)];
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
    let point = vertices[newPointIndex];
    let badTriangles = [];  // Contains triangles that contain the new point (a.k.a  triangles who breaks the delunary triangulation property)
    let polygon = [];  // Contains edges which are to make new triangles with the new point
    
    // Find all bad triangles and remove from triangulation
    // O(n) time where n is the length of vertices. (Max length of triangulation is n)
    let length = triangulation.length;
    for (let i = length - 1; i >= 0; i--){
      let triangle = triangulation.popFront();
      let a = vertices[triangle.vertices[0]];
      let b = vertices[triangle.vertices[1]];
      let c = vertices[triangle.vertices[2]];
      let d = point;
      
      if (inCircle(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)){  // O(1) time
        badTriangles.push(triangle); // Add to badTriangles
      }
      else triangulation.pushBack(new DequeEl(triangle));
    }
    
    // Create "polygon" with info from badTriangles
    // Check for any shared edges between triangles of badTriangles. Any edges that are unshared should be appended into the polygon array
    for (let triangle of badTriangles){
      for (let i = 0; i < triangle.vertices.length; i++){
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
    // Runs in O(P) time where P is the length of the polygon array
    for (let edge of polygon){
      // Indexed based vertices btw
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
    for (let v of triangle.vertices){
      if (superTriangle.vertices.indexOf(v) != -1){
        // Remove triangle from triangulation
        // Remove directed edges from AdjM
        for (let j = 0; j < triangle.vertices.length; j++){
          let curV = triangle.vertices[j];
          let nextV;
          if (j == 2) nextV = triangle.vertices[0];
          else nextV = triangle.vertices[j + 1];
          adjM[curV][nextV] = false;
        }
        break;
      }
      else triangulation.pushBack(new DequeEl(triangle));
    }
  }
  
  
  // Calculate circum-centers of every triangle
  length = triangulation.length;
  for (let i = 0; i < length; i++){
    let triangle = triangulation.popFront();
    triangulation.pushBack(new DequeEl(triangle))
    let v1 = vertices[triangle.vertices[0]];
    let v2 = vertices[triangle.vertices[1]];
    let v3 = vertices[triangle.vertices[2]];
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
  
  // drawCircumCircle();
  // drawDirectedEdges();
  drawVornoiDiagram();
  
  // Draw circles
  fill(255, 163, 230);
  for (let v of vertices) circle(v.x, v.y, 15);
}

function draw() {
}

function drawCircumCircle(){
  // Draw the circumcircles and circumcenters
  let length = triangulation.length;
  for (let i = 0; i < length; i++){
    let triangle = triangulation.popFront();
    triangulation.pushBack(new DequeEl(triangle));
    let r = dist(triangle.circumCenter.x, triangle.circumCenter.y, vertices[triangle.vertices[0]].x, vertices[triangle.vertices[0]].y);
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
      if (i == 2) nextP = vertices[t.vertices[0]];
      else nextP = vertices[t.vertices[i + 1]];
      
      curP = vertices[t.vertices[i]];
      line(curP.x, curP.y, nextP.x, nextP.y);
    }
  }
}

function drawVornoiDiagram(){
  // Draw the vornoi diagram
  // We do this by drawing lines from circumcenters of triangles which share an edge with one another
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
        line(triangle.circumCenter.x, triangle.circumCenter.y, otherTriangle.circumCenter.x, otherTriangle.circumCenter.y)
      }
      else{
        // The edge is unshared so we assume that it extends to a screen edge
        // We call these edges "infinite edges". They are special since they will got on indefenitly
        // "infinite edges" will always point outwards to the boarders so we use our triangle's ccw property alongside cross product in order to consturct vectors that point outwards
        // In this case, we are desiring a clockwise orientation
        let edgeMid = p5.Vector.add(vertices[curV], vertices[nextV]).div(2);
        // circle(edgeMid.x, edgeMid.y, 20);
        let e1 = p5.Vector.sub(edgeMid, triangle.circumCenter);
        let e2 = p5.Vector.sub(vertices[nextV], vertices[curV]);
        if (e2.cross(e1).z > 0){
          // Orientation was counter clockwise orientation so we multiply by -1 to get clockwise orientation
          e1.mult(-1);
        }
        // Bc I really only want a visual representation, I'm just cheesing this part
        // Basically, we just default to drawing a SUPER long line entending past the screen
        // May lead to errors tho where the slope is just too small so the line is too short
        line(triangle.circumCenter.x, triangle.circumCenter.y, triangle.circumCenter.x + e1.x * 50000, triangle.circumCenter.y + e1.y * 50000)
      }
    } 
  }
}

function mouseClicked(){
  let mx = mouseX; let my = height - mouseY;
  vertices.push(createVector(mx, my));
  delTrig();
  drawVisual();
}
