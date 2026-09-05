import { useEffect, useRef, useState } from 'react'

interface CosmicGalaxyProps {
  className?: string
  interactive?: boolean
}

interface Star {
  arm: number
  dist: number // normalized distance 0 to 1
  armOffset: number // angle along arm
  scatterDist: number // orthogonal scatter
  scatterAngle: number
  size: number
  baseAlpha: number
  color: string
  twinkleSpeed: number
  twinklePhase: number
  hasFlare: boolean
  flareSize: number
}

export function CosmicGalaxy({
  className = '',
  interactive = true,
}: CosmicGalaxyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeMode, setActiveMode] = useState<'galaxy' | 'manifold' | 'real'>('galaxy')

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

    // Interactive orientation / tilt
    let targetTiltX = 0.48 // natural angle inspired by Astra
    let targetTiltY = -0.15
    let currentTiltX = 0.48
    let currentTiltY = -0.15

    // Stars data
    const numArms = 3
    const isMobile = window.innerWidth < 768
    const totalStars = isMobile ? 1200 : 2200
    const stars: Star[] = []

    const starColors = [
      'rgba(255, 255, 255, ',     // Pure white
      'rgba(220, 238, 255, ',     // Diamond blue
      'rgba(255, 226, 185, ',     // Warm golden giant
      'rgba(235, 220, 255, ',     // Soft lavender
      'rgba(195, 230, 255, ',     // Ice blue
      'rgba(255, 242, 215, ',     // Pearl white
    ]

    // Generate logarithmic spiral galaxy stars
    for (let i = 0; i < totalStars; i++) {
      const isCore = Math.random() < 0.28
      const arm = Math.floor(Math.random() * numArms)

      let dist: number
      let scatterDist: number
      let armOffset: number

      if (isCore) {
        // Dense core cluster
        dist = Math.pow(Math.random(), 2.0) * 0.28
        scatterDist = Math.random() * 0.14
        armOffset = Math.random() * Math.PI * 2
      } else {
        // Logarithmic spiral arms
        dist = 0.14 + Math.pow(Math.random(), 1.15) * 0.86
        // Logarithmic spiral curve
        const spiralTightness = 2.4
        armOffset = Math.log(dist * 4.5 + 0.15) * spiralTightness + (arm * (Math.PI * 2 / numArms))
        // Arms are tight near core, disperse slightly at rim
        scatterDist = (Math.random() - 0.5) * (0.05 + dist * 0.18)
      }

      const scatterAngle = Math.random() * Math.PI * 2
      const size = isCore ? 0.7 + Math.random() * 1.5 : 0.6 + Math.random() * 1.8
      const baseAlpha = 0.35 + Math.random() * 0.65
      const color = starColors[Math.floor(Math.random() * starColors.length)]
      const twinkleSpeed = 1.0 + Math.random() * 2.2
      const twinklePhase = Math.random() * Math.PI * 2

      // Prominent bright anchor stars with 4-point diffraction flares (Astra telescope spikes)
      const hasFlare = !isCore && Math.random() < 0.016 && dist > 0.25 && dist < 0.85
      const flareSize = hasFlare ? 12 + Math.random() * 18 : 0

      stars.push({
        arm,
        dist,
        armOffset,
        scatterDist,
        scatterAngle,
        size,
        baseAlpha,
        color,
        twinkleSpeed,
        twinklePhase,
        hasFlare,
        flareSize,
      })
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
    }

    resize()
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(container)

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
      { threshold: 0.08 }
    )
    intersectionObserver.observe(container)

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive) return
      const rect = container.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5

      targetTiltX = 0.48 + ny * 0.28
      targetTiltY = -0.15 - nx * 0.4
    }

    const onPointerLeave = () => {
      targetTiltX = 0.48
      targetTiltY = -0.15
    }

    if (interactive) {
      container.addEventListener('pointermove', onPointerMove, { passive: true })
      container.addEventListener('pointerleave', onPointerLeave)
    }

    let lastTime = performance.now()
    let rotationAngle = 0
    let timeAcc = 0

    const render = (currentTime: number) => {
      if (!isVisible) {
        animationFrameId = 0
        return
      }

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime
      timeAcc += delta

      // Galactic differential rotation
      rotationAngle += delta * 0.065

      // Smooth tilt lerp
      currentTiltX += (targetTiltX - currentTiltX) * 0.08
      currentTiltY += (targetTiltY - currentTiltY) * 0.08

      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      // Large, expansive galaxy filling the frame
      const maxRadius = Math.min(width * 0.54, height * 0.78)

      // 1. Deep Celestial Core Glow (Multi-stop radiant halo)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.55)
      coreGrad.addColorStop(0, 'rgba(255, 248, 235, 0.35)')
      coreGrad.addColorStop(0.12, 'rgba(255, 230, 190, 0.22)')
      coreGrad.addColorStop(0.3, 'rgba(180, 195, 255, 0.12)')
      coreGrad.addColorStop(0.6, 'rgba(110, 80, 210, 0.04)')
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxRadius * 0.55, 0, Math.PI * 2)
      ctx.fill()

      // 2. 3D Perspective Projection
      const cosY = Math.cos(currentTiltY)
      const sinY = Math.sin(currentTiltY)
      const cosX = Math.cos(currentTiltX)
      const sinX = Math.sin(currentTiltX)

      // 3. Render Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]

        // Keplerian / logarithmic speed factor (inner stars orbit faster)
        const speedFactor = 0.55 + 0.45 / (star.dist + 0.25)
        const theta = star.armOffset + rotationAngle * speedFactor

        // Unprojected 2D coordinates on galaxy disc
        const r = star.dist * maxRadius
        const px = Math.cos(theta) * r + Math.cos(star.scatterAngle) * star.scatterDist * maxRadius
        const pz = Math.sin(theta) * r + Math.sin(star.scatterAngle) * star.scatterDist * maxRadius
        const py = Math.sin(star.twinklePhase + timeAcc) * (0.02 * maxRadius) // disc thickness

        // 3D Matrix Rotation (Yaw then Pitch)
        const rx = px * cosY + pz * sinY
        const rzTemp = -px * sinY + pz * cosY
        const ry = py * cosX - rzTemp * sinX
        const rz = py * sinX + rzTemp * cosX

        // Perspective scaling
        const fov = 650
        const scale = fov / (fov + rz * 0.38)
        const screenX = cx + rx * scale
        const screenY = cy + ry * scale

        // Twinkle factor
        const twinkle = 0.8 + Math.sin(timeAcc * star.twinkleSpeed + star.twinklePhase) * 0.22
        const alpha = Math.min(1, Math.max(0.12, star.baseAlpha * twinkle * scale))

        ctx.fillStyle = `${star.color}${alpha})`
        ctx.beginPath()
        ctx.arc(screenX, screenY, Math.max(0.5, star.size * scale), 0, Math.PI * 2)
        ctx.fill()

        // 4. 4-Point Diffraction Spikes (OpenAI Astra telescope flare)
        if (star.hasFlare) {
          const fSize = star.flareSize * scale
          const flareAlpha = alpha * 0.85

          // Horizontal spike
          const fGradH = ctx.createLinearGradient(screenX - fSize, screenY, screenX + fSize, screenY)
          fGradH.addColorStop(0, 'rgba(255, 255, 255, 0)')
          fGradH.addColorStop(0.5, `rgba(255, 255, 255, ${flareAlpha})`)
          fGradH.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.strokeStyle = fGradH
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.moveTo(screenX - fSize, screenY)
          ctx.lineTo(screenX + fSize, screenY)
          ctx.stroke()

          // Vertical spike
          const fGradV = ctx.createLinearGradient(screenX, screenY - fSize, screenX, screenY + fSize)
          fGradV.addColorStop(0, 'rgba(255, 255, 255, 0)')
          fGradV.addColorStop(0.5, `rgba(255, 255, 255, ${flareAlpha})`)
          fGradV.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.strokeStyle = fGradV
          ctx.beginPath()
          ctx.moveTo(screenX, screenY - fSize)
          ctx.lineTo(screenX, screenY + fSize)
          ctx.stroke()

          // Central diamond flare
          ctx.fillStyle = `rgba(255, 255, 255, ${flareAlpha})`
          ctx.beginPath()
          ctx.arc(screenX, screenY, 1.8 * scale, 0, Math.PI * 2)
          ctx.fill()
        }
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
      if (interactive) {
        container.removeEventListener('pointermove', onPointerMove)
        container.removeEventListener('pointerleave', onPointerLeave)
      }
    }
  }, [interactive])

  return (
    <div ref={containerRef} className={`cosmic-galaxy-container ${className}`}>
      {/* Background celestial ambient */}
      <div className="cosmic-galaxy-backdrop" />

      {/* Canvas rendering the logarithmic spiral galaxy */}
      <canvas ref={canvasRef} className="cosmic-galaxy-canvas" />

      {/* High-res authentic Astra spiral image overlay mode */}
      {activeMode === 'real' && (
        <img
          src="/method/galaxy-astra.jpg"
          alt="Astra spiral galaxy astrophotography"
          className="cosmic-manifold-overlay"
          loading="eager"
        />
      )}

      {/* Trajectory overlay comparison mode */}
      {activeMode === 'manifold' && (
        <img
          src="/method/color-space-journey.png"
          alt="OKLCH search trajectory"
          className="cosmic-manifold-overlay"
          loading="eager"
        />
      )}

      {/* Control overlay & mode selector */}
      <div className="cosmic-galaxy-controls">
        <div className="cosmic-galaxy-tag">
          <span className="cosmic-galaxy-pulse" />
          <span className="cosmic-galaxy-label">OKLCH Manifold Convergence</span>
        </div>
        <div className="cosmic-mode-pills" role="tablist" aria-label="Visualizer view modes">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'galaxy'}
            className={`cosmic-mode-btn ${activeMode === 'galaxy' ? 'is-active' : ''}`}
            onClick={() => setActiveMode('galaxy')}
          >
            Cosmic Spiral
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'real'}
            className={`cosmic-mode-btn ${activeMode === 'real' ? 'is-active' : ''}`}
            onClick={() => setActiveMode('real')}
          >
            Deep Cosmos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'manifold'}
            className={`cosmic-mode-btn ${activeMode === 'manifold' ? 'is-active' : ''}`}
            onClick={() => setActiveMode('manifold')}
          >
            Color Path
          </button>
        </div>
      </div>
    </div>
  )
}
