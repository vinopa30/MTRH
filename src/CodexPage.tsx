// Codex Page Component
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Flag, Play } from 'lucide-react';
import { TERM_TREE_DATA, TermNode, TranslationInfo } from './termTreeData';
import { TIMELINE_LOCATIONS } from './timelineData';
import MobileCodex from './mobile/MobileCodex';

interface CodexPageProps {
  theme: {
    bg: string;
    bgTransparent: string;
    text: string;
    textDim: string;
    border: string;
    borderLight: string;
    invert: string;
  };
  isMapDarkMode: boolean;
  isMobile?: boolean;
  onViewOnMap: (layerName: string, featureSearchTerm?: string) => void;
  onViewOnTimeline: (timelineId: string) => void;
  onFlagItem?: (item: TermNode) => void;
  onSelectedTermChange?: (node: TermNode | null) => void;
  focusedTermId?: string | null;
  onFocusedTermConsumed?: () => void;
  codexNodes?: TermNode[];
}

const LAYER_COLORS: Record<string, string> = {
  'UFOs - War.gov': '#FF9BE1',
  'UFOs - Brazillian Archives': '#B297FF',
  'Enochian Sites': '#FF9F63',
  'Giants & Nephilim': '#ECCE81',
  'Biblical Figures': '#90C2FF',
  'Religion': '#90C2FF',
  'Myths / Legends': '#FFF96A',
  'Biblical Events': '#91FFC4',
  'UFOs - Sightings': '#C2FFBD',
  'Bigfoot Sightings': '#C6986D',
  'Cryptid Sightings': '#AFFFEC',
  'Underworld Entrances': '#D3C5FB',
  'Ancient Texts': '#F6E8C1',
  'Burial Mounds': '#B3C77B',
  'Cave Systems': '#B9BDAD',
  'Alien Abductions': '#C0F06E',
  'Cattle Mutilations': '#D59CF1',
  'Crop Circles': '#FFF96A',
  "D.U.M.B.'s": '#BAEAF4',
  'Particle Accelerators': '#90E9FF',
  'Ghosts & Hauntings': '#BDC4FF',
  'Megaliths / Structures': '#FFFBA6',
  'Rock Art & Cave Paintings': '#FFCBA6',

  'National Parks & Reserves': '#9FF3BC',
  'Missing 411': '#CBDF8E',
  'Blurred on Google Maps': '#BDC4FF',
  'Meteor Impact Craters': '#FF9F63',
  'Ley Lines': '#FF5E97',
  'Archaeological Finds': '#74F8F3',
  'Biblical Discoveries': '#D49459',
  'Secret Government Programs': '#FF5C5C',
  'NASA / Space': '#BACEF4',
  'The Occult': '#59DCB7',
  'People Groups': '#BCA7C7',
  'Ancient People Groups': '#BCA7C7',
  'Default': '#b6a6ff'
};

const LAYER_ICONS: Record<string, string> = {
  'UFOs - War.gov': '/icons/icon-ufo-wargov.svg',
  'UFOs - Brazillian Archives': '/icons/icon-ufo-brazilian.svg',
  'Enochian Sites': '/icons/icon-enochian-lore.svg',
  'Giants & Nephilim': '/icons/icon-giants.svg',
  'Biblical Figures': '/icons/icon-biblical-bloodlines.svg',
  'Religion': '/icons/icon-religion.svg',
  'Masonic Lodges': '/icons/icon-alchemy-occult.svg',
  'Particle Accelerators': '/icons/icon-cern.svg',
  'Myths / Legends': '/icons/icon-greek-mythology.svg',
  'Biblical Events': '/icons/icon-biblical-bloodlines-1.svg',
  'UFOs - Sightings': '/icons/icon-ufo-sightings.svg',
  'Bigfoot Sightings': '/icons/icon-bigfoot-sightings.svg',
  'Cryptid Sightings': '/icons/icon-cryptid-sightings.svg',
  'Underworld Entrances': '/icons/icon-entrances-to-underworld.svg',
  'Ancient Texts': '/icons/icon-ancient-texts.svg',
  'Burial Mounds': '/icons/icon-burial-mounds.svg',
  'Cave Systems': '/icons/icon-caves.svg',
  'Alien Abductions': '/icons/icon-alien.svg',
  'Cattle Mutilations': '/icons/icon-cow.svg',
  'Crop Circles': '/icons/icon-crop-circles.svg',
  "D.U.M.B.'s": '/icons/icon-dumbs.svg',
  'Ghosts & Hauntings': '/icons/icon-ghosts.svg',
  'Megaliths / Structures': '/icons/icon-megaliths.svg',
  'Rock Art & Cave Paintings': '/icons/icon-petroglyphs.svg',

  'National Parks & Reserves': '/icons/icon-national-parks-reserves.svg',
  'Missing 411': '/icons/icon-missing-411.svg',
  'Blurred on Google Maps': '/icons/icon-blurred-on-google.svg',
  'Meteor Impact Craters': '/icons/icon-meteors.svg',
  'Ley Lines': '/icons/icon-ley-lines.svg',
  'Archaeological Finds': '/icons/icon-archaeological-finds.svg',
  'Biblical Discoveries': '/icons/icon-biblical-discoveries.svg',
  'Secret Government Programs': '/icons/icon-secret-government-programs.svg',
  'NASA / Space': '/icons/icon-nasa.svg',
  'The Occult': '/icons/icon-alchemy-occult.svg',
  'People Groups': '/icons/icon-people-groups.svg',
  'Ancient People Groups': '/icons/icon-people-groups.svg',
  'ancient-civilizations': '/icons/icon-people-groups.svg',
  'Default': '/icons/icon-map-pin.svg'
};

interface SVGLinePath {
  id: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  isRelated: boolean;
  isDottedParentLink?: boolean;
}

const isPdfUrl = (url: string) => {
  if (!url) return false;
  const lowerUrl = url.trim().toLowerCase();
  return lowerUrl.includes('.pdf') || 
         lowerUrl.includes('docs.google.com/viewer') || 
         (lowerUrl.includes('web.archive.org') && lowerUrl.includes('/https://') && lowerUrl.split('https://')[1]?.includes('.pdf'));
};

const isAudioUrl = (url: string) => {
  if (!url) return false;
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'];
  const lowerUrl = url.trim().toLowerCase();
  return audioExtensions.some(ext => lowerUrl.includes(ext));
};

const getPdfViewerSrcDoc = (pdfUrl: string) => {
  const proxyUrl = `${window.location.origin}/api/proxy-resource?url=${encodeURIComponent(pdfUrl)}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Declassified Dossier Viewer</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0e0e0e;
      color: #eaeaea;
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: monospace, system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    header {
      background-color: #141414;
      border-bottom: 1px solid #222;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      letter-spacing: 1.5px;
      font-weight: bold;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .badge {
      background: #ef4444;
      color: #fff;
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 9px;
    }
    #viewer-container {
      flex-grow: 1;
      overflow: auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle, #151515 0%, #080808 100%);
    }
    .pdf-page-wrapper {
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      border: 1px solid #222;
      position: relative;
    }
    canvas {
      display: block;
      max-width: 100%;
    }
    footer {
      background-color: #141414;
      border-top: 1px solid #222;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    button {
      background: #1f1f1f;
      border: 1px solid #333;
      color: #999;
      cursor: pointer;
      padding: 6px 12px;
      font-size: 10px;
      font-family: inherit;
      font-weight: bold;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    button:hover:not(:disabled) {
      background: #999;
      color: #000;
      border-color: #999;
    }
    button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    #page-indicator {
      font-size: 10px;
      color: #888;
      letter-spacing: 1px;
    }
    #status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top-color: #ef4444;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <header>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="badge">CLASSIFIED</span>
      <span>Dossier Intelligence File</span>
    </div>
    <div style="color: #666; font-size: 9px;">PAGE RENDERER ACTIVE</div>
  </header>

  <div id="viewer-container">
    <div id="status">
      <div class="spinner"></div>
      <div id="status-text" style="font-size: 11px; letter-spacing: 2px; color: #888; line-height: 1.6;">DECLASSIFIED DATA STREAM LOADING...</div>
    </div>
    <div class="pdf-page-wrapper" id="page-wrapper" style="display: none;">
      <canvas id="pdf-canvas"></canvas>
    </div>
  </div>

  <footer>
    <div class="controls">
      <button id="prev-btn" disabled>PREV</button>
      <span id="page-indicator">PAGE <span id="current-page">0</span> / <span id="total-pages">0</span></span>
      <button id="next-btn" disabled>NEXT</button>
    </div>
    <div class="controls">
      <button id="zoom-out-btn" disabled>ZOOM -</button>
      <button id="zoom-in-btn" disabled>ZOOM +</button>
    </div>
  </footer>

  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    var pdfDoc = null;
    var pageNum = 1;
    var pageRendering = false;
    var pageNumPending = null;
    var scale = 1.25;
    var canvas = document.getElementById('pdf-canvas');
    var ctx = canvas.getContext('2d');
    var pageWrapper = document.getElementById('page-wrapper');
    var statusEl = document.getElementById('status');
    var statusTextEl = document.getElementById('status-text');

    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var zoomInBtn = document.getElementById('zoom-in-btn');
    var zoomOutBtn = document.getElementById('zoom-out-btn');
    var currentPageEl = document.getElementById('current-page');
    var totalPagesEl = document.getElementById('total-pages');

    function renderPage(num) {
      pageRendering = true;
      statusEl.style.display = 'block';
      if (statusTextEl) {
        statusTextEl.textContent = 'RENDERING PAGE ' + num + '...';
      }
      
      pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        pageWrapper.style.width = viewport.width + 'px';
        pageWrapper.style.height = viewport.height + 'px';
        pageWrapper.style.display = 'block';

        var renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        var renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
          pageRendering = false;
          statusEl.style.display = 'none';

          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });

      currentPageEl.textContent = num;
      prevBtn.disabled = num <= 1;
      nextBtn.disabled = num >= pdfDoc.numPages;
    }

    function queueRenderPage(num) {
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
    }

    zoomInBtn.addEventListener('click', function() {
      if (scale >= 3.0) return;
      scale += 0.25;
      renderPage(pageNum);
    });

    zoomOutBtn.addEventListener('click', function() {
      if (scale <= 0.75) return;
      scale -= 0.25;
      renderPage(pageNum);
    });

    prevBtn.addEventListener('click', function() {
      if (pageNum <= 1) return;
      pageNum--;
      queueRenderPage(pageNum);
    });

    nextBtn.addEventListener('click', function() {
      if (pageNum >= pdfDoc.numPages) return;
      pageNum++;
      queueRenderPage(pageNum);
    });

    var pdfUrl = '${proxyUrl}';
    var loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false
    });

    loadingTask.onProgress = function(progressData) {
      if (statusTextEl) {
        if (progressData && progressData.total > 0) {
          var percent = Math.round((progressData.loaded / progressData.total) * 100);
          statusTextEl.innerHTML = 'DECLASSIFIED DATA STREAM LOADING...<br><span style="color: #ef4444; font-weight: bold; font-family: monospace; font-size: 14px; margin-top: 8px; display: inline-block;">' + percent + '% COMPLETE</span>';
        } else if (progressData && progressData.loaded > 0) {
          var kb = Math.round(progressData.loaded / 1024);
          statusTextEl.innerHTML = 'DECLASSIFIED DATA STREAM LOADING...<br><span style="color: #ef4444; font-weight: bold; font-family: monospace; font-size: 14px; margin-top: 8px; display: inline-block;">' + kb + ' KB LOADED</span>';
        }
      }
    };

    loadingTask.promise.then(function(pdfDoc_) {
      pdfDoc = pdfDoc_;
      totalPagesEl.textContent = pdfDoc.numPages;
      zoomInBtn.disabled = false;
      zoomOutBtn.disabled = false;
      renderPage(pageNum);
    }).catch(function(err) {
      console.error('PDF loading error:', err);
      var errMsg = err ? (err.message || err.toString()) : 'Unknown error';
      statusEl.innerHTML = '<div style="color: #ef4444; font-size: 11px; margin-bottom: 8px;">[ TRANSMISSION ERROR ]</div>' +
        '<div style="font-size: 10px; color: #aaa; max-width: 350px; line-height: 1.6; margin: 0 auto; font-family: monospace;">' +
        'Failed to parse classified records directly on proxy stream.<br>' +
        '<span style="color: #ef4444; word-break: break-all; width: 100%; display: inline-block;">' + errMsg + '</span><br><br>' +
        'Please use "OPEN SOURCE FILE" below for direct raw viewing.</div>';
    });
  </script>
</body>
</html>`;
};

