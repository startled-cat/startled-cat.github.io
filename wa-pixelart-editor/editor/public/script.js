// ========== CONFIGURATION ==========
const COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#ffffff' },
    // Easy to add more colors later:
    // { name: 'Red', hex: '#ff0000' },
    // { name: 'Green', hex: '#00ff00' },
    // { name: 'Blue', hex: '#0000ff' },
];

const STORAGE_KEY = 'pixelArtEditor';
const GITHUB_CONFIG_KEY = 'pixelArtGitHubConfig';

// ========== STATE MANAGEMENT ==========
let state = {
    width: 16,
    height: 16,
    selectedColor: '#ffffff',
    pixels: []
};

// ========== DOM ELEMENTS ==========
const canvas = document.getElementById('canvas');
const palette = document.getElementById('palette');
const clearBtn = document.getElementById('clearBtn');
const displayBtn = document.getElementById('displayBtn');
const galleryBtn = document.getElementById('galleryBtn');
const settingsBtn = document.getElementById('settingsBtn');
const exportBtn = document.getElementById('exportBtn');
const sizeBtns = document.querySelectorAll('.size-btn');
const menuToggle = document.getElementById('menuToggle');
const actionButtons = document.getElementById('actionButtons');

// ========== INITIALIZATION ==========
function init() {
    loadFromStorage();
    setupEventListeners();
    initializePalette();
    renderCanvas();
}

function setupEventListeners() {
    // Menu toggle
    menuToggle.addEventListener('click', () => {
        actionButtons.classList.toggle('open');
    });

    // Close menu when a button is clicked
    const buttons = actionButtons.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            actionButtons.classList.remove('open');
        });
    });

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', handleSizeChange);
    });

    clearBtn.addEventListener('click', clearCanvas);
    displayBtn.addEventListener('click', showCurrentDisplay);
    galleryBtn.addEventListener('click', showGallery);
    settingsBtn.addEventListener('click', showGitHubSettings);
    exportBtn.addEventListener('click', exportImage);
}

function initializePalette() {
    palette.innerHTML = '';
    COLORS.forEach((color, index) => {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.backgroundColor = color.hex;
        btn.title = color.name;
        
        if (index === 1) { // White is default
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => selectColor(color.hex, btn));
        palette.appendChild(btn);
    });
}

// ========== CANVAS RENDERING ==========
function renderCanvas() {
    canvas.innerHTML = '';
    const pixelSize = calculatePixelSize();
    
    canvas.style.gridTemplateColumns = `repeat(${state.width}, ${pixelSize}px)`;
    canvas.style.gridTemplateRows = `repeat(${state.height}, ${pixelSize}px)`;

    for (let i = 0; i < state.width * state.height; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.style.backgroundColor = state.pixels[i] || '#000000';
        pixel.style.width = `${pixelSize}px`;
        pixel.style.height = `${pixelSize}px`;
        
        canvas.appendChild(pixel);
    }

    updateSizeButtonStates();
}

function calculatePixelSize() {
    const containerWidth = canvas.parentElement.offsetWidth - 30; // Subtract padding
    const maxPixelSize = Math.min(
        Math.floor(containerWidth / state.width),
        Math.floor(window.innerHeight / state.height * 0.6)
    );
    return Math.max(8, maxPixelSize);
}

// ========== DRAWING LOGIC ==========
let isDrawing = false;
let lastPaintedPixelIndex = -1;

function startDrawing(e, index) {
    e.preventDefault();
    isDrawing = true;
    lastPaintedPixelIndex = -1;
    paintPixel(index);
}

function draw(e, index) {
    if (!isDrawing) return;
    if (e.buttons === 0) isDrawing = false; // Mouse button released
    else paintPixel(index);
}

// Calculate which pixel is at the given client coordinates
function getPixelAtCoordinates(clientX, clientY) {
    const canvasRect = canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    // Calculate pixel size from canvas dimensions
    const pixelWidth = canvasRect.width / state.width;
    const pixelHeight = canvasRect.height / state.height;
    
    // Get grid position
    const gridX = Math.floor(x / pixelWidth);
    const gridY = Math.floor(y / pixelHeight);
    
    // Validate position is within bounds
    if (gridX < 0 || gridY < 0 || gridX >= state.width || gridY >= state.height) {
        return -1;
    }
    
    // Convert to pixel index
    return gridY * state.width + gridX;
}

