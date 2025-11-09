// Simple QR Scanner App
let html5QrcodeScanner;
let deferredPrompt;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initScanner();
    setupInstallPrompt();
    registerServiceWorker();
});

// Initialize QR Code Scanner
function initScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        }
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanError);
}

// Handle successful scan
function onScanSuccess(decodedText, decodedResult) {
    // Show result
    document.getElementById('result-text').textContent = decodedText;
    document.getElementById('result-box').classList.add('show');
    
    // Vibrate on success
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    // If it's a URL, open it automatically
    if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        setTimeout(() => {
            if (confirm('Open this link?\n\n' + decodedText)) {
                window.open(decodedText, '_blank');
            }
        }, 500);
    }
}

// Handle scan errors (silent)
function onScanError(errorMessage) {
    // Silent - scanning errors are normal when no QR code is in view
}

// Copy result to clipboard
document.getElementById('copy-btn').addEventListener('click', function() {
    const resultText = document.getElementById('result-text').textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(resultText).then(() => {
            this.textContent = '✅ Copied!';
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
            setTimeout(() => {
                this.textContent = '📋 Copy';
            }, 2000);
        }).catch(err => {
            fallbackCopy(resultText);
        });
    } else {
        fallbackCopy(resultText);
    }
});

// Fallback copy method
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        const btn = document.getElementById('copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = '📋 Copy';
        }, 2000);
    } catch (err) {
        alert('Failed to copy');
    }
    document.body.removeChild(textArea);
}

// PWA Install Prompt
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('install-prompt').style.display = 'block';
    });

    document.getElementById('install-button').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            document.getElementById('install-prompt').style.display = 'none';
        }
    });

    document.getElementById('dismiss-install').addEventListener('click', () => {
        document.getElementById('install-prompt').style.display = 'none';
    });
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    }
}
