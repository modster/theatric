import React, { forwardRef, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useUpdate } from 'react-three-fiber'
import { OrbitControls, Environment, useGLTF, CurveModifier, PerspectiveCamera } from '@react-three/drei'
import { ResizeObserver } from '@juggle/resize-observer'
import { TorusKnotHelper } from './Util'
import { useControls, types, initialize } from 'theatric'
import theatricState from './theatricState.json'

/* 
Model by Alex Sanches:  https://skfb.ly/6VoNE

Original sandbox by Matt Rossman:
https://codesandbox.io/s/perpetual-pencil-e0res

Inspirations:
https://www.reddit.com/r/blender/comments/j87ivi/endless_possibilities/
https://www.reddit.com/r/blender/comments/kgryl9/here_is_a_little_looping_animation_i_did_pretty/
*/

initialize({ state: theatricState })

export default function App() {
  const { camera, background } = useControls(
    {
      background: { color1: types.rgba(), color2: types.rgba() },
      camera: { position: { x: 10, y: 0, z: 0 }, fov: 30 },
    },
    { folder: 'Scene' }
  )

  const style = { background: `radial-gradient(${background.color1.toString()}, ${background.color2.toString()})` }

  return (
    <Canvas style={style} concurrent resize={{ polyfill: ResizeObserver }}>
      <PerspectiveCamera position={Object.values(camera.position)} fov={camera.fov} makeDefault />
      <Scene />
    </Canvas>
  )
}

function Scene() {
  const { radius, tubularSegments, p, q, speed, debug } = useControls(
    {
      radius: 1,
      tubularSegments: types.number(64, {
        range: [1, Infinity],
      }),
      p: 2,
      q: 3,
      debug: false,
      speed: types.number(0.2, {
        nudgeMultiplier: 0.01,
      }),
    },
    { folder: 'Pencil' }
  )

  return (
    <Suspense fallback={null}>
      <OrbitControls autoRotate autoRotateSpeed={(-60 * 0.15) / 2} />
      <Environment preset="warehouse" />
      <CurvyPencil p={p} q={q} speed={speed} radius={radius} tubularSegments={tubularSegments} debug={debug} />
    </Suspense>
  )
}

function CurvyPencil({ radius = 1, tubularSegments = 64, p = 2, q = 3, debug = false, speed = 0.2, ...props }) {
  const { curve, points } = useMemo(() => {
    const curve = TorusKnotHelper.generateCurve(radius, tubularSegments, p, q)
    const points = curve.getPoints(300)
    return { curve, points }
  }, [radius, tubularSegments, p, q])

  const flowRef = useRef()
  const curveRef = useRef(curve)

  useEffect(() => {
    curveRef.current.copy(curve)
  }, [curve])

  useFrame((_, delta) => {
    flowRef.current && flowRef.current.moveAlongCurve(delta * speed)
  })
  return (
    <group {...props}>
      <CurveModifier ref={flowRef} curve={curveRef.current}>
        <Pencil />
      </CurveModifier>
      {debug && <LineLoop points={points} color="red" />}
    </group>
  )
}

// CurveModifier needs to pass a ref, so we forwardRef
const Pencil = forwardRef((props, ref) => {
  const { nodes } = useGLTF('pencil.glb')
  const { material, geometry } = nodes.mesh
  useLayoutEffect(() => {
    geometry.scale(7, 7, 7)
  }, [geometry])
  return <mesh ref={ref} args={[geometry, material]} {...props} />
})

function LineLoop({ color = 'white', points = [], ...props }) {
  const ref = useUpdate((geom) => geom.setFromPoints(points), [points])
  return (
    <lineLoop {...props}>
      <bufferGeometry ref={ref} />
      <lineBasicMaterial color={color} />
    </lineLoop>
  )
}
