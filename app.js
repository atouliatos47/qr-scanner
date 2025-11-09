// DOM elements
const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const status = document.getElementById('status');
const result = document.getElementById('result');
const resultText = document.getElementById('result-text');
const copyBtn = document.getElementById('copy-btn');
const openBtn = document.getElementById('open-btn');
const clearBtn = document.getElementById('clear-btn');
const installBtn = document.getElementById('install-btn');

// Variables
let stream = null;
let scanning = false;
let canvas = null;
let context = null;
let animationFrame = null;
let deferredPrompt = null;

// Initialize the app
function init() {
    // Create canvas for QR code scanning
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    
    // Check if the browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "Your browser doesn't support camera access. Please try a different browser.";
        startBtn.disabled = true;
        return;
    }
    
    // Set up event listeners
    startBtn.addEventListener('click', startScanner);
    stopBtn.addEventListener('click', stopScanner);
    copyBtn.addEventListener('click', copyResult);
    openBtn.addEventListener('click', openResult);
    clearBtn.addEventListener('click', clearResult);
    
    // PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });
    
    installBtn.addEventListener('click', installApp);
    
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'none';
    }
}

// Start the QR scanner
async function startScanner() {
    try {
        status.textContent = "Requesting camera permission...";
        
        // Get camera stream
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = stream;
        await video.play();
        
        // Enable/disable buttons
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        status.textContent = "Scanner active. Point at a QR code.";
        scanning = true;
        
        // Start scanning for QR codes
        scanFrame();
        
    } catch (err) {
        console.error("Error accessing camera:", err);
        status.textContent = "Error accessing camera. Please make sure you've granted camera permissions.";
    }
}

// Stop the QR scanner
function stopScanner() {
    scanning = false;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    video.srcObject = null;
    
    // Enable/disable buttons
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    status.textContent = "Scanner stopped.";
}

// Scan for QR codes in video frames
function scanFrame() {
    if (!scanning) return;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for QR code scanning
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            handleScanResult(code.data);
            return; // Stop scanning after successful detection
        }
    }
    
    // Continue scanning
    animationFrame = requestAnimationFrame(scanFrame);
}

// Handle QR code scan result
function handleScanResult(data) {
    resultText.textContent = data;
    result.style.display = 'block';
    
    // Show/hide the "Open Link" button based on content
    if (data.startsWith('http://') || data.startsWith('https://')) {
        openBtn.style.display = 'inline-flex';
    } else {
        openBtn.style.display = 'none';
    }
    
    status.textContent = "QR code detected!";
    
    // Stop scanning after a successful scan
    stopScanner();
}

// Copy result to clipboard
function copyResult() {
    navigator.clipboard.writeText(resultText.textContent)
        .then(() => {
            status.textContent = "Copied to clipboard!";
        })
        .catch(err => {
            console.error("Failed to copy: ", err);
            status.textContent = "Failed to copy to clipboard.";
        });
}

// Open result if it's a URL
function openResult() {
    const url = resultText.textContent;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    }
}

// Clear the result
function clearResult() {
    result.style.display = 'none';
    status.textContent = "Scanner is ready. Click 'Start Scanner' to begin.";
}

// Install the PWA
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                installBtn.style.display = 'none';
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}