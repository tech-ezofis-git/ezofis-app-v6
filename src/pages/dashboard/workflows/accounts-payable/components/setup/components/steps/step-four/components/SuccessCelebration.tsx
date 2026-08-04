import { useEffect, useRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'

type Particle = {
  color: string
  opacity: number
  rotation: number
  rotationSpeed: number
  size: number
  speedX: number
  speedY: number
  x: number
  y: number
}

const COLORS = [
  'rgba(34, 197, 94, 0.7)', // green
  'rgba(168, 85, 247, 0.65)', // purple
  'rgba(59, 130, 246, 0.65)', // blue
  'rgba(251, 191, 36, 0.7)', // amber
  'rgba(244, 114, 182, 0.65)', // pink
  'rgba(45, 212, 191, 0.65)', // teal
]

type SuccessCelebrationProps = {
  description?: string
  loadingLabel?: string
  title?: string
}

export default function SuccessCelebration({
  description = 'Your workflow is now active and ready to process invoices. Redirecting you to your requests dashboard...',
  loadingLabel = 'Loading request workspace...',
  title = 'Accounts Payable Setup Successful!',
}: SuccessCelebrationProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let spawnTimer = 0
    const particles: Particle[] = []

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      const width = parent?.clientWidth || window.innerWidth
      const height = parent?.clientHeight || 480
      canvas.width = width > 0 ? width : window.innerWidth
      canvas.height = height > 0 ? height : 480
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const createParticle = (fromTop = true): Particle => ({
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.35 + 0.45,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      size: Math.random() * 7 + 5,
      speedX: (Math.random() - 0.5) * 1.1,
      speedY: Math.random() * 1.1 + 0.7,
      x: Math.random() * canvas.width,
      y: fromTop ? -16 : Math.random() * canvas.height * 0.55,
    })

    for (let i = 0; i < 36; i++) {
      particles.push(createParticle(false))
    }

    const drawParticle = (p: Particle) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.roundRect(-p.size / 2, -p.size / 4, p.size, p.size / 2, 2)
      ctx.fill()
      ctx.restore()
    }

    const updateAndRender = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (time - spawnTimer > 90) {
        particles.push(createParticle(true))
        particles.push(createParticle(true))
        spawnTimer = time
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.speedX
        p.y += p.speedY
        p.rotation += p.rotationSpeed
        p.opacity -= 0.0018

        drawParticle(p)

        if (
          p.y > canvas.height + 20 ||
          p.opacity <= 0.05 ||
          p.x < -20 ||
          p.x > canvas.width + 20
        ) {
          particles.splice(i, 1)
        }
      }

      while (particles.length > 70) {
        particles.shift()
      }

      animationFrameId = requestAnimationFrame(updateAndRender)
    }

    animationFrameId = requestAnimationFrame(updateAndRender)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <AnimateFadeIn className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/5 p-4 backdrop-blur-sm'>
      <AnimateScale className='relative z-20 flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-border-default bg-surface-primary/90 p-8 text-center shadow-2xl backdrop-blur-md dark:bg-surface-secondary/90'>
        <canvas
          className='pointer-events-none absolute inset-0 z-[1] h-full w-full'
          ref={canvasRef}
        />

        <div className='relative z-[2] flex w-full flex-col items-center'>
          <AnimateSlideUp delay={0.1}>
            <div className='flex size-20 items-center justify-center rounded-full border border-green-3 bg-green-1 shadow-lg shadow-green-9/10 dark:bg-green-9/10'>
              <Icon
                className='size-10 text-green-9 dark:text-green-4'
                name='tabler:circle-check'
              />
            </div>
          </AnimateSlideUp>

          <AnimateSlideUp delay={0.2}>
            <h3 className='md:text-22 mt-6 text-20 font-bold tracking-tight text-gray-13'>
              {title}
            </h3>
          </AnimateSlideUp>

          <AnimateSlideUp delay={0.3}>
            <p className='mt-3 max-w-md text-14/5 text-gray-11'>
              {description}
            </p>
          </AnimateSlideUp>

          <AnimateFadeIn delay={0.45}>
            <div className='mt-8 flex items-center gap-2 text-12 font-medium text-gray-9'>
              <Icon
                className='size-4 animate-spin text-primary-9'
                name='tabler:loader-quarter'
              />
              <span>{loadingLabel}</span>
            </div>
          </AnimateFadeIn>
        </div>
      </AnimateScale>
    </AnimateFadeIn>
  )
}

SuccessCelebration.displayName = 'SuccessCelebration'
