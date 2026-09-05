import { useEffect, useRef } from 'react'

interface AuroraGridProps {
  className?: string
  interactive?: boolean
}

export function MethodAuroraGrid({ className = '', interactive = true }: AuroraGridProps) {
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

    // Pointer state
    let mouseX = -1000
    let mouseY = -1000
    let targetMouseX = -1000
    let targetMouseY = -1000

    // Dot grid configuration
    const spacing = 32 // spacing between dots in css pixels
    interface Dot {
      x: number
      y: number
      baseAlpha: number
      phase: number
      speed: number
      size: number
    }
    let dots: Dot[] = []

    const setupDots = () => {
      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      dots = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * spacing
          const y = r * spacing
          // Organic variation in base alpha
          const distFromCenter = Math.hypot(x - width / 2, y - height / 2) / (Math.max(width, height) / 2)
          const centerFalloff = Math.max(0.3, 1 - distFromCenter * 0.4)
          const baseAlpha = (0.04 + Math.random() * 0.08) * centerFalloff
          const phase = Math.random() * Math.PI * 2
          const speed = 0.6 + Math.random() * 0.8
          const size = Math.random() > 0.94 ? 1.4 : 1.0

          dots.push({ x, y, baseAlpha, phase, speed, size })
        }
      }
    }

    const resize = () => {
      if (!container || !canvas) return
      const rect = container.getBoundingClientRect()
      width = Math.floor(rect.width)
      height = Math.floor(rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2) // Cap DPR at 2 for performance

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      setupDots()
    }

    resize()

    // Smooth resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      resize()
    })
    resizeObserver.observe(container)

    // Visibility observer to pause animation loop when scrolled away
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting
          if (isVisible && !prefersReducedMotion && !animationFrameId) {
            lastTime = performance.now()
            render(lastTime)
          }
        })
      },
      { threshold: 0.05 }
    )
    intersectionObserver.observe(container)

    // Pointer events for gentle stardust response
    const onPointerMove = (e: PointerEvent) => {
      if (!interactive) return
      const rect = container.getBoundingClientRect()
      targetMouseX = e.clientX - rect.left
      targetMouseY = e.clientY - rect.top
    }

    const onPointerLeave = () => {
      targetMouseX = -1000
      targetMouseY = -1000
    }

    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.addEventListener('pointerleave', onPointerLeave)
    }

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

      // Smooth pointer lerp
      mouseX += (targetMouseX - mouseX) * 0.12
      mouseY += (targetMouseY - mouseY) * 0.12

      ctx.clearRect(0, 0, width, height)

      // Render dots
      const hoverRadius = 140
      const hoverRadiusSq = hoverRadius * hoverRadius

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]

        // Ambient sine wave twinkle
        const wave = Math.sin(timeAcc * dot.speed + dot.phase)
        let alpha = dot.baseAlpha + wave * 0.035

        // Interactive pointer proximity boost
        if (mouseX > -500) {
          const dx = dot.x - mouseX
          const dy = dot.y - mouseY
          const distSq = dx * dx + dy * dy

          if (distSq < hoverRadiusSq) {
            const proximity = 1 - Math.sqrt(distSq) / hoverRadius
            alpha += proximity * 0.38
          }
        }

        if (alpha <= 0.01) continue

        ctx.fillStyle = `rgba(215, 225, 255, ${Math.min(alpha, 0.65)})`
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    if (prefersReducedMotion) {
      // Draw static frame once
      render(performance.now())
    } else {
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      if (interactive) {
        window.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerleave', onPointerLeave)
      }
    }
  }, [interactive])

  return (
    <div ref={containerRef} className={`method-aurora-container ${className}`} aria-hidden="true">
      {/* Organic Northern Lights (Aurora Borealis) ambient glow layers */}
      <div className="aurora-ambient-root">
        <div className="aurora-wave aurora-wave-violet" />
        <div className="aurora-wave aurora-wave-teal" />
        <div className="aurora-wave aurora-wave-indigo" />
        <div className="aurora-radial-soft" />
      </div>

      {/* Stardust dot-matrix canvas */}
      <canvas ref={canvasRef} className="aurora-dots-canvas" />
    </div>
  )
}