// Handle pointer down (works for both mouse and touch)
canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDrawing = true;
    lastPaintedPixelIndex = -1;
    const index = getPixelAtCoordinates(e.clientX, e.clientY);
    if (index >= 0) {
        paintPixel(index);
        lastPaintedPixelIndex = index;
    }
}, { passive: false });

// Handle pointer move (works for both mouse and touch)
document.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    
    const index = getPixelAtCoordinates(e.clientX, e.clientY);
    // Only paint if we moved to a different pixel
    if (index >= 0 && index !== lastPaintedPixelIndex) {
        paintPixel(index);
        lastPaintedPixelIndex = index;
    }
});

// Handle pointer up (works for both mouse and touch)
document.addEventListener('pointerup', () => {
    if (isDrawing) {
        isDrawing = false;
        saveToStorage();
    }
});

// Handle pointer cancel (for interrupted touch)
document.addEventListener('pointercancel', () => {
    if (isDrawing) {
        isDrawing = false;
        saveToStorage();
    }
});

function paintPixel(index) {
    if (index < 0 || index >= state.pixels.length) return;
    
    state.pixels[index] = state.selectedColor;
    
    const pixelElement = canvas.children[index];
    if (pixelElement) {
        pixelElement.style.backgroundColor = state.selectedColor;
    }
}

// ========== COLOR SELECTION ==========
function selectColor(hex, btnElement) {
    state.selectedColor = hex;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    btnElement.classList.add('active');
}

// ========== SIZE MANAGEMENT ==========
function handleSizeChange(e) {
    const width = parseInt(e.target.dataset.width);
    const height = parseInt(e.target.dataset.height);
    
    state.width = width;
    state.height = height;
    state.pixels = new Array(width * height).fill('#000000');
    
    renderCanvas();
    saveToStorage();
}

