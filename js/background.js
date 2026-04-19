function initInteractiveBackground() {
    const canvas = document.getElementById('interactive-bg');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let deformationFactor = 0;
    let deformationSpeed = 0.002;

    class Point {
        constructor(index, total) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 4 + 2;
            this.targetX = this.x;
            this.targetY = this.y;
            this.speed = Math.random() * 0.03 + 0.01;
            this.index = index;
            this.total = total;
            this.isSeparated = false;
            this.separationTime = 0;
            this.separationDuration = Math.random() * 5000 + 3000;
        }

        update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside) {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetRadius = 100;

            if (isMouseOutside) {
                if (Math.random() < 0.005) {
                    this.targetX = Math.random() * canvas.width;
                    this.targetY = Math.random() * canvas.height;
                }
            } else if (isMouseMoving) {
                if (!this.isSeparated && Math.random() < 0.02) {
                    this.isSeparated = true;
                    this.separationTime = 0;

                    if (mouseSpeed > 50) {
                        const direction = Math.random();
                        if (direction < 0.25) {
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = 0 - this.size;
                        } else if (direction < 0.5) {
                            this.targetX = canvas.width + this.size;
                            this.targetY = Math.random() * canvas.height;
                        } else if (direction < 0.75) {
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = canvas.height + this.size;
                        } else {
                            this.targetX = 0 - this.size;
                            this.targetY = Math.random() * canvas.height;
                        }
                    } else {
                        const angle = Math.random() * Math.PI * 2;
                        const separationDistance = Math.random() * 150 + 50;
                        this.targetX = mouseX + Math.cos(angle) * separationDistance;
                        this.targetY = mouseY + Math.sin(angle) * separationDistance;
                    }
                }
            } else if (!this.isSeparated) {
                const angle = (this.index / this.total) * Math.PI * 2;
                const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                this.targetX = mouseX + Math.cos(angle) * radius;
                this.targetY = mouseY + Math.sin(angle) * radius;
            }

            if (this.isSeparated && !isMouseOutside) {
                this.separationTime += 16;
                if (this.separationTime > this.separationDuration) {
                    const angle = (this.index / this.total) * Math.PI * 2;
                    const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                    this.targetX = mouseX + Math.cos(angle) * radius;
                    this.targetY = mouseY + Math.sin(angle) * radius;
                    this.isSeparated = false;
                }
            }

            let moveSpeed = this.speed;
            if (isMouseOutside) {
                moveSpeed = this.speed * 0.5;
            } else if (mouseSpeed > 50) {
                moveSpeed = this.speed * 0.5;
            } else if (mouseSpeed > 10) {
                moveSpeed = this.speed * 0.8;
            }

            this.x += (this.targetX - this.x) * moveSpeed;
            this.y += (this.targetY - this.y) * moveSpeed;
        }

        draw() {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const points = [];
    const numPoints = 50;
    for (let i = 0; i < numPoints; i++) {
        points.push(new Point(i, numPoints));
    }

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let mouseSpeed = 0;
    let isMouseMoving = false;
    let mouseMoveTimer = null;
    let isMouseOutside = false;

    document.addEventListener('mousemove', (e) => {
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;

        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        isMouseMoving = true;
        isMouseOutside = false;

        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            isMouseMoving = false;
            mouseSpeed = 0;
        }, 300);
    });

    document.addEventListener('mouseleave', () => {
        isMouseOutside = true;
        mouseSpeed = 0;
        isMouseMoving = false;
        clearTimeout(mouseMoveTimer);
    });

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        deformationFactor += deformationSpeed;
        if (deformationFactor > Math.PI * 2) {
            deformationFactor = 0;
        }

        points.forEach(point => {
            point.update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside);
            point.draw();
        });

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const opacity = 0.6 * (1 - distance / 120);
                    const gradient = ctx.createLinearGradient(points[i].x, points[i].y, points[j].x, points[j].y);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.5})`);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.stroke();
                }
            }
        }

        if (!isMouseOutside) {
            const centerGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 10);
            centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = centerGradient;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    animate();
}
