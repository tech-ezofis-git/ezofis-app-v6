import { useDocumentVisibility } from '@mantine/hooks'
import { BaseEdge, type EdgeProps, getBezierPath } from '@xyflow/react'
import { useEffect, useRef } from 'react'

const AnimatedEdge = ({
  id,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  })

  const animationRef = useRef<SVGAnimateMotionElement | null>(null)
  const documentVisible = useDocumentVisibility()

  useEffect(() => {
    const animEl = animationRef.current
    if (!animEl) return

    const svg = animEl.closest('svg')
    if (!svg) return

    if (documentVisible) {
      svg.unpauseAnimations()
    } else {
      svg.pauseAnimations()
    }
  }, [documentVisible])

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <circle className='fill-primary-9' opacity='0' r='5'>
        <set attributeName='opacity' begin='anim.begin' dur='1s' to='1' />
        <set attributeName='opacity' begin='anim.end' to='0' />
        <animateMotion
          begin='1s;anim.end+1s'
          dur='1s'
          fill='freeze'
          id='anim'
          path={edgePath}
          ref={animationRef}
          repeatCount='1'
        />
      </circle>
    </>
  )
}

AnimatedEdge.displayName = 'AnimatedEdge'
export default AnimatedEdge
