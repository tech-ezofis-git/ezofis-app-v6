import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import Icon from '@/components/base/icon/Icon'

type Particle = {
  color: string
  opacity: number
  rotation: number
  rotationSpeed: number
  shapeFactor: number
  size: number
  speedX: number
  speedY: number
  type: 'flower' | 'sparkle'
  x: number
  y: number
}

const COLORS = [
  '#FF69B4', // Hot Pink
  '#FFB6C1', // Light Pink
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#87CEFA', // Light Sky Blue
  '#98FB98', // Pale Green
  '#D8BFD8', // Thistle
]

export default function SuccessCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
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

    // Standard falling particle factory (rains from top)
    const createParticle = (
      x: number,
      y: number,
      isInitial = false,
    ): Particle => {
      const type = Math.random() > 0.4 ? 'flower' : 'sparkle'
      return {
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: Math.random() * 0.5 + 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.03 - 0.015,
        shapeFactor: Math.random() * 0.4 + 0.8,
        size: Math.random() * 8 + (type === 'flower' ? 6 : 4),
        speedX: Math.random() * 2 - 1,
        speedY: Math.random() * 1.5 + 1.2, // steady fall downwards
        type,
        x,
        y: isInitial ? Math.random() * y : -20,
      }
    }

    // Populate initial rain particles
    for (let i = 0; i < 15; i++) {
      particles.push(
        createParticle(canvas.width * Math.random(), canvas.height, true),
      )
    }

    // Spawn corner bursts (velocity upwards and inwards)
    const spawnBurst = () => {
      for (let i = 0; i < 5; i++) {
        // Left corner burst
        particles.push({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: Math.random() * 0.08 - 0.04,
          shapeFactor: Math.random() * 0.4 + 0.8,
          size: Math.random() * 8 + 5,
          speedX: Math.random() * 5 + 3, // shoot right
          speedY: Math.random() * -8 - 4, // shoot up
          type: Math.random() > 0.4 ? 'flower' : 'sparkle',
          x: 0,
          y: canvas.height,
        })

        // Right corner burst
        particles.push({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: Math.random() * 0.08 - 0.04,
          shapeFactor: Math.random() * 0.4 + 0.8,
          size: Math.random() * 8 + 5,
          speedX: Math.random() * -5 - 3, // shoot left
          speedY: Math.random() * -8 - 4, // shoot up
          type: Math.random() > 0.4 ? 'flower' : 'sparkle',
          x: canvas.width,
          y: canvas.height,
        })
      }
    }

    // Initial burst
    spawnBurst()

    // Periodically spawn bursts
    const burstInterval = setInterval(spawnBurst, 1500)

    const drawFlower = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rotation)
      c.fillStyle = p.color
      c.globalAlpha = p.opacity

      // Draw 4 petals using arcs (extremely robust cross-platform)
      for (let i = 0; i < 4; i++) {
        c.rotate((Math.PI * 2) / 4)
        c.beginPath()
        c.arc(0, p.size * 0.5, p.size * 0.4, 0, Math.PI * 2)
        c.fill()
      }

      // Draw center disc
      c.beginPath()
      c.arc(0, 0, p.size * 0.3, 0, Math.PI * 2)
      c.fillStyle = '#FFFFFF'
      c.globalAlpha = p.opacity * 0.9
      c.fill()
      c.restore()
    }

    const drawSparkle = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rotation)
      c.fillStyle = p.color
      c.globalAlpha = p.opacity

      // Draw smooth, premium star curves (extremely robust)
      c.beginPath()
      c.moveTo(0, -p.size)
      c.quadraticCurveTo(0, 0, p.size, 0)
      c.quadraticCurveTo(0, 0, 0, p.size)
      c.quadraticCurveTo(0, 0, -p.size, 0)
      c.quadraticCurveTo(0, 0, 0, -p.size)
      c.closePath()
      c.fill()
      c.restore()
    }

    const updateAndRender = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p, idx) => {
        p.x += p.speedX
        p.y += p.speedY
        p.speedY += 0.1 // gravity
        p.rotation += p.rotationSpeed
        p.opacity -= 0.003

        if (p.type === 'flower') {
          drawFlower(ctx, p)
        } else {
          drawSparkle(ctx, p)
        }

        // Reset or remove dead particles
        if (
          p.y > canvas.height + 20 ||
          p.opacity <= 0 ||
          p.x < -20 ||
          p.x > canvas.width + 20
        ) {
          particles[idx] = createParticle(Math.random() * canvas.width, 0)
        }
      })

      animationFrameId = requestAnimationFrame(updateAndRender)
    }

    updateAndRender()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      clearInterval(burstInterval)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className='animate-in fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 p-4 backdrop-blur-md duration-300'>
      {/* Center Glassmorphic Success Card */}
      <div className='animate-in zoom-in-95 relative z-20 flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-border-default bg-surface-primary/90 p-8 text-center shadow-2xl backdrop-blur-lg duration-300 dark:bg-surface-secondary/90'>
        {/* Card-contained Canvas Confetti Shower */}
        <canvas
          className='pointer-events-none absolute inset-0 z-0 h-full w-full'
          ref={canvasRef}
        />
        
        <div className='relative z-10 flex w-full flex-col items-center'>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='flex size-20 items-center justify-center rounded-full border border-green-3 bg-green-1 shadow-lg shadow-green-9/10 dark:bg-green-9/10'
          initial={{ opacity: 0, scale: 0.3 }}
          transition={{
            delay: 0.1,
            duration: 0.5,
            type: 'spring',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{
              duration: 2.0,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <Icon
              className='size-10 text-green-9 dark:text-green-4'
              name='tabler:circle-check'
            />
          </motion.div>
        </motion.div>

        <motion.h3
          animate={{ opacity: 1, y: 0 }}
          className='md:text-22 mt-6 text-20 font-bold tracking-tight text-gray-13'
          initial={{ opacity: 0, y: 15 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          Accounts Payable Setup Successful!
        </motion.h3>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className='mt-3 max-w-md text-14/5 text-gray-11'
          initial={{ opacity: 0, y: 15 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          Your workflow is now active and ready to process invoices. Redirecting
          you to your requests dashboard...
        </motion.p>

        {/* Indeterminate loader */}
        <motion.div
          animate={{ opacity: 1 }}
          className='mt-8 flex items-center gap-2 text-12 font-medium text-gray-9'
          initial={{ opacity: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Icon
            className='size-4 animate-spin text-primary-9'
            name='tabler:loader-quarter'
          />
          <span>Loading request workspace...</span>
        </motion.div>
        </div>
      </div>
    </div>
  )
}

SuccessCelebration.displayName = 'SuccessCelebration'
