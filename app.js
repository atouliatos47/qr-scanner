// DOM elements
const video = document.getElementById('video');
const scanBtn = document.getElementById('scan-btn');
const status = document.getElementById('status');
const result = document.getElementById('result');
const resultText = document.getElementById('result-text');
const copyBtn = document.getElementById('copy-btn');
const openBtn = document.getElementById('open-btn');
const newScanBtn = document.getElementById('new-scan-btn');
const installBtn = document.getElementById('install-btn');
const scannerContainer = document.querySelector('.scanner-container');

// Variables
let stream = null;
let scanning = false;
let canvas = null;
let context = null;
let animationFrame = null;
let deferredPrompt = null;

// Initialize the app
function init() {
    console.log('Initializing QR Scanner...');
    
    // Create canvas for QR code scanning
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    
    // Check if the browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Your browser doesn't support camera access. Please try Chrome, Firefox, or Edge.";
        status.textContent = errorMsg;
        status.className = 'status error';
        console.error(errorMsg);
        scanBtn.disabled = true;
        return;
    }
    
    // Check if we're on a secure context
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('Camera access may not work without HTTPS or localhost');
    }
    
    // Set up event listeners
    scanBtn.addEventListener('click', startScanner);
    copyBtn.addEventListener('click', copyResult);
    openBtn.addEventListener('click', openResult);
    newScanBtn.addEventListener('click', resetScanner);
    
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
    
    console.log('QR Scanner initialized successfully');
}

// Start the QR scanner
async function startScanner() {
    try {
        console.log('Starting scanner...');
        scanBtn.disabled = true;
        scanBtn.textContent = "Scanning...";
        status.textContent = "Requesting camera permission...";
        status.className = 'status';
        
        // Get camera stream
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Prefer rear camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        console.log('Camera access granted');
        
        video.srcObject = stream;
        scannerContainer.classList.add('scanning');
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            video.play().then(() => {
                console.log('Video playback started');
                
                status.textContent = "Scanning... Point camera at QR code";
                status.className = 'status scanning-indicator';
                scanning = true;
                
                // Start scanning for QR codes
                scanFrame();
            }).catch(err => {
                console.error('Error playing video:', err);
                status.textContent = "Error starting video: " + err.message;
                status.className = 'status error';
                resetScanner();
            });
        };
        
        video.onerror = (err) => {
            console.error('Video error:', err);
            status.textContent = "Video error occurred";
            status.className = 'status error';
            resetScanner();
        };
        
    } catch (err) {
        console.error("Error accessing camera:", err);
        let errorMsg = "Error accessing camera: ";
        
        if (err.name === 'NotAllowedError') {
            errorMsg += "Camera permission denied. Please allow camera access and try again.";
        } else if (err.name === 'NotFoundError') {
            errorMsg += "No camera found on your device.";
        } else if (err.name === 'NotSupportedError') {
            errorMsg += "Camera not supported in your browser.";
        } else {
            errorMsg += err.message;
        }
        
        status.textContent = errorMsg;
        status.className = 'status error';
        resetScanner();
    }
}

// Reset the scanner for a new scan
function resetScanner() {
    console.log('Resetting scanner...');
    scanning = false;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
        });
        stream = null;
    }
    
    video.srcObject = null;
    scannerContainer.classList.remove('scanning');
    
    // Reset UI
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan QR Code";
    scanBtn.innerHTML = '<span>Scan QR Code</span>';
    
    if (!result.style.display || result.style.display === 'none') {
        status.textContent = "Ready to scan. Click 'Scan QR Code' to begin.";
        status.className = 'status';
    }
}

// Scan for QR codes in video frames
function scanFrame() {
    if (!scanning) return;
    
    try {
        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data for QR code scanning
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Scan for QR code using jsQR library
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
                
                if (code) {
                    console.log('QR Code detected:', code.data);
                    handleScanResult(code.data);
                    return; // Stop scanning after successful detection
                }
            } else {
                console.error('jsQR library not loaded');
                status.textContent = "QR scanning library not loaded. Please check your connection.";
                resetScanner();
                return;
            }
        }
        
        // Continue scanning
        animationFrame = requestAnimationFrame(scanFrame);
    } catch (err) {
        console.error('Error during scanning:', err);
        status.textContent = "Scanning error: " + err.message;
        status.className = 'status error';
        resetScanner();
    }
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
    status.className = 'status success';
    
    // Stop camera but keep result visible
    scanning = false;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        stream = null;
    }
    
    video.srcObject = null;
    scannerContainer.classList.remove('scanning');
    
    // Update scan button state
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan QR Code";
    scanBtn.innerHTML = '<span>Scan QR Code</span>';
}

// Copy result to clipboard
function copyResult() {
    navigator.clipboard.writeText(resultText.textContent)
        .then(() => {
            status.textContent = "Copied to clipboard!";
            status.className = 'status success';
        })
        .catch(err => {
            console.error("Failed to copy: ", err);
            status.textContent = "Failed to copy to clipboard.";
            status.className = 'status error';
        });
}

// Open result if it's a URL
function openResult() {
    const url = resultText.textContent;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    }
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
document.addEventListener('DOMContentLoaded', init);

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