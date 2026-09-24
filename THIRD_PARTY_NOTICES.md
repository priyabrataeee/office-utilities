# Third-party notices

Code in this repository that was copied from other projects, rather than installed as a dependency. Dependencies installed through npm carry their own licences in `node_modules` and are listed in the build's `3rdpartylicenses.txt`.

## Vanta.js — FOG effect

The fragment shader in `src/app/core/engines/fog.engine.ts` is reproduced from Vanta.js (https://github.com/tengbao/vanta).

```
Copyright 2020 Teng Bao

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Morgan McGuire — 2D value noise

The `noise` function inside that shader is by Morgan McGuire (https://www.shadertoy.com/view/4dS3Wd), reused under the BSD license. Its attribution is kept inside the shader source, where Vanta.js carries it.