interface CombinedAsset {
  url: string;
  type: 'image' | 'video' | 'audio' | 'pdf';
  pdfUrl?: string;
  isCombined?: boolean;
}

const getFilenameWithNoExtension = (url: string) => {
  if (!url) return '';
  const trimmedUrl = url.trim();
  const parts = trimmedUrl.split('/');
  const filename = parts[parts.length - 1];
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex !== -1) {
    return filename.substring(0, dotIndex).toLowerCase();
  }
  return filename.toLowerCase();
};

const getCombinedAssets = (images: string[]): CombinedAsset[] => {
  if (!images || images.length === 0) return [];
  
  const pdfs = images.filter(isPdfUrl);
  const others = images.filter(url => !isPdfUrl(url));
  
  const combined: CombinedAsset[] = [];
  const processedPdfs = new Set<string>();
  const processedOthers = new Set<string>();

  // Attempt to match each non-PDF with its PDF counterpart
  others.forEach(otherUrl => {
    const baseOther = getFilenameWithNoExtension(otherUrl);
    
    const matchedPdf = pdfs.find(pdfUrl => {
      const basePdf = getFilenameWithNoExtension(pdfUrl);
      return (baseOther === basePdf) || 
             (baseOther.includes(basePdf) && basePdf.length > 5) || 
             (basePdf.includes(baseOther) && baseOther.length > 5);
    });

    if (matchedPdf) {
      combined.push({
        url: otherUrl,
        type: isVideoUrl(otherUrl) ? 'video' : (isAudioUrl(otherUrl) ? 'audio' : 'image'),
        pdfUrl: matchedPdf,
        isCombined: true
      });
      processedPdfs.add(matchedPdf);
      processedOthers.add(otherUrl);
    }
  });

  // Add any remaining non-PDFs
  others.forEach(otherUrl => {
    if (!processedOthers.has(otherUrl)) {
      combined.push({
        url: otherUrl,
        type: isVideoUrl(otherUrl) ? 'video' : (isAudioUrl(otherUrl) ? 'audio' : 'image')
      });
    }
  });

  // Add any remaining PDFs which were not matched to any preview image
  pdfs.forEach(pdfUrl => {
    if (!processedPdfs.has(pdfUrl)) {
      combined.push({
        url: pdfUrl,
        type: 'pdf'
      });
    }
  });

  // Put videos first, whilst otherwise preserving their order
  const videos = combined.filter(asset => asset.type === 'video');
  const nonVideos = combined.filter(asset => asset.type !== 'video');
  return [...videos, ...nonVideos];
};

const MISSING_IMAGE_URL = '/icons/icon-missing-image.svg';

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.ogv', '.mov'];
  const lowerUrl = url.trim().toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('youtube.com/embed') || 
         lowerUrl.includes('youtube.com/watch') ||
         lowerUrl.includes('youtu.be/') ||
         lowerUrl.includes('vimeo.com') || 
         lowerUrl.includes('dvidshub.net/video/embed') ||
         lowerUrl.includes('dvidshub.net/video/');
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  
  // YouTube 
  if (trimmed.includes('youtube.com/watch?v=')) {
    const videoId = trimmed.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // DVIDS
  if (trimmed.includes('dvidshub.net/video/')) {
    if (trimmed.includes('/video/embed/')) {
      return trimmed;
    }
    const parts = trimmed.split('/video/')[1]?.split('/');
    const videoId = parts ? parts[0] : '';
    return `https://www.dvidshub.net/video/embed/${videoId}`;
  }

  return trimmed;
};

const cleanAndProxyImageUrl = (url: any) => {
  if (!url || typeof url !== 'string') return MISSING_IMAGE_URL;

  const trimmedUrl = url.trim();
  if (trimmedUrl.includes('icon-missing-image.svg')) return MISSING_IMAGE_URL;

  if (isVideoUrl(trimmedUrl)) {
    return trimmedUrl;
  }
  
  if (
    trimmedUrl.startsWith('/api/proxy') || 
    trimmedUrl.startsWith('data:') || 
    trimmedUrl.startsWith('blob:')
  ) {
    return trimmedUrl;
  }

  const lowerUrl = trimmedUrl.toLowerCase();
  const isWiki = lowerUrl.includes('wikimedia.org') || lowerUrl.includes('wikipedia.org');

  if (
    isWiki ||
    lowerUrl.includes('unsplash.com') ||
    lowerUrl.includes('cloudfront.net') ||
    lowerUrl.includes('wonders-of-the-world.net') ||
    lowerUrl.includes('circleresearcharchive.com')
  ) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('http')) {
    return `/api/proxy-resource?url=${encodeURIComponent(trimmedUrl)}`;
  }

  return trimmedUrl;
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  // If it's an acronym like D.U.M.B.S. or all caps like UFO, keep it
  if (str.includes('.') || (str === str.toUpperCase() && str.length > 1)) return str;
  const titled = str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return titled.replace(/\bufos\b/gi, 'UFOs');
};

export default function CodexPage({
  theme,
  isMapDarkMode,
  isMobile = false,
  onViewOnMap,
  onViewOnTimeline,
  onFlagItem,
  onSelectedTermChange,
  focusedTermId,
  onFocusedTermConsumed,
  codexNodes
}: CodexPageProps) {
  const nodes = codexNodes || TERM_TREE_DATA;

  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [hoveredTerm, setHoveredTerm] = useState<{ id: string; level: number } | null>(null);
  const hoveredTermId = hoveredTerm?.id || null;
  const hoveredLevel = hoveredTerm?.level ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [lines, setLines] = useState<SVGLinePath[]>([]);
  const [scrollSize, setScrollSize] = useState({ width: 0, height: 0 });
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLightboxImageLoading, setIsLightboxImageLoading] = useState(false);

  const columnsContainerRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag velocity and inertia state
  const dragVelocityRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });
  const inertiaFrameRef = useRef<number | null>(null);


  // Derive active selection node (last element in selected path)
  const selectedTermId = selectedPath[selectedPath.length - 1] || null;
  const activeTermId = selectedTermId || hoveredTermId;

  const activeTermNode = useMemo(() => {
    if (!activeTermId) return null;
    return nodes.find(t => t.id === activeTermId) || null;
  }, [activeTermId, nodes]);

  const activeAssets = useMemo(() => {
    return getCombinedAssets(activeTermNode?.images || []);
  }, [activeTermNode]);

  const activeRootColor = useMemo(() => {
    const rootCatNode = selectedPath[0] ? nodes.find(n => n.id === selectedPath[0]) : null;
    return rootCatNode ? getNodeColor(rootCatNode) : (activeTermNode ? getRootCategoryColor(activeTermNode) : '#b6a6ff');
  }, [selectedPath, activeTermNode]);

  const resolvedMapInfo = useMemo(() => {
    if (!activeTermNode) return null;

    // 1. If it has a timelineId and it exists in TIMELINE_LOCATIONS, use that location's category and the term name
    if (activeTermNode.timelineId && TIMELINE_LOCATIONS[activeTermNode.timelineId]) {
      const loc = TIMELINE_LOCATIONS[activeTermNode.timelineId];
      return {
        layer: loc.category,
        featureSearchTerm: activeTermNode.timelineId
      };
    }

    // 2. If this node is a category/parent (has children) and has no explicit mapFeatureId,
    //    suppress VIEW ON MAP — navigating there would open the layer with no specific target
    const isParentNode = nodes.some(n => n.parentId === activeTermNode.id);
    if (isParentNode && !activeTermNode.mapFeatureId) return null;

    // 3. If the node has an explicit layer defined, map it
    if (activeTermNode.layer) {
      let layerName = activeTermNode.layer;
      if (layerName === 'biblical-patriarchs' || layerName === 'royal-bloodlines' || layerName === 'merovingian-bloodlines' || layerName === 'sumerian-kings' || layerName === 'greek-mythology' || layerName === 'ancient-civilizations' || layerName === 'illuminati-bloodlines' || layerName === 'black-nobility') {
        if (layerName === 'biblical-patriarchs') layerName = 'Biblical Figures';
        else if (layerName === 'royal-bloodlines' || layerName === 'merovingian-bloodlines') layerName = 'Biblical Figures';
        else if (layerName === 'sumerian-kings') layerName = 'Archaeological Finds';
        else if (layerName === 'greek-mythology') layerName = 'Archaeological Finds';
        else if (layerName === 'ancient-civilizations') layerName = 'Ancient People Groups';
        else if (layerName === 'illuminati-bloodlines' || layerName === 'black-nobility') layerName = 'The Occult';
      }
      return {
        layer: layerName,
        featureSearchTerm: activeTermNode.mapFeatureId || activeTermNode.id || activeTermNode.name
      };
    }

    // 4. Otherwise, walk up the hierarchy of parent terms to find an inherited layer
    let curr = activeTermNode;
    while (curr.parentId) {
      const parent = nodes.find(n => n.id === curr.parentId);
      if (!parent) break;
      if (parent.layer) {
        let layerName = parent.layer;
        if (layerName === 'biblical-patriarchs' || layerName === 'royal-bloodlines' || layerName === 'merovingian-bloodlines' || layerName === 'sumerian-kings' || layerName === 'greek-mythology' || layerName === 'ancient-civilizations' || layerName === 'illuminati-bloodlines' || layerName === 'black-nobility') {
          if (layerName === 'biblical-patriarchs') layerName = 'Biblical Figures';
          else if (layerName === 'royal-bloodlines' || layerName === 'merovingian-bloodlines') layerName = 'Biblical Figures';
          else if (layerName === 'sumerian-kings') layerName = 'Archaeological Finds';
          else if (layerName === 'greek-mythology') layerName = 'Archaeological Finds';
          else if (layerName === 'ancient-civilizations') layerName = 'Ancient People Groups';
          else if (layerName === 'illuminati-bloodlines' || layerName === 'black-nobility') layerName = 'The Occult';
        }
        return {
          layer: layerName,
          featureSearchTerm: activeTermNode.mapFeatureId || activeTermNode.id || activeTermNode.name
        };
      }
      curr = parent;
    }

    return null;
  }, [activeTermNode, nodes]);

  useEffect(() => {
    if (onSelectedTermChange) {
      onSelectedTermChange(activeTermNode);
    }
  }, [activeTermNode, onSelectedTermChange]);

  // Compute terms visible/matched for search query
  // Helper to trace path from node to root
  const getPathToRoot = (id: string | null): string[] => {
    const path: string[] = [];
    let curr = id;
    while (curr) {
      path.unshift(curr);
      const node = nodes.find(n => n.id === curr);
      curr = node?.parentId || null;
    }
    return path;
  };

  // Handle external focus on a specific term
  useEffect(() => {
    if (focusedTermId) {
      const path = getPathToRoot(focusedTermId);
      if (path.length > 0) {
        setSelectedPath(path);
        setIsRightCollapsed(false);
      }
      if (onFocusedTermConsumed) {
        onFocusedTermConsumed();
      }
    }
  }, [focusedTermId, onFocusedTermConsumed]);

  // Compute search suggestions list for dropdown suggest panel
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    
    const matches = nodes.filter(node => {
      const nameMatch = node.name.toLowerCase().includes(query);
      const descMatch = node.description ? node.description.toLowerCase().includes(query) : false;
      const transMatch = node.translations?.some(t =>
        (t.original || '').toLowerCase().includes(query) ||
        (t.translit || '').toLowerCase().includes(query) ||
        (t.meaning || '').toLowerCase().includes(query)
      );
      const verseMatch = node.bibleVerses?.some(v => (v || '').toLowerCase().includes(query));

      return nameMatch || descMatch || transMatch || verseMatch;
    });

    // Sort by match quality: exact name matches first, then prefix name matches, then substring name matches, then description matches
    return matches.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      const aExact = aNameLower === query;
      const bExact = bNameLower === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStartsWith = aNameLower.startsWith(query);
      const bStartsWith = bNameLower.startsWith(query);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      const aContainsName = aNameLower.includes(query);
      const bContainsName = bNameLower.includes(query);
      if (aContainsName && !bContainsName) return -1;
      if (!aContainsName && bContainsName) return 1;

      return 0;
    }).slice(0, 10);
  }, [searchQuery, nodes]);

  const getParentPathLabel = (node: TermNode): string => {
    if (!node.parentId) return '';
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return '';
    return parent.name;
  };

  // Layer Color and Icon helpers
  function getNodeColor(node: TermNode): string {
    let curr = node;
    while (curr.parentId) {
      const parent = nodes.find(n => n.id === curr.parentId);
      if (!parent) break;
      curr = parent;
    }

    if (curr.id === 'biblical-apocryphal') return '#90C2FF'; // Blue (Biblical Figures)
    if (curr.id === 'myths-legends-root') return '#FFF96A'; // Yellow/Gold (Myths / Legends)
    if (curr.id === 'megaliths-structures') return '#FFFBA6'; // Yellow/Gold (Megaliths)
    if (curr.id === 'supernatural-anomalies') return '#C2FFBD'; // Green (U.F.O. Sightings)
    if (curr.id === 'secret-government-programs') return '#FF5C5C'; // Red (Secret Government Programs)
    if (curr.id === 'alchemy-occult') return '#59DCB7'; // Mint/Teal (The Occult)
    if (curr.id === 'people-groups') return '#BCA7C7'; // Lavender (People Groups)
    if (curr.id === 'nasa-root') return '#BACEF4'; // Light Blue (NASA / Space)
    
    return LAYER_COLORS['Default'];
  }

  function getRootCategory(node: TermNode): TermNode {
    let curr = node;
    while (curr.parentId) {
      const parent = nodes.find(n => n.id === curr.parentId);
      if (!parent) break;
      curr = parent;
    }
    return curr;
  }

  function getRootCategoryColor(node: TermNode): string {
    return getNodeColor(getRootCategory(node));
  }

  function adjustColorForContrast(color: string): string {
    if (isMapDarkMode) return color;
    
    const lower = color.toLowerCase();
    switch (lower) {
      case '#fff96a': // Crop Circles
      case '#fffba6': // Megaliths
        return '#705b00'; // Very dark gold/yellow
      case '#f6e8c1': // Ancient Texts
      case '#ecce81': // Giants & Nephilim
        return '#604e1e'; // Dark brown/gold
      case '#59dcb7': // The Occult
        return '#125e4a'; // Dark mint/teal
      case '#c2ffbd': // UFOs - Sightings
      case '#9ff3bc': // National Parks
      case '#b297ff': // UFOs - Brazillian Archives
        return '#6200af'; // Dark purple
      case '#afffec': // Cryptid Sightings
      case '#74f8f3': // Archaeological Finds
        return '#005c5c'; // Dark teal
      case '#baeaf4': // D.U.M.B.'s
      case '#90e9ff': // Particle Accelerators (CERN)
        return '#114b59'; // Dark blue-teal
      case '#90c2ff': // Biblical Figures
      case '#bdc4ff': // Ghosts & Hauntings / Blurred
        return '#1c447d'; // Dark navy blue
      case '#ff5c5c': // Secret Government Programs
        return '#b31b1b'; // Dark red/crimson
      case '#ff9be1': // UFOs - War.gov
      case '#ff5e97': // Ley Lines
        return '#940d3f'; // Dark pink/red
      case '#ff9f63': // Enochian / Meteor Impact
      case '#ffcba6': // Petroglyphs
        return '#803b00'; // Dark rust orange
      case '#d49459': // Biblical Discoveries
        return '#754215'; // Dark brown-orange
      case '#c6986d': // Bigfoot
        return '#5c3f25'; // Dark chocolate brown
      case '#d3c5fb': // Underworld Entrances
      case '#d29bff': // War.gov UFO files 02
        return '#472280'; // Dark violet/purple
      case '#b6a6ff': // Default / Related
        return '#322280'; // Dark indigo
      case '#bca7c7': // People Groups
        return '#502d66'; // Dark purple/lavender
      default:
        return color;
    }
  }

  const getNodeIcon = (node: TermNode): string => {
    if (node.id === 'biblical-apocryphal') return LAYER_ICONS['Biblical Figures'];
    if (node.id === 'myths-legends-root') return LAYER_ICONS['Myths / Legends'];
    if (node.id === 'megaliths-structures') return LAYER_ICONS['Megaliths / Structures'];
    if (node.id === 'supernatural-anomalies') return LAYER_ICONS['UFOs - Sightings'];
    if (node.id === 'secret-government-programs') return LAYER_ICONS['Secret Government Programs'];
    if (node.id === 'alchemy-occult') return LAYER_ICONS['The Occult'];
    if (node.id === 'people-groups') return LAYER_ICONS['People Groups'];
    if (node.id === 'nasa-root') return LAYER_ICONS['NASA / Space'];

    if (node.layer && LAYER_ICONS[node.layer]) {
      return LAYER_ICONS[node.layer];
    }
    let parentId = node.parentId;
    while (parentId) {
      if (parentId === 'biblical-apocryphal') return LAYER_ICONS['Biblical Figures'];
      if (parentId === 'myths-legends-root') return LAYER_ICONS['Myths / Legends'];
      if (parentId === 'megaliths-structures') return LAYER_ICONS['Megaliths / Structures'];
      if (parentId === 'supernatural-anomalies') return LAYER_ICONS['UFOs - Sightings'];
      if (parentId === 'secret-government-programs') return LAYER_ICONS['Secret Government Programs'];
      if (parentId === 'alchemy-occult') return LAYER_ICONS['The Occult'];
      if (parentId === 'people-groups') return LAYER_ICONS['People Groups'];
      if (parentId === 'nasa-root') return LAYER_ICONS['NASA / Space'];

      const parent = nodes.find(n => n.id === parentId);
      if (parent && parent.layer && LAYER_ICONS[parent.layer]) {
        return LAYER_ICONS[parent.layer];
      }
      parentId = parent?.parentId;
    }
    
    return LAYER_ICONS['Default'];
  };

  const hasCanonicalConnection = (node: TermNode): boolean => {
    // Explicit list of terms/categories that are found in the Bible but also have isApocryphal: true
    const biblicalExclusions = ['fallen-angel', 'demons', 'nephilim-br', 'watchers', 'giants'];
    if (biblicalExclusions.includes(node.id)) return true;

    // Check if it has any canonical bible verses
    if (node.bibleVerses && node.bibleVerses.length > 0) {
      const canonicalBooks = [
        'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
        '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
        'Job', 'Psalms', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
        'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
        'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
        'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
        'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
        'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
      ];
      
      const hasCanonicalVerse = node.bibleVerses.some(verse => {
        const parts = verse.split(' — ');
        if (parts.length < 2) return false;
        const citation = parts[1].toLowerCase();
        
        // Check if citation mentions a canonical book
        const hasBook = canonicalBooks.some(book => citation.includes(book.toLowerCase()));
        if (!hasBook) return false;
        
        // Exclude apocryphal books that might contain the name (e.g. Enoch, Jubilees, etc.)
        const isApocryphalWord = 
          citation.includes('enoch') || 
          citation.includes('giants') || 
          citation.includes('jubilees') || 
          citation.includes('jasher') || 
          citation.includes('gospel of thomas') || 
          citation.includes('gospel of peter') || 
          citation.includes('gospel of mary') || 
          citation.includes('gospel of judas') ||
          citation.includes('apocalypse of') ||
          citation.includes('maccabees') ||
          citation.includes('esdras') ||
          citation.includes('tobit') ||
          citation.includes('judith') ||
          citation.includes('wisdom of solomon') ||
          citation.includes('sirach') ||
          citation.includes('baruch');
          
        return !isApocryphalWord;
      });
      
      if (hasCanonicalVerse) return true;
    }

    // Check if sources mention canonical scripture, bible, or any of the biblical books
    if (node.sources && node.sources.length > 0) {
      const canonicalKeywords = [
        'canonical', 'bible', 'gospel', 'testament', 'scripture',
        'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
        'samuel', 'kings', 'chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalm', 'proverb',
        'ecclesiastes', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel',
        'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah',
        'malachi', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'corinthians', 'galatians',
        'ephesians', 'philippians', 'colossians', 'thessalonians', 'timothy', 'titus', 'philemon',
        'hebrews', 'james', 'peter', 'jude', 'revelation'
      ];
      
      const hasCanonicalSource = node.sources.some(s => {
        const lower = s.toLowerCase();
        
        // Exclude apocryphal specific mentions
        if (lower.includes('enoch') || lower.includes('giants') || lower.includes('jubilees') || lower.includes('apocryphal texts only')) {
          return false;
        }
        
        return canonicalKeywords.some(keyword => lower.includes(keyword));
      });
      
      if (hasCanonicalSource) return true;
    }

    // Check description for explicit "found in the bible" or "canonical"
    if (node.description) {
      const lowerDesc = node.description.toLowerCase();
      if (lowerDesc.includes('canonical scripture') || 
          lowerDesc.includes('in the bible') || 
          lowerDesc.includes('biblical narrative') || 
          lowerDesc.includes('mentioned in the bible') ||
          lowerDesc.includes('mentioned in genesis') ||
          lowerDesc.includes('book of revelation') ||
          lowerDesc.includes('book of daniel') ||
          lowerDesc.includes('book of genesis')) {
        return true;
      }
    }

    return false;
  };

  const isOnlyApocryphal = (node: TermNode): boolean => {
    if (!node.isApocryphal) return false;
    
    // If it is part of Myths / Legends or The Occult, it is non-canonical (so it remains apocryphal)
    const path = getPathToRoot(node.id);
    const isMythOrOccult = path.includes('myths-legends-root') || path.includes('alchemy-occult');
    if (isMythOrOccult) return true;

    // If it has a canonical biblical connection, it is not purely apocryphal
    if (hasCanonicalConnection(node)) return false;
    
    // Genuinely biblical terms that also have isApocryphal: true will list 'Bible' in their sources
    const hasBibleSource = node.sources?.some(s => s.toLowerCase() === 'bible');
    if (hasBibleSource) return false;
    
    const biblicalExclusions = ['fallen-angel', 'demons', 'nephilim-br', 'watchers', 'giants'];
    if (biblicalExclusions.includes(node.id)) return false;
    
    return true;
  };

  // Helper to trace term depth level dynamically based on active rendering columns
  const getNodeLevel = (node: TermNode): number => {
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].nodes.some(n => n.id === node.id)) {
        return i;
      }
    }
    
    // Fallback if not found in active rendered columns
    let lvl = 0;
    let curr = node.parentId;
    while (curr) {
      lvl++;
      const parent = nodes.find(n => n.id === curr);
      curr = parent?.parentId;
    }
    return lvl;
  };

  // Generate visible columns
  const columns = useMemo(() => {
    const list: { level: number; title: string; nodes: TermNode[] }[] = [];

    // Level 0: Roots
    const rootNodes = nodes.filter(n => !n.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    list.push({ level: 0, title: 'Categories', nodes: rootNodes });

    // Subsequent levels based on active selected path
    for (let i = 0; i < selectedPath.length; i++) {
      const currentId = selectedPath[i];
      const currentNode = nodes.find(n => n.id === currentId);
      const children = nodes.filter(n => {
        if (selectedPath.slice(0, i + 1).includes(n.id)) return false;
        
        const isChild = n.parentId === currentId || n.secondaryParentIds?.includes(currentId);
        const isParent = currentNode && (currentNode.parentId === n.id || currentNode.secondaryParentIds?.includes(n.id));
        
        return isChild || isParent;
      }).sort((a, b) => a.name.localeCompare(b.name));

      if (children.length > 0) {
        list.push({
          level: i + 1,
          title: i === 0 ? 'Sub-Themes' : 'Terms',
          nodes: children
        });
      }
    }

    return list;
  }, [selectedPath, nodes]);

  // Handle term node selection click
  const handleNodeClick = (node: TermNode, level: number) => {
    const path = [...selectedPath.slice(0, level), node.id];
    setSelectedPath(path);
  };

  // Build a selection path from root to a node by walking parentId links, so a
  // cross-reference jump lands the drill-down (and breadcrumb) at that term.
  const buildPathToNode = (id: string): string[] => {
    const path: string[] = [];
    const seen = new Set<string>();
    let currentId: string | undefined = id;
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      path.unshift(currentId);
      const node = nodes.find(n => n.id === currentId);
      currentId = node?.parentId;
    }
    return path;
  };

  // Update selection pathways and cross-links lines
  const updateLines = () => {
    if (!columnsContainerRef.current || !svgOverlayRef.current) return;

    const container = columnsContainerRef.current;
    
    setScrollSize({
      width: Math.max(container.scrollWidth, container.clientWidth),
      height: Math.max(container.scrollHeight, container.clientHeight)
    });

    const containerRect = container.getBoundingClientRect();
    const paths: SVGLinePath[] = [];

    // Helper to find the best column index for a node ID relative to activeTermLevel
    const activeTermLevel = hoveredLevel !== null ? hoveredLevel : (selectedPath.length > 0 ? selectedPath.length - 1 : 0);
    
    const getBestColIdx = (pId: string): number | null => {
      let bestColIdx: number | null = null;
      let minDiff = Infinity;
      columns.forEach((col, colIdx) => {
        if (col.nodes.some(n => n.id === pId)) {
          const diff = Math.abs(colIdx - activeTermLevel);
          if (diff < minDiff) {
            minDiff = diff;
            bestColIdx = colIdx;
          }
        }
      });
      return bestColIdx;
    };

    // 1. Draw Selection Path connecting lines (right-angle orthogonal staircase style)
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const parentId = selectedPath[i];
      const childId = selectedPath[i + 1];

      const parentEl = document.getElementById(`node-pill-${parentId}-${i}`);
      const childEl = document.getElementById(`node-pill-${childId}-${i + 1}`);

      if (parentEl && childEl) {
        const parentRect = parentEl.getBoundingClientRect();
        const childRect = childEl.getBoundingClientRect();

        // Right side of parent pill
        const x1 = parentRect.right - containerRect.left + container.scrollLeft;
        const y1 = parentRect.top + parentRect.height / 2 - containerRect.top + container.scrollTop;

        // Left side of child pill
        const x2 = childRect.left - containerRect.left + container.scrollLeft;
        const y2 = childRect.top + childRect.height / 2 - containerRect.top + container.scrollTop;

        const parentNode = nodes.find(n => n.id === parentId);
        const color = parentNode ? getRootCategoryColor(parentNode) : theme.borderLight;

        // Orthogonal right angle path (horizontal, vertical, horizontal)
        const xMid = (x1 + x2) / 2;
        const pathData = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;

        paths.push({
          id: `path-${parentId}-${childId}`,
          d: pathData,
          x1,
          y1,
          x2,
          y2,
          color,
          isRelated: false
        });
      }
    }

    // 2. Draw Cross-linked Related Terms curves
    if (activeTermId) {
      const activeNode = nodes.find(n => n.id === activeTermId);
      const activeEl = document.getElementById(`node-pill-${activeTermId}-${activeTermLevel}`);

      if (activeNode && activeNode.relatedIds && activeEl) {
        const activeRect = activeEl.getBoundingClientRect();

        activeNode.relatedIds.forEach(relId => {
          const relLevel = getBestColIdx(relId);
          if (relLevel !== null) {
            const relEl = document.getElementById(`node-pill-${relId}-${relLevel}`);
            const relNode = nodes.find(n => n.id === relId);

            if (relEl && relNode) {
              const relRect = relEl.getBoundingClientRect();
              const activeLevel = activeTermLevel;

              let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
              let pathData = '';

              if (activeLevel === relLevel) {
                if (activeLevel === 0) {
                  // Column 0 (categories): connect on the right side using the gap
                  x1 = activeRect.right - containerRect.left + container.scrollLeft;
                  y1 = activeRect.top + activeRect.height / 2 - containerRect.top + container.scrollTop;

                  x2 = relRect.right - containerRect.left + container.scrollLeft;
                  y2 = relRect.top + relRect.height / 2 - containerRect.top + container.scrollTop;

                  // Loop into the gap between Column 0 and Column 1 (20px to the right)
                  const xOffset = Math.max(x1, x2) + 20;
                  pathData = `M ${x1} ${y1} H ${xOffset} V ${y2} H ${x2}`;
                } else {
                  // Columns 1+: connect on the left side using the gap on the left
                  x1 = activeRect.left - containerRect.left + container.scrollLeft;
                  y1 = activeRect.top + activeRect.height / 2 - containerRect.top + container.scrollTop;

                  x2 = relRect.left - containerRect.left + container.scrollLeft;
                  y2 = relRect.top + relRect.height / 2 - containerRect.top + container.scrollTop;

                  // Loop into the gap on the left (20px to the left)
                  const xOffset = Math.min(x1, x2) - 20;
                  pathData = `M ${x1} ${y1} H ${xOffset} V ${y2} H ${x2}`;
                }
              } else {
                // Different columns: connect right-side of left element to left-side of right element
                const isLeftToRight = activeLevel < relLevel;
                const leftElRect = isLeftToRight ? activeRect : relRect;
                const rightElRect = isLeftToRight ? relRect : activeRect;

                x1 = leftElRect.right - containerRect.left + container.scrollLeft;
                y1 = leftElRect.top + leftElRect.height / 2 - containerRect.top + container.scrollTop;

                x2 = rightElRect.left - containerRect.left + container.scrollLeft;
                y2 = rightElRect.top + rightElRect.height / 2 - containerRect.top + container.scrollTop;

                // Calculate xMid: 20px before the right element is the center of the gap preceding it
                const xMid = rightElRect.left - 20 - containerRect.left + container.scrollLeft;
                pathData = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;
              }

              paths.push({
                id: `rel-${activeTermId}-${relId}`,
                d: pathData,
                x1,
                y1,
                x2,
                y2,
                color: activeRootColor,
                isRelated: true
              });
            }
          }
        });
      }

      // 3. Draw Parent & Secondary Parent connections (attaching to categories/sub-categories they are linked to)
      if (activeNode && activeEl) {
        const activeRect = activeEl.getBoundingClientRect();
        const activeLevel = activeTermLevel;
        const parentIds: string[] = [];
        if (activeNode.parentId) {
          parentIds.push(activeNode.parentId);
        }
        if (activeNode.secondaryParentIds) {
          parentIds.push(...activeNode.secondaryParentIds);
        }

        parentIds.forEach(pId => {
          const parentLevel = getBestColIdx(pId);
          if (parentLevel !== null) {
            // Check if there is already a line connecting them in paths (e.g. selection path)
            const alreadyHasLine = paths.some(p => p.id === `path-${pId}-${activeTermId}` || p.id === `path-${activeTermId}-${pId}`);
            if (alreadyHasLine) return;

            const parentEl = document.getElementById(`node-pill-${pId}-${parentLevel}`);
            const parentNode = nodes.find(n => n.id === pId);

            if (parentEl && parentNode) {
              const parentRect = parentEl.getBoundingClientRect();

              let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
              let pathData = '';

              // Different columns: connect right-side of left element to left-side of right element
              const isParentToChild = parentLevel < activeLevel;
              const leftElRect = isParentToChild ? parentRect : activeRect;
              const rightElRect = isParentToChild ? activeRect : parentRect;

              x1 = leftElRect.right - containerRect.left + container.scrollLeft;
              y1 = leftElRect.top + leftElRect.height / 2 - containerRect.top + container.scrollTop;

              x2 = rightElRect.left - containerRect.left + container.scrollLeft;
              y2 = rightElRect.top + rightElRect.height / 2 - containerRect.top + container.scrollTop;

              const xMid = rightElRect.left - 20 - containerRect.left + container.scrollLeft;
              pathData = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;

              const parentColor = getRootCategoryColor(parentNode);

              paths.push({
                id: `parentLink-${activeTermId}-${pId}`,
                d: pathData,
                x1,
                y1,
                x2,
                y2,
                color: parentColor,
                isRelated: false,
                isDottedParentLink: true
              });
            }
          }
        });
      }
    }

    setLines(paths);
  };

  // Trigger line updates on rendering parameters
  useEffect(() => {
    const timer = setTimeout(updateLines, 50);

    const container = columnsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateLines);
    }
    window.addEventListener('resize', updateLines);

    return () => {
      clearTimeout(timer);
      if (container) {
        container.removeEventListener('scroll', updateLines);
      }
      window.removeEventListener('resize', updateLines);
    };
  }, [selectedPath, columns, activeTermId, hoveredLevel, searchQuery, nodes]);

  // Mouse drag-to-scroll panning like a Miro board
  const activeDragRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    container: HTMLDivElement;
    hasDragged: boolean;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;

    // Dismiss search suggestions dropdown on canvas click/drag
    if (searchQuery) {
      setSearchQuery('');
    }

    // Stop any running inertia animation immediately on click
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    
    // Only drag if clicking on the background, columns container, gaps, or column bodies, not on buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }
    
    const container = columnsContainerRef.current;
    if (!container) return;
    
    dragVelocityRef.current = { x: 0, y: 0 };
    lastMousePosRef.current = { x: e.pageX, y: e.pageY, time: performance.now() };
    
    activeDragRef.current = {
      startX: e.pageX,
      startY: e.pageY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      container,
      hasDragged: false
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;
      
      const deltaX = e.pageX - drag.startX;
      const deltaY = e.pageY - drag.startY;
      
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        if (!drag.hasDragged) {
          drag.hasDragged = true;
          document.body.classList.add('is-grabbing');
        }
      }

      // Calculate velocity based on change in position over time
      const now = performance.now();
      const dt = now - lastMousePosRef.current.time;
      if (dt > 0) {
        const vx = e.pageX - lastMousePosRef.current.x;
        const vy = e.pageY - lastMousePosRef.current.y;
        dragVelocityRef.current = { x: vx, y: vy };
      }
      lastMousePosRef.current = { x: e.pageX, y: e.pageY, time: now };
      
      // Pan main container horizontally and vertically (Miro board style)
      drag.container.scrollLeft = drag.scrollLeft - deltaX;
      drag.container.scrollTop = drag.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      const drag = activeDragRef.current;
      if (drag) {
        if (drag.hasDragged) {
          document.body.classList.remove('is-grabbing');

          // Trigger inertia scroll if velocity is high enough
          const container = drag.container;
          let { x: vx, y: vy } = dragVelocityRef.current;
          
          const maxVel = 40;
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > maxVel) {
            vx = (vx / speed) * maxVel;
            vy = (vy / speed) * maxVel;
          }
          
          const friction = 0.95; // Decay factor
          
          const runInertia = () => {
            if (Math.abs(vx) < 0.25 && Math.abs(vy) < 0.25) {
              inertiaFrameRef.current = null;
              return;
            }
            
            container.scrollLeft -= vx;
            container.scrollTop -= vy;
            
            vx *= friction;
            vy *= friction;
            
            inertiaFrameRef.current = requestAnimationFrame(runInertia);
          };
          
          if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
            inertiaFrameRef.current = requestAnimationFrame(runInertia);
          }
          
          // Prevent next click event on pill items if dragged
          const preventClick = (captureEvent: MouseEvent) => {
            captureEvent.stopPropagation();
            captureEvent.preventDefault();
          };
          window.addEventListener('click', preventClick, { capture: true });
          setTimeout(() => {
            window.removeEventListener('click', preventClick, { capture: true });
          }, 50);
        }
        activeDragRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
      }
    };
  }, []);

  // Disable native browser wheel scrolling and native drag-and-drop
  useEffect(() => {
    const container = columnsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Stop any running drag inertia animation immediately on scrollwheel action
      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
        inertiaFrameRef.current = null;
      }

      let dy = e.deltaY;
      let dx = e.deltaX;
      if (e.deltaMode === 1) { // Line mode
        dy *= 20;
        dx *= 20;
      } else if (e.deltaMode === 2) { // Page mode
        dy *= 800;
        dx *= 800;
      }

      container.scrollTop += dy;
      container.scrollLeft += dx;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('dragstart', handleDragStart);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Parallax grid background effect linked to drag/scroll position
  useEffect(() => {
    const container = columnsContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const ratio = 0.7; // moves at 70% of canvas speed (30% lag)
      const x = scrollLeft * (1 - ratio);
      const y = scrollTop * (1 - ratio);
      canvas.style.backgroundPosition = `${x}px ${y}px`;
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-center selected terms vertically within their columns (aligning them to a single horizontal line)
  const isInitialMountRef = useRef(true);

  // Smoothly center the columns container on the active column and vertical midpoint (single horizontal selections line)
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = columnsContainerRef.current;
      if (!container) return;
      
      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;
      
      // Determine which column to center
      const targetColIdx = Math.min(selectedPath.length, columns.length - 1);
      const colCenterX = 1200 + targetColIdx * 300 + 130;
      
      // If the sidebar is expanded (not collapsed), offset the center to the left
      const sidebarOffset = isRightCollapsed ? 0 : 300;
      const targetScrollLeft = colCenterX - (viewportWidth - sidebarOffset) / 2;
      const targetScrollTop = 1500 - viewportHeight / 2;
      
      if (isInitialMountRef.current) {
        container.scrollLeft = targetScrollLeft;
        container.scrollTop = targetScrollTop;
        isInitialMountRef.current = false;
      } else {
        container.scrollTo({
          left: targetScrollLeft,
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }, 150); // slight delay to allow rendering
    return () => clearTimeout(timer);
  }, [selectedPath, columns, isRightCollapsed]);

  // Automatically expand sidebar when a term is selected
  useEffect(() => {
    if (selectedTermId) {
      setIsRightCollapsed(false);
    }
  }, [selectedTermId]);

  // Reset image index when switching locations
  useEffect(() => {
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
    if (activeTermNode && activeAssets && activeAssets.length > 0) {
      setIsImageLoading(true);
    }
  }, [activeTermNode, activeAssets]);

  // Set image loading state when image index changes
  useEffect(() => {
    if (activeTermNode && activeAssets && activeAssets.length > 0) {
      const currentAsset = activeAssets[activeImageIndex];
      const currentUrl = currentAsset?.url;
      if (isVideoUrl(currentUrl) || isPdfUrl(currentUrl) || isAudioUrl(currentUrl) || currentAsset?.pdfUrl) {
        setIsImageLoading(false);
      } else {
        setIsImageLoading(true);
      }
    }
  }, [activeImageIndex, activeTermNode, activeAssets]);

  // Handle lightbox image loading when assets index or lightbox open state changes
  useEffect(() => {
    if (isLightboxOpen && activeTermNode && activeAssets && activeAssets.length > 0) {
      setIsLightboxImageLoading(true);
    }
  }, [activeImageIndex, isLightboxOpen, activeTermNode, activeAssets]);

  // Escape/Arrow keys for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === 'Escape') setIsLightboxOpen(false);
        if (e.key === 'ArrowRight') {
          setActiveImageIndex(prev => (prev + 1) % activeAssets.length);
        }
        if (e.key === 'ArrowLeft') {
          setActiveImageIndex(prev => (prev - 1 + activeAssets.length) % activeAssets.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, activeTermNode, activeAssets]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeAssets || activeAssets.length === 0) return;
    setActiveImageIndex(prev => (prev - 1 + activeAssets.length) % activeAssets.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeAssets || activeAssets.length === 0) return;
    setActiveImageIndex(prev => (prev + 1) % activeAssets.length);
  };

  // Poll line positions during slide transitions to ensure SVG paths follow animated columns in real-time
  useEffect(() => {
    let startTime = performance.now();
    let frameId: number;

    const poll = (now: number) => {
      updateLines();
      if (now - startTime < 400) { // Poll for 400ms matching transition duration
        frameId = requestAnimationFrame(poll);
      }
    };

    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, [selectedPath]);

  const minorLines = [30, 60, 90, 120, 150, 180, 210, 240, 270];
  const minorStroke = isMapDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const majorStroke = isMapDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';

  const svgGrid = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
  ${minorLines.map(pos => `
    <line x1="${pos}" y1="0" x2="${pos}" y2="300" stroke="${minorStroke}" stroke-dasharray="2,2" />
    <line x1="0" y1="${pos}" x2="300" y2="${pos}" stroke="${minorStroke}" stroke-dasharray="2,2" />
  `).join('')}
  <line x1="0" y1="0" x2="0" y2="300" stroke="${majorStroke}" stroke-dasharray="4,4" />
  <line x1="0" y1="0" x2="300" y2="0" stroke="${majorStroke}" stroke-dasharray="4,4" />
</svg>
`)}`;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        background: isMapDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        color: theme.text,
        overflow: 'hidden',
        position: 'relative',
        borderTop: `1px solid ${theme.border}` // Dynamic divider line across the top of the term tree area
      }}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .is-grabbing {
          cursor: grabbing !important;
        }
        .is-grabbing * {
          cursor: grabbing !important;
        }
        /* Disable text selection inside the columns container to ensure smooth dragging */
        .drag-container-select-none {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        .search-suggestion-item {
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          border-bottom: 1px solid var(--border-light);
        }
        .search-suggestion-item:last-child {
          border-bottom: none;
        }
        .search-suggestion-item:hover {
          background: var(--hover-bg) !important;
        }
      `}</style>

      {/* MOBILE: case-file drill-down replaces the pannable canvas */}
      {isMobile && (
        <MobileCodex
          theme={theme}
          nodes={nodes}
          columns={columns}
          selectedPath={selectedPath}
          onNodeTap={(node, level) => { handleNodeClick(node, level); setIsRightCollapsed(false); }}
          onCrumbTap={(index) => setSelectedPath(selectedPath.slice(0, index + 1))}
          onReset={() => setSelectedPath([])}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* FLOATING SEARCH BAR IN THE TOP LEFT (separate from canvas) — desktop only */}
      {!isMobile && (<>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '32px',
          width: '260px',
          zIndex: 10,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          padding: '4px 8px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '40px',
          ...({
            '--hover-bg': isMapDarkMode ? '#222222' : '#f5f5f5',
            '--border-light': theme.borderLight
          } as React.CSSProperties)
        }}
      >
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="SEARCH DATABASE..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 24px 8px 8px',
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              background: theme.bg,
              color: theme.text
            }}
          />
          {searchQuery && (
            <motion.button
              whileHover={{ opacity: 0.7 }}
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 21
              }}
            >
              <X size={14} color={theme.text} />
            </motion.button>
          )}
        </div>

        {/* Suggestion Dropdown Panel */}
        {searchQuery.trim() !== '' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '39px', // align right under the border
              left: '-1px',
              width: '260px',
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              borderTop: 'none',
              maxHeight: '260px',
              overflowY: 'auto',
              zIndex: 11,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {searchSuggestions.length > 0 ? (
              searchSuggestions.map(node => {
                const parentLabel = getParentPathLabel(node);
                return (
                  <div
                    key={node.id}
                    className="search-suggestion-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const path = getPathToRoot(node.id);
                      setSelectedPath(path);
                      setSearchQuery('');
                    }}
                  >
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        fontFamily: '"Space Mono", monospace',
                        color: theme.text,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        {node.subLabel === 'Possible Nephilim Bloodline' && (
                          <span style={{ marginRight: '6px', color: 'currentColor', fontWeight: '900' }}>✖</span>
                        )}
                        {node.name}
                      </span>
                      {parentLabel && (
                        <span style={{
                          fontSize: '8px',
                          fontFamily: '"Space Mono", monospace',
                          color: theme.textDim,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          marginTop: '2px'
                        }}>
                          IN {parentLabel}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '12px 16px',
                  fontSize: '9px',
                  fontFamily: '"Space Mono", monospace',
                  color: theme.textDim,
                  letterSpacing: '0.5px'
                }}>
                  NO MATCHES FOUND
                </div>
              )}
            </motion.div>
          )}
      </div>

      {/* LEFT AREA: HORIZONTALLY AND VERTICALLY DRAGGABLE INFINITE CANVAS */}
      <div
        ref={columnsContainerRef}
        className="no-scrollbar drag-container-select-none"
        onMouseDown={handleMouseDown}
        style={{
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'hidden',
          position: 'relative',
          background: 'rgba(0, 0, 0, 0)', // Use zero opacity color to ensure pointer event capture in all browsers
          cursor: 'grab',
          zIndex: 3
        }}
      >
        {/* The 2D Canvas */}
        <div
          ref={canvasRef}
          style={{
            width: '4000px',
            height: '3000px',
            position: 'relative',
            backgroundImage: `url("${svgGrid}")`,
            backgroundRepeat: 'repeat'
          }}
        >
          {/* SVG connection overlay (background lines) scrolling natively with the columns */}
          <svg
            ref={svgOverlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4000px',
              height: '3000px',
              pointerEvents: 'none',
              zIndex: 4
            }}
          >
            {lines.map(line => {
              const isDotted = line.isRelated || line.isDottedParentLink;
              return (
                <path
                  key={line.id}
                  d={line.d}
                  fill="none"
                  stroke={theme.text}
                  strokeWidth="2"
                  strokeDasharray={isDotted ? "4,4" : "none"}
                  opacity={line.isRelated ? 0.6 : (line.isDottedParentLink ? 0.75 : 0.85)}
                />
              );
            })}
          </svg>

        {/* Columns positioned absolutely on the 2D Canvas */}
        <AnimatePresence>
          {columns.map((column, colIdx) => {
            const selectedNodeId = selectedPath[colIdx];
            const selIdx = column.nodes.findIndex(n => n.id === selectedNodeId);
            const activeSelIdx = selIdx >= 0 ? selIdx : 0;
            const Y_item = activeSelIdx * 40 + 16; // 32px height + 8px gap, center is at 16px
            const colTop = 1500 - Y_item;
            const colLeft = 1200 + colIdx * 300;

            return (
              <motion.div
                key={colIdx}
                initial={{ opacity: 0, x: 25 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  top: `${colTop}px`
                }}
                exit={{ opacity: 0, x: 25 }}
                transition={{ 
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1] // Apple-style fluid deceleration ease-out curve
                }}
                style={{
                  position: 'absolute',
                  left: `${colLeft}px`,
                  width: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 5,
                  background: 'transparent'
                }}
              >
                {/* Column 0 Blurb (says click a category to dive deeper, fades out on click) */}
                {colIdx === 0 && (
                  <AnimatePresence>
                    {selectedPath.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          right: 0,
                          marginBottom: '16px',
                          padding: '12px 16px',
                          border: `1px dashed ${theme.borderLight}`,
                          borderRadius: '8px',
                          background: isMapDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: '"Space Mono", monospace',
                            color: theme.textDim,
                            lineHeight: '1.4',
                            display: 'block'
                          }}
                        >
                          SELECT A CATEGORY BELOW TO DIVE DEEPER INTO THE TAXONOMY AND EXPLORE CONNECTIONS.
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Column List Body (no-scrollbar, static layout inside absolute column block) */}
                <div
                  className="no-scrollbar"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative'
                  }}
                >

                {/* Items Render */}
                {column.nodes.map(node => {
                  const isSelected = selectedPath[colIdx] === node.id;
                  const isHovered = hoveredTermId === node.id;
                  const nodeColor = colIdx === 0 ? getNodeColor(node) : activeRootColor;
                  const nodeIcon = getNodeIcon(node);

                  const hasChildren = nodes.some(c => c.parentId === node.id);

                  // Column 0 / Level 0: Main Category terms (style identical to map page sidebar layer list, minus visibility toggle)
                  if (colIdx === 0) {
                    return (
                      <div
                        key={node.id}
                        id={`node-pill-${node.id}-${colIdx}`}
                        onMouseEnter={() => setHoveredTerm({ id: node.id, level: colIdx })}
                        onMouseLeave={() => setHoveredTerm(null)}
                        onClick={() => handleNodeClick(node, colIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0',
                          height: '32px',
                          cursor: 'pointer',
                          background: isSelected
                            ? '#000000'
                            : isHovered
                              ? (isMapDarkMode ? '#222222' : '#f0f0f0')
                              : (isMapDarkMode ? '#1a1a1a' : '#ffffff'),
                          border: (selectedTermId === node.id)
                            ? `1px solid ${isMapDarkMode ? '#ffffff' : '#000000'}`
                            : `1px solid ${theme.border}`,
                          borderRadius: '16px',
                          boxSizing: 'border-box',
                          color: isSelected ? '#ffffff' : theme.text, // Text is white when selected over black background
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          zIndex: isSelected ? 15 : 5,
                          boxShadow: isSelected ? `0 0 10px ${nodeColor}44` : 'none'
                        }}
                      >
                        {/* Left icon and text wrapper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                          <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img
                              src={nodeIcon}
                              style={{ width: '30px', height: '30px' }}
                              alt={node.name}
                              draggable={false}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              lineHeight: '24px',
                              fontWeight: '700',
                              fontFamily: '"Space Mono", monospace',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              opacity: 1,
                              color: isSelected ? '#ffffff' : theme.text
                            }}
                          >
                            {node.name}
                          </span>
                        </div>

                        {/* Right pointing arrow (matching sidebar expand chevron but pointing right) */}
                        {hasChildren && (
                          <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img
                              src="/icons/icon-arrow-down.svg"
                              style={{
                                width: '30px',
                                height: '30px',
                                transform: 'rotate(-90deg)', // pointing right
                                filter: isSelected ? 'invert(1)' : theme.invert
                              }}
                              alt="arrow"
                              draggable={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Columns 1+: Secondary Terms/Themes (look exactly like timeline cards: faded color bg, no icon, no stroke)
                  return (
                    <div
                      key={node.id}
                      id={`node-pill-${node.id}-${colIdx}`}
                      onMouseEnter={() => setHoveredTerm({ id: node.id, level: colIdx })}
                      onMouseLeave={() => setHoveredTerm(null)}
                      onClick={() => handleNodeClick(node, colIdx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '16px',
                        padding: '0 12px',
                        height: '32px',
                        boxSizing: 'border-box',
                        border: (selectedTermId === node.id)
                          ? `2px solid ${isMapDarkMode ? '#ffffff' : '#000000'}`
                          : '2px solid transparent',
                        background: (isSelected || isHovered)
                          ? nodeColor // Solid background on hover/selection
                          : `${nodeColor}a6`, // 65% opacity background by default (hex a6 is 65% opacity)
                        color: (isSelected || isHovered)
                          ? '#000000' // Black text on solid background color
                          : theme.text,
                        boxShadow: isSelected ? `0 0 8px ${nodeColor}44` : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                        position: 'relative',
                        zIndex: isSelected ? 15 : 5
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {node.subLabel === 'Possible Nephilim Bloodline' && (
                          <span 
                            title="Possible Nephilim Bloodline" 
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              lineHeight: '1',
                              fontWeight: '900',
                              color: isSelected || isHovered 
                                ? '#000000' 
                                : (isMapDarkMode ? '#ffffff' : '#000000'),
                              marginRight: '6px',
                              flexShrink: 0
                            }}
                          >
                            ✖
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: isSelected || isHovered ? 700 : 500,
                            fontFamily: '"Space Mono", monospace',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {node.name}
                        </span>

                      </div>

                      {/* Chevron indicators */}
                      {hasChildren && (
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            opacity: 0.6,
                            flexShrink: 0,
                            color: (isSelected || isHovered) ? '#000000' : theme.text,
                            marginLeft: '6px'
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )})}
        </AnimatePresence>

        {/* SVG anchor dots overlay (foreground dots) rendered on top of columns */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4000px',
            height: '3000px',
            pointerEvents: 'none',
            zIndex: 6
          }}
        >
          {lines.map(line => (
            <g key={`dots-${line.id}`}>
              {/* Source Circle Anchor */}
              <circle
                cx={line.x1}
                cy={line.y1}
                r="4"
                fill={theme.text}
              />

              {/* Target Circle Anchor */}
              <circle
                cx={line.x2}
                cy={line.y2}
                r="3"
                fill={theme.text}
              />
            </g>
          ))}
        </svg>
        </div>
      </div>
      </>)}

      {/* RIGHT SIDEBAR (desktop) / FULL-SCREEN TERM DOSSIER (mobile) */}
      <motion.div
        initial={false}
        animate={isMobile ? {
          x: isRightCollapsed ? '110%' : '0%',
          background: isMapDarkMode ? 'rgba(10, 10, 10, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: theme.border,
          opacity: 1
        } : {
          right: isRightCollapsed ? -280 : 20,
          background: isMapDarkMode ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.border,
          opacity: 1
        }}
        transition={{
          right: { type: 'spring', stiffness: 240, damping: 28 },
          x: { type: 'spring', stiffness: 320, damping: 34 },
          default: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
        }}
        style={isMobile ? {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 50,
          fontFamily: '"Space Mono", monospace',
          pointerEvents: 'auto',
          color: theme.text,
          backdropFilter: 'blur(8px)'
        } : {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '300px',
          borderLeft: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          zIndex: 15,
          fontFamily: '"Space Mono", monospace',
          pointerEvents: 'auto',
          color: theme.text,
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* MOBILE: back-to-list bar for the term dossier */}
        {isMobile && (
          <button
            onClick={() => setIsRightCollapsed(true)}
            style={{ flexShrink: 0, height: '40px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', background: theme.bg, border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.12em', cursor: 'pointer' }}
          >
            ‹ BACK TO INDEX
          </button>
        )}
        {/* ABSOLUTE POSITIONED FIXED TAB FOR RIGHT SIDEBAR */}
        <motion.button
          whileHover={{ opacity: 0.8 }}
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          title={isRightCollapsed ? "Maximize Dossier" : "Minimize Dossier"}
          style={{
            display: isMobile ? 'none' : 'flex',
            position: 'absolute',
            top: '-1px',
            left: '-20px',
            width: '20px',
            height: '41px',
            background: theme.text,
            color: theme.bg,
            border: 'none',
            cursor: 'pointer',
            zIndex: 25,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        >
          <img 
            src="/icons/icon-arrow-left.svg" 
            alt="toggle" 
            style={{ 
              width: '6px', 
              height: '12px', 
              transform: isRightCollapsed ? 'none' : 'rotate(180deg)',
              filter: theme.invert
            }} 
            draggable={false}
          />
        </motion.button>

        <AnimatePresence mode="wait">
          {activeTermNode ? (
            <motion.div 
              key={activeTermNode.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}
            >
              {/* Header Top Bar */}
              <div style={{ 
                height: '40px', 
                padding: '0 16px', 
                borderBottom: `1px solid ${theme.border}`, 
                display: 'flex', 
                alignItems: 'center', 
                background: theme.bg, 
                flexShrink: 0 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {(() => {
                    const rootCat = getRootCategory(activeTermNode);
                    return (
                      <>
                        <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={getNodeIcon(rootCat)} 
                            style={{ width: '30px', height: '30px' }} 
                            alt="category-icon" 
                            draggable={false}
                          />
                        </div>
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '11px', 
                          letterSpacing: '1px', 
                          fontFamily: '"Space Mono", monospace',
                          color: theme.text
                        }}>
                          {toTitleCase(rootCat.name)}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Scrollable details area */}
              <div 
                className="no-scrollbar" 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  overflowX: 'hidden', 
                  textAlign: 'left', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  paddingBottom: '40px' 
                }}
              >
                {/* Image Gallery at the very top (styled like map page dossier) */}
                {activeAssets && activeAssets.length > 0 && (
                  <div style={{ width: '100%', position: 'relative', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
                    <div 
                      style={{ 
                        width: '100%', 
                        height: '260px', 
                        backgroundColor: isMapDarkMode ? '#0a0a0a' : '#f0f0f0', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative'
                      }}
                    >
                      {(() => {
                        const curAsset = activeAssets[activeImageIndex];
                        if (!curAsset) return null;

                        const showPdfBadge = !!(curAsset.pdfUrl || curAsset.type === 'pdf');
                        const isBroken = !!(brokenImages[curAsset.url] || curAsset.url === MISSING_IMAGE_URL || curAsset.url?.includes('icon-missing-image.svg'));
                        const imgSrc = isBroken ? MISSING_IMAGE_URL : cleanAndProxyImageUrl(curAsset.url);

                        return (
                          <>
                            {isImageLoading && curAsset.type === 'image' && !curAsset.pdfUrl && (
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                                <div className="loading-spinner" />
                              </div>
                            )}

                            {curAsset.type === 'pdf' ? (
                              <div 
                                onClick={() => setIsLightboxOpen(true)}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  position: 'relative', 
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isMapDarkMode ? '#141414' : '#fafafa',
                                  border: `1px solid ${theme.border}`
                                }}
                              >
                                {/* Background Paper Mockup */}
                                <div style={{
                                  width: '130px',
                                  height: '180px',
                                  backgroundColor: isMapDarkMode ? '#1e1e1e' : '#ffffff',
                                  border: `1px solid ${isMapDarkMode ? '#333333' : '#e0e0e0'}`,
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                                  padding: '16px 12px',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between'
                                }}>
                                  {/* Styled typewriter horizontal lines to mimic official records */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ height: '6px', width: '80%', backgroundColor: isMapDarkMode ? '#3a3a3a' : '#d2d2d2' }} />
                                    <div style={{ height: '6px', width: '50%', backgroundColor: isMapDarkMode ? '#3a3a3a' : '#eaeaea' }} />
                                    {/* Redacted text block */}
                                    <div style={{ height: '6px', width: '90%', backgroundColor: isMapDarkMode ? '#ffffff' : '#000000' }} />
                                    <div style={{ height: '6px', width: '35%', backgroundColor: isMapDarkMode ? '#3a3a3a' : '#d2d2d2' }} />
                                    <div style={{ height: '6px', width: '70%', backgroundColor: isMapDarkMode ? '#ffffff' : '#000000' }} />
                                  </div>

                                  {/* Diagonal Classified Stamp */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '45%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%) rotate(-25deg)',
                                    border: '2px double #ef4444',
                                    color: '#ef4444',
                                    padding: '1px 6px',
                                    fontFamily: '"Space Mono", monospace',
                                    fontSize: '7px',
                                    fontWeight: 'bold',
                                    zIndex: 1,
                                    letterSpacing: '1px',
                                    borderRadius: '2px',
                                    opacity: 0.85,
                                    textTransform: 'uppercase'
                                  }}>
                                    DECLASSIFIED
                                  </div>

                                  {/* Lower border line */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ height: '2px', width: '100%', backgroundColor: isMapDarkMode ? '#333333' : '#eaeaea' }} />
                                    <div style={{ fontSize: '6px', color: theme.textDim, fontFamily: '"Space Mono", monospace', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                      RECORD DOSSIER
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : curAsset.type === 'video' ? (
                              <div 
                                onClick={() => setIsLightboxOpen(true)}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  position: 'relative', 
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div style={{ width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', position: 'relative' }}>
                                  {(curAsset.url.includes('youtube.com') || 
                                   curAsset.url.includes('youtu.be') || 
                                   curAsset.url.includes('dvidshub.net/video/')) ? (
                                    <iframe
                                      src={curAsset.url.includes('dvidshub.net/video/') ? getEmbedUrl(curAsset.url) : `${getEmbedUrl(curAsset.url)}?autoplay=0&controls=0&mute=1`}
                                      style={curAsset.url.includes('dvidshub.net/video/') ? {
                                        border: 'none',
                                        position: 'absolute',
                                        top: 0,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '165%',
                                        height: '190%'
                                      } : { 
                                        border: 'none', 
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '180%', 
                                        height: '180%'
                                      }}
                                      title="Video asset viewport"
                                    />
                                  ) : (
                                    (() => {
                                      const videoSrc = curAsset.url.startsWith('http')
                                        ? `/api/proxy-resource?url=${encodeURIComponent(curAsset.url)}`
                                        : curAsset.url;
                                      const mimeType = curAsset.url.toLowerCase().endsWith('.webm') ? 'video/webm' : curAsset.url.toLowerCase().endsWith('.ogv') ? 'video/ogg' : 'video/mp4';
                                      return (
                                        <video
                                          key={videoSrc}
                                          muted
                                          playsInline
                                          preload="metadata"
                                          referrerPolicy="no-referrer"
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        >
                                          <source src={videoSrc} type={mimeType} />
                                        </video>
                                      );
                                    })()
                                  )}
                                </div>
                                
                                {/* Play overlay */}
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 1
                                }}>
                                  <motion.div
                                    whileHover={{ scale: 1.15, backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                                    whileTap={{ scale: 0.92 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    style={{
                                      width: '56px',
                                      height: '56px',
                                      borderRadius: '50%',
                                      background: 'rgba(0, 0, 0, 0.70)',
                                      border: `1px solid ${theme.border || 'rgba(255,255,255,0.45)'}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                      color: '#ffffff'
                                    }}
                                  >
                                    <Play size={20} fill="currentColor" style={{ marginLeft: '3px' }} />
                                  </motion.div>
                                </div>
                              </div>
                            ) : curAsset.type === 'audio' ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: isMapDarkMode ? '#030303' : '#f9f9f9', gap: '20px', padding: '24px' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isMapDarkMode ? '#222' : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: theme.text }}>
                                    <path d="M9 18V5l12-2v13"></path>
                                    <circle cx="6" cy="18" r="3"></circle>
                                    <circle cx="18" cy="16" r="3"></circle>
                                  </svg>
                                </div>
                                <audio 
                                  src={curAsset.url} 
                                  controls 
                                  style={{ width: '100%', height: '40px' }} 
                                />
                                <p style={{ color: theme.textDim, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Audio Intelligence Intercept</p>
                              </div>
                            ) : (
                              <motion.img 
                                key={`${activeTermNode.id}-${activeImageIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: isImageLoading ? 0 : 1 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => setIsLightboxOpen(true)}
                                src={imgSrc} 
                                alt={`${activeTermNode.name} asset viewport`} 
                                referrerPolicy="no-referrer"
                                onLoad={() => setIsImageLoading(false)}
                                onError={() => {
                                  setIsImageLoading(false);
                                  if (curAsset.url) {
                                    setBrokenImages(prev => ({ ...prev, [curAsset.url]: true }));
                                  }
                                }}
                                style={{ 
                                  width: isBroken ? '48px' : '100%', 
                                  height: isBroken ? '48px' : '100%', 
                                  objectFit: isBroken ? 'contain' : 'cover',                     
                                  backgroundColor: 'transparent',           
                                  filter: isBroken ? (isMapDarkMode ? 'invert(1)' : 'none') : 'none',
                                  cursor: 'pointer'
                                }}
                              />
                            )}
                          </>
                        );
                      })()}
                      
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '4px', 
                        left: '4px', right: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        zIndex: 2,
                        pointerEvents: 'none'
                      }}>
                        <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-start', pointerEvents: 'auto' }}>
                          {activeAssets.length > 1 && (
                            <>
                              <motion.button 
                                whileHover={{ opacity: 0.7 }}
                                onClick={handlePrevImage} 
                                style={{ 
                                  background: theme.bg, 
                                  border: `1px solid ${theme.border}`, 
                                  borderRadius: '50%', 
                                  width: '30px', 
                                  height: '30px', 
                                  cursor: 'pointer', 
                                  padding: '0',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  boxShadow: 'none',
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <img 
                                  src="/icons/icon-arrow-left.svg" 
                                  style={{ width: '6px', height: '12px', filter: isMapDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)' }} 
                                  alt="prev" 
                                />
                              </motion.button>
                              <motion.button 
                                whileHover={{ opacity: 0.7 }}
                                onClick={handleNextImage} 
                                style={{ 
                                  background: theme.bg, 
                                  border: `1px solid ${theme.border}`, 
                                  borderRadius: '50%', 
                                  width: '30px', 
                                  height: '30px', 
                                  cursor: 'pointer', 
                                  padding: '0',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  boxShadow: 'none',
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <img 
                                  src="/icons/icon-arrow-left.svg" 
                                  style={{ width: '6px', height: '12px', transform: 'rotate(180deg)', filter: isMapDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)' }} 
                                  alt="next" 
                                />
                              </motion.button>
                            </>
                          )}
                        </div>

                        {activeAssets.length > 1 && (
                          <div style={{ display: 'flex', flex: 1, justifyContent: 'center', pointerEvents: 'auto' }}>
                            <div style={{ 
                              background: 'rgba(0, 0, 0, 0.65)', 
                              backdropFilter: 'blur(2px)',
                              color: '#ffffff', 
                              fontSize: '11px', 
                              fontFamily: '"Space Mono", monospace',
                              fontWeight: '700',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 16px', 
                              borderRadius: '15px', 
                              letterSpacing: '0.5px',
                              textAlign: 'center',
                              whiteSpace: 'nowrap'
                            }}>
                              {activeImageIndex + 1}/{activeAssets.length}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', pointerEvents: 'auto' }}>
                          <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: isMapDarkMode ? '#222' : '#f0f0f0' }}
                            onClick={() => setIsLightboxOpen(true)} 
                            title="Expand image to Fullscreen Lightbox"
                            style={{ 
                              background: theme.bg, 
                              border: `1px solid ${theme.border}`, 
                              borderRadius: '50%', 
                              width: '30px', 
                              height: '30px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              boxShadow: 'none',
                              padding: 0,
                              fontFamily: '"Space Mono", monospace',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <img src="/icons/icon-expand.svg" style={{ width: '30px', height: '30px', filter: theme.invert }} alt="expand" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rest of the details content padded beneath the image gallery */}
                <div 
                  style={{ 
                    padding: '24px', 
                    textAlign: 'left',
                    flex: 1
                  }}
                >
                  {/* Title */}
                  <h1 style={{ 
                    fontFamily: '"Space Mono", monospace',
                    fontWeight: '400', 
                    fontSize: '32px', 
                    lineHeight: '36px',
                    color: theme.text, 
                    margin: '0 0 8px 0', 
                    textAlign: 'left', 
                    letterSpacing: '-0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>

                    {activeTermNode.subLabel === 'Possible Nephilim Bloodline' && (
                      <span style={{
                        marginRight: '12px',
                        fontWeight: 900,
                        fontSize: '44px',
                        lineHeight: 1,
                        WebkitTextStroke: '3px currentColor',
                        flexShrink: 0
                      }}>✖</span>
                    )}
                    {activeTermNode.name}
                  </h1>

                  {/* SubLabel */}
                  {activeTermNode.subLabel && (
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: isMapDarkMode ? '#ff5c5c' : '#b31b1b',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                      fontFamily: '"Space Mono", monospace'
                    }}>
                      [{activeTermNode.subLabel}]
                    </div>
                  )}

                  {/* Cross-references — the SVG threads from the desktop board as tappable chips (mobile) */}
                  {isMobile && activeTermNode.relatedIds && activeTermNode.relatedIds.length > 0 && (() => {
                    const related = activeTermNode.relatedIds
                      .map(rid => nodes.find(n => n.id === rid))
                      .filter((n): n is TermNode => !!n);
                    if (related.length === 0) return null;
                    return (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '9px', letterSpacing: '0.18em', color: theme.textDim, marginBottom: '8px', fontFamily: '"Space Mono", monospace' }}>
                          CROSS-REFERENCES [{related.length}]
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {related.map(rel => (
                            <button
                              key={rel.id}
                              onClick={() => setSelectedPath(buildPathToNode(rel.id))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                color: theme.text,
                                border: `1px solid ${activeRootColor}`,
                                padding: '6px 10px',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontFamily: '"Space Mono", monospace',
                                letterSpacing: '0.04em',
                                textAlign: 'left',
                              }}
                            >
                              {rel.name} <span style={{ color: theme.textDim }}>▸</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions Row (Flag, View on Map, View on Timeline) */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {onFlagItem && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onFlagItem(activeTermNode)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'transparent',
                          color: isMapDarkMode ? '#fff' : '#000',
                          border: `1px solid ${isMapDarkMode ? '#fff' : '#000'}`,
                          padding: '6px 12px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          fontFamily: '"Space Mono", monospace',
                          letterSpacing: '0.05em',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        title="Report inaccuracy / flag this term"
                      >
                        <Flag size={13} />
                        <span>FLAG</span>
                      </motion.button>
                    )}

                    {resolvedMapInfo && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onViewOnMap(resolvedMapInfo.layer, resolvedMapInfo.featureSearchTerm)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'transparent',
                          color: isMapDarkMode ? '#fff' : '#000',
                          border: `1px solid ${isMapDarkMode ? '#fff' : '#000'}`,
                          padding: '6px 12px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          fontFamily: '"Space Mono", monospace',
                          letterSpacing: '0.05em',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                          <line x1="9" y1="3" x2="9" y2="18"></line>
                          <line x1="15" y1="6" x2="15" y2="21"></line>
                        </svg>
                        <span>VIEW ON MAP</span>
                      </motion.button>
                    )}

                    {activeTermNode.timelineId && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onViewOnTimeline(activeTermNode.timelineId!)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'transparent',
                          color: isMapDarkMode ? '#fff' : '#000',
                          border: `1px solid ${isMapDarkMode ? '#fff' : '#000'}`,
                          padding: '6px 12px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          fontFamily: '"Space Mono", monospace',
                          letterSpacing: '0.05em',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>TIMELINE VIEW</span>
                      </motion.button>
                    )}
                  </div>

                  {/* Tag Pills (Category layer + Related terms) */}
                  {((activeTermNode.layer) || (activeTermNode.relatedIds && activeTermNode.relatedIds.length > 0)) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', justifyContent: 'flex-start' }}>
                      {/* Node's own Layer tag */}
                      {activeTermNode.layer && (
                        <button 
                          style={{ 
                            height: '24px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '10px', 
                            fontWeight: '400', 
                            padding: '0 12px', 
                            borderRadius: '12px', 
                            background: activeRootColor, 
                            border: 'none',
                            color: '#000000',
                            cursor: 'default',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: '"Space Mono", monospace'
                          }}
                        >
                          {activeTermNode.layer}
                        </button>
                      )}

                      {/* Related term tags */}
                      {activeTermNode.relatedIds?.map(relId => {
                        const relNode = nodes.find(t => t.id === relId);
                        if (!relNode) return null;
                        
                        // Prevent duplicate category tags
                        if (activeTermNode.layer && relNode.name.toLowerCase() === activeTermNode.layer.toLowerCase()) {
                          return null;
                        }

                        const relColor = getNodeColor(relNode);

                        return (
                          <button 
                            key={relId} 
                            onClick={() => {
                              const path = getPathToRoot(relId);
                              setSelectedPath(path);
                            }}
                            title={`Navigate to ${relNode.name}`}
                            style={{ 
                              height: '24px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '10px', 
                              fontWeight: '400', 
                              padding: '0 12px', 
                              borderRadius: '12px', 
                              background: relColor, 
                              border: 'none',
                              color: '#000000',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontFamily: '"Space Mono", monospace',
                              transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            {relNode.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                {/* Linguistic Translations */}
                {activeTermNode.translations && activeTermNode.translations.length > 0 && (
                  <div
                    style={{
                      border: `1px solid ${theme.borderLight}`,
                      borderRadius: '8px',
                      padding: '16px',
                      background: isMapDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      marginBottom: '24px'
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: '"Space Mono", monospace',
                        fontWeight: '700',
                        fontSize: '11px',
                        lineHeight: '22px',
                        textTransform: 'uppercase',
                        color: theme.text,
                        margin: '0 0 12px 0'
                      }}
                    >
                      Linguistic Roots
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeTermNode.translations.map((trans, tIdx) => (
                        <div
                          key={tIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            borderBottom: tIdx < activeTermNode.translations!.length - 1 ? `1px dashed ${theme.borderLight}` : 'none',
                            paddingBottom: tIdx < activeTermNode.translations!.length - 1 ? '12px' : '0'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '8.5px', fontWeight: 'bold', textTransform: 'uppercase', color: adjustColorForContrast(activeRootColor), letterSpacing: '0.5px' }}>
                              {trans.lang}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.text, fontFamily: '"Space Mono", monospace' }}>
                              {trans.translit}
                            </span>
                            <span style={{ fontSize: '10px', fontStyle: 'italic', color: theme.textDim }}>
                              "{trans.meaning}"
                            </span>
                          </div>
                          
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: theme.text,
                              fontFamily: trans.lang === 'Hebrew' ? 'serif' : '"Space Mono", monospace',
                              letterSpacing: '1px'
                            }}
                          >
                            {trans.original}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div style={{ paddingTop: '0', textAlign: 'left', marginBottom: '24px' }}>
                  <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px', textTransform: 'uppercase' }}>
                    DESCRIPTION:
                  </div>
                  <p style={{ 
                    fontFamily: '"Space Mono", monospace',
                    fontWeight: '400',
                    fontSize: '10px', 
                    lineHeight: '22px', 
                    color: theme.text,
                    marginTop: '4px', 
                    whiteSpace: 'pre-line', 
                    textAlign: 'left' 
                  }}>
                    {activeTermNode.description}
                  </p>
                </div>

                {/* Scripture references */}
                {activeTermNode.bibleVerses && activeTermNode.bibleVerses.length > 0 && (
                  <div 
                    style={{ 
                      marginTop: '24px', 
                      borderTop: `1px solid ${theme.borderLight || theme.border}`, 
                      paddingTop: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px',
                      marginBottom: '24px'
                    }}
                  >
                    <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px', textTransform: 'uppercase' }}>
                      SCRIPTURE REFERENCES:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {activeTermNode.bibleVerses.map((verse, vIdx) => {
                        const [quote, citation] = verse.split(' — ');
                        return (
                          <div
                            key={vIdx}
                            style={{
                              borderLeft: `2px solid ${activeRootColor}`,
                              paddingLeft: '12px',
                              paddingTop: '2px',
                              paddingBottom: '2px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontSize: '10px', fontStyle: 'italic', lineHeight: '1.5', color: theme.text }}>
                              "{quote}"
                            </span>
                            {citation && (() => {
                              const urlRegex = /(https?:\/\/[^\s\)]+)/g;
                              const match = citation.match(urlRegex);
                              if (match) {
                                const url = match[0];
                                const displayText = citation.replace(`(${url})`, '').trim();
                                return (
                                  <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: adjustColorForContrast(activeRootColor), letterSpacing: '0.5px' }}>
                                    — {displayText.toUpperCase()}{' '}
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: adjustColorForContrast(activeRootColor),
                                        textDecoration: 'underline',
                                        opacity: 0.85,
                                        marginLeft: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      [LINK]
                                    </a>
                                  </span>
                                );
                              }
                              return (
                                <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: adjustColorForContrast(activeRootColor), letterSpacing: '0.5px' }}>
                                  — {citation.toUpperCase()}
                                </span>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Sources & Ancient Texts */}
                {activeTermNode.sources && activeTermNode.sources.length > 0 && (
                  <div 
                    style={{ 
                      marginTop: '24px', 
                      borderTop: `1px solid ${theme.borderLight || theme.border}`, 
                      paddingTop: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px',
                      marginBottom: '24px'
                    }}
                  >
                    <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px', textTransform: 'uppercase', color: theme.text }}>
                      PRIMARY SOURCES & ANCIENT TEXTS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {activeTermNode.sources.map((source, sIdx) => {
                        const rootColor = activeRootColor;
                        return (
                          <div
                            key={sIdx}
                            style={{
                              fontFamily: '"Space Mono", monospace',
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: `${rootColor}15`,
                              border: `1px solid ${rootColor}30`,
                              color: adjustColorForContrast(rootColor),
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {source.trim().toUpperCase() === 'CANONICAL SCRIPTURE' ? 'BIBLE' : source.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legend explanation for Apocryphal tag */}
                {isOnlyApocryphal(activeTermNode) && (
                  <div 
                    style={{ 
                      marginTop: '24px',
                      borderTop: `1px solid ${theme.borderLight || theme.border}`,
                      paddingTop: '20px',
                      marginBottom: '24px'
                    }}
                  >
                    <div 
                      style={{ 
                        padding: '12px',
                        border: `1px solid ${isMapDarkMode ? 'rgba(255, 92, 92, 0.4)' : 'rgba(179, 27, 27, 0.4)'}`,
                        borderRadius: '8px',
                        background: isMapDarkMode ? 'rgba(255, 92, 92, 0.04)' : 'rgba(255, 92, 92, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            lineHeight: '1',
                            fontWeight: '900',
                            color: isMapDarkMode ? '#ff5c5c' : '#b31b1b',
                            fontFamily: '"Space Mono", monospace',
                          }}
                        >
                          ✖
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: '"Space Mono", monospace', color: isMapDarkMode ? '#ff5c5c' : '#b31b1b' }}>
                          APOCRYPHAL INDICATOR
                        </span>
                      </div>
                      <p style={{ fontSize: '8.5px', lineHeight: '1.4', color: isMapDarkMode ? '#ffb3b3' : '#801c1c', margin: 0, fontFamily: '"Space Mono", monospace' }}>
                        Represents apocryphal, non-canonical, or mythological entries outside of canonical scripture.
                      </p>
                    </div>
                  </div>
                )}

                {/* Legend explanation for Nephilim Bloodline tag */}
                {activeTermNode.subLabel === 'Possible Nephilim Bloodline' && (
                  <div 
                    style={{ 
                      marginTop: '24px',
                      borderTop: `1px solid ${theme.borderLight || theme.border}`,
                      paddingTop: '20px',
                      marginBottom: '24px'
                    }}
                  >
                    <div 
                      style={{ 
                        padding: '12px',
                        border: `1px solid ${isMapDarkMode ? 'rgba(255, 92, 92, 0.4)' : 'rgba(179, 27, 27, 0.4)'}`,
                        borderRadius: '8px',
                        background: isMapDarkMode ? 'rgba(255, 92, 92, 0.04)' : 'rgba(255, 92, 92, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            lineHeight: '1',
                            fontWeight: '900',
                            color: isMapDarkMode ? '#ff5c5c' : '#b31b1b',
                            fontFamily: '"Space Mono", monospace',
                          }}
                        >
                          ✖
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: '"Space Mono", monospace', color: isMapDarkMode ? '#ff5c5c' : '#b31b1b' }}>
                          NEPHILIM BLOODLINE INDICATOR
                        </span>
                      </div>
                      <p style={{ fontSize: '8.5px', lineHeight: '1.4', color: isMapDarkMode ? '#ffb3b3' : '#801c1c', margin: 0, fontFamily: '"Space Mono", monospace' }}>
                        Represents a people group historically associated with or suspected of carrying Nephilim giant lineage.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textDim, fontSize: '10px', fontFamily: '"Space Mono", monospace', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '24px', textAlign: 'center' }}>
              SELECT A TERM TO REVIEW DETAILS & TIES
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* FIXED RIGHT EDGE MASK BAR */}
      <motion.div 
        initial={false}
        animate={{ 
          background: isMapDarkMode ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.border
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          bottom: 0, 
          width: '20px', 
          borderLeft: `1px solid ${theme.border}`, 
          zIndex: 100, 
          pointerEvents: 'auto',
          backdropFilter: 'blur(8px)'
        }} 
      />

      {/* FULL SCREEN LIGHTBOX MODAL ARCHITECTURE */}
      <AnimatePresence>
        {isLightboxOpen && activeTermNode && activeAssets && activeAssets.length > 0 && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsLightboxOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out', fontFamily: '"Space Mono", monospace' }}
          >
            <motion.button 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ opacity: 0.7 }}
              onClick={() => setIsLightboxOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Space Mono", monospace', letterSpacing: '1px', zIndex: 10001, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src="/icons/icon-x.svg" style={{ width: '24px', height: '24px', filter: 'invert(1)' }} alt="close" />
              CLOSE
            </motion.button>
  
            <div 
              style={{ 
                position: 'relative', 
                width: '100%', 
                height: '100%', 
                padding: '64px', 
                boxSizing: 'border-box',
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center' 
              }} 
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const curAsset = activeAssets[activeImageIndex];
                if (!curAsset) return null;

                const isPdf = !!(curAsset.type === 'pdf' || curAsset.pdfUrl);
                const actualPdfUrl = curAsset.pdfUrl || (curAsset.type === 'pdf' ? curAsset.url : undefined);
                const isBroken = !!(brokenImages[curAsset.url] || curAsset.url === MISSING_IMAGE_URL || curAsset.url?.includes('icon-missing-image.svg'));
                const imgSrc = isBroken ? MISSING_IMAGE_URL : cleanAndProxyImageUrl(curAsset.url);

                return (
                  <>
                    {isLightboxImageLoading && curAsset.type === 'image' && !curAsset.pdfUrl && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <div className="loading-spinner" style={{ borderTopColor: '#ffffff' }} />
                      </div>
                    )}
        
                    <AnimatePresence mode="wait">
                      {isPdf && actualPdfUrl ? (
                        <motion.div
                          key={`lightbox-pdf-${activeTermNode.id}-${activeImageIndex}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{ width: '90%', height: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
                        >
                          <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', background: '#fff' }}>
                            <iframe
                              srcDoc={getPdfViewerSrcDoc(actualPdfUrl)}
                              style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                              title="Declassified Document Archive"
                            />
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', color: '#fff', pointerEvents: 'none' }}>
                              If dossier fails to display, use "OPEN SOURCE FILE" below
                            </div>
                          </div>
                        </motion.div>
                      ) : curAsset.type === 'video' ? (
                        <motion.div
                          key={`lightbox-video-${activeTermNode.id}-${activeImageIndex}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{ 
                            width: 'min(80vw, calc((100vh - 220px) * 16 / 9))',
                            height: 'min(calc(100vh - 220px), calc(80vw * 9 / 16))',
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 220px)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {(curAsset.url.includes('youtube.com') || 
                            curAsset.url.includes('youtu.be') || 
                            curAsset.url.includes('dvidshub.net/video/')) ? (
                            <iframe
                              src={getEmbedUrl(curAsset.url)}
                              style={{ 
                                width: '100%', 
                                height: curAsset.url.includes('dvidshub.net/video/') ? '110%' : '100%', 
                                border: 'none', 
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                position: 'absolute',
                                top: 0,
                                left: 0
                              }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="High resolution dossier archive asset"
                            />
                          ) : (
                            (() => {
                              const videoSrc = curAsset.url.startsWith('http')
                                ? `/api/proxy-resource?url=${encodeURIComponent(curAsset.url)}`
                                : curAsset.url;
                              const mimeType = curAsset.url.toLowerCase().endsWith('.webm') ? 'video/webm' : curAsset.url.toLowerCase().endsWith('.ogv') ? 'video/ogg' : 'video/mp4';
                              return (
                                <video
                                  controls
                                  autoPlay
                                  referrerPolicy="no-referrer"
                                  style={{ width: '100%', height: '100%', outline: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                                >
                                  <source src={videoSrc} type={mimeType} />
                                  Your browser does not support the video tag.
                                </video>
                              );
                            })()
                          )}
                        </motion.div>
                      ) : curAsset.type === 'audio' ? (
                        <motion.div
                          key={`lightbox-audio-${activeTermNode.id}-${activeImageIndex}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{ width: '80%', height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', gap: '32px', padding: '48px' }}
                        >
                          <div style={{ width: '128px', height: '128px', borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
                              <path d="M9 18V5l12-2v13"></path>
                              <circle cx="6" cy="18" r="3"></circle>
                              <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                          </div>
                          <audio 
                            src={curAsset.url} 
                            controls 
                            autoPlay
                            style={{ width: '100%', maxWidth: '600px', height: '54px' }} 
                          />
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ color: '#ffffff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '8px' }}>AUDIO INTELLIGENCE INTERCEPT</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{activeTermNode.name} - DIRECT SIGNAL CAPTURE</p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.img 
                          key={`${activeTermNode.id}-${activeImageIndex}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: isLightboxImageLoading ? 0 : 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          src={imgSrc} 
                          alt="High resolution dossier archive asset" 
                          referrerPolicy="no-referrer"
                          onLoad={() => setIsLightboxImageLoading(false)}
                          onError={() => {
                            setIsLightboxImageLoading(false);
                            if (curAsset.url) {
                              setBrokenImages(prev => ({ ...prev, [curAsset.url]: true }));
                            }
                          }}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain', 
                            margin: 'auto',
                            backgroundColor: 'transparent',
                            width: isBroken ? '96px' : 'auto',
                            height: isBroken ? '96px' : 'auto',
                            filter: isBroken ? 'invert(1)' : 'none'
                          }}
                        />
                      )}
                    </AnimatePresence>
        
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{ 
                          margin: '24px 0 0 0',
                          color: '#ffffff', 
                          fontSize: '11px', 
                          fontFamily: '"Space Mono", monospace', 
                          whiteSpace: 'nowrap', 
                          backgroundColor: 'rgba(0,0,0,0.6)', 
                          padding: '6px 16px', 
                          borderRadius: '20px', 
                          letterSpacing: '0.5px',
                          textAlign: 'center',
                          zIndex: 10001
                        }}>
                        FILE ASSET {activeImageIndex + 1} OF {activeAssets.length} — {activeTermNode.name.toUpperCase()}
                      </motion.div>
        
                      {isPdf && actualPdfUrl && (
                        <a 
                          href={actualPdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            border: '1px solid #ffffff',
                            padding: '12px 24px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            letterSpacing: '1.5px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            zIndex: 10002,
                            textTransform: 'uppercase'
                          }}
                        >
                          <img src="/icons/icon-expand.svg" style={{ width: '18px', height: '18px', filter: 'invert(1)' }} alt="open" />
                          OPEN FULL PDF IN NEW TAB
                        </a>
                      )}
                    </div>
                  </>
                );
              })()}
  
              {activeAssets.length > 1 && (
                <>
                  <motion.button 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    whileHover={{ scale: 1.1, backgroundColor: '#ffffff' }}
                    onClick={handlePrevImage} 
                    style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', background: '#000000', border: '1px solid #ffffff', borderRadius: '50%', width: '64px', height: '64px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10002, transition: 'background-color 0.2s ease' }}
                  >
                    <img src="/icons/icon-arrow-left.svg" style={{ width: '12px', height: '24px' }} alt="prev" className="lightbox-nav-icon" />
                  </motion.button>
                  <motion.button 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    whileHover={{ scale: 1.1, backgroundColor: '#ffffff' }}
                    onClick={handleNextImage} 
                    style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', background: '#000000', border: '1px solid #ffffff', borderRadius: '50%', width: '64px', height: '64px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10002, transition: 'background-color 0.2s ease' }}
                  >
                    <img src="/icons/icon-arrow-left.svg" style={{ width: '12px', height: '24px', transform: 'rotate(180deg)' }} alt="next" className="lightbox-nav-icon" />
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
