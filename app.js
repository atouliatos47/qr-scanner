let video = document.getElementById('preview');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let resultDiv = document.getElementById('result');
let startBtn = document.getElementById('startBtn');
let scanning = false;

startBtn.addEventListener('click', () => {
    if (!scanning) {
        startScanning();
        startBtn.textContent = 'Stop Scanning';
    } else {
        stopScanning();
        startBtn.textContent = 'Start Scanning';
    }
    scanning = !scanning;
});

function startScanning() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            requestAnimationFrame(tick);
        })
        .catch(err => {
            resultDiv.textContent = 'Error accessing camera: ' + err;
        });
}

function stopScanning() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
}

function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            resultDiv.textContent = 'Scanned: ' + code.data;
            drawBox(code.location);
        } else {
            resultDiv.textContent = '';
        }
    }
    requestAnimationFrame(tick);
}

function drawBox(location) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00ff00';
    ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    ctx.closePath();
    ctx.stroke();
}