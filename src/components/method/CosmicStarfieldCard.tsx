import { useEffect, useRef } from 'react'

interface StarfieldCardProps {
  className?: string
  children?: React.ReactNode
  imageSrc?: string
  alt?: string
}

export function CosmicStarfieldCard({
  className = '',
  children,
  imageSrc = '/method/cosmic-cluster.jpg',
  alt = 'Cosmic star cluster in deep space',
}: StarfieldCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationFrameId: number
    let isVisible = true
    let width = 0
    let height = 0
    let dpr = 1

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    interface Particle {
      x: number
      y: number
      size: number
      alpha: number
      baseAlpha: number
      speedY: number
      speedX: number
      twinkleSpeed: number
      twinklePhase: number
      color: string
    }

    const particleColors = [
      'rgba(255, 255, 255, ',
      'rgba(200, 225, 255, ',
      'rgba(255, 230, 190, ',
      'rgba(210, 190, 255, ',
    ]

    let particles: Particle[] = []
    const count = 90

    const setup = () => {
      particles = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() < 0.2 ? 1.8 : 0.8 + Math.random() * 0.8,
          alpha: 0.2 + Math.random() * 0.7,
          baseAlpha: 0.2 + Math.random() * 0.6,
          speedY: -(0.05 + Math.random() * 0.15),
          speedX: (Math.random() - 0.5) * 0.08,
          twinkleSpeed: 1 + Math.random() * 2,
          twinklePhase: Math.random() * Math.PI * 2,
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
        })
      }
    }

    const resize = () => {
      if (!container || !canvas) return
      const rect = container.getBoundingClientRect()
      width = Math.floor(rect.width)
      height = Math.floor(rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      setup()
    }

    resize()
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(container)

    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting
        if (isVisible && !prefersReducedMotion && !animationFrameId) {
          lastTime = performance.now()
          render(lastTime)
        }
      })
    }, { threshold: 0.1 })
    intersectionObserver.observe(container)

    let lastTime = performance.now()
    let timeAcc = 0

    const render = (currentTime: number) => {
      if (!isVisible) {
        animationFrameId = 0
        return
      }

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime
      timeAcc += delta

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y += p.speedY
        p.x += p.speedX

        if (p.y < 0) p.y = height
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0

        const twinkle = 0.75 + Math.sin(timeAcc * p.twinkleSpeed + p.twinklePhase) * 0.25
        const a = Math.min(1, Math.max(0.1, p.baseAlpha * twinkle))

        ctx.fillStyle = `${p.color}${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    if (prefersReducedMotion) {
      render(performance.now())
    } else {
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={`cosmic-starfield-card ${className}`}>
      {/* Background authentic astronomy image */}
      <img src={imageSrc} alt={alt} className="cosmic-card-bg-img" loading="lazy" />
      {/* Dark vignette overlay */}
      <div className="cosmic-card-vignette" />
      {/* Floating stardust canvas */}
      <canvas ref={canvasRef} className="cosmic-card-canvas" aria-hidden="true" />
      {/* Content overlay */}
      <div className="cosmic-card-content">{children}</div>
    </div>
  )
}
