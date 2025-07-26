import React, { useRef, useEffect } from 'react';

const ChineseDragonAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas reference is null');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('2D context is not supported');
      return;
    }

    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class ChineseDragon {
      constructor(yOffset, startDelay, colors) {
        this.segments = [];
        this.length = 15;
        this.segmentLength = 20;
        this.baseX = -200;
        this.baseY = window.innerHeight * yOffset;
        this.speed = 2;
        this.timeOffset = startDelay;
        this.colors = colors;
        this.breathParticles = [];
        this.initSegments();
      }

      initSegments() { for (let i = 0; i < this.length; i++) this.segments.push({ x: this.baseX - i * this.segmentLength, y: this.baseY, scale: i < this.length - 1 ? Math.max(0.5, 1 - (i / this.length) * 0.5) : 0.3 }); }
      update(time) {
        this.baseX += this.speed;
        if (this.baseX > window.innerWidth + 200) this.baseX = -200;
        this.segments[0].x = this.baseX;
        this.segments[0].y = this.baseY + Math.sin((time + this.timeOffset) * 0.002) * 40;
        for (let i = 1; i < this.length; i++) {
          const prev = this.segments[i - 1], curr = this.segments[i];
          curr.x += (prev.x - this.segmentLength - curr.x) * 0.15;
          curr.y += (prev.y + Math.sin((time + this.timeOffset + i * 150) * 0.003) * 15 - curr.y) * 0.15;
        }
        if (Math.random() < 0.05) {
          const head = this.segments[0];
          this.breathParticles.push({ x: head.x + 35, y: head.y, vx: 2 + Math.random(), vy: (Math.random() - 0.5) * 1, life: 1, size: 3 + Math.random() * 2 });
        }
        this.breathParticles = this.breathParticles.filter(p => p.life > 0);
        this.breathParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.025; });
      }
      draw(ctx) {
        try {
          ctx.save();
          ctx.strokeStyle = this.colors[0]; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = this.colors[1]; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(this.segments[0].x, this.segments[0].y); for (let i = 1; i < this.length; i++) ctx.lineTo(this.segments[i].x, this.segments[i].y); ctx.stroke();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          for (let i = 0; i < this.length; i++) {
            const seg = this.segments[i], radius = 15 * seg.scale;
            if (i === this.length - 1) { ctx.beginPath(); ctx.moveTo(seg.x, seg.y - radius); ctx.lineTo(seg.x - radius * 1.5, seg.y + radius); ctx.lineTo(seg.x + radius * 1.5, seg.y + radius); ctx.closePath(); ctx.fillStyle = this.colors[0]; ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2); ctx.fillStyle = this.colors[0]; ctx.fill(); ctx.beginPath(); ctx.arc(seg.x - 3, seg.y - 3, radius * 0.4, 0, Math.PI * 2); ctx.fillStyle = this.colors[1]; ctx.fill(); }
          }
          const head = this.segments[0];
          ctx.shadowColor = this.colors[1]; ctx.shadowBlur = 15; ctx.beginPath(); ctx.ellipse(head.x, head.y, 25, 18, 0, 0, Math.PI * 2); ctx.fillStyle = this.colors[0]; ctx.fill();
          ctx.beginPath(); ctx.ellipse(head.x + 25, head.y + 2, 15, 10, 0, 0, Math.PI * 2); ctx.fillStyle = this.colors[0]; ctx.fill();
          ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(head.x + 8, head.y - 8, 5, 0, Math.PI * 2); ctx.fillStyle = '#FF4500'; ctx.fill();
          ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(head.x + 8, head.y - 8, 2, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill(); ctx.beginPath(); ctx.arc(head.x + 9, head.y - 9, 1, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
          ctx.shadowColor = '#D2691E'; ctx.shadowBlur = 4; ctx.strokeStyle = '#D2691E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(head.x - 15, head.y - 18); ctx.lineTo(head.x - 25, head.y - 35); ctx.moveTo(head.x - 20, head.y - 25); ctx.lineTo(head.x - 30, head.y - 28); ctx.stroke();
          ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6; ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(head.x + 35, head.y - 5); ctx.lineTo(head.x + 65, head.y - 2); ctx.moveTo(head.x + 35, head.y + 5); ctx.lineTo(head.x + 65, head.y + 8); ctx.stroke();
          ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(head.x + 8, head.y + 18, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fill();
          ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(head.x + 10, head.y + 16, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          const legPositions = [3, 12];
          ctx.strokeStyle = this.colors[0]; ctx.lineWidth = 4; legPositions.forEach(legIndex => { if (legIndex < this.segments.length) { const seg = this.segments[legIndex]; const legSway = Math.sin((Date.now() + legIndex * 500) * 0.005) * 2; ctx.beginPath(); ctx.moveTo(seg.x, seg.y + 15); ctx.quadraticCurveTo(seg.x - 8, seg.y + 25 + legSway, seg.x - 6, seg.y + 35 + legSway); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(seg.x - 6, seg.y + 35 + legSway); ctx.lineTo(seg.x - 12, seg.y + 42 + legSway); ctx.lineTo(seg.x, seg.y + 42 + legSway); ctx.stroke(); ctx.lineWidth = 4; } });
          this.breathParticles.forEach(p => { ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, ${Math.floor(100 + 155 * p.life)}, 0, ${p.life * 0.8})`; ctx.fill(); });
        } catch (drawError) {
          console.error('Error drawing dragon:', drawError);
        } finally {
          ctx.restore();
        }
      }
    }

    const dragons = [
      new ChineseDragon(0.25, 0, ['#FFD700', '#FFA500']),       // Gold dragon
      new ChineseDragon(0.55, 3000, ['#FF0000', '#FF69B4']),    // Red dragon
      new ChineseDragon(0.85, 6000, ['#00FF00', '#ADFF2F'])     // Green dragon (new third dragon)
    ];
    const animate = (time) => {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dragons.forEach(dragon => { dragon.update(time); dragon.draw(ctx); });
        animationFrameId = requestAnimationFrame(animate);
      } catch (animError) {
        console.error('Animation error:', animError);
      }
    };
    animate(0);

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
        zIndex: 20,
      }}
    />
  );
};

export default ChineseDragonAnimation;