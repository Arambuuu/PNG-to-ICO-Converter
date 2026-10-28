/**
 * IconForge - Application Logic
 * Drag & Drop, Clipboard Paste, Multi-File Batching, Live Realistic Mockups, and ICO Downloads
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fullscreenOverlay = document.getElementById('fullscreenDragOverlay');
  const toastContainer = document.getElementById('toastContainer');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  // Settings DOM
  const presetButtons = document.querySelectorAll('.preset-btn');
  const sizeCheckboxes = document.querySelectorAll('input[name="icoSize"]');
  const selectedSizesCountEl = document.getElementById('selectedSizesCount');
  const fitSelect = document.getElementById('fitSelect');
  const formatSelect = document.getElementById('formatSelect');
  const transparentBgCheck = document.getElementById('transparentBgCheck');
  const bgColorPicker = document.getElementById('bgColorPicker');

  // Active Workspace DOM
  const activeWorkspace = document.getElementById('activeWorkspace');
  const filesQueueList = document.getElementById('filesQueueList');
  const fileCountBadge = document.getElementById('fileCountBadge');
  const batchSizesInfo = document.getElementById('batchSizesInfo');
  const downloadAllZipBtn = document.getElementById('downloadAllZipBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  // Mockup Previews DOM
  const previewTabBtns = document.querySelectorAll('.preview-tab-btn');
  const tabBrowserView = document.getElementById('tabBrowserView');
  const tabDesktopView = document.getElementById('tabDesktopView');
  const tabMatrixView = document.getElementById('tabMatrixView');
  const mockTabFavicon = document.getElementById('mockTabFavicon');
  const mockTabTitle = document.getElementById('mockTabTitle');
  const mockDesktopIcon = document.getElementById('mockDesktopIcon');
  const mockDesktopTitle = document.getElementById('mockDesktopTitle');
  const mockTaskbarIcon = document.getElementById('mockTaskbarIcon');

  // Application State
  const PRESET_MAP = {
    favicon: [16, 32, 48],
    windows: [16, 24, 32, 48, 64, 128, 256],
    all: [16, 24, 32, 48, 64, 96, 128, 256],
    single256: [256]
  };

  const state = {
    files: [], // Array of FileItem objects
    activeFileIndex: 0,
    sizes: [16, 24, 32, 48, 64, 128, 256],
    fit: 'contain',
    format: 'hybrid',
    bgColor: null,
    isConvertingAll: false
  };

  /**
   * Helper: Format bytes to human readable string
   */
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Toast notification helper
   */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  /**
   * Update sizes count display & preset button active states
   */
  function updateSizesState() {
    const selected = [];
    sizeCheckboxes.forEach((cb) => {
      if (cb.checked) selected.push(parseInt(cb.value, 10));
    });
    state.sizes = selected.sort((a, b) => a - b);
    selectedSizesCountEl.textContent = `${state.sizes.length} ${state.sizes.length === 1 ? 'size' : 'sizes'} selected`;
    batchSizesInfo.textContent = `${state.sizes.length} icon sizes embedded`;

    // Match preset
    let matchedPreset = null;
    for (const [name, list] of Object.entries(PRESET_MAP)) {
      if (list.length === state.sizes.length && list.every((val, idx) => val === state.sizes[idx])) {
        matchedPreset = name;
        break;
      }
    }

    presetButtons.forEach((btn) => {
      if (btn.dataset.preset === matchedPreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Re-render currently loaded files with new settings
    reprocessAllFiles();
  }

  // Handle Preset Button Clicks
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const targetSizes = PRESET_MAP[presetKey];
      if (!targetSizes) return;

      sizeCheckboxes.forEach((cb) => {
        cb.checked = targetSizes.includes(parseInt(cb.value, 10));
      });

      updateSizesState();
    });
  });

  // Handle Checkbox Changes
  sizeCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      // Ensure at least 1 size is selected
      const checkedBoxes = Array.from(sizeCheckboxes).filter((c) => c.checked);
      if (checkedBoxes.length === 0) {
        cb.checked = true;
        showToast('At least one icon resolution must be chosen', 'error');
        return;
      }
      updateSizesState();
    });
  });

  // Handle Fit and Format changes
  fitSelect.addEventListener('change', () => {
    state.fit = fitSelect.value;
    reprocessAllFiles();
  });

  formatSelect.addEventListener('change', () => {
    state.format = formatSelect.value;
    reprocessAllFiles();
  });

  transparentBgCheck.addEventListener('change', () => {
    bgColorPicker.disabled = transparentBgCheck.checked;
    state.bgColor = transparentBgCheck.checked ? null : bgColorPicker.value;
    reprocessAllFiles();
  });

  bgColorPicker.addEventListener('input', () => {
    if (!transparentBgCheck.checked) {
      state.bgColor = bgColorPicker.value;
      reprocessAllFiles();
    }
  });

  /**
   * Theme Toggle (Dark / Light)
   */
  const savedTheme = localStorage.getItem('iconforge-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon(true);
  }

  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('iconforge-theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
  });

  function updateThemeIcon(isLight) {
    if (isLight) {
      themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
      themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  }

  /**
   * Preview Tabs Switching
   */
  previewTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      previewTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      tabBrowserView.style.display = tab === 'browser' ? 'block' : 'none';
      tabDesktopView.style.display = tab === 'desktop' ? 'flex' : 'none';
      tabMatrixView.style.display = tab === 'matrix' ? 'grid' : 'none';
    });
  });

  /**
   * File processing & Ico generation pipeline
   */
  async function processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const result = await IcoGenerator.generateIco(img, state.sizes, {
              fit: state.fit,
              bgColor: state.bgColor,
              format: state.format
            });

            // Extract base name without extension
            const originalName = file.name || 'icon.png';
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const icoFileName = `${baseName}.ico`;

            const item = {
              id: 'file_' + Math.random().toString(36).substring(2, 9),
              originalFile: file,
              imgElement: img,
              originalName: originalName,
              icoFileName: icoFileName,
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
              originalSize: file.size,
              icoBlob: result.blob,
              canvases: result.canvases,
              thumbUrl: reader.result
            };

            resolve(item);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to decode image data'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Add new files to the queue
   */
  async function addFiles(fileList) {
    const validFiles = Array.from(fileList).filter((f) => {
      return (
        f.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|svg|bmp)$/i.test(f.name)
      );
    });

    if (validFiles.length === 0) {
      showToast('Please select valid image files (PNG, WebP, JPEG, SVG)', 'error');
      return;
    }

    showToast(`Processing ${validFiles.length} ${validFiles.length === 1 ? 'image' : 'images'}...`, 'info');

    for (const file of validFiles) {
      try {
        const item = await processImageFile(file);
        state.files.push(item);
      } catch (err) {
        console.error(err);
        showToast(`Error converting ${file.name}: ${err.message}`, 'error');
      }
    }

    if (state.files.length > 0) {
      activeWorkspace.style.display = 'flex';
      renderFileList();
      setActiveFile(state.files.length - 1);
      showToast(`Generated multi-resolution ICO for ${validFiles.length} ${validFiles.length === 1 ? 'file' : 'files'}!`, 'success');
    }
  }

  /**
   * Reprocess existing files when settings change
   */
  async function reprocessAllFiles() {
    if (state.files.length === 0) return;

    for (let i = 0; i < state.files.length; i++) {
      const item = state.files[i];
      try {
        const result = await IcoGenerator.generateIco(item.imgElement, state.sizes, {
          fit: state.fit,
          bgColor: state.bgColor,
          format: state.format
        });
        item.icoBlob = result.blob;
        item.canvases = result.canvases;
      } catch (err) {
        console.error('Reprocess error:', err);
      }
    }

    renderFileList();
    updateMockupPreviews(state.files[state.activeFileIndex]);
  }

  /**
   * Render the files list cards
   */
  function renderFileList() {
    filesQueueList.innerHTML = '';
    fileCountBadge.textContent = `${state.files.length} ${state.files.length === 1 ? 'File Ready' : 'Files Ready'}`;

    state.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `file-item-card ${index === state.activeFileIndex ? 'active-preview' : ''}`;

      card.innerHTML = `
        <div class="file-info-group">
          <div class="file-thumb-container">
            <img src="${item.thumbUrl}" class="file-thumb-img" alt="${item.originalName}">
          </div>
          <div class="file-details">
            <div class="file-name" title="${item.originalName}">${item.originalName}</div>
            <div class="file-meta">
              <span>${item.width}×${item.height}px</span>
              <span>•</span>
              <span style="color: var(--accent-cyan); font-family: var(--font-mono); font-weight: 600;">.ICO (${formatBytes(item.icoBlob.size)})</span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-secondary btn-inspect" data-index="${index}" type="button" title="View Mockups & Sizes">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Inspect
          </button>
          <button class="btn-primary btn-download" data-index="${index}" type="button">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download .ICO
          </button>
          <button class="btn-icon btn-remove" data-index="${index}" type="button" title="Remove" style="color: var(--danger);">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // Wire up card actions
      card.querySelector('.btn-inspect').addEventListener('click', () => {
        setActiveFile(index);
      });

      card.querySelector('.btn-download').addEventListener('click', () => {
        downloadBlob(item.icoBlob, item.icoFileName);
        showToast(`Downloaded ${item.icoFileName}!`, 'success');
      });

      card.querySelector('.btn-remove').addEventListener('click', () => {
        removeFile(index);
      });

      filesQueueList.appendChild(card);
    });
  }

  /**
   * Set active file for live preview mockups
   */
  function setActiveFile(index) {
    if (!state.files[index]) return;
    state.activeFileIndex = index;

    // Update active highlight on cards
    const cards = filesQueueList.querySelectorAll('.file-item-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('active-preview', idx === index);
    });

    updateMockupPreviews(state.files[index]);
  }

  /**
   * Remove a file from queue
   */
  function removeFile(index) {
    state.files.splice(index, 1);
    if (state.files.length === 0) {
      activeWorkspace.style.display = 'none';
      state.activeFileIndex = 0;
    } else {
      if (state.activeFileIndex >= state.files.length) {
        state.activeFileIndex = state.files.length - 1;
      }
      renderFileList();
      setActiveFile(state.activeFileIndex);
    }
    showToast('File removed', 'info');
  }

  /**
   * Clear All files
   */
  clearAllBtn.addEventListener('click', () => {
    state.files = [];
    activeWorkspace.style.display = 'none';
    state.activeFileIndex = 0;
    fileInput.value = '';
    showToast('Queue cleared', 'info');
  });

  /**
   * Update Mockup Previews
   */
  function updateMockupPreviews(item) {
    if (!item) return;

    // Get 32px or 16px canvas for browser favicon
    const favCanvas = item.canvases.get(32) || item.canvases.get(16) || Array.from(item.canvases.values())[0];
    const favDataUrl = favCanvas ? favCanvas.toDataURL('image/png') : item.thumbUrl;

    // Get 48px or 32px canvas for desktop icon
    const desktopCanvas = item.canvases.get(48) || item.canvases.get(64) || favCanvas;
    const desktopDataUrl = desktopCanvas ? desktopCanvas.toDataURL('image/png') : item.thumbUrl;

    // Get 24px or 32px canvas for taskbar
    const taskbarCanvas = item.canvases.get(24) || item.canvases.get(32) || favCanvas;
    const taskbarDataUrl = taskbarCanvas ? taskbarCanvas.toDataURL('image/png') : item.thumbUrl;

    mockTabFavicon.src = favDataUrl;
    mockTabTitle.textContent = `${item.originalName} — Favicon Preview`;
    mockDesktopIcon.src = desktopDataUrl;
    mockDesktopTitle.textContent = item.icoFileName;
    mockTaskbarIcon.src = taskbarDataUrl;

    // Update Matrix Grid
    tabMatrixView.innerHTML = '';
    for (const [size, canvas] of item.canvases.entries()) {
      const card = document.createElement('div');
      card.className = 'matrix-card';

      const canvasBox = document.createElement('div');
      canvasBox.className = 'matrix-canvas-box';

      // Render actual size or scale up to fit nicely inside 72px box
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);

      // Max size styling
      if (size <= 48) {
        // Show at integer magnification or 1:1 with crisp pixel rendering
        previewCanvas.style.width = Math.min(canvas.width * 2, 60) + 'px';
        previewCanvas.style.height = Math.min(canvas.height * 2, 60) + 'px';
      } else {
        previewCanvas.style.maxWidth = '60px';
        previewCanvas.style.maxHeight = '60px';
      }

      canvasBox.appendChild(previewCanvas);

      const info = document.createElement('div');
      info.className = 'matrix-info';
      info.innerHTML = `
        <div class="matrix-dim">${size}×${size}</div>
        <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.1rem;">${size >= 64 ? 'PNG' : 'DIB/PNG'}</div>
      `;

      const downloadPngBtn = document.createElement('button');
      downloadPngBtn.className = 'matrix-download-btn';
      downloadPngBtn.type = 'button';
      downloadPngBtn.textContent = 'PNG';
      downloadPngBtn.title = `Download standalone ${size}x${size} PNG`;
      downloadPngBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        canvas.toBlob((blob) => {
          downloadBlob(blob, `${item.originalName.replace(/\.[^/.]+$/, '')}-${size}x${size}.png`);
          showToast(`Downloaded ${size}x${size} PNG`, 'success');
        }, 'image/png');
      });

      card.appendChild(canvasBox);
      card.appendChild(info);
      card.appendChild(downloadPngBtn);
      tabMatrixView.appendChild(card);
    }
  }

  /**
   * Helper: Trigger download of a Blob
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Batch Download All as ZIP (or fallback to sequential)
   */
  downloadAllZipBtn.addEventListener('click', async () => {
    if (state.files.length === 0) return;

    if (state.files.length === 1) {
      const item = state.files[0];
      downloadBlob(item.icoBlob, item.icoFileName);
      showToast(`Downloaded ${item.icoFileName}!`, 'success');
      return;
    }

    if (typeof JSZip !== 'undefined') {
      try {
        downloadAllZipBtn.disabled = true;
        downloadAllZipBtn.textContent = 'Creating ZIP...';

        const zip = new JSZip();
        state.files.forEach((item) => {
          zip.file(item.icoFileName, item.icoBlob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'iconforge-converted-icons.zip');
        showToast(`Created & downloaded ZIP with ${state.files.length} ICO files!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('ZIP packaging error; downloading files individually', 'error');
        downloadSequentially();
      } finally {
        downloadAllZipBtn.disabled = false;
        downloadAllZipBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download All (.ICO)
        `;
      }
    } else {
      downloadSequentially();
    }
  });

  function downloadSequentially() {
    state.files.forEach((item, idx) => {
      setTimeout(() => {
        downloadBlob(item.icoBlob, item.icoFileName);
      }, idx * 250);
    });
    showToast(`Downloading ${state.files.length} ICO files...`, 'success');
  }

  /**
   * Drag and Drop Events on Dropzone and Global Window
   */
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  });

  // Local Dropzone Highlight
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  // Global Fullscreen Drag Overlay
  let dragCounter = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      fullscreenOverlay.classList.add('active');
    }
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      fullscreenOverlay.classList.remove('active');
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    fullscreenOverlay.classList.remove('active');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  });

  /**
   * Clipboard Paste (Ctrl+V / Cmd+V)
   */
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const filesToLoad = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
          const customFile = new File([file], `clipboard-image-${timestamp}.png`, { type: file.type });
          filesToLoad.push(customFile);
        }
      }
    }

    if (filesToLoad.length > 0) {
      e.preventDefault();
      showToast('Image pasted from clipboard!', 'info');
      addFiles(filesToLoad);
    }
  });

  /**
   * Demo Logo Generator
   * Creates a modern, high-res geometric gradient logo in a canvas and passes it to addFiles
   */
  loadDemoBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Create high-res demo logo
    // Smooth rounded squircle badge
    const r = 100;
    const x = 56;
    const y = 56;
    const w = 400;
    const h = 400;

    // Outer subtle glow
    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
    ctx.shadowBlur = 40;

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Inner stylized spark/star symbol
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const cx = 256;
    const cy = 256;

    // 4-pointed smooth star spark
    ctx.moveTo(cx, cy - 130);
    ctx.quadraticCurveTo(cx, cy, cx + 130, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + 130);
    ctx.quadraticCurveTo(cx, cy, cx - 130, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - 130);
    ctx.closePath();
    ctx.fill();

    // Orbiting mini spark
    ctx.beginPath();
    ctx.arc(cx + 90, cy - 90, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    canvas.toBlob((blob) => {
      const demoFile = new File([blob], 'demo-iconforge-logo.png', { type: 'image/png' });
      addFiles([demoFile]);
      showToast('Loaded sample high-resolution logo!', 'success');
    }, 'image/png');
  });

});
