// QR Scanner App
let html5QrcodeScanner;
let scanHistory = [];
let deferredPrompt;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initScanner();
    loadHistory();
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
    document.getElementById('result-container').classList.add('active');
    document.getElementById('status').textContent = '✅ QR Code scanned successfully!';
    
    // Check if it's a URL
    const isUrl = decodedText.startsWith('http://') || decodedText.startsWith('https://');
    document.getElementById('open-btn').style.display = isUrl ? 'block' : 'none';
    
    // Add to history
    addToHistory(decodedText);
    
    // Play success sound (vibration on mobile)
    if (navigator.vibrate) {
        navigator.vibrate(200);
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
            showStatus('📋 Copied to clipboard!');
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        }).catch(err => {
            fallbackCopy(resultText);
        });
    } else {
        fallbackCopy(resultText);
    }
});

// Fallback copy method for older browsers
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showStatus('📋 Copied to clipboard!');
    } catch (err) {
        showStatus('❌ Failed to copy');
    }
    document.body.removeChild(textArea);
}

// Open link in new tab
document.getElementById('open-btn').addEventListener('click', function() {
    const resultText = document.getElementById('result-text').textContent;
    window.open(resultText, '_blank');
});

// Add to scan history
function addToHistory(text) {
    const timestamp = new Date().toLocaleString();
    const historyItem = {
        text: text,
        time: timestamp
    };
    
    // Add to beginning of array
    scanHistory.unshift(historyItem);
    
    // Keep only last 10 items
    if (scanHistory.length > 10) {
        scanHistory = scanHistory.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('qr-scan-history', JSON.stringify(scanHistory));
    
    // Update display
    displayHistory();
}

// Load history from localStorage
function loadHistory() {
    const saved = localStorage.getItem('qr-scan-history');
    if (saved) {
        scanHistory = JSON.parse(saved);
        displayHistory();
    }
}

// Display history items
function displayHistory() {
    const historyList = document.getElementById('history-list');
    
    if (scanHistory.length === 0) {
        historyList.innerHTML = '<div class="history-item" style="opacity: 0.6;">No recent scans</div>';
        return;
    }
    
    historyList.innerHTML = scanHistory.map(item => `
        <div class="history-item" onclick="showHistoryItem('${escapeHtml(item.text)}')">
            <div class="history-text">${escapeHtml(item.text)}</div>
            <div class="history-time">${item.time}</div>
        </div>
    `).join('');
}

// Show history item in result area
function showHistoryItem(text) {
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-container').classList.add('active');
    
    const isUrl = text.startsWith('http://') || text.startsWith('https://');
    document.getElementById('open-btn').style.display = isUrl ? 'block' : 'none';
    
    // Scroll to result
    document.getElementById('result-container').scrollIntoView({ behavior: 'smooth' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show status message
function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => {
        status.textContent = 'Camera ready - Point at a QR code to scan';
    }, 3000);
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
            if (outcome === 'accepted') {
                console.log('App installed');
            }
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
