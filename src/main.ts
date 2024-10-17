import './style.scss';
import {Color4, Matrix, Vector2, Vector3} from "./math.ts";

export class Camera {
  Position: Vector3;
  Target: Vector3;

  constructor() {
    this.Position = Vector3.Zero();
    this.Target = Vector3.Zero();
  }
}

export class Mesh {
  Position: Vector3;
  Rotation: Vector3;
  Vertices: Vector3[];

  constructor(public name: string, verticesCount: number) {
    this.Vertices = new Array(verticesCount);
    this.Rotation = Vector3.Zero();
    this.Position = Vector3.Zero();
  }
}

class Device {
  // the back buffer size is equal to the number of pixels to draw
  // on screen (width*height) * 4 (R,G,B & Alpha values).
  private backbuffer: ImageData;
  private workingCanvas: HTMLCanvasElement;
  private workingContext: CanvasRenderingContext2D;
  private readonly workingWidth: number;
  private readonly workingHeight: number;
  // equals to backbuffer.data
  private backbufferdata: typeof this.backbuffer.data;

  constructor(canvas: HTMLCanvasElement) {
    this.workingCanvas = canvas;
    this.workingWidth = canvas.width;
    this.workingHeight = canvas.height;
    this.workingContext = this.workingCanvas.getContext("2d")!;
  }

  // This function is called to clear the back buffer with a specific color
  public clear(): void {
    // Clearing with black color by default
    this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
    // once cleared with black pixels, we're getting back the associated image data to
    // clear out back buffer
    this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
  }

  // Once everything is ready, we can flush the back buffer
  // into the front buffer.
  public present(): void {
    this.workingContext.putImageData(this.backbuffer, 0, 0);
  }

  // Called to put a pixel on screen at a specific X,Y coordinates
  public putPixel(x: number, y: number, color: Color4): void {
    this.backbufferdata = this.backbuffer.data;
    // As we have a 1-D Array for our back buffer
    // we need to know the equivalent cell index in 1-D based
    // on the 2D coordinates of the screen
    let index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;



    // RGBA color space is used by the HTML5 canvas
    this.backbufferdata[index] = color.r * 255;
    this.backbufferdata[index + 1] = color.g * 255;
    this.backbufferdata[index + 2] = color.b * 255;
    this.backbufferdata[index + 3] = color.a * 255;
  }

  // Project takes some 3D coordinates and transform them
  // in 2D coordinates using the transformation matrix
  public project(coord: Vector3, transMat: Matrix): Vector2 {
    // transforming the coordinates
    let point = Vector3.TransformCoordinates(coord, transMat);
    // The transformed coordinates will be based on coordinate system
    // starting on the center of the screen. But drawing on screen normally starts
    // from top left. We then need to transform them again to have x:0, y:0 on top left.
    let x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
    let y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
    return (new Vector2(x, y));
  }

  // drawPoint calls putPixel but does the clipping operation before
  public drawPoint(point: Vector2): void {
    // Clipping what's visible on screen
    if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth
      && point.y < this.workingHeight) {
      // Drawing a yellow point
      this.putPixel(point.x, point.y, new Color4(1, 1, 0, 1));
    }
  }

  // The main method of the engine that re-compute each vertex projection
  // during each frame
  public render(camera: Camera, meshes: Mesh[]): void {
    // To understand this part, please read the prerequisites resources
    let viewMatrix = Matrix.LookAtLH(camera.Position, camera.Target, Vector3.Up());
    let projectionMatrix = Matrix.PerspectiveFovLH(0.78,
      this.workingWidth / this.workingHeight, 0.01, 1.0);

    for (let index = 0; index < meshes.length; index++) {
      // current mesh to work on
      let cMesh = meshes[index];
      // Beware to apply rotation before translation
      let worldMatrix = Matrix.RotationYawPitchRoll(
        cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z)
        .multiply(Matrix.Translation(
          cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));

      let transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

      for (let indexVertices = 0; indexVertices < cMesh.Vertices.length; indexVertices++) {
        // First, we project the 3D coordinates into the 2D space
        let projectedPoint = this.project(cMesh.Vertices[indexVertices], transformMatrix);
        // Then we can draw on screen
        this.drawPoint(projectedPoint);
      }
    }
  }
}

let canvas: HTMLCanvasElement;
let device: Device;
let mesh: Mesh;
let meshes: Mesh[] = [];
let mera: Camera;


function init() {
  canvas = <HTMLCanvasElement> document.getElementById("viewer");
  mesh = new Mesh("Cube", 8);
  meshes.push(mesh);
  mera = new Camera();
  device = new Device(canvas);

  mesh.Vertices[0] = new Vector3(-1, 1, 1);
  mesh.Vertices[1] = new Vector3(1, 1, 1);
  mesh.Vertices[2] = new Vector3(-1, -1, 1);
  mesh.Vertices[3] = new Vector3(-1, -1, -1);
  mesh.Vertices[4] = new Vector3(-1, 1, -1);
  mesh.Vertices[5] = new Vector3(1, 1, -1);
  mesh.Vertices[6] = new Vector3(1, -1, 1);
  mesh.Vertices[7] = new Vector3(1, -1, -1);

  mera.Position = new Vector3(0, 0, 10);
  mera.Target = new Vector3(0, 0, 0);

  // Calling the HTML5 rendering loop
  requestAnimationFrame(drawingLoop);
}

function drawingLoop() {
  device.clear();

  // rotating slightly the cube during each frame rendered
  mesh.Rotation.x += 0.01;
  mesh.Rotation.y += 0.01;

  // Doing the various matrix operations
  device.render(mera, meshes);
  // Flushing the back buffer into the front buffer
  device.present();

  // Calling the HTML5 rendering loop recursively
  requestAnimationFrame(drawingLoop);
}

init();