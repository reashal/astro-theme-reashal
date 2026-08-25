interface FireworkParticle {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    life: number;
    size: number;
    color: string;
}

const canvas = document.querySelector<HTMLCanvasElement>(".fireworks");
const context = canvas?.getContext("2d");

if (canvas && context) {
    const colors = ["#fbf38c", "#18ff92", "#5a87ff", "#ff1461"];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles: FireworkParticle[] = [];
    let viewportWidth = 0;
    let viewportHeight = 0;
    let animationFrame = 0;
    let previousTime = 0;

    const resizeCanvas = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        canvas.width = Math.round(viewportWidth * pixelRatio);
        canvas.height = Math.round(viewportHeight * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const render = (time: number) => {
        const elapsed = previousTime ? Math.min(32, time - previousTime) : 16.67;
        const frameScale = elapsed / 16.67;
        previousTime = time;
        context.clearRect(0, 0, viewportWidth, viewportHeight);

        for (let index = particles.length - 1; index >= 0; index -= 1) {
            const particle = particles[index];
            particle.life -= .026 * frameScale;
            if (particle.life <= 0) {
                particles.splice(index, 1);
                continue;
            }

            particle.velocityX *= Math.pow(.985, frameScale);
            particle.velocityY =
                particle.velocityY * Math.pow(.985, frameScale) + .075 * frameScale;
            particle.x += particle.velocityX * frameScale;
            particle.y += particle.velocityY * frameScale;

            context.globalAlpha = Math.min(1, particle.life * 1.4);
            context.fillStyle = particle.color;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            context.fill();
        }

        context.globalAlpha = 1;
        if (particles.length > 0) {
            animationFrame = requestAnimationFrame(render);
        } else {
            animationFrame = 0;
            previousTime = 0;
        }
    };

    const launch = (x: number, y: number) => {
        const count = 26;
        for (let index = 0; index < count; index += 1) {
            const angle = (index / count) * Math.PI * 2 + Math.random() * .16;
            const speed = 2.2 + Math.random() * 2.8;
            particles.push({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: .72 + Math.random() * .28,
                size: 1.1 + Math.random() * 1.5,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        if (!animationFrame) animationFrame = requestAnimationFrame(render);
    };

    document.addEventListener("pointerup", (event) => {
        if (reduceMotion.matches || !event.isPrimary || event.button !== 0) return;
        const target = event.target;
        if (
            target instanceof Element &&
            target.closest(
                "a, button, input, textarea, select, summary, label, [role='button'], [contenteditable='true'], .aside-body, .view-box-show",
            )
        ) {
            return;
        }
        launch(event.clientX, event.clientY);
    });

    reduceMotion.addEventListener("change", () => {
        if (!reduceMotion.matches) return;
        particles.length = 0;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previousTime = 0;
        context.clearRect(0, 0, viewportWidth, viewportHeight);
    });
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
}

export {};
