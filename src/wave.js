import { uniforms } from 'gl-shader/lib/runtime-reflect'; //this auto imported maybe remove
// require js and packages up here.
const path = require('path') //this is a node.js thing

const createLine = require('./gl/gl-line-3d') //line draw-er? dig in here.
const createCamera = require('perspective-camera')// used on line 71
const createShader = require('gl-shader') //used on line 66
const createOrbit = require('orbit-controls')//used on line 79
const glAudioAnalyser = require('gl-audio-analyser') //used on line 109

const newArray = require('array-range')//used on line 87 - https://www.npmjs.com/package/array-range
const assign = require('object-assign') //used on line 38
const setIdentity = require('gl-mat4/identity'); //used on line 65 - smaller vers of js Matrix & Vector library for High Performance WebGL apps http://glmatrix.net
const lerp = require('lerp') //used on line 174 https://www.npmjs.com/package/lerp is a linear interpolation function - maybe learn this math?
const vignette = require('gl-vignette-background') //used on line 55
const hexRgbByte = require('hex-rgb') //used on line 56 (from next const variable)
const hexRgb = (str) => hexRgbByte(str).map( x => x / 255 ) //math that converts hex into rgb vals?
const glsify = require('glslify') //used on line 68 & 69 - node.js style module system for GLSL

const segments = 100//used on line 85
const radius = 0.1 //used on line 152
const thickness = 0.01//used on line 161
const steps = 200 //used on line 174
const src = 'assets/highroad.mp3' //used on line 103

const defaults = {
  opacity: 0.75,
  useHue: false,
  additive: false
}

const presets = [
  { gradient: [ '#fff', '#4f4f4f' ],
    color: '#000', useHue: true },
  // other styles that look decent
  // { gradient: [ '#fff', '#4f4f4f' ], color: '#000' },
  // { gradient: [ '#757575', '#1c0216' ], color: '#fff' }
]

let settings = presets[Math.floor(Math.random() * presets.length)]
settings = assign({}, defaults, settings)
//is object-assign just a package that does Object.assign? - console.log this later... understand better;

const colorVec = hexRgb(settings.color);

const gl = require('webgl-context')()
const canvas = gl.canvas
document.body.appendChild(canvas);

const AudioContext = window.AudioContext || window.webkitAudioContext
const audioPlayer = require('web-audio-player')
const supportedTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)

const app = require('canvas-loop')(canvas, {
  scale: window.devicePixelRatio
}) // creates a window sized canvas frame that loops?

const background = vignette(gl)
background.style({
  aspect: 1,
  color1: hexRgb(settings.gradient[0]),
  color2: hexRgb(settings.gradient[1]),
  smoothing: [ -0.5, 1.0 ],
  noiseAlpha: 0.1,
  offset: [ -0.05, -0.15 ]
})

const identity = setIdentity([])
//console.log this later to better understand
const shader = createShader(gl,
  glsify(path.join(__dirname, '/shaders/wave.vert')),
  glsify(path.join(__dirname, '/shaders/wave.frag'))
)

const camera = createCamera({
  fov: 50 * Math.PI / 180,
  position: [0, 0, 1],
  near: 0.0001,
  far: 10000
})
//where the camera is... will probably need to hook into this via keyboard for "game"

const controls = createOrbit({
  element: canvas,
  distanceBounds: [0.5, 100],
  distance: 0.5
})

const paths = newArray(segments).map(createSegment)
const lines = paths.map(aPath => {
  return createLine(gl, shader, aPath)
})

let analyser
start()

function start () {
  if (supportedTextures < 1) return error('This demo requires a GPU with vertex texture sampling.');
  if (!AudioContext) return error('This demo requires a WebAudio capable browser.');

  const audioContext = new audioContext()
  const audio = audioPlayer(src, {
    context: audioContext,
    loop: true,
    // buffer: isSafari -- don't think I need this
  })

  const loader = document.querySelector('.loader')
  audio.once('load', () => {
    analyser = glAudioAnalyser(gl, audio.node, audioContext)
    audio.play()
    audio.start()
    loader.style.display = 'none' //maybe give the loader a style?
  })
}
//end of start

let time = 0;
app.on('tick', dt => {
  time += Math.min(30, dt) / 1000

  const width = gl.drawingBufferWidth
  const height = gl.drawingBufferHeight

  //camera setup
  camera.viewport[2] = width
  camera.viewport[3] = height
  controls.update(camera.position, camera.direction, camera.up)
  camera.update()

  gl.viewport(0, 0, width, height)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) //look into this too

  const size = Math.min(width, height) * 1.5
  gl.disable(gl.DEPTH_TEST)
  background.style({
    scale: [ 1 / width * size, 1 / height * size ]
  })

  background.draw()

  gl.disable(gl.DEPTH_TEST) // off for now (is this a repetition? maybe remove)
  gl.enable(gl.BLEND)

  if (settings.additive) gl.blendFunc(gl.ONE, gl.ONE) //I think additive is off, play with this.
  else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.disable(gl.CULL_FACE) //look into all of these more now

  shader.bind()
  shader.uniforms.iGlobalTime = time
  shader.uniforms.radius = radius
  shader.uniforms.audioTexture = 0
  shader.uniforms.opacity = settings.opacity
  shader.uniforms.useHue = settings.useHue

  analyser.bindFrequencies(0)

  lines.forEach((line, i, list) => {
    line.color = colorVec
    line.thickness = thickness
    line.model = identity
    line.view = camera.view
    line.projection = camera.projection
    line.aspect = width / height
    line.miter = 0
    shader.uniforms.index = i / (list.length - 1)
    line.draw()
  })
})

function createSegment () {
  return newArray(steps).map((i, _, list) => {
    const x = lerp(-1, 1, i / (list.length - 1))
    return [ x, 0, 0 ]
  })
}
