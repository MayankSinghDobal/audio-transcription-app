import React, { useRef, useEffect } from 'react';

const ChineseDragonAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Simple but visible Chinese Dragon
    class ChineseDragon {
      constructor(yOffset, startDelay, colors) {
        this.segments = [];
        this.length = 20;
        this.segmentLength = 25;
        this.baseX = -200;
        this.baseY = window.innerHeight * yOffset;
        this.speed = 3; // Increased speed for more noticeable movement
        this.timeOffset = startDelay;
        this.colors = colors;
        this.breathParticles = [];
        this.initSegments();
      }

      initSegments() {
        for (let i = 0; i < this.length; i++) {
          // Adjust scale for more gradual tapering towards tail
          const scale = i < this.length - 1 ? Math.max(0.5, 1 - (i / this.length) * 0.5) : 0.3; // Smaller scale for last segment
          this.segments.push({
            x: this.baseX - i * this.segmentLength,
            y: this.baseY,
            scale: scale
          });
        }
      }

      update(time) {
        // Move dragon across screen
        this.baseX += this.speed;
        if (this.baseX > window.innerWidth + 200) {
          this.baseX = -200;
        }

        // Serpentine movement
        this.segments[0].x = this.baseX;
        this.segments[0].y = this.baseY + Math.sin((time + this.timeOffset) * 0.002) * 60;

        // Follow segments
        for (let i = 1; i < this.length; i++) {
          const prev = this.segments[i - 1];
          const curr = this.segments[i];
          
          const targetX = prev.x - this.segmentLength;
          const targetY = prev.y + Math.sin((time + this.timeOffset + i * 150) * 0.003) * 20;
          
          curr.x += (targetX - curr.x) * 0.15;
          curr.y += (targetY - curr.y) * 0.15;
        }

        // Add breath particles occasionally
        if (Math.random() < 0.08) {
          const head = this.segments[0];
          this.breathParticles.push({
            x: head.x + 35,
            y: head.y,
            vx: 3 + Math.random() * 2,
            vy: (Math.random() - 0.5) * 1.5,
            life: 1,
            size: 4 + Math.random() * 3
          });
        }

        // Update particles
        this.breathParticles = this.breathParticles.filter(p => p.life > 0);
        this.breathParticles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.025;
        });
      }

      draw(ctx) {
        // Save context state
        ctx.save();

        // Draw body as connected segments
        ctx.strokeStyle = this.colors[0];
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.colors[1];
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.length; i++) {
          ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw individual body segments with glow
        for (let i = 0; i < this.length; i++) {
          const seg = this.segments[i];
          const radius = 18 * seg.scale;
          
          // Glow effect
          ctx.shadowColor = this.colors[1];
          ctx.shadowBlur = 10;
          
          // Draw last segment as a triangle for tail
          if (i === this.length - 1) {
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y - radius);
            ctx.lineTo(seg.x - radius * 2, seg.y + radius);
            ctx.lineTo(seg.x + radius * 2, seg.y + radius);
            ctx.closePath();
            ctx.fillStyle = this.colors[0];
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colors[0];
            ctx.fill();
            
            // Inner highlight
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(seg.x - 3, seg.y - 3, radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = this.colors[1];
            ctx.fill();
          }
        }

        // Dragon head (enlarged and detailed)
        const head = this.segments[0];
        
        // Head glow
        ctx.shadowColor = this.colors[1];
        ctx.shadowBlur = 20;
        
        // Main head
        ctx.beginPath();
        ctx.ellipse(head.x, head.y, 28, 20, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.colors[0];
        ctx.fill();
        
        // Snout
        ctx.beginPath();
        ctx.ellipse(head.x + 25, head.y + 2, 18, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.colors[0];
        ctx.fill();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Eyes with glow
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(head.x + 8, head.y - 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4500';
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(head.x + 8, head.y - 8, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(head.x + 9, head.y - 9, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Antlers with glow
        ctx.shadowColor = '#D2691E';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = '#D2691E';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(head.x - 15, head.y - 18);
        ctx.lineTo(head.x - 25, head.y - 35);
        ctx.moveTo(head.x - 20, head.y - 25);
        ctx.lineTo(head.x - 30, head.y - 28);
        ctx.moveTo(head.x - 18, head.y - 30);
        ctx.lineTo(head.x - 28, head.y - 38);
        ctx.stroke();

        // Whiskers with glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(head.x + 35, head.y - 5);
        ctx.lineTo(head.x + 65, head.y - 2);
        ctx.moveTo(head.x + 35, head.y + 5);
        ctx.lineTo(head.x + 65, head.y + 8);
        ctx.moveTo(head.x + 32, head.y + 10);
        ctx.lineTo(head.x + 55, head.y + 15);
        ctx.stroke();

        // Pearl with strong glow
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(head.x + 8, head.y + 18, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(head.x + 10, head.y + 16, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Reset shadow for legs
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Legs
        const legPositions = [3, 7, 12, 16];
        ctx.strokeStyle = this.colors[0];
        ctx.lineWidth = 5;
        legPositions.forEach(legIndex => {
          if (legIndex < this.segments.length) {
            const seg = this.segments[legIndex];
            const legSway = Math.sin((Date.now() + legIndex * 500) * 0.005) * 3;
            
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y + 15);
            ctx.quadraticCurveTo(seg.x - 8, seg.y + 25 + legSway, seg.x - 6, seg.y + 35 + legSway);
            ctx.stroke();
            
            // Claws
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(seg.x - 6, seg.y + 35 + legSway);
            ctx.lineTo(seg.x - 12, seg.y + 42 + legSway);
            ctx.moveTo(seg.x - 6, seg.y + 35 + legSway);
            ctx.lineTo(seg.x, seg.y + 42 + legSway);
            ctx.moveTo(seg.x - 6, seg.y + 35 + legSway);
            ctx.lineTo(seg.x - 3, seg.y + 45 + legSway);
            ctx.stroke();
            ctx.lineWidth = 5;
          }
        });

        // Breath particles with glow
        this.breathParticles.forEach(p => {
          ctx.shadowColor = '#FF4500';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, ${Math.floor(100 + 155 * p.life)}, 0, ${p.life * 0.8})`;
          ctx.fill();
        });
        
        // Restore context state
        ctx.restore();
      }
    }

    // Create dragons with glowing colors
    const dragons = [
      new ChineseDragon(0.25, 0, ['#FFD700', '#FFA500']), // Gold with orange glow
      new ChineseDragon(0.55, 3000, ['#FF0000', '#FF69B4']), // Red with pink glow
      new ChineseDragon(0.75, 6000, ['#00FF7F', '#32CD32']), // Green with lime glow
    ];

    // Animation loop
    const animate = (time) => {
      try {
        // Clear the entire canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw dragons with glow effects
        dragons.forEach(dragon => {
          dragon.update(time);
          dragon.draw(ctx);
        });

        animationFrameId = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Animation error:', error);
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    animate(0);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20
      }}
    />
  );
};

export default ChineseDragonAnimation;