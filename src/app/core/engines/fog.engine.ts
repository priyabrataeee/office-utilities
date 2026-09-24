// Shader from Vanta.js, Copyright 2020 Teng Bao, MIT License. See THIRD_PARTY_NOTICES.md.
const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

uniform float blurFactor;
uniform vec3 baseColor;
uniform vec3 lowlightColor;
uniform vec3 midtoneColor;
uniform vec3 highlightColor;
uniform float zoom;

float random (in vec2 _st) {
  return fract(sin(dot(_st.xy,
                     vec2(0.129898,0.78233)))*
        437.585453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
  vec2 i = floor(_st);
  vec2 f = fract(_st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) +
          (c - a)* u.y * (1.0 - u.x) +
          (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 6

float fbm ( in vec2 _st) {
  float v = 0.0;
  float a = blurFactor;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5),
                  -sin(0.5), cos(0.50));
  for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(_st);
      _st = rot * _st * 2.0 + shift;
      a *= (1. - blurFactor);
  }
  return v;
}

void main() {
  vec2 st = gl_FragCoord.xy / iResolution.xy*3.;
  st.x *= 0.7 * iResolution.x / iResolution.y;
  st *= zoom;

  vec3 color = vec3(0.0);

  vec2 q = vec2(0.);
  q.x = fbm( st + 0.00*iTime);
  q.y = fbm( st + vec2(1.0));

  vec2 dir = vec2(0.15,0.126);
  vec2 r = vec2(0.);
  r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ dir.x*iTime );
  r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ dir.y*iTime);

  float f = fbm(st+r);

  color = mix(baseColor,
              lowlightColor,
              clamp((f*f)*4.0,0.0,1.0));

  color = mix(color,
              midtoneColor,
              clamp(length(q),0.0,1.0));

  color = mix(color,
              highlightColor,
              clamp(length(r.x),0.0,1.0));

  vec3 finalColor = mix(baseColor, color, f*f*f+.6*f*f+.5*f);
  gl_FragColor = vec4(finalColor,1.0);
}
`;

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export interface FogColors {
  readonly base: string;
  readonly lowlight: string;
  readonly midtone: string;
  readonly highlight: string;
}

export interface FogOptions {
  readonly colors: FogColors;
  readonly blurFactor?: number;
  readonly zoom?: number;
  readonly speed?: number;
  readonly downscale?: number;
  readonly fps?: number;
}

export class FogRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: Record<string, WebGLUniformLocation | null> = {};
  private readonly buffer: WebGLBuffer;

  private options: Required<Omit<FogOptions, 'colors'>> & { colors: FogColors };
  private frame = 0;
  private phase = 0;
  private lastFrame = 0;
  private lastDraw = 0;
  private running = false;
  private disposed = false;
  private lost = false;

  onAvailabilityChange: ((available: boolean) => void) | null = null;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    options: FogOptions,
  ) {
    this.gl = gl;
    this.options = {
      blurFactor: 0.6,
      zoom: 1,
      speed: 1,
      downscale: 2,
      fps: 30,
      ...options,
    };

    this.program = buildProgram(gl);
    for (const name of [
      'iResolution',
      'iTime',
      'blurFactor',
      'zoom',
      'baseColor',
      'lowlightColor',
      'midtoneColor',
      'highlightColor',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL buffer could not be created.');
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(this.program);

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
      this.stop();
      this.onAvailabilityChange?.(false);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.onAvailabilityChange?.(true);
    });
  }

  static create(canvas: HTMLCanvasElement, options: FogOptions): FogRenderer | null {
    try {
      const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      }) as WebGLRenderingContext | null;
      if (!gl) return null;
      return new FogRenderer(canvas, gl, options);
    } catch {
      return null;
    }
  }

  setColors(colors: FogColors): void {
    this.options = { ...this.options, colors };
    if (!this.running) this.draw();
  }

  setSpeed(speed: number): void {
    if (this.options.speed === speed) return;
    this.options = { ...this.options, speed };
    if (speed === 0) {
      this.stop();
      this.draw();
    } else {
      this.play();
    }
  }

  resize(): void {
    if (this.disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((this.canvas.clientWidth * dpr) / this.options.downscale));
    const height = Math.max(
      1,
      Math.round((this.canvas.clientHeight * dpr) / this.options.downscale),
    );
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    if (!this.running) this.draw();
  }

  play(): void {
    if (this.options.speed === 0) {
      this.draw();
      return;
    }
    this.start_();
  }

  pause(): void {
    this.stop();
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private start_(): void {
    if (this.running || this.disposed || this.lost) return;
    this.running = true;
    this.lastFrame = performance.now();

    const tick = (now: number) => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(tick);

      const dt = Math.min(now - this.lastFrame, 100) / 1000;
      this.lastFrame = now;
      this.phase += dt * this.options.speed;

      if (now - this.lastDraw < 1000 / this.options.fps) return;
      this.lastDraw = now;
      this.draw();
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private draw(): void {
    if (this.disposed || this.lost) return;
    const gl = this.gl;
    const { colors, blurFactor, zoom } = this.options;

    if (!this.canvas.width || !this.canvas.height) return;

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms['iResolution'], this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms['iTime'], this.phase);
    gl.uniform1f(this.uniforms['blurFactor'], blurFactor);
    gl.uniform1f(this.uniforms['zoom'], zoom);
    setColor(gl, this.uniforms['baseColor'], colors.base);
    setColor(gl, this.uniforms['lowlightColor'], colors.lowlight);
    setColor(gl, this.uniforms['midtoneColor'], colors.midtone);
    setColor(gl, this.uniforms['highlightColor'], colors.highlight);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL program could not be created.');

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Fog shader failed to link: ${log}`);
  }
  return program;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL shader could not be created.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Fog shader failed to compile: ${log}`);
  }
  return shader;
}

function setColor(
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation | null,
  value: string,
): void {
  if (!location) return;
  const [r, g, b] = hexToRgb(value);
  gl.uniform3f(location, r, g, b);
}

export function hexToRgb(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return [0.5, 0.5, 0.5];
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}