function updateSizeButtonStates() {
    sizeBtns.forEach(btn => {
        const w = parseInt(btn.dataset.width);
        const h = parseInt(btn.dataset.height);
        
        if (w === state.width && h === state.height) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ========== CANVAS OPERATIONS ==========
function clearCanvas() {
    if (confirm('Wyczyścić wszystkie piksele? Tej akcji nie można cofnąć.')) {
        state.pixels = new Array(state.width * state.height).fill('#000000');
        renderCanvas();
        saveToStorage();
    }
}


// ========== EXPORT FUNCTIONALITY ==========
function exportImage() {
    const config = loadGitHubConfig();
    
    if (!config || !config.token || !config.owner || !config.repo) {
        alert('❌ GitHub nie skonfigurowany!\n\nProszę kliknąć "⚙️ Ustawienia" i wprowadzić swoje dane logowania.');
        return;
    }

    const imageData = {
        width: state.width,
        height: state.height,
        pixels: state.pixels,
        colors: extractUsedColors(),
        timestamp: new Date().toISOString()
    };

    exportBtn.disabled = true;
    exportBtn.textContent = '⏳ Wysyłanie...';

    commitToGitHub(imageData, config)
        .then(result => {
            exportBtn.disabled = false;
            exportBtn.textContent = '📤 Wyślij obraz';
            
            // Aktualizuj konfigurację displayu, aby pokazać nowy obraz
            return updateDisplayConfig(result.file, config).then(() => result);
        })
        .then(result => {
            showSuccessModal(result);
        })
        .catch(error => {
            exportBtn.disabled = false;
            exportBtn.textContent = '📤 Wyślij obraz';
            alert('❌ Błąd wysyłania:\n\n' + error.message);
            console.error('GitHub commit error:', error);
        });
}

async function commitToGitHub(imageData, config) {
    const timestamp = Date.now();
    const filename = `pixel-art-${timestamp}.json`;
    const filepath = `pixel-art/${filename}`;
    const content = JSON.stringify(imageData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filepath}`;

    // Get current SHA if file exists
    let sha = null;
    try {
        const getResponse = await fetch(url, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }
    } catch (e) {
        // File doesn't exist yet, that's fine
    }

    // Commit the file
    const commitResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `Add pixel art: ${imageData.timestamp}`,
            content: encodedContent,
            sha: sha,
            branch: 'main'
        })
    });

    if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.message || `GitHub API error: ${commitResponse.status}`);
    }

    const result = await commitResponse.json();
    
    return {
        file: filepath,
        url: result.content.html_url,
        commit: result.commit.html_url
    };
}

function extractUsedColors() {
    const colors = {};
    state.pixels.forEach(color => {
        if (color && !colors[color]) {
            colors[color] = true;
        }
    });
    return Object.keys(colors);
}

function showSuccessModal(data) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 20px;
        max-width: 90%;
        max-height: 80%;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '✓ Obraz wysłany!';
    title.style.cssText = 'margin: 0; font-size: 14px; text-transform: uppercase; color: #00aa00;';
    
    const fileInfo = document.createElement('p');
    fileInfo.style.cssText = 'margin: 0; font-size: 12px;';
    fileInfo.innerHTML = `<strong>File:</strong> ${data.file}`;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Zamknij';
    closeBtn.style.cssText = `
        padding: 8px 15px;
        background: linear-gradient(to bottom, #dfdfdf, #b0b0b0);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
    `;
    closeBtn.onclick = () => modal.remove();
    
    container.appendChild(title);
    container.appendChild(fileInfo);
    container.appendChild(closeBtn);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

// ========== LOCAL STORAGE ==========
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const loaded = JSON.parse(stored);
            state = loaded;
        } catch (e) {
            console.warn('Failed to load saved state:', e);
        }
    } else {
        // Initialize with empty canvas
        state.pixels = new Array(state.width * state.height).fill('#000000');
    }
}

// ========== GITHUB CONFIG ==========
function saveGitHubConfig(token, owner, repo) {
    const config = { token, owner, repo };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

function loadGitHubConfig() {
    const stored = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function showGitHubSettings() {
    const config = loadGitHubConfig() || { token: '', owner: '', repo: '' };
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 20px;
        max-width: 90%;
        width: 350px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Konfiguracja GitHub';
    title.style.cssText = 'margin: 0; font-size: 14px; text-transform: uppercase;';
    
    const createInput = (label, value, type = 'text') => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        
        const lbl = document.createElement('label');
        lbl.textContent = label;
        lbl.style.cssText = 'font-size: 11px; font-weight: bold; text-transform: uppercase;';
        
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.style.cssText = `
            padding: 6px;
            border: 1px solid #999;
            font-family: monospace;
            font-size: 11px;
        `;
        
        div.appendChild(lbl);
        div.appendChild(input);
        return { div, input };
    };
    
    const { div: tokenDiv, input: tokenInput } = createInput('Token GitHub', config.token, 'password');
    const { div: ownerDiv, input: ownerInput } = createInput('Właściciel repozytorium', config.owner);
    const { div: repoDiv, input: repoInput } = createInput('Nazwa repozytorium', config.repo);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Anuluj';
    cancelBtn.style.cssText = `
        flex: 1;
        padding: 8px 15px;
        background: linear-gradient(to bottom, #dfdfdf, #b0b0b0);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 11px;
    `;
    cancelBtn.onclick = () => modal.remove();
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Zapisz';
    saveBtn.style.cssText = `
        flex: 1;
        padding: 8px 15px;
        background: linear-gradient(to bottom, #00dd00, #00aa00);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 11px;
    `;
    saveBtn.onclick = () => {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repo = repoInput.value.trim();
        
        if (!token || !owner || !repo) {
            alert('❌ Proszę wypełnić wszystkie pola');
            return;
        }
        
        saveGitHubConfig(token, owner, repo);
        alert('✓ Ustawienia GitHub zapisane!');
        modal.remove();
    };
    
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);
    
    container.appendChild(title);
    container.appendChild(tokenDiv);
    container.appendChild(ownerDiv);
    container.appendChild(repoDiv);
    container.appendChild(buttonGroup);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

// ========== DISPLAY CONFIG FUNCTIONALITY ==========
async function showCurrentDisplay() {
    const config = loadGitHubConfig();
    
    if (!config || !config.token || !config.owner || !config.repo) {
        alert('❌ GitHub nie skonfigurowany!\n\nProszę kliknąć "⚙️ Ustawienia" i wprowadzić swoje dane logowania.');
        return;
    }

    displayBtn.disabled = true;
    displayBtn.textContent = '⏳ Ładowanie...';

    try {
        const configData = await loadDisplayConfig(config);
        displayBtn.disabled = false;
        displayBtn.textContent = '📺 Bieżący wyświetlacz';
        
        if (!configData || !configData.image) {
            alert('📭 Brak obrazu do wyświetlenia!\n\nUżyj Galerii, aby wybrać obraz.');
            return;
        }
        
        // Load the image that's set as display
        const image = await loadImageFromPath(config, configData.image);
        showCurrentDisplayModal(image, configData.image);
    } catch (error) {
        displayBtn.disabled = false;
        displayBtn.textContent = '📺 Bieżący wyświetlacz';
        alert('❌ Błąd ładowania konfiguracji:\n\n' + error.message);
        console.error('Display config error:', error);
    }
}

async function loadDisplayConfig(config) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/config.json`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const file = await response.json();
        const content = atob(file.content);
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

async function loadImageFromPath(config, imagePath) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${imagePath}`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
    }

    const file = await response.json();
    const imageData = JSON.parse(atob(file.content));
    
    return {
        name: file.name,
        path: file.path,
        sha: file.sha,
        data: imageData,
        htmlUrl: file.html_url
    };
}

function showCurrentDisplayModal(image, imagePath) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 20px;
        max-width: 90%;
        width: 400px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Aktualnie wyświetlane';
    title.style.cssText = 'margin: 0; font-size: 14px; text-transform: uppercase; color: #ff00ff;';
    
    const filename = document.createElement('p');
    filename.style.cssText = 'margin: 0; font-size: 11px; font-weight: bold; word-break: break-all;';
    filename.textContent = image.name;
    
    const info = document.createElement('p');
    info.style.cssText = 'margin: 0; font-size: 11px; color: #666;';
    const date = new Date(image.data.timestamp);
    info.innerHTML = `<strong>${image.data.width}×${image.data.height}</strong><br>${date.toLocaleString()}`;
    
    // Preview
    const previewCanvas = document.createElement('canvas');
    const scale = Math.max(1, Math.floor(300 / Math.max(image.data.width, image.data.height)));
    previewCanvas.width = image.data.width * scale;
    previewCanvas.height = image.data.height * scale;
    previewCanvas.style.cssText = `
        border: 2px solid #000;
        background: #000;
        display: block;
        margin: 0 auto;
    `;
    
    const ctx = previewCanvas.getContext('2d');
    for (let i = 0; i < image.data.pixels.length; i++) {
        const color = image.data.pixels[i];
        const x = (i % image.data.width) * scale;
        const y = Math.floor(i / image.data.width) * scale;
        
        ctx.fillStyle = color || '#000000';
        ctx.fillRect(x, y, scale, scale);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Zamknij';
    closeBtn.style.cssText = `
        padding: 8px 15px;
        background: linear-gradient(to bottom, #dfdfdf, #b0b0b0);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
    `;
    closeBtn.onclick = () => modal.remove();
    
    container.appendChild(title);
    container.appendChild(filename);
    container.appendChild(info);
    container.appendChild(previewCanvas);
    container.appendChild(closeBtn);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

async function updateDisplayConfig(imagePath, config) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/config.json`;
    const content = JSON.stringify({ image: imagePath }, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Get current SHA if file exists
    let sha = null;
    try {
        const getResponse = await fetch(url, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }
    } catch (e) {
        // File doesn't exist yet, that's fine
    }

    // Create/update config.json
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `Update display config to show: ${imagePath}`,
            content: encodedContent,
            sha: sha,
            branch: 'main'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return true;
}

function setAsDisplayImage(image, config, btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Ustawianie...';

    updateDisplayConfig(image.path, config)
        .then(() => {
            btn.disabled = false;
            btn.textContent = '📺 Ustaw jako obraz wyświetlacza';
            alert('✓ Obraz wyświetlacza zaktualizowany!\n\nWyświetlacz będzie teraz pokazywać ten obraz.');
        })
        .catch(error => {
            btn.disabled = false;
            btn.textContent = '📺 Ustaw jako obraz wyświetlacza';
            alert('❌ Błąd aktualizacji wyświetlacza:\n\n' + error.message);
            console.error('Set display error:', error);
        });
}

// ========== GALLERY FUNCTIONALITY ==========
async function showGallery() {
    const config = loadGitHubConfig();
    
    if (!config || !config.token || !config.owner || !config.repo) {
        alert('❌ GitHub not configured!\n\nPlease click "⚙️ GitHub Setup" and enter your credentials.');
        return;
    }

    galleryBtn.disabled = true;
    galleryBtn.textContent = '⏳ Ładowanie...';

    // Show loading modal immediately
    const loadingModal = showGalleryLoadingModal();

    try {
        const images = await loadGalleryImages(config);
        
        // Remove loading modal
        loadingModal.remove();
        
        galleryBtn.disabled = false;
        galleryBtn.textContent = '🖼️ Galeria';
        
        if (images.length === 0) {
            alert('📭 Brak obrazów w galerii!\n\nNajpierw utwórz i wyślij pixel art.');
            return;
        }
        
        displayGalleryModal(images, config);
    } catch (error) {
        loadingModal.remove();
        galleryBtn.disabled = false;
        galleryBtn.textContent = '🖼️ Galeria';
        alert('❌ Błąd ładowania galerii:\n\n' + error.message);
        console.error('Gallery load error:', error);
    }
}

function showGalleryLoadingModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 40px;
        max-width: 90%;
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        justify-content: center;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        font-size: 48px;
        animation: spin 1s linear infinite;
    `;
    spinner.textContent = '⏳';
    
    const text = document.createElement('p');
    text.textContent = 'Ładowanie galerii...';
    text.style.cssText = `
        margin: 0;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        color: #000;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(spinner);
    container.appendChild(text);
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    return modal;
}

async function loadGalleryImages(config) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/pixel-art`;
    
    const response = await fetch(url, {
        cache: 'no-store',
        headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            return [];
        }
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const files = await response.json();
    const images = [];

    // Load each JSON file
    for (const file of files) {
        if (file.name.endsWith('.json')) {
            try {
                const fileResponse = await fetch(file.download_url);
                const imageData = await fileResponse.json();
                images.push({
                    name: file.name,
                    path: file.path,
                    sha: file.sha,
                    data: imageData,
                    htmlUrl: file.html_url
                });
            } catch (e) {
                console.error('Failed to load image:', file.name, e);
            }
        }
    }

    // Sort by timestamp (most recent first)
    images.sort((a, b) => {
        const timeA = new Date(a.data.timestamp).getTime();
        const timeB = new Date(b.data.timestamp).getTime();
        return timeB - timeA;
    });

    return images;
}

function displayGalleryModal(images, config) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 20px;
        max-width: 95%;
        width: 600px;
        max-height: 90%;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Galeria';
    title.style.cssText = 'margin: 0; font-size: 14px; text-transform: uppercase;';
    
    const gallery = document.createElement('div');
    gallery.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 10px;
    `;
    
    images.forEach(image => {
        const thumb = document.createElement('div');
        thumb.style.cssText = `
            aspect-ratio: 1;
            background: #000;
            border: 2px solid #999;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        `;
        
        // Create mini preview
        const canvas = document.createElement('canvas');
        const scale = Math.max(1, Math.floor(80 / Math.max(image.data.width, image.data.height)));
        canvas.width = image.data.width * scale;
        canvas.height = image.data.height * scale;
        const ctx = canvas.getContext('2d');
        
        for (let i = 0; i < image.data.pixels.length; i++) {
            const color = image.data.pixels[i];
            const x = (i % image.data.width) * scale;
            const y = Math.floor(i / image.data.width) * scale;
            
            ctx.fillStyle = color || '#000000';
            ctx.fillRect(x, y, scale, scale);
        }
        
        thumb.appendChild(canvas);
        
        const info = document.createElement('div');
        info.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            font-size: 9px;
            padding: 3px;
            text-align: center;
        `;
        const date = new Date(image.data.timestamp);
        info.textContent = date.toLocaleDateString();
        thumb.appendChild(info);
        
        thumb.addEventListener('mouseover', () => {
            thumb.style.borderColor = '#ffff00';
            thumb.style.boxShadow = '0 0 5px #ffff00';
        });
        
        thumb.addEventListener('mouseout', () => {
            thumb.style.borderColor = '#999';
            thumb.style.boxShadow = 'none';
        });
        
        thumb.addEventListener('click', () => {
            modal.remove();
            showImageOptions(image, config);
        });
        
        gallery.appendChild(thumb);
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Zamknij';
    closeBtn.style.cssText = `
        padding: 8px 15px;
        background: linear-gradient(to bottom, #dfdfdf, #b0b0b0);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
    `;
    closeBtn.onclick = () => modal.remove();
    
    container.appendChild(title);
    container.appendChild(gallery);
    container.appendChild(closeBtn);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

function showImageOptions(image, config) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: #c0c0c0;
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        padding: 20px;
        max-width: 90%;
        width: 400px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    const title = document.createElement('h3');
    title.textContent = image.name;
    title.style.cssText = 'margin: 0; font-size: 12px; text-transform: uppercase; word-break: break-all;';
    
    const info = document.createElement('p');
    info.style.cssText = 'margin: 0; font-size: 11px; color: #666;';
    const date = new Date(image.data.timestamp);
    info.innerHTML = `<strong>${image.data.width}×${image.data.height}</strong><br>${date.toLocaleString()}`;
    
    // Preview
    const previewCanvas = document.createElement('canvas');
    const scale = Math.max(1, Math.floor(300 / Math.max(image.data.width, image.data.height)));
    previewCanvas.width = image.data.width * scale;
    previewCanvas.height = image.data.height * scale;
    previewCanvas.style.cssText = `
        border: 2px solid #000;
        background: #000;
        display: block;
        margin: 0 auto;
    `;
    
    const ctx = previewCanvas.getContext('2d');
    for (let i = 0; i < image.data.pixels.length; i++) {
        const color = image.data.pixels[i];
        const x = (i % image.data.width) * scale;
        const y = Math.floor(i / image.data.width) * scale;
        
        ctx.fillStyle = color || '#000000';
        ctx.fillRect(x, y, scale, scale);
    }
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 10px; flex-direction: column;';
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = '📥 Załaduj do edytora';
    loadBtn.style.cssText = `
        flex: 1;
        padding: 10px 15px;
        background: linear-gradient(to bottom, #4169e1, #2d4fbf);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
        color: #fff;
    `;
    loadBtn.onclick = () => {
        modal.remove();
        loadImageToEditor(image);
    };
    
    const displayBtn = document.createElement('button');
    displayBtn.textContent = '📺 Ustaw jako obraz wyświetlacza';
    displayBtn.style.cssText = `
        flex: 1;
        padding: 10px 15px;
        background: linear-gradient(to bottom, #ff00ff, #cc00cc);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
        color: #fff;
    `;
    displayBtn.onclick = () => {
        setAsDisplayImage(image, config, displayBtn);
        modal.remove();
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Usuń z repozytorium';
    deleteBtn.style.cssText = `
        flex: 1;
        padding: 10px 15px;
        background: linear-gradient(to bottom, #ff6b6b, #cc5555);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
        color: #fff;
    `;
    deleteBtn.onclick = () => {
        if (confirm(`Usunąć "${image.name}"?\n\nTej akcji nie można cofnąć.`)) {
            deleteImageFromGallery(image, config);
            modal.remove();
        }
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Anuluj';
    cancelBtn.style.cssText = `
        flex: 1;
        padding: 10px 15px;
        background: linear-gradient(to bottom, #dfdfdf, #b0b0b0);
        border: 2px solid;
        border-color: #ffffff #000000 #000000 #ffffff;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
    `;
    cancelBtn.onclick = () => {
        modal.remove();
    };
    
    buttonGroup.appendChild(loadBtn);
    buttonGroup.appendChild(displayBtn);
    buttonGroup.appendChild(deleteBtn);
    buttonGroup.appendChild(cancelBtn);
    
    container.appendChild(title);
    container.appendChild(info);
    container.appendChild(previewCanvas);
    container.appendChild(buttonGroup);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

function loadImageToEditor(image) {
    state.width = image.data.width;
    state.height = image.data.height;
    state.pixels = [...image.data.pixels];
    state.selectedColor = '#ffffff';
    
    renderCanvas();
    initializePalette();
    saveToStorage();
    
    alert('✓ Obraz załadowany do edytora!');
}

async function deleteImageFromGallery(image, config) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = '⏳ Deleting...';
    
    try {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${image.path}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Delete pixel art: ${image.name}`,
                sha: image.sha,
                branch: 'main'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to delete image: ${response.status}`);
        }

        alert('✓ Obraz usunięty!');
    } catch (error) {
        alert('❌ Błąd usuwania obrazu:\n\n' + error.message);
        console.error('Delete error:', error);
    }
}

// ========== RESPONSIVE HANDLING ==========
window.addEventListener('resize', () => {
    renderCanvas();
});

// ========== START THE APP ==========
init();
