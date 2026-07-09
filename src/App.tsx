// Mapping The Rabbit Hole App Component
import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate } from 'motion/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, Heart, Play, Upload, Plus, Link, MapPin, Lock, Check, Trash2, ShieldAlert, ChevronDown, Shield, Eye, EyeOff, Shuffle, Flag, AlertTriangle, Instagram, ExternalLink, RotateCcw } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, onSnapshot, serverTimestamp, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
// @ts-ignore
import firebaseConfig from '../firebase-applet-config.json';

import MobileTabBar from './mobile/MobileTabBar';
import { useBackGesture } from './mobile/useBackGesture';

// Code-split the Timeline and Codex pages: they mount on first visit (then stay
// warm), so their code stays out of the critical-path bundle for the map.
const TimelinePage = lazy(() => import('./TimelinePage'));
const CodexPage = lazy(() => import('./CodexPage'));
import { TIMELINE_ITEMS, TIMELINE_LOCATIONS, BIBLICAL_TRAVEL_PATHS, Waypoint, TravelPath } from './timelineData';
// import { ARCHAEOLOGICAL_FINDS_DATA } from './archaeologyData';
import { TERM_TREE_DATA } from './termTreeData';
// import { MISSING_411_DATA } from './missing411Data';
// import { CAVES_DATA } from './cavesData';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

// Initialize Analytics conditionally if a Measurement ID exists
if (firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
      console.log("Firebase Analytics initialized successfully.");
    }
  });
}

// Heavy datasets will be loaded dynamically on demand
const ARCHAEOLOGICAL_FINDS_DATA: any[] = [];
const MISSING_411_DATA: any[] = [];
const CAVES_DATA: any[] = [];
const ALIEN_ABDUCTION_DATA: any[] = [];
const CATTLE_MUTILATION_DATA: any[] = [];
const rawPointsAndLinesData: any[] = [];
const ufoData1: any[] = [];
const ufoData2: any[] = [];
const warGovData: any[] = [];
const warGovData2: any[] = [];
const warGovData3: any[] = [];
const brazilianUfoData: any[] = [];

const getSafeData = (data: any) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.default)) return data.default;
  return [];
};

const realUfoData = [
  ...getSafeData(ufoData1),
  ...getSafeData(ufoData2),
  ...getSafeData(warGovData),
  ...getSafeData(warGovData2),
  ...getSafeData(warGovData3),
  ...getSafeData(brazilianUfoData)
];

mapboxgl.accessToken = 'pk.eyJ1Ijoibm9ydGhiZWFzdCIsImEiOiJjbXAyNnBhMGowMTFoMnFwenRnNWZvOWc5In0.PpOOemte4Ub9PVLfGsUS1g'; 

const isValidLngLat = (lng: any, lat: any) => {
  return (
    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 &&
    typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
  );
};

// ERROR HANDLER
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // No auth used here as per user request
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Enochian Sites': 'Geographical locations, portals of descent, and prisons of the fallen Watchers as detailed in the Book of Enoch.',
  'Giants & Nephilim': 'Newspaper articles about finding the bones of ancient biblical giants, horned humanoids, cyclops and more.',
  'Biblical Figures': 'Geographical tracking and historical sites associated with biblical patriarchs, prophets, and key lineage figures.',
  'Biblical Events': 'Key geographical milestones and historical events from biblical history, including the Exodus, the Fall of Jericho, and the Crucifixion.',
  'UFOs - Sightings': 'Reports of unidentified flying objects and UAP encounters across the globe.',
  'UFOs - War.gov': 'Official declassified records, sensor videos, and multimedia releases from government archives documenting unidentified aerial phenomena.',
  'UFOs - Brazillian Archives': 'Declassified Brazilian military documents, reports, and drawings detailing unexplained aerial phenomena and entity encounters compiled from official archives.',
  'D.U.M.B.\'s': 'Deep Underground Military Bases and mysterious subterranean government facilities.',
  'Cryptid Sightings': 'Encounters with legendary creatures whose existence has yet to be scientifically proven.',
  'Giants': 'Historical and archaeological accounts of unusually large skeletal remains.',
  'Megaliths / Structures': 'Colossal stone circles, dolmens, standing stones, and ancient temples of unknown origin.',

  'Rock Art & Cave Paintings': 'Ancient rock carvings, petroglyphs, and cave paintings depicting entities, celestial events, or forgotten symbols.',
  'Ancient Texts': 'Lost manuscripts, carvings, and inscriptions carrying forbidden or forgotten knowledge.',
  'Bigfoot Sightings': 'Tracking the elusive Sasquatch through forests and wilderness sightings.',
  'Blurred on Google Maps': 'Locations deliberately obscured or censored by satellite imaging providers.',
  'Burial Mounds': 'Ancient earthworks and ceremonial mounds marking the resting places of unknown civilizations.',
  'Dolmans': 'Mysterious single-chamber megalithic tombs consisting of massive upright stones.',
  'Underworld Entrances': 'Purported Entrances to the Underworld from lore, legends, and modern times.',
  'Ghosts & Hauntings': 'Areas reported to have high levels of paranormal activity and spectral apparitions.',
  'National Parks & Reserves': 'The intersection of vast wilderness and unexplained disappearances.',
  'Missing 411': 'Mysterious disappearances of people in national parks and wilderness areas documented by David Paulides.',
  'Cave Systems': 'USGS documented locations of caves, caverns, grottos, and sinkholes.',
  'Alien Abductions': 'Documentation of major reported extraterrestrial abduction cases and close encounters.',
  'Cattle Mutilations': 'Reports of unexplained livestock deaths characterized by bloodless surgical-like tissue removal and a lack of tracks.',
  'Crop Circles': 'Intricate patterns appearing in fields, often appearing overnight with no clear earthly explanation.',
  'Meteor Impact Craters': 'Confirmed impact structures on Earth created by ancient meteorite collisions, marking catastrophic cosmic encounters throughout geological history.',
  'Archaeological Finds': 'Remarkable historical excavations, lost citadels, and ancient artifacts rewriting human origin timelines.',
  'Biblical Discoveries': 'Archaeological discoveries, inscriptions, and sacred sanctuaries validating accounts from biblical history.',
  'Ancient People Groups': 'Ancient Mesoamerican civilizations, Native American tribes, and lost people groups of antiquity.'
};

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

const isPdfUrl = (url: string) => {
  if (!url) return false;
  const lowerUrl = url.trim().toLowerCase();
  return lowerUrl.includes('.pdf') || 
         lowerUrl.includes('docs.google.com/viewer') || 
         (lowerUrl.includes('web.archive.org') && lowerUrl.includes('/https://') && lowerUrl.split('https://')[1]?.includes('.pdf'));
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
  if (trimmed.includes('dvidshub.net/image/')) {
    // If it's a DVIDS image page, we might want the thumbnail but it's complex
    // For now, let it be handled by proxy if it's a direct image link
    return trimmed;
  }

  return trimmed;
};

const isAudioUrl = (url: string) => {
  if (!url) return false;
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'];
  const lowerUrl = url.trim().toLowerCase();
  return audioExtensions.some(ext => lowerUrl.includes(ext));
};

const MISSING_IMAGE_URL = '/icons/icon-missing-image.svg';

const cleanAndProxyImageUrl = (url: any) => {
  if (!url || typeof url !== 'string') return MISSING_IMAGE_URL;
  
  const trimmedUrl = url.trim();
  if (trimmedUrl.includes('icon-missing-image.svg')) return MISSING_IMAGE_URL;
  
  // If already proxied, or is a blob/data URL, don't proxy again
  if (
    trimmedUrl.startsWith('/api/proxy') || 
    trimmedUrl.startsWith('data:') || 
    trimmedUrl.startsWith('blob:')
  ) {
    return trimmedUrl;
  }

  // Do NOT proxy videos, PDFs, or audio as images
  if (isVideoUrl(trimmedUrl) || isPdfUrl(trimmedUrl) || isAudioUrl(trimmedUrl)) {
    return trimmedUrl;
  }

  // Bypass proxy for domains that block server-side IPs (like Wikipedia/Wikimedia 403s/429s on Cloud Run)
  // or that already fully support highly reliable direct client-side loading (like Unsplash/Wonders of the world).
  const lowerUrl = trimmedUrl.toLowerCase();
  
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  );

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

  // Route everything through our local server proxy, which is highly reliable,
  // bypasses SameSite cookie limitations, and avoids rate limiting of public proxies.
  if (trimmedUrl.startsWith('http')) {
    return `/api/proxy-resource?url=${encodeURIComponent(trimmedUrl)}`;
  }

  return trimmedUrl;
};

const processIncomingRecord = (item: any, index: number) => {
  const safeId = item.id || `rec-id-${index}-${Date.now()}`;
  
  let safeDate: number | null = null;
  if (item.date !== undefined && item.date !== null && item.date !== '') {
    const parsedYear = parseInt(item.date, 10);
    if (!isNaN(parsedYear)) safeDate = parsedYear;
  }

  let safeCoords: any = null;
  if (Array.isArray(item.coordinates)) {
    if (item.type === 'LineString') {
      safeCoords = item.coordinates.map((c: any) => {
        if (Array.isArray(c)) return [parseFloat(c[0]), parseFloat(c[1])];
        return [parseFloat(c.lng || c.lon), parseFloat(c.lat)];
      }).filter((c: any) => isValidLngLat(c[0], c[1]));
    } else if (item.coordinates.length === 2) {
      const lng = parseFloat(item.coordinates[0]);
      const lat = parseFloat(item.coordinates[1]);
      if (isValidLngLat(lng, lat)) safeCoords = [lng, lat];
    }
  } else if (item.coordinates && typeof item.coordinates === 'object') {
    const lng = parseFloat(item.coordinates.lng || item.coordinates.lon);
    const lat = parseFloat(item.coordinates.lat);
    if (isValidLngLat(lng, lat)) safeCoords = [lng, lat];
  }

  if (!safeCoords || (item.type === 'LineString' && safeCoords.length === 0)) return null; 

  const safeName = item.name ? String(item.name).trim() : "Unidentified Coordinate";
  const rawCategory = item.category ? String(item.category).trim() : "Uncategorized Anomalies";
  const safeDescription = item.description || item.comments || "";
  const safeSource = item.source ? String(item.source).trim() : null;
  
  const rawImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
  const filteredImages = rawImages.filter(Boolean); // Keep raw URLs in state
  let safeImages = [...filteredImages].sort((a, b) => {
    const aIsVideo = isVideoUrl(a);
    const bIsVideo = isVideoUrl(b);
    if (aIsVideo && !bIsVideo) return -1;
    if (!aIsVideo && bIsVideo) return 1;
    return 0;
  });

  const displayDescription = safeDescription.trim() || "No further diagnostic descriptive intelligence available in active log sheets.";
  const lowerCat = rawCategory.toLowerCase();
  let normalizedCategory = rawCategory;
  if (lowerCat.includes('cave system') || lowerCat === 'cave systems') normalizedCategory = 'Cave Systems';
  else if (lowerCat.includes('alien abduction') || lowerCat.includes('abduction')) normalizedCategory = 'Alien Abductions';
  else if (lowerCat.includes('cattle mutilation') || lowerCat.includes('livestock mutilation') || lowerCat.includes('mutilation')) normalizedCategory = 'Cattle Mutilations';
  else if (lowerCat.includes('enochian') || lowerCat.includes('watcher') || lowerCat.includes('angel') || lowerCat === 'enochian sites') normalizedCategory = 'Enochian Sites';
  else if (lowerCat.includes('bigfoot') || lowerCat.includes('sasquatch')) normalizedCategory = 'Bigfoot Sightings';
  else if (lowerCat.includes('giant') || lowerCat.includes('nephilim') || lowerCat.includes('giants')) normalizedCategory = 'Giants & Nephilim';
  else if (lowerCat.includes('brazilian') || lowerCat === 'brazilian ufo archives' || lowerCat.includes('brazillian')) normalizedCategory = 'UFOs - Brazillian Archives';
  else if (lowerCat.includes('war.gov') || lowerCat.includes('aaro') || lowerCat.includes('official release') || lowerCat.includes('declassified')) normalizedCategory = 'UFOs - War.gov';
  else if (lowerCat.includes('ufo') || lowerCat.includes('uap')) normalizedCategory = 'UFOs - Sightings';
  else if (lowerCat.includes('ley') || lowerCat.includes('ley-line') || lowerCat === 'ley lines') normalizedCategory = 'Ley Lines';
  else if (lowerCat.includes('cryptid')) normalizedCategory = 'Cryptid Sightings';
  else if (lowerCat.includes('entrance') || lowerCat.includes('underworld')) normalizedCategory = 'Underworld Entrances';
  else if (lowerCat.includes('ancient people') || lowerCat.includes('people group')) normalizedCategory = 'Ancient People Groups';
  else if (lowerCat.includes('ancient') || lowerCat.includes('text')) normalizedCategory = 'Ancient Texts';
  else if (lowerCat.includes('burial') || lowerCat.includes('mound')) normalizedCategory = 'Burial Mounds';
  else if (lowerCat.includes('cave') || lowerCat.includes('drawing')) normalizedCategory = 'Rock Art & Cave Paintings';
  else if (lowerCat.includes('megaliths / dolmans / petroglyphs / geoglyphs')) {
    const descLower = displayDescription.toLowerCase();
    const nameLower = safeName.toLowerCase();
    if (descLower.includes('petroglyph') || descLower.includes('rock art') || nameLower.includes('rock art') || nameLower.includes('petroglyph') || descLower.includes('cave painting') || descLower.includes('cave art')) {
      normalizedCategory = 'Rock Art & Cave Paintings';
    } else {
      normalizedCategory = 'Megaliths / Structures';
    }
  }
  else if (lowerCat.includes('petroglyph') || lowerCat.includes('rock art')) normalizedCategory = 'Rock Art & Cave Paintings';
  else if (lowerCat.includes('geoglyph') || lowerCat.includes('earthwork')) normalizedCategory = 'Megaliths / Structures';
  else if (lowerCat.includes('crop') || lowerCat.includes('circle')) normalizedCategory = 'Crop Circles';
  else if (lowerCat.includes('megalith')) normalizedCategory = 'Megaliths / Structures';
  else if (lowerCat.includes('dumb') || lowerCat.includes('d.u.m.b')) normalizedCategory = 'D.U.M.B.\'s';
  else if (lowerCat.includes('ghost') || lowerCat.includes('haunt')) normalizedCategory = 'Ghosts & Hauntings';
  else if (lowerCat.includes('national park') || lowerCat.includes('reserve')) normalizedCategory = 'National Parks & Reserves';
  else if (lowerCat.includes('missing 411') || lowerCat === 'missing 411') normalizedCategory = 'Missing 411';
  else if (lowerCat.includes('blurred')) normalizedCategory = 'Blurred on Google Maps';
  else if (lowerCat.includes('meteor') || lowerCat.includes('crater') || lowerCat.includes('impact structure')) normalizedCategory = 'Meteor Impact Craters';
  else if (lowerCat.includes('archaeological') || lowerCat.includes('archaeology')) normalizedCategory = 'Archaeological Finds';
  else if (lowerCat.includes('biblical find') || lowerCat.includes('biblical discover') || lowerCat === 'biblical finds' || lowerCat === 'biblical discoveries') normalizedCategory = 'Biblical Discoveries';
  else if (lowerCat.includes('government program') || lowerCat.includes('secret government') || lowerCat.includes('classified program')) normalizedCategory = 'Secret Government Programs';
  else if (lowerCat.includes('alchemy') || lowerCat.includes('occult') || lowerCat.includes('hermeticism') || lowerCat.includes('thelema')) normalizedCategory = 'The Occult';

  // Smart imagery injection for map points lacking media (megaliths, underworld entrances, national parks, mounds)
  // ONLY use high-quality location-specific historical/documentary assets for actual landmarks.
  // DO NOT use generic category-wide backgrounds/placers or fallbacks when no specific photo is matched.
  if (safeImages.length === 0) {
    const lowerName = safeName.toLowerCase();
    const lowerNormalizedCat = normalizedCategory.toLowerCase();
    
    if (lowerNormalizedCat === 'megaliths & ancient monuments') {
      if (lowerName.includes('pyramid of giza') || lowerName.includes('great pyramid')) {
        safeImages = ['https://www.wonders-of-the-world.net/Pyramids-of-Egypt/images/Description/Gizeh/Pyramides-de-Gizeh-7.jpg'];
      } else if (lowerName.includes('sphinx')) {
        safeImages = ['https://www.wonders-of-the-world.net/Pyramids-of-Egypt/images/Description/Sphinx/Sphinx-2.jpg'];
      } else if (lowerName.includes('göbekli') || lowerName.includes('gobekli')) {
        safeImages = ['https://ferrerysaret.com/wp-content/uploads/2026/01/GobekliTepe_turquia-2.jpg'];
      } else if (lowerName.includes('moai') || lowerName.includes('easter island')) {
        safeImages = ['https://www.wonders-of-the-world.net/Statues-of-Easter-island/images/Vignettes/Photos/Statues-de-l-ile-de-Paques-004-V.jpg'];
      } else if (lowerName.includes('evergreen')) {
        safeImages = ['https://www.montanamegaliths.com/uploads/6/9/2/9/69295147/evergreen-dolmen-tane-talalotu_orig.jpg'];
      } else if (lowerName.includes('tizer')) {
        safeImages = ['https://www.montanamegaliths.com/uploads/6/9/2/9/69295147/andrew-barker-tizer-best_orig.jpg'];
      } else if (lowerName.includes('dolman') || lowerName.includes('dolmen')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/5/52/Poulnabrone_dolmen%2C_Ireland_-_Aug_2009.jpg'];
      }
    } else if (lowerNormalizedCat === 'geoglyphs & earthworks') {
      if (lowerName.includes('nazca')) {
        safeImages = [
          'https://youtu.be/t0vEngqpk84?si=TdyO-_NxCj9CqnFl',
          'https://www.machutravelperu.com/blog/wp-content/uploads/2018/03/how-were-nazca-lines-made.jpg'
        ];
      } else if (lowerName.includes('uffington')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/4/48/Uffington-White-Horse-sat.jpg'];
      } else if (lowerName.includes('candelabro') || lowerName.includes('candelabra')) {
        safeImages = ['https://paracasbluetours.com/wp-content/uploads/2026/01/el-candelabro-paracas-noche-estrellas-misterio.webp'];
      } else if (lowerName.includes('blythe')) {
        safeImages = ['https://www.ancientartarchive.org/wp-content/uploads/ALV200217009325_Blythe_Geoglyph-scaled.jpg'];
      } else if (lowerName.includes('steppe')) {
        safeImages = ['https://i0.wp.com/beforeatlantis.com/wp-content/uploads/2020/08/ushtogaiskiisquareaerial-1.jpg?fit=1200%2C458&ssl=1'];
      }
    } else if (lowerNormalizedCat === 'rock art & cave paintings') {
      if (lowerName.includes('ferganchick')) {
        safeImages = ['https://www.historycolorado.org/sites/default/files/media/images/2018/5dt355.jpg'];
      }
    } else if (lowerNormalizedCat === 'underworld entrances') {
      if (lowerName.includes('darvaza') || lowerName.includes('door to hell')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/9/91/Darvasa_gas_crater_panorama_crop.jpg'];
      } else if (lowerName.includes('hekla')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/e/ec/Hekla_from_southWest_under_snow.jpg'];
      } else if (lowerName.includes('osore')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/9/90/Mount_Osore_lake.jpg'];
      } else if (lowerName.includes('cave of hades') || lowerName.includes('gates of hades') || lowerName.includes('matapan') || lowerName.includes('tainaron')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/0/07/The_cave_of_Hades_on_Cape_Matapan.jpg'];
      } else if (lowerName.includes('actun tunichil') || lowerName.includes('xibalba')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/2/2e/Actun_Tunichil_Muknal_Entrance.jpg'];
      } else if (lowerName.includes('mitla') || lowerName.includes('mictlan')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/4/42/Mitla_Tombs.jpg'];
      } else if (lowerName.includes('ghost city') || lowerName.includes('fengdu') || lowerName.includes('guimen')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/5/5d/FengduGhostCityChina.jpg'];
      }
    } else if (lowerNormalizedCat === 'burial mounds') {
      if (lowerName.includes('serpent')) {
        safeImages = ['https://upload.wikimedia.org/wikipedia/commons/e/e0/Serpentmound_topview.jpg'];
      }
    } else if (lowerNormalizedCat === 'enochian sites') {
      if (lowerName.includes('hermon')) {
        safeImages = [
          'https://upload.wikimedia.org/wikipedia/commons/8/86/Paradise_Lost_1.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/3/33/The_lake_of_Tiberias,_looking_towards_Hermon._David_Roberts._1855.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/1/13/Mount_Hermon_View.jpg'
        ];
      } else if (lowerName.includes('dudael')) {
        safeImages = [
          'https://upload.wikimedia.org/wikipedia/commons/9/97/William_Holman_Hunt_-_The_Scapegoat.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/b/bb/JudeanDesert.jpg'
        ];
      } else if (lowerName.includes('sheol') || lowerName.includes('hinnom') || lowerName.includes('gehenna')) {
        safeImages = [
          'https://upload.wikimedia.org/wikipedia/commons/f/f2/Thomas_Seddon_-_Jerusalem_and_the_Valley_of_Jehoshaphat_from_the_Hill_of_Evil_Counsel_-_Google_Art_Project.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/9/91/Suburbs_of_Jerusalem_seen_from_the_Valley_of_Gehenna_-_Cootwijck_Johannes_Van_-_1619.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/7/71/Jerusalem-Hinnom-Kidron-Old-City-323.jpg'
        ];
      } else if (lowerName.includes('bashan') || lowerName.includes('golan') || lowerName.includes('og')) {
        safeImages = [
          'https://upload.wikimedia.org/wikipedia/commons/c/c8/The_Sae_of_Tiberias%2C_looking_towards_Bashan._David_Roberts._1855.jpg',
          'https://upload.wikimedia.org/wikipedia/commons/a/ac/Golan_Heights_-_Gamla_view.jpg'
        ];
      }
    }
  }

  const tagsSet = new Set([normalizedCategory]);

  return {
    ...item,
    id: safeId,
    name: safeName,
    categories: Array.from(tagsSet),
    category: normalizedCategory,
    description: displayDescription,
    date: safeDate,
    coordinates: safeCoords,
    source: safeSource,
    images: safeImages,
    type: item.type === 'LineString' ? 'LineString' : 'Point'
  };
};

const LAYER_CONFIG: Record<string, { color: string; icon: string }> = {
  'UFOs - War.gov': { color: '#FF9BE1', icon: '/icons/icon-ufo-wargov.svg' },
  'UFOs - Brazillian Archives': { color: '#B297FF', icon: '/icons/icon-ufo-brazilian.svg' },
  'Enochian Sites': { color: '#FF9F63', icon: '/icons/icon-enochian-lore.svg' },
  'Giants & Nephilim': { color: '#ECCE81', icon: '/icons/icon-giants.svg' },
  'Biblical Figures': { color: '#90C2FF', icon: '/icons/icon-biblical-bloodlines.svg' },
  'Religion': { color: '#90C2FF', icon: '/icons/icon-religion.svg' },
  'Masonic Lodges': { color: '#ECCE81', icon: '/icons/icon-alchemy-occult.svg' },
  'Hadron Colliders': { color: '#BAEAF4', icon: '/icons/icon-portals.svg' },
  'Myths / Legends': { color: '#FFF96A', icon: '/icons/icon-greek-mythology.svg' },
  'Biblical Events': { color: '#91FFC4', icon: '/icons/icon-biblical-bloodlines-1.svg' },
  'UFOs - Sightings': { color: '#C2FFBD', icon: '/icons/icon-ufo-sightings.svg' },
  'Bigfoot Sightings': { color: '#C6986D', icon: '/icons/icon-bigfoot-sightings.svg' },
  'Cryptid Sightings': { color: '#AFFFEC', icon: '/icons/icon-cryptid-sightings.svg' },
  'Underworld Entrances': { color: '#D3C5FB', icon: '/icons/icon-entrances-to-underworld.svg' },
  'Ancient Texts': { color: '#F6E8C1', icon: '/icons/icon-ancient-texts.svg' },
  'Burial Mounds': { color: '#B3C77B', icon: '/icons/icon-burial-mounds.svg' },
  'Cave Systems': { color: '#B9BDAD', icon: '/icons/icon-caves.svg' },
  'Alien Abductions': { color: '#C0F06E', icon: '/icons/icon-alien.svg' },
  'Cattle Mutilations': { color: '#D59CF1', icon: '/icons/icon-cow.svg' },
  'Crop Circles': { color: '#FFF96A', icon: '/icons/icon-crop-circles.svg' },
  'D.U.M.B.\'s': { color: '#BAEAF4', icon: '/icons/icon-dumbs.svg' },
  'Ghosts & Hauntings': { color: '#BDC4FF', icon: '/icons/icon-ghosts.svg' },
  'Megaliths / Structures': { color: '#FFFBA6', icon: '/icons/icon-megaliths.svg' },

  'Rock Art & Cave Paintings': { color: '#FFCBA6', icon: '/icons/icon-petroglyphs.svg' },
  'National Parks & Reserves': { color: '#9FF3BC', icon: '/icons/icon-national-parks-reserves.svg' },
  'Missing 411': { color: '#CBDF8E', icon: '/icons/icon-missing-411.svg' },
  'Blurred on Google Maps': { color: '#BDC4FF', icon: '/icons/icon-blurred-on-google.svg' },
  'Meteor Impact Craters': { color: '#FF9F63', icon: '/icons/icon-meteors.svg' },
  'Ley Lines': { color: '#FF5E97', icon: '/icons/icon-ley-lines.svg' },
  'Archaeological Finds': { color: '#74F8F3', icon: '/icons/icon-archaeological-finds.svg' },
  'Biblical Discoveries': { color: '#D49459', icon: '/icons/icon-biblical-discoveries.svg' },
  'Secret Government Programs': { color: '#FF5C5C', icon: '/icons/icon-secret-government-programs.svg' },
  'NASA / Space': { color: '#BACEF4', icon: '/icons/icon-nasa.svg' },
  'The Occult': { color: '#59DCB7', icon: '/icons/icon-alchemy-occult.svg' },
  'Ancient People Groups': { color: '#BCA7C7', icon: '/icons/icon-people-groups.svg' },
  'Default': { color: '#b6a6ff', icon: '/icons/icon-map-pin.svg' }
};

const matchParkName = (featName: string, targetName: string) => {
  if (!featName || !targetName) return false;
  const cleanFeat = featName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('nationalparkandpreserve', '')
    .replace('nationalparkreserve', '')
    .replace('nationalparksreserves', '')
    .replace('nationalpark', '')
    .replace('nationalreserve', '')
    .replace('nationalpreserve', '')
    .replace('nationalmonument', '');
  const cleanTarget = targetName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('nationalparkandpreserve', '')
    .replace('nationalparkreserve', '')
    .replace('nationalparksreserves', '')
    .replace('nationalpark', '')
    .replace('nationalreserve', '')
    .replace('nationalpreserve', '')
    .replace('nationalmonument', '');
  return cleanFeat.includes(cleanTarget) || cleanTarget.includes(cleanFeat);
};

const getMatchScore = (featName: string, targetName: string) => {
  if (!featName || !targetName) return 0;
  const cleanFeat = featName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('nationalparkandpreserve', '')
    .replace('nationalparkreserve', '')
    .replace('nationalparksreserves', '')
    .replace('nationalpark', '')
    .replace('nationalreserve', '')
    .replace('nationalpreserve', '')
    .replace('nationalmonument', '');
  const cleanTarget = targetName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('nationalparkandpreserve', '')
    .replace('nationalparkreserve', '')
    .replace('nationalparksreserves', '')
    .replace('nationalpark', '')
    .replace('nationalreserve', '')
    .replace('nationalpreserve', '')
    .replace('nationalmonument', '');

  if (cleanFeat === cleanTarget) {
    return 100;
  }

  const featHasWilderness = featName.toLowerCase().includes('wilderness');
  const targetHasWilderness = targetName.toLowerCase().includes('wilderness');
  if (featHasWilderness !== targetHasWilderness) {
    return 10;
  }

  if (cleanFeat.includes(cleanTarget) || cleanTarget.includes(cleanFeat)) {
    return 50;
  }

  return 0;
};

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const bgMapContainer = useRef<HTMLDivElement>(null);
  const bgMapRef = useRef<mapboxgl.Map | null>(null);

  const lineLayersRef = useRef<string[]>([]);
  const selectedParkGeomRef = useRef<Record<string, { precise: boolean; score: number; features: any[] }>>({});
  const activeTravelPopupRef = useRef<mapboxgl.Popup | null>(null);
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const hoverTimeoutRef = useRef<any>(null);
  const hoveredFeatureIdRef = useRef<string | null>(null);
  const combinedDataRef = useRef<any[]>([]);
  const hasRandomizedRef = useRef(false);

  const fadeOutPopup = (popup: mapboxgl.Popup | null) => {
    if (!popup) return;
    const el = popup.getElement();
    if (el) {
      el.style.transition = 'opacity 0.15s ease, transform 0.15s ease-out';
      el.style.opacity = '0';
      const currentTransform = el.style.transform || '';
      el.style.transform = `${currentTransform} scale(0.92) translateY(6px)`;
      setTimeout(() => {
        try {
          popup.remove();
        } catch (err) {
          // already removed or unmounted
        }
      }, 150);
    } else {
      popup.remove();
    }
  };

  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [pointsAndLinesData, setPointsAndLinesData] = useState<any[]>([]);
  const [rabbitHoleData, setRabbitHoleData] = useState<any[]>([]);
  const [ufoData, setUfoData] = useState<any[]>([]);
  // Tracks which UFO dataset chunks have been (or are being) loaded so each
  // layer only pulls its own files, and never twice.
  const loadedUfoChunksRef = useRef<Set<string>>(new Set());
  const [archaeologyData, setArchaeologyData] = useState<any[]>([]);
  const [missing411Data, setMissing411Data] = useState<any[]>([]);
  const [cavesData, setCavesData] = useState<any[]>([]);
  const [alienAbductionData, setAlienAbductionData] = useState<any[]>([]);
  const [cattleMutilationData, setCattleMutilationData] = useState<any[]>([]);
  const [savedPasscode, setSavedPasscode] = useState('');
  const [approvedSubmissions, setApprovedSubmissions] = useState<any[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isDataCompiled, setIsDataCompiled] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(true);
  const [currentPage, setCurrentPage] = useState<'map' | 'timeline' | 'codex'>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/timeline')) return 'timeline';
    if (path.startsWith('/codex')) return 'codex';
    return 'map';
  });
  // Mount Timeline/Codex on first visit, then keep them warm — pairs with the
  // React.lazy imports so neither page's chunk loads until it's actually opened.
  const [mountedPages, setMountedPages] = useState<{ timeline: boolean; codex: boolean }>(() => {
    const path = window.location.pathname.toLowerCase();
    return {
      timeline: path.startsWith('/timeline'),
      codex: path.startsWith('/codex'),
    };
  });
  useEffect(() => {
    if (currentPage === 'timeline' || currentPage === 'codex') {
      setMountedPages(prev => (prev[currentPage] ? prev : { ...prev, [currentPage]: true }));
    }
  }, [currentPage]);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<any | null>(null);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number | null>(null);

  const isLayerLoading = (layerName: string): boolean => {
    if (!activeLayers[layerName]) return false;

    if (layerName === 'Cave Systems') {
      return cavesData.length === 0;
    }
    if (layerName === 'Alien Abductions') {
      return alienAbductionData.length === 0;
    }
    if (layerName === 'Cattle Mutilations') {
      return cattleMutilationData.length === 0;
    }
    if (layerName === 'Missing 411') {
      return missing411Data.length === 0;
    }
    if (layerName === 'Archaeological Finds' || layerName === 'Biblical Discoveries') {
      return archaeologyData.length === 0;
    }
    if (
      layerName === 'UFOs - War.gov' ||
      layerName === 'UFOs - Brazillian Archives' ||
      layerName === 'UFOs - Sightings' ||
      layerName === 'Secret Government Programs'
    ) {
      return ufoData.length === 0;
    }

    return rabbitHoleData.length === 0;
  };
  const getModeratorHeadersAndBody = async (bodyObj: any = {}) => {
    const headers: any = { 'Content-Type': 'application/json' };
    const body: any = { ...bodyObj };
    
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        console.error("Error getting ID token:", e);
      }
    } else if (savedPasscode) {
      body.passcode = savedPasscode;
      headers['Authorization'] = savedPasscode;
    } else if (moderatorPasscode) {
      body.passcode = moderatorPasscode;
      headers['Authorization'] = moderatorPasscode;
    }
    return { headers, body: JSON.stringify(body) };
  };

  const handleBypassAuth = async () => {
    try {
      setModeratorError(null);
      const response = await fetch('/api/moderate/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: moderatorPasscode })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server status ${response.status}`);
      }

      setSavedPasscode(moderatorPasscode);
      setIsModeratorAuthenticated(true);
      setModeratorPasscode('');
    } catch (err: any) {
      console.error("Passcode auth fail:", err);
      setModeratorError(err.message || "BYPASS CODE DENIED.");
    }
  };


  const combinedPointsAndLinesData = useMemo(() => {
    const approvedMapSubmissions = approvedSubmissions.filter(item => 
      !item.destinations || item.destinations.includes('map')
    );
    const combined = [...pointsAndLinesData, ...approvedMapSubmissions];
    const uniqueMap = new Map();
    combined.forEach((item: any) => {
      if (item && item.id) {
        let mergedItem = { ...item };
        const override = overrides[String(item.id)];
        if (override) {
          mergedItem = {
            ...mergedItem,
            ...override
          };
          if (override.coordinates) {
            mergedItem.coordinates = override.coordinates;
          }
        }
        // Filter out point features without valid coordinates on the map view
        const isLineString = mergedItem.type === 'LineString';
        const hasValidCoords = Array.isArray(mergedItem.coordinates) && 
                              mergedItem.coordinates.length === 2 && 
                              isValidLngLat(mergedItem.coordinates[0], mergedItem.coordinates[1]);
        const hasLineCoords = isLineString && Array.isArray(mergedItem.coordinates) && mergedItem.coordinates.length > 0;

        if (hasValidCoords || hasLineCoords) {
          uniqueMap.set(String(mergedItem.id), mergedItem);
        }
      }
    });
    return Array.from(uniqueMap.values()) as any[];
  }, [pointsAndLinesData, approvedSubmissions, overrides]);

  combinedDataRef.current = combinedPointsAndLinesData;

  // Combine static Codex nodes and approved user Codex submissions
  const combinedCodexNodes = useMemo(() => {
    const approvedCodexSubmissions = approvedSubmissions.filter(item => 
      item.destinations && item.destinations.includes('codex')
    ).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      parentId: item.codexParentId || undefined,
      images: item.images || [],
      sources: item.source ? [item.source] : [],
      layer: item.category || undefined
    }));
    const rawNodes = [...TERM_TREE_DATA, ...approvedCodexSubmissions];
    return rawNodes.map((node: any) => {
      const override = overrides[String(node.id)];
      if (override) {
        return {
          ...node,
          ...override
        };
      }
      return node;
    });
  }, [approvedSubmissions, overrides]);

  // Combine static Timeline items and approved user Timeline submissions
  const combinedTimelineItems = useMemo(() => {
    const approvedTimelineSubmissions = approvedSubmissions.filter(item => 
      item.destinations && item.destinations.includes('timeline')
    ).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      start: Number(item.date) || 0,
      end: item.timelineEnd ? Number(item.timelineEnd) : undefined,
      type: item.timelineType || 'event',
      layer: item.timelineLayer || 'biblical-events',
      fatherId: item.timelineFatherId || undefined,
      motherId: item.timelineMotherId || undefined,
      spouseId: item.timelineSpouseId || undefined
    }));
    const rawItems = [...TIMELINE_ITEMS, ...approvedTimelineSubmissions];
    return rawItems.map((item: any) => {
      const override = overrides[String(item.id)];
      if (override) {
        return {
          ...item,
          ...override,
          start: override.start !== undefined ? Number(override.start) : (override.date !== undefined ? Number(override.date) : item.start),
          end: override.end !== undefined ? Number(override.end) : item.end
        };
      }
      return item;
    });
  }, [approvedSubmissions, overrides]);

  const uniqueCategories = useMemo(() => {
    const order = ['UFOs - War.gov', 'UFOs - Brazillian Archives', 'UFOs - Sightings', 'Secret Government Programs', 'Giants & Nephilim'];
    const allCategories = Object.keys(LAYER_CONFIG).filter(cat => cat !== 'Default');
    return allCategories.sort((a, b) => {
      const sA = String(a);
      const sB = String(b);
      const indexA = order.indexOf(sA);
      const indexB = order.indexOf(sB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return sA.localeCompare(sB);
    });
  }, []);

  const allIntelCategories = useMemo(() => {
    const cats = [
      ...uniqueCategories,
      'Religion',
      'Myths / Legends',
      'Megaliths / Structures',
      'Supernatural / Anomalies',
      'Secret Government Programs',
      'The Occult'
    ];
    return Array.from(new Set(cats));
  }, [uniqueCategories]);

  const layerColors = useMemo(() => {
    const assigned: Record<string, string> = {};
    uniqueCategories.forEach(category => {
      assigned[category] = LAYER_CONFIG[category]?.color || LAYER_CONFIG['Default'].color;
    });
    return assigned;
  }, [uniqueCategories]);

  const timeBounds = useMemo(() => {
    return { min: 0, max: 2050 };
  }, []);

  const globalMaxTimelineCount = useMemo(() => {
    const counts: Record<number, number> = {};
    combinedPointsAndLinesData.forEach(item => {
      if (item.date) {
        counts[item.date] = (counts[item.date] || 0) + 1;
      }
    });
    const values = Object.values(counts) as number[];
    return values.length > 0 ? Math.max(...values) : 1;
  }, [combinedPointsAndLinesData]);

  // Handle Mapbox Geocoding
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setGeocodeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5`
        );
        const data = await response.json();
        setGeocodeResults(data.features || []);
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleGeocodeSelect = (result: any) => {
    stopMainMapRotation();
    if (!mapRef.current) return;
    const [lng, lat] = result.center;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 12,
      duration: 2000,
      essential: true
    });
    setSearchQuery('');
    setGeocodeResults([]);
    setShowSearchResults(false);
  };

  const handleSearchItemSelect = (item: any) => {
    // Auto-enable the item's layer if it's currently toggled off
    if (item.categories && item.categories.length > 0) {
      setActiveLayers(prev => {
        const updated = { ...prev };
        item.categories.forEach((cat: string) => {
          if (updated[cat] === false) updated[cat] = true;
        });
        return updated;
      });
    }
    handleLocationItemClick(item);
    setSearchQuery('');
    setGeocodeResults([]);
    setShowSearchResults(false);
  };

  const [yearRange, setYearRange] = useState({ start: 0, end: 2050 });
  const [hasSeenTimelineHint, setHasSeenTimelineHint] = useState(false);
  const hasSeenTimelineHintRef = useRef(false); // ref for use inside setTimeout closures
  const [showTimelineHint, setShowTimelineHint] = useState(false);
  const [hintSource, setHintSource] = useState<'zoom' | 'left' | 'right'>('zoom');
  const [hintAnchor, setHintAnchor] = useState<{ x: number; y: number } | null>(null);
  const timelineHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHintRef = useRef<{ source: 'zoom' | 'left' | 'right'; x: number; y: number } | null>(null);
  const zoomSliderRef = useRef<HTMLInputElement>(null);
  const leftSliderRef = useRef<HTMLInputElement>(null);
  const rightSliderRef = useRef<HTMLInputElement>(null);
  const timelinePanelRef = useRef<HTMLDivElement>(null);
  const [timelineWindowStart, setTimelineWindowStart] = useState(0);
  const [timelineWindowSpan, setTimelineWindowSpan] = useState(2050);

  // Called on every slider onChange — debounces 400ms so tooltip appears at release position, not drag start
  const triggerTimelineHint = (source: 'zoom' | 'left' | 'right', ref: React.RefObject<HTMLInputElement>, thumbRatio?: number) => {
    if (hasSeenTimelineHintRef.current) return;

    // Always track latest position while dragging
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const x = thumbRatio !== undefined
        ? rect.left + thumbRatio * rect.width
        : rect.left + rect.width / 2;
      pendingHintRef.current = { source, x, y: rect.top };
    }

    // Reset debounce — fires 400ms after the last drag movement (i.e. on release)
    if (hintDebounceRef.current) clearTimeout(hintDebounceRef.current);
    hintDebounceRef.current = setTimeout(() => {
      if (hasSeenTimelineHintRef.current) return;
      const pending = pendingHintRef.current;
      if (!pending) return;
      hasSeenTimelineHintRef.current = true;
      setHasSeenTimelineHint(true);
      setHintSource(pending.source);
      setHintAnchor({ x: pending.x, y: pending.y });
      setShowTimelineHint(true);
      if (timelineHintTimerRef.current) clearTimeout(timelineHintTimerRef.current);
      timelineHintTimerRef.current = setTimeout(() => setShowTimelineHint(false), 12000);
    }, 400);
  };
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTimelineStart, setDragStartTimelineStart] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const selectedFeatureRef = useRef<any>(null);
  selectedFeatureRef.current = selectedFeature;
  const wasHoverTooltipVisibleRef = useRef(false);
  const [focusedCodexTermId, setFocusedCodexTermId] = useState<string | null>(null);

  // Helper to resolve map features to codex nodes
  const getCodexTermForMapFeature = (feature: any) => {
    if (!feature) return null;
    return combinedCodexNodes.find(node => 
      node.mapFeatureId === feature.id ||
      node.timelineId === feature.id ||
      node.id === feature.id ||
      (node.name && feature.name && node.name.toLowerCase() === feature.name.toLowerCase())
    );
  };


  // Dynamically compute active figures and their locations during a selected Biblical Event
  const activeFigures = useMemo(() => {
    if (!selectedFeature) return [];
    const selectedTimelineItem = combinedTimelineItems.find(t => String(t.id) === String(selectedFeature.id));
    if (!selectedTimelineItem || selectedTimelineItem.type !== 'event') return [];

    const eventYear = selectedTimelineItem.start;
    return combinedTimelineItems.filter(item => {
      return (
        item.type === 'lifespan' &&
        item.layer === 'biblical-patriarchs' &&
        item.start <= eventYear &&
        (item.end !== undefined && item.end >= eventYear)
      );
    }).map(fig => {
      // Calculate age at the time of the event
      const age = eventYear - fig.start;
      // Find their estimated location during this event
      let locationName = 'Unknown';
      let coords = null;
      
      const travelPath = BIBLICAL_TRAVEL_PATHS[fig.id];
      if (travelPath && travelPath.waypoints.length > 0) {
        // Find the last waypoint before or during the event year
        let bestWp = null;
        for (const wp of travelPath.waypoints) {
          if (wp.year !== undefined && wp.year <= eventYear) {
            bestWp = wp;
          }
        }
        if (bestWp) {
          locationName = bestWp.locationName;
          coords = [bestWp.lng, bestWp.lat];
        } else {
          // Fallback to first waypoint
          locationName = travelPath.waypoints[0].locationName;
          coords = [travelPath.waypoints[0].lng, travelPath.waypoints[0].lat];
        }
      } else {
        // Fallback to timeline data location
        const loc = TIMELINE_LOCATIONS[fig.id];
        if (loc) {
          locationName = loc.locationName;
          coords = [loc.lng, loc.lat];
        }
      }
      return {
        id: fig.id,
        name: fig.name,
        age,
        locationName,
        coords,
        timelineItem: fig
      };
    });
  }, [selectedFeature, layerColors]);

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  // Mobile layout gate — same threshold the old "Optimized for Desktop"
  // blocker used, now driving an adapted layout instead of a wall.
  const isMobile = windowWidth < 1024;
  // Side panels shrink to the viewport on phones; collapsed offset leaves the
  // 20px toggle tab visible. All values numeric so Motion can interpolate.
  const sidePanelWidth = isMobile ? Math.min(300, windowWidth - 40) : 300;
  const collapsedPanelOffset = -(sidePanelWidth - 20);
  // Everything bottom-anchored sits above the mobile tab bar.
  const tabBarOffset = isMobile ? 56 : 0;
  const [selectedCodexNode, setSelectedCodexNode] = useState<any>(null);

  // Submission Form State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isPinningOnMap, setIsPinningOnMap] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCategory, setSubCategory] = useState('UFOs - Sightings');
  const [subDescription, setSubDescription] = useState('');
  const [subDate, setSubDate] = useState('');
  const [subLatitude, setSubLatitude] = useState('');
  const [subLongitude, setSubLongitude] = useState('');
  const [subSource, setSubSource] = useState('');
  const [subMediaList, setSubMediaList] = useState<string[]>([]);
  const [subMediaInput, setSubMediaInput] = useState('');
  const [subMediaType, setSubMediaType] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Added States for Geocoding-Pinpoint & Custom Dropdown matching requirement 3 & 5
  const [subLocationSearch, setSubLocationSearch] = useState('');
  const [subGeocodeResults, setSubGeocodeResults] = useState<any[]>([]);
  const [isSubGeocoding, setIsSubGeocoding] = useState(false);
  const [subGeocodeMsg, setSubGeocodeMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // New Cross-Registry Submission Fields
  const [subDestinations, setSubDestinations] = useState<string[]>(['map']);
  const [subCodexParentId, setSubCodexParentId] = useState('');
  const [subTimelineLayer, setSubTimelineLayer] = useState('biblical-events');
  const [subTimelineType, setSubTimelineType] = useState<'event' | 'lifespan'>('event');
  const [subTimelineEnd, setSubTimelineEnd] = useState('');
  const [subTimelineFatherId, setSubTimelineFatherId] = useState('');
  const [subTimelineMotherId, setSubTimelineMotherId] = useState('');
  const [subTimelineSpouseId, setSubTimelineSpouseId] = useState('');
  const [subSubmitterName, setSubSubmitterName] = useState('');
  const [subSubmitterEmail, setSubSubmitterEmail] = useState('');

  // Onboarding Tour State
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);

  // Moderator State
  const [isModeratorOpen, setIsModeratorOpen] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/mod' || 
      path === '/moderator' || 
      path === '/moderate' || 
      path.endsWith('/mod') || 
      path.endsWith('/moderator') || 
      path.endsWith('/moderate') || 
      hash === '#/mod' || 
      hash === '#mod' || 
      hash === '#/moderator' || 
      hash === '#moderator' || 
      hash === '#/moderate' || 
      hash === '#moderate'
    );
  });
  const [moderatorPasscode, setModeratorPasscode] = useState('');
  const [isModeratorAuthenticated, setIsModeratorAuthenticated] = useState(false);
  const [moderatorError, setModeratorError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [submittingApprovalId, setSubmittingApprovalId] = useState<string | null>(null);
  const [submittingRejectionId, setSubmittingRejectionId] = useState<string | null>(null);
  const [moderatorReloadTrigger, setModeratorReloadTrigger] = useState(0);
  const [isModMinimized, setIsModMinimized] = useState(false);
  const [activeModTab, setActiveModTab] = useState<'pending' | 'approved' | 'reports'>('pending');
  const [submittingRevocationId, setSubmittingRevocationId] = useState<string | null>(null);

  // Inaccuracy Reporting States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportedFeature, setReportedFeature] = useState<any>(null);
  const [reportReason, setReportReason] = useState('Incorrect Coordinates / Location');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [submittingReportActionId, setSubmittingReportActionId] = useState<string | null>(null);

  // States for editing submissions
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);
  const [editMediaList, setEditMediaList] = useState<string[]>([]);
  const [editMediaInput, setEditMediaInput] = useState('');
  const [editMediaType, setEditMediaType] = useState<'url' | 'upload'>('url');
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [editLocationSearch, setEditLocationSearch] = useState('');
  const [editGeocodeResults, setEditGeocodeResults] = useState<any[]>([]);
  const [isEditGeocoding, setIsEditGeocoding] = useState(false);
  const [editGeocodeMsg, setEditGeocodeMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // New Cross-Registry Editing Fields
  const [editDestinations, setEditDestinations] = useState<string[]>(['map']);
  const [editCodexParentId, setEditCodexParentId] = useState('');
  const [editTimelineId, setEditTimelineId] = useState('');
  const [editMapFeatureId, setEditMapFeatureId] = useState('');
  const [editTimelineLayer, setEditTimelineLayer] = useState('biblical-events');
  const [editTimelineType, setEditTimelineType] = useState<'event' | 'lifespan'>('event');
  const [editTimelineEnd, setEditTimelineEnd] = useState('');
  const [editTimelineFatherId, setEditTimelineFatherId] = useState('');
  const [editTimelineMotherId, setEditTimelineMotherId] = useState('');
  const [editTimelineSpouseId, setEditTimelineSpouseId] = useState('');

  const isPinningOnMapRef = useRef(false);
  useEffect(() => {
    isPinningOnMapRef.current = isPinningOnMap;
  }, [isPinningOnMap]);

  // Requirement 1: Listen to URL slug for opening Mod Desk Automatically
  useEffect(() => {
    const checkModUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const isModUrl = 
        path === '/mod' || 
        path === '/moderator' || 
        path === '/moderate' || 
        path.endsWith('/mod') || 
        path.endsWith('/moderator') || 
        path.endsWith('/moderate') || 
        hash === '#/mod' || 
        hash === '#mod' || 
        hash === '#/moderator' || 
        hash === '#moderator' || 
        hash === '#/moderate' || 
        hash === '#moderate';
      if (isModUrl) {
        setIsModeratorOpen(true);
        setIsModMinimized(false);
      }
    };
    checkModUrl();
    window.addEventListener('hashchange', checkModUrl);
    return () => window.removeEventListener('hashchange', checkModUrl);
  }, []);

  const handleStartEdit = (sub: any) => {
    setEditingSubId(sub.id);
    setEditName(sub.name || '');
    setEditCategory(sub.category || '');
    setEditDescription(sub.description || '');
    setEditDate(sub.date || '');
    setEditSource(sub.source || '');
    setEditLongitude(sub.coordinates?.[0]?.toString() || '');
    setEditLatitude(sub.coordinates?.[1]?.toString() || '');
    setEditDestinations(sub.destinations || ['map']);
    setEditCodexParentId(sub.codexParentId || '');
    setEditTimelineLayer(sub.timelineLayer || 'biblical-events');
    setEditTimelineType(sub.timelineType || 'event');
    setEditTimelineEnd(sub.timelineEnd || '');
    setEditTimelineFatherId(sub.timelineFatherId || '');
    setEditTimelineMotherId(sub.timelineMotherId || '');
    setEditTimelineSpouseId(sub.timelineSpouseId || '');
    setIsEditCategoryDropdownOpen(false);
    setEditMediaList(sub.images || []);
    setEditMediaInput('');
    setEditMediaType('url');
    setEditLocationSearch('');
    setEditGeocodeResults([]);
    setEditGeocodeMsg(null);
  };

  const handleSaveSubmissionEdit = async (docId: string) => {
    setIsSavingEdit(true);
    setModeratorError(null);
    try {
      const hasCoords = editLongitude.trim() !== '' || editLatitude.trim() !== '';
      let coordinatesValue: any = null;
      if (hasCoords) {
        const lngNum = parseFloat(editLongitude);
        const latNum = parseFloat(editLatitude);
        if (isNaN(lngNum) || isNaN(latNum)) {
          throw new Error("Invalid Longitude/Latitude coordinates format.");
        }
        if (!isValidLngLat(lngNum, latNum)) {
          throw new Error("Coordinates must be within standard bounds (Latitude: -90 to 90, Longitude: -180 to 180).");
        }
        coordinatesValue = [lngNum, latNum];
      }

      const updatedFields = {
        name: editName,
        category: editCategory,
        description: editDescription,
        date: editDate,
        source: editSource,
        coordinates: coordinatesValue,
        images: editMediaList,
        destinations: editDestinations,
        codexParentId: editDestinations.includes('codex') ? editCodexParentId : '',
        timelineLayer: editDestinations.includes('timeline') ? editTimelineLayer : '',
        timelineType: editDestinations.includes('timeline') ? editTimelineType : 'event',
        timelineEnd: (editDestinations.includes('timeline') && editTimelineType === 'lifespan') ? editTimelineEnd.trim() : '',
        timelineFatherId: (editDestinations.includes('timeline') && editTimelineType === 'lifespan') ? editTimelineFatherId : '',
        timelineMotherId: (editDestinations.includes('timeline') && editTimelineType === 'lifespan') ? editTimelineMotherId : '',
        timelineSpouseId: (editDestinations.includes('timeline') && editTimelineType === 'lifespan') ? editTimelineSpouseId : ''
      };

      const authParams = await getModeratorHeadersAndBody({ docId, updatedData: updatedFields });
      const response = await fetch('/api/moderate/update', {
        method: 'POST',
        headers: authParams.headers,
        body: authParams.body
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server status ${response.status}`);
      }

      try {
        await updateDoc(doc(db, 'submissions', docId), updatedFields);
      } catch (fbErr) {
        console.warn("Direct Firestore update skipped/failed:", fbErr);
      }

      setEditingSubId(null);
      setModeratorReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Failed to save submission edit:", err);
      setModeratorError(`Edit Failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUseMapCenterForEdit = () => {
    if (mapRef.current) {
      try {
        const center = mapRef.current.getCenter();
        if (center) {
          setEditLongitude(center.lng.toFixed(6));
          setEditLatitude(center.lat.toFixed(6));
        }
      } catch (err) {
        console.error("Error getting map center:", err);
      }
    }
  };

  const handleEditSearchGeocode = async () => {
    const queryStr = editLocationSearch.trim();
    if (!queryStr) return;
    setIsEditGeocoding(true);
    setEditGeocodeMsg(null);
    setEditGeocodeResults([]);
    try {
      let proximityStr = '';
      if (mapRef.current) {
        try {
          const center = mapRef.current.getCenter();
          if (center && typeof center.lng === 'number' && typeof center.lat === 'number') {
            proximityStr = `&proximity=${center.lng},${center.lat}`;
          }
        } catch (mapErr) {
          console.warn("Could not get map center for proximity bias:", mapErr);
        }
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryStr)}.json?access_token=${mapboxgl.accessToken}&limit=5${proximityStr}`
      );
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        setEditGeocodeResults(data.features);
        
        // Populate with the first match immediately as default
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        setEditLongitude(lng.toFixed(6));
        setEditLatitude(lat.toFixed(6));
        setEditGeocodeMsg({
          text: `RESOLVED: ${feature.place_name || feature.text} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          type: 'success'
        });
      } else {
        setEditGeocodeMsg({
          text: "STATION ERROR: LOCATION NOT FOUND.",
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error(err);
      setEditGeocodeMsg({
        text: `STATION ERROR: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setIsEditGeocoding(false);
    }
  };

  const renderEditForm = (sub: any) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', textAlign: 'left' }}>
        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>NAME *</label>
          <input 
            type="text" 
            value={editName} 
            onChange={(e) => setEditName(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '6px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace'
            }} 
          />
        </div>

        {/* DESTINATION REGISTRIES */}
        <div style={{ paddingTop: '12px' }}>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>DESTINATION REGISTRIES * (SELECT AT LEAST ONE)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '14px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '11px', 
              cursor: 'pointer', 
              color: theme.text,
              backgroundColor: editDestinations.includes('map') 
                ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
              border: `1px solid ${editDestinations.includes('map') ? theme.border : theme.borderLight}`,
              padding: '6px 14px',
              borderRadius: '20px',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={editDestinations.includes('map')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEditDestinations(prev => [...prev, 'map']);
                  } else {
                    setEditDestinations(prev => prev.filter(d => d !== 'map'));
                  }
                }}
                style={{ accentColor: theme.text }}
              />
              Interactive Map
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '11px', 
              cursor: 'pointer', 
              color: theme.text,
              backgroundColor: editDestinations.includes('codex') 
                ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
              border: `1px solid ${editDestinations.includes('codex') ? theme.border : theme.borderLight}`,
              padding: '6px 14px',
              borderRadius: '20px',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={editDestinations.includes('codex')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEditDestinations(prev => [...prev, 'codex']);
                  } else {
                    setEditDestinations(prev => prev.filter(d => d !== 'codex'));
                  }
                }}
                style={{ accentColor: theme.text }}
              />
              Codex
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '11px', 
              cursor: 'pointer', 
              color: theme.text,
              backgroundColor: editDestinations.includes('timeline') 
                ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
              border: `1px solid ${editDestinations.includes('timeline') ? theme.border : theme.borderLight}`,
              padding: '6px 14px',
              borderRadius: '20px',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={editDestinations.includes('timeline')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEditDestinations(prev => [...prev, 'timeline']);
                  } else {
                    setEditDestinations(prev => prev.filter(d => d !== 'timeline'));
                  }
                }}
                style={{ accentColor: theme.text }}
              />
              Timeline
            </label>
          </div>
        </div>

        {editDestinations.includes('map') && (
          <div style={{ display: 'flex', gap: '10px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>LAYER CATEGORY *</label>
              <select 
                value={editCategory} 
                onChange={(e) => setEditCategory(e.target.value)} 
                style={{
                  width: '100%', 
                  background: isMapDarkMode ? '#222' : '#fff', 
                  border: `1px solid ${theme.border}`, 
                  color: theme.text, 
                  padding: '6px 10px', 
                  fontSize: '11px',
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} style={{ background: isMapDarkMode ? '#0d0d0d' : '#fff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>YEAR / DATE</label>
              <input 
                type="text" 
                value={editDate} 
                onChange={(e) => setEditDate(e.target.value)} 
                style={{
                  width: '100%', 
                  background: isMapDarkMode ? '#222' : '#fff', 
                  border: `1px solid ${theme.border}`, 
                  color: theme.text, 
                  padding: '6px 10px', 
                  fontSize: '11px',
                  fontFamily: '"Space Mono", monospace',
                  height: '30px',
                  boxSizing: 'border-box'
                }} 
              />
            </div>
          </div>
        )}

         {editDestinations.includes('codex') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '10px' }}>
            <div>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>PARENT CODEX TERM</label>
              <select
                value={editCodexParentId}
                onChange={(e) => setEditCodexParentId(e.target.value)}
                style={{
                  width: '100%',
                  background: isMapDarkMode ? '#222' : '#fff',
                  border: `1px solid ${theme.border}`,
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: theme.text,
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }}
              >
                <option value="">None (Root Category)</option>
                {[...combinedCodexNodes]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(node => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
        )}

        {editDestinations.includes('timeline') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>TIMELINE LAYER / ERA *</label>
                <select
                  value={editTimelineLayer}
                  onChange={(e) => setEditTimelineLayer(e.target.value)}
                  style={{
                    width: '100%',
                    background: isMapDarkMode ? '#222' : '#fff',
                    border: `1px solid ${theme.border}`,
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme.text,
                    fontFamily: '"Space Mono", monospace',
                    height: '30px'
                  }}
                >
                  <option value="biblical-patriarchs">Biblical Bloodlines</option>
                  <option value="biblical-events">Biblical Events</option>
                  <option value="future-prophecy">Biblical Prophecy</option>
                  <option value="enochian-lore">Enochian Lore</option>
                  <option value="sumerian-kings">Sumerian Kings List</option>
                  <option value="greek-mythology">Greek Mythology</option>
                  <option value="merovingian-bloodlines">Merovingian Bloodlines</option>
                  <option value="royal-bloodlines">Royal Bloodlines</option>
                  <option value="illuminati-bloodlines">13 Illuminati Bloodlines</option>
                  <option value="black-nobility">13 Black Nobility Families</option>
                  <option value="secret-gov-programs">Secret Government Programs</option>
                  <option value="nasa-space">NASA / Space</option>
                  <option value="ancient-civilizations">Ancient People Groups</option>
                  <option value="alchemy-occult">The Occult</option>
                </select>
              </div>

              <div style={{ width: '120px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>ENTRY TYPE</label>
                <select
                  value={editTimelineType}
                  onChange={(e) => setEditTimelineType(e.target.value as 'event' | 'lifespan')}
                  style={{
                    width: '100%',
                    background: isMapDarkMode ? '#222' : '#fff',
                    border: `1px solid ${theme.border}`,
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme.text,
                    fontFamily: '"Space Mono", monospace',
                    height: '30px'
                  }}
                >
                  <option value="event">Event</option>
                  <option value="lifespan">Lifespan</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>
                  {editTimelineType === 'lifespan' ? 'YEAR OF BIRTH (START) *' : 'YEAR OF OCCURRENCE *'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. -1948 or 1350"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: isMapDarkMode ? '#222' : '#fff',
                    border: `1px solid ${theme.border}`,
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme.text,
                    fontFamily: '"Space Mono", monospace',
                    height: '30px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {editTimelineType === 'lifespan' && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>YEAR OF DEATH (END)</label>
                  <input
                    type="text"
                    placeholder="e.g. -1800 or 1410 (optional)"
                    value={editTimelineEnd}
                    onChange={(e) => setEditTimelineEnd(e.target.value)}
                    style={{
                      width: '100%',
                      background: isMapDarkMode ? '#222' : '#fff',
                      border: `1px solid ${theme.border}`,
                      padding: '6px 10px',
                      fontSize: '11px',
                      color: theme.text,
                      fontFamily: '"Space Mono", monospace',
                      height: '30px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Lineage relationships for Lifespans in Edit Form */}
            {editTimelineType === 'lifespan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: isMapDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', padding: '8px', border: `1px solid ${theme.borderLight}` }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textDim, letterSpacing: '0.5px' }}>FAMILY TREE LINEAGE (OPTIONAL)</div>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: theme.text }}>FATHER</label>
                    <select
                      value={editTimelineFatherId}
                      onChange={(e) => setEditTimelineFatherId(e.target.value)}
                      style={{
                        width: '100%',
                        background: isMapDarkMode ? '#111' : '#fff',
                        border: `1px solid ${theme.border}`,
                        padding: '4px 6px',
                        fontSize: '9px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace'
                      }}
                    >
                      <option value="">None</option>
                      {[...combinedTimelineItems]
                        .filter(item => item.type === 'lifespan' && item.id !== sub.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: theme.text }}>MOTHER</label>
                    <select
                      value={editTimelineMotherId}
                      onChange={(e) => setEditTimelineMotherId(e.target.value)}
                      style={{
                        width: '100%',
                        background: isMapDarkMode ? '#111' : '#fff',
                        border: `1px solid ${theme.border}`,
                        padding: '4px 6px',
                        fontSize: '9px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace'
                      }}
                    >
                      <option value="">None</option>
                      {[...combinedTimelineItems]
                        .filter(item => item.type === 'lifespan' && item.id !== sub.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: theme.text }}>SPOUSE</label>
                    <select
                      value={editTimelineSpouseId}
                      onChange={(e) => setEditTimelineSpouseId(e.target.value)}
                      style={{
                        width: '100%',
                        background: isMapDarkMode ? '#111' : '#fff',
                        border: `1px solid ${theme.border}`,
                        padding: '4px 6px',
                        fontSize: '9px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace'
                      }}
                    >
                      <option value="">None</option>
                      {[...combinedTimelineItems]
                        .filter(item => item.type === 'lifespan' && item.id !== sub.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>INTELLIGENCE / DESCRIPTION *</label>
          <textarea 
            rows={4}
            value={editDescription} 
            onChange={(e) => setEditDescription(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '8px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace',
              lineHeight: '15px'
            }} 
          />
        </div>

        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>SOURCE DOCUMENTATION</label>
          <input 
            type="text" 
            value={editSource} 
            onChange={(e) => setEditSource(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '6px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace'
            }} 
          />
        </div>

        {/* Media list manager matching user's request to edit imagery/videos */}
        <div style={{ background: isMapDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${theme.border}`, padding: '12px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: theme.text }}>EDIT IMAGES / VIDEOS ATTACHMENTS</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditMediaType('url')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: editMediaType === 'url' ? theme.text : theme.textDim,
                  fontWeight: editMediaType === 'url' ? 'bold' : 'normal',
                  fontSize: '9px',
                  cursor: 'pointer',
                  textDecoration: editMediaType === 'url' ? 'underline' : 'none',
                  fontFamily: '"Space Mono", monospace'
                }}
              >
                LINK URL
              </button>
              <span style={{ fontSize: '9px', color: theme.textDim }}>|</span>
              <button
                type="button"
                onClick={() => setEditMediaType('upload')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: editMediaType === 'upload' ? theme.text : theme.textDim,
                  fontWeight: editMediaType === 'upload' ? 'bold' : 'normal',
                  fontSize: '9px',
                  cursor: 'pointer',
                  textDecoration: editMediaType === 'upload' ? 'underline' : 'none',
                  fontFamily: '"Space Mono", monospace'
                }}
              >
                FILE UPLOAD
              </button>
            </div>
          </div>

          {editMediaType === 'url' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Paste image/PDF/audio/video URL directly..." 
                value={editMediaInput} 
                onChange={(e) => setEditMediaInput(e.target.value)}
                style={{
                  flex: 1,
                  background: isMapDarkMode ? '#222' : '#fff',
                  border: `1px solid ${theme.border}`,
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: theme.text,
                  fontFamily: '"Space Mono", monospace'
                }}
              />
              <button 
                type="button" 
                onClick={() => {
                  const url = editMediaInput.trim();
                  if (!url) return;
                  setEditMediaList(prev => [...prev, url]);
                  setEditMediaInput('');
                }}
                style={{
                  background: 'transparent',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  padding: '0 12px',
                  height: '28px',
                  borderRadius: '14px',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"Space Mono", monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                LINK
              </button>
            </div>
          ) : (
            <div style={{ border: `1px dashed ${theme.border}`, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
              <input 
                type="file" 
                accept="image/*,video/*,audio/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setIsEditUploading(true);
                  try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result as string;
                      const base64Data = base64.split(',')[1] || base64;

                      try {
                        const response = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            filename: file.name,
                            fileData: base64Data
                          })
                        });

                        if (!response.ok) {
                          throw new Error(`Upload failed with status: ${response.status}`);
                        }

                        const data = await response.json();
                        if (data && data.url) {
                          setEditMediaList(prev => [...prev, data.url]);
                        } else {
                          throw new Error("Invalid response schema from upload endpoint");
                        }
                      } catch (err: any) {
                        console.error("Upload Error:", err);
                        setModeratorError(`Upload failed: ${err.message || err}`);
                      } finally {
                        setIsEditUploading(false);
                      }
                    };
                    reader.onerror = () => {
                      setModeratorError("Failed to read local file.");
                      setIsEditUploading(false);
                    };
                    reader.readAsDataURL(file);
                  } catch (fileErr: any) {
                    console.error(fileErr);
                    setIsEditUploading(false);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <Upload size={16} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '9px' }}>
                {isEditUploading ? "UPLOADING FILE..." : "CLICK TO ADD FILE"}
              </span>
            </div>
          )}

          {/* Edit Attachments lists */}
          {editMediaList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${theme.borderLight}`, paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: theme.textDim }}>CURRENT ATTACHMENTS ({editMediaList.length})</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {editMediaList.map((url, idx) => {
                  const isFile = url.startsWith('/uploads/');
                  const displayName = isFile ? url.replace('/uploads/', '') : url;
                  return (
                    <div key={idx} style={{ padding: '3px 6px', background: isMapDarkMode ? '#222' : '#eeeeee', border: `1px solid ${theme.border}`, fontSize: '8.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditMediaList(prev => prev.filter((_, i) => i !== idx));
                        }} 
                        style={{ background: 'transparent', border: 'none', color: '#ff3333', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {editDestinations.includes('map') && (
          <>
            {/* Geographic location search matching requirement */}
            <div style={{ background: isMapDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${theme.borderLight}`, padding: '10px', borderRadius: '2px' }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>GEOGRAPHIC GEO-SEARCH (AUTO-FILL COORDINATES)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type place name/address (e.g., Mount Shasta, CA)..."
                  value={editLocationSearch}
                  onChange={(e) => setEditLocationSearch(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await handleEditSearchGeocode();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: isMapDarkMode ? '#222' : '#fff',
                    border: `1px solid ${theme.border}`,
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: theme.text,
                    fontFamily: '"Space Mono", monospace'
                  }}
                />
                <button
                  type="button"
                  onClick={handleEditSearchGeocode}
                  disabled={isEditGeocoding}
                  style={{
                    background: theme.text,
                    color: theme.bg,
                    border: 'none',
                    padding: '0 12px',
                    height: '28px',
                    borderRadius: '14px',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: '"Space Mono", monospace',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  {isEditGeocoding ? 'RESOLVING...' : 'RESOLVE'}
                </button>
              </div>
              
              {editGeocodeMsg && (
                <div style={{ fontSize: '9px', color: editGeocodeMsg.type === 'error' ? '#ff3333' : '#00cc00', marginTop: '6px', fontWeight: 'bold' }}>
                  {editGeocodeMsg.text}
                </div>
              )}

              {editGeocodeResults.length > 1 && (
                <div style={{ 
                  marginTop: '8px', 
                  border: `1px solid ${theme.borderLight}`,
                  borderRadius: '2px',
                  background: isMapDarkMode ? '#111' : '#fcfcfc',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  textAlign: 'left'
                }}>
                  <div style={{ padding: '4px 8px', fontSize: '8px', fontWeight: 'bold', color: theme.textDim, borderBottom: `1px solid ${theme.borderLight}`, letterSpacing: '0.5px' }}>
                    SUGGESTED MATCHES (CLICK TO PINPOINT):
                  </div>
                  {editGeocodeResults.map((feat) => {
                    const [lng, lat] = feat.center;
                    return (
                      <div 
                        key={feat.id}
                        onClick={() => {
                          setEditLongitude(lng.toFixed(6));
                          setEditLatitude(lat.toFixed(6));
                          setEditLocationSearch(feat.place_name || feat.text);
                          setEditGeocodeMsg({
                            text: `SELECTED: ${feat.place_name || feat.text} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                            type: 'success'
                          });
                          setEditGeocodeResults([]);
                        }}
                        style={{ 
                          padding: '6px 8px', 
                          fontSize: '9.5px', 
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px',
                          borderBottom: `1px solid ${theme.borderLight}`
                        }}
                        className={isMapDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}
                      >
                        <span style={{ fontWeight: 'bold', color: theme.text }}>{feat.place_name || feat.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ border: `1px dashed ${theme.borderLight}`, padding: '10px', borderRadius: '2px', background: isMapDarkMode ? '#1a1a1a' : '#fcfcfc', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#ffcc00' }}>MAP COORDINATE CALIBRATION</span>
                <button 
                  type="button"
                  onClick={handleUseMapCenterForEdit}
                  style={{
                    background: 'rgba(255,204,0,0.1)',
                    border: '1px solid #ffcc00',
                    color: '#ffcc00',
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    fontFamily: '"Space Mono", monospace'
                  }}
                >
                  USE MAP CENTER COORDS
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: theme.textDim, display: 'block', marginBottom: '2px' }}>LONGITUDE *</span>
                  <input 
                    type="text" 
                    value={editLongitude} 
                    onChange={(e) => setEditLongitude(e.target.value)} 
                    style={{
                      width: '100%', 
                      background: isMapDarkMode ? '#111' : '#fff', 
                      border: `1px solid ${theme.border}`, 
                      color: theme.text, 
                      padding: '4px 8px', 
                      fontSize: '11.5px',
                      fontFamily: '"Space Mono", monospace'
                    }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: theme.textDim, display: 'block', marginBottom: '2px' }}>LATITUDE *</span>
                  <input 
                    type="text" 
                    value={editLatitude} 
                    onChange={(e) => setEditLatitude(e.target.value)} 
                    style={{
                      width: '100%', 
                      background: isMapDarkMode ? '#111' : '#fff', 
                      border: `1px solid ${theme.border}`, 
                      color: theme.text, 
                      padding: '4px 8px', 
                      fontSize: '11.5px',
                      fontFamily: '"Space Mono", monospace'
                    }} 
                  />
                </div>
              </div>
              <span style={{ fontSize: '8px', color: theme.textDim, display: 'block', marginTop: '6px', fontStyle: 'italic', lineHeight: '11px' }}>
                Tip: Close/minimize this desk, find the correct spot on the map, then hit 'USE MAP CENTER COORDS' above to snap it!
              </span>
            </div>
          </>
        )}


        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={isSavingEdit}
            onClick={() => setEditingSubId(null)}
            style={{
              background: 'transparent',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '16px',
              padding: '0 18px',
              height: '32px',
              fontSize: '9px',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={isSavingEdit}
            onClick={() => handleSaveSubmissionEdit(sub.id)}
            style={{
              background: '#ffcc00',
              color: '#000000',
              border: '1px solid #ffcc00',
              borderRadius: '16px',
              padding: '0 18px',
              height: '32px',
              fontSize: '9px',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isSavingEdit ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    );
  };

  const handleSaveReportEdit = async (report: any) => {
    setIsSavingEdit(true);
    setModeratorError(null);
    try {
      const isSubmission = approvedSubmissions.some(s => String(s.id) === String(report.pointId)) ||
                           pendingSubmissions.some(s => String(s.id) === String(report.pointId));

      const hasCoords = editLongitude.trim() !== '' || editLatitude.trim() !== '';
      let coordinatesValue: any = null;
      if (hasCoords) {
        const lngNum = parseFloat(editLongitude);
        const latNum = parseFloat(editLatitude);
        if (isNaN(lngNum) || isNaN(latNum)) {
          throw new Error("Invalid Longitude/Latitude coordinates format.");
        }
        if (!isValidLngLat(lngNum, latNum)) {
          throw new Error("Coordinates must be within standard bounds (Latitude: -90 to 90, Longitude: -180 to 180).");
        }
        coordinatesValue = [lngNum, latNum];
      }

      if (isSubmission) {
        const updatedFields = {
          name: editName.trim(),
          category: editCategory,
          description: editDescription.trim(),
          date: editDate,
          source: editSource.trim(),
          coordinates: coordinatesValue,
          codexParentId: editCodexParentId,
          timelineLayer: editTimelineLayer,
          timelineType: editTimelineType,
          timelineEnd: editTimelineEnd.trim(),
          timelineFatherId: editTimelineFatherId,
          timelineMotherId: editTimelineMotherId,
          timelineSpouseId: editTimelineSpouseId
        };
        const authParams = await getModeratorHeadersAndBody({ docId: report.pointId, updatedData: updatedFields });
        const response = await fetch('/api/moderate/update', {
          method: 'POST',
          headers: authParams.headers,
          body: authParams.body
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Server status ${response.status}`);
        }
        try {
          await updateDoc(doc(db, 'submissions', report.pointId), updatedFields);
        } catch (fbErr) {
          console.warn("Direct Firestore update failed:", fbErr);
        }
      } else {
        const updatedFields: any = {
          name: editName.trim(),
          description: editDescription.trim(),
          category: editCategory,
          source: editSource.trim(),
          coordinates: coordinatesValue,
          parentId: editCodexParentId,
          timelineId: editTimelineId,
          mapFeatureId: editMapFeatureId
        };
        
        Object.keys(updatedFields).forEach(key => {
          if (updatedFields[key] === undefined || updatedFields[key] === '') {
            delete updatedFields[key];
          }
        });

        const authParams = await getModeratorHeadersAndBody({ overrideId: report.pointId, updatedData: updatedFields });
        const response = await fetch('/api/moderate/save-override', {
          method: 'POST',
          headers: authParams.headers,
          body: authParams.body
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Server status ${response.status}`);
        }
        try {
          await setDoc(doc(db, 'overrides', report.pointId), updatedFields);
        } catch (fbErr) {
          console.warn("Direct Firestore override set failed:", fbErr);
        }
        
        setOverrides(prev => ({
          ...prev,
          [report.pointId]: updatedFields
        }));
      }

      await handleReportAction(report.id, 'resolve');

      setEditingReportId(null);
      setModeratorReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Failed to save report edit:", err);
      setModeratorError(`Edit Failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderReportEditForm = (report: any) => {
    const mapRecord = combinedPointsAndLinesData.find(item => String(item.id) === String(report.pointId));
    const codexRecord = combinedCodexNodes.find(item => String(item.id) === String(report.pointId));
    const isMapItem = !!mapRecord || report.pointCategory !== 'General';
    const isCodexItem = !!codexRecord;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', textAlign: 'left' }}>
        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>NAME *</label>
          <input 
            type="text" 
            value={editName} 
            onChange={(e) => setEditName(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '6px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace'
            }} 
          />
        </div>

        {isMapItem && (
          <div style={{ display: 'flex', gap: '10px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>LAYER CATEGORY *</label>
              <select 
                value={editCategory} 
                onChange={(e) => setEditCategory(e.target.value)} 
                style={{
                  width: '100%', 
                  background: isMapDarkMode ? '#222' : '#fff', 
                  border: `1px solid ${theme.border}`, 
                  color: theme.text, 
                  padding: '6px 10px', 
                  fontSize: '11px',
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} style={{ background: isMapDarkMode ? '#0d0d0d' : '#fff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>LONGITUDE *</label>
              <input 
                type="text" 
                value={editLongitude} 
                onChange={(e) => setEditLongitude(e.target.value)} 
                style={{
                  width: '100%', 
                  background: isMapDarkMode ? '#222' : '#fff', 
                  border: `1px solid ${theme.border}`, 
                  color: theme.text, 
                  padding: '6px 10px', 
                  fontSize: '11px',
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }} 
              />
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>LATITUDE *</label>
              <input 
                type="text" 
                value={editLatitude} 
                onChange={(e) => setEditLatitude(e.target.value)} 
                style={{
                  width: '100%', 
                  background: isMapDarkMode ? '#222' : '#fff', 
                  border: `1px solid ${theme.border}`, 
                  color: theme.text, 
                  padding: '6px 10px', 
                  fontSize: '11px',
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }} 
              />
            </div>
          </div>
        )}

        {isCodexItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '10px' }}>
            <div>
              <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>PARENT CODEX TERM</label>
              <select
                value={editCodexParentId}
                onChange={(e) => setEditCodexParentId(e.target.value)}
                style={{
                  width: '100%',
                  background: isMapDarkMode ? '#222' : '#fff',
                  border: `1px solid ${theme.border}`,
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: theme.text,
                  fontFamily: '"Space Mono", monospace',
                  height: '30px'
                }}
              >
                <option value="">None (Root Category)</option>
                {[...combinedCodexNodes]
                  .filter(node => node.id !== report.pointId)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(node => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))
                }
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>TIMELINE ID</label>
                <input 
                  type="text" 
                  value={editTimelineId} 
                  onChange={(e) => setEditTimelineId(e.target.value)} 
                  style={{
                    width: '100%', 
                    background: isMapDarkMode ? '#222' : '#fff', 
                    border: `1px solid ${theme.border}`, 
                    color: theme.text, 
                    padding: '6px 10px', 
                    fontSize: '11px',
                    fontFamily: '"Space Mono", monospace'
                  }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>MAP FEATURE ID</label>
                <input 
                  type="text" 
                  value={editMapFeatureId} 
                  onChange={(e) => setEditMapFeatureId(e.target.value)} 
                  style={{
                    width: '100%', 
                    background: isMapDarkMode ? '#222' : '#fff', 
                    border: `1px solid ${theme.border}`, 
                    color: theme.text, 
                    padding: '6px 10px', 
                    fontSize: '11px',
                    fontFamily: '"Space Mono", monospace'
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>DESCRIPTION *</label>
          <textarea 
            rows={4}
            value={editDescription} 
            onChange={(e) => setEditDescription(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '8px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace',
              lineHeight: '15px'
            }} 
          />
        </div>

        <div>
          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>SOURCE DOCUMENTATION</label>
          <input 
            type="text" 
            value={editSource} 
            onChange={(e) => setEditSource(e.target.value)} 
            style={{
              width: '100%', 
              background: isMapDarkMode ? '#222' : '#fff', 
              border: `1px solid ${theme.border}`, 
              color: theme.text, 
              padding: '6px 10px', 
              fontSize: '11px',
              fontFamily: '"Space Mono", monospace'
            }} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={isSavingEdit}
            onClick={() => setEditingReportId(null)}
            style={{
              background: 'transparent',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '16px',
              padding: '0 18px',
              height: '32px',
              fontSize: '9px',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={isSavingEdit}
            onClick={() => handleSaveReportEdit(report)}
            style={{
              background: '#ffcc00',
              color: '#000000',
              border: '1px solid #ffcc00',
              borderRadius: '16px',
              padding: '0 18px',
              height: '32px',
              fontSize: '9px',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isSavingEdit ? 'SAVING...' : 'SAVE & RESOLVE'}
          </button>
        </div>
      </div>
    );
  };

  // Requirement 3: Geocode search to auto-populate submission coords (with proximity bias and suggestions list)
  const handleSubSearchGeocode = async () => {
    const queryStr = subLocationSearch.trim();
    if (!queryStr) return;
    setIsSubGeocoding(true);
    setSubGeocodeMsg(null);
    setSubGeocodeResults([]);
    try {
      let proximityStr = '';
      if (mapRef.current) {
        try {
          const center = mapRef.current.getCenter();
          if (center && typeof center.lng === 'number' && typeof center.lat === 'number') {
            proximityStr = `&proximity=${center.lng},${center.lat}`;
          }
        } catch (mapErr) {
          console.warn("Could not get map center for proximity bias:", mapErr);
        }
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryStr)}.json?access_token=${mapboxgl.accessToken}&limit=5${proximityStr}`
      );
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        setSubGeocodeResults(data.features);
        
        // Populate with the first match immediately as default
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        setSubLongitude(lng.toFixed(6));
        setSubLatitude(lat.toFixed(6));
        setSubGeocodeMsg({
          text: `RESOLVED: ${feature.place_name || feature.text} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          type: 'success'
        });
      } else {
        setSubGeocodeMsg({
          text: "STATION ERROR: LOCATION NOT FOUND.",
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error(err);
      setSubGeocodeMsg({
        text: `STATION ERROR: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setIsSubGeocoding(false);
    }
  };

  useEffect(() => {
    const calculateScrollbarWidth = () => {
      // Create a temporary element to measure
      const outer = document.createElement('div');
      outer.style.visibility = 'hidden';
      outer.style.overflow = 'scroll'; // Force scrollbar to show
      outer.style.position = 'absolute';
      outer.style.top = '-9999px';
      outer.style.width = '50px';
      outer.style.height = '50px';
      document.body.appendChild(outer);

      const width = outer.offsetWidth - outer.clientWidth;
      document.body.removeChild(outer);
      
      setScrollbarWidth(width);
      document.documentElement.style.setProperty('--scrollbar-width', `${width}px`);
    };

    calculateScrollbarWidth();
    
    window.addEventListener('resize', calculateScrollbarWidth);
    return () => window.removeEventListener('resize', calculateScrollbarWidth);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On phones the filter panel and timeline bar start collapsed so the map
  // owns the screen; a pin tap still slides the dossier open.
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  // Mobile dossier bottom-sheet snap height; drag handle toggles/dismisses it.
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'half' | 'full'>('half');
  const sheetDragStartRef = useRef<{ y: number; moved: boolean }>({ y: 0, moved: false });
  const [hoveredBucket, setHoveredBucket] = useState<{
    count: number;
    cat: string;
    year: number;
    x: number;
    bottom: number;
  } | null>(null);

  // Keep selection range within the visible window when zooming or panning
  useEffect(() => {
    const windowEnd = timelineWindowStart + timelineWindowSpan;
    const timelineWidth = timelineRef.current?.offsetWidth || 0;
    // Calculate gap in years equivalent to 12px thumb width
    const gap = timelineWidth > 0 ? (12 / timelineWidth) * timelineWindowSpan : 0;

    setYearRange(prev => {
      let newStart = prev.start;
      let newEnd = prev.end;
      
      // Clamp start
      if (newStart < timelineWindowStart) newStart = timelineWindowStart;
      if (newStart > windowEnd - gap) newStart = windowEnd - gap;
      
      // Clamp end
      if (newEnd > windowEnd) newEnd = windowEnd;
      if (newEnd < timelineWindowStart + gap) newEnd = timelineWindowStart + gap;

      // Ensure minimum gap is maintained
      if (newEnd - newStart < gap) {
        // If we were pushing boundaries, decide which one to move
        // Favor keeping the one that was inside the window
        if (newStart <= timelineWindowStart) {
          newEnd = Math.min(windowEnd, newStart + gap);
        } else if (newEnd >= windowEnd) {
          newStart = Math.max(timelineWindowStart, newEnd - gap);
        } else {
          // If neither at edge, just push end
          newEnd = Math.min(windowEnd, newStart + gap);
        }
      }

      if (Math.abs(newStart - prev.start) < 0.01 && Math.abs(newEnd - prev.end) < 0.01) return prev;
      return { start: newStart, end: newEnd };
    });
  }, [timelineWindowStart, timelineWindowSpan]);

  // 1. Synchronize initial state and back/forward browser navigation from URL
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // Sync Page
      if (path.startsWith('/timeline')) {
        setCurrentPage('timeline');
        setIsModeratorOpen(false);
        const itemId = params.get('itemId');
        if (itemId) {
          const matched = TIMELINE_ITEMS.find(item => String(item.id) === itemId);
          if (matched) setSelectedTimelineItem(matched);
        } else {
          setSelectedTimelineItem(null);
        }
      } else if (path.startsWith('/codex')) {
        setCurrentPage('codex');
        setIsModeratorOpen(false);
        const termId = params.get('termId');
        if (termId) {
          const matched = TERM_TREE_DATA.find(node => String(node.id) === termId);
          if (matched) setSelectedCodexNode(matched);
        } else {
          setSelectedCodexNode(null);
        }
      } else if (path.startsWith('/mod') || path.startsWith('/moderator') || path.startsWith('/moderate')) {
        setCurrentPage('map');
        setIsModeratorOpen(true);
      } else {
        setCurrentPage('map');
        setIsModeratorOpen(false);
      }

      // Sync selectedFeature
      const featureId = params.get('featureId');
      if (featureId) {
        const matched = combinedPointsAndLinesData.find(item => String(item.id) === featureId);
        if (matched) setSelectedFeature(matched);
      } else {
        setSelectedFeature(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, [combinedPointsAndLinesData]);

  // 2. Sync page and navigation changes to URL history path
  useEffect(() => {
    let path = '/';
    if (isModeratorOpen) path = '/moderator';
    else if (currentPage === 'timeline') path = '/timeline';
    else if (currentPage === 'codex') path = '/codex';

    const params = new URLSearchParams(window.location.search);

    // Keep coordinates and featureId only on map / mod page
    if (currentPage !== 'map' && !isModeratorOpen) {
      params.delete('lat');
      params.delete('lng');
      params.delete('zoom');
      params.delete('featureId');
    }

    if (currentPage === 'timeline' && selectedTimelineItem) {
      params.set('itemId', String(selectedTimelineItem.id));
    } else {
      params.delete('itemId');
    }

    if (currentPage === 'codex' && selectedCodexNode) {
      params.set('termId', String(selectedCodexNode.id));
    } else {
      params.delete('termId');
    }

    const searchStr = params.toString();
    const newURL = path + (searchStr ? `?${searchStr}` : '');
    
    if (window.location.pathname !== path || window.location.search !== (searchStr ? `?${searchStr}` : '')) {
      window.history.pushState(null, '', newURL);
    }
  }, [currentPage, isModeratorOpen, selectedTimelineItem, selectedCodexNode]);

  // 3. Sync selectedFeature selection to URL search params (replace state)
  useEffect(() => {
    if (currentPage === 'map' && !isModeratorOpen) {
      const params = new URLSearchParams(window.location.search);
      if (selectedFeature) {
        params.set('featureId', String(selectedFeature.id));
      } else {
        params.delete('featureId');
      }
      const searchStr = params.toString();
      window.history.replaceState(null, '', `/${searchStr ? `?${searchStr}` : ''}`);
    }
  }, [selectedFeature, currentPage, isModeratorOpen]);
  
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  // Tracks a touch on the lightbox so a horizontal swipe pages images (and is
  // not misread as a tap-to-close on the backdrop).
  const lightboxTouchRef = useRef<{ x: number; y: number; swiped: boolean }>({ x: 0, y: 0, swiped: false });

  const activeAssets = useMemo(() => {
    return getCombinedAssets(selectedFeature?.images || []);
  }, [selectedFeature]);
  
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isLightboxImageLoading, setIsLightboxImageLoading] = useState(false);

  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLikedIds, setUserLikedIds] = useState<Set<string>>(new Set());

  // Load user likes from localStorage
  useEffect(() => {
    const likesCleared = localStorage.getItem('likes_cleared_2026_05_28');
    if (!likesCleared) {
      localStorage.removeItem('userLikedIds');
      localStorage.setItem('likes_cleared_2026_05_28', 'true');
      setUserLikedIds(new Set());
    } else {
      const stored = localStorage.getItem('userLikedIds');
      if (stored) {
        try {
          setUserLikedIds(new Set(JSON.parse(stored)));
        } catch (e) {
          console.error('Failed to parse userLikedIds', e);
        }
      }
    }
  }, []);

  // Save user likes to localStorage
  useEffect(() => {
    localStorage.setItem('userLikedIds', JSON.stringify(Array.from(userLikedIds)));
  }, [userLikedIds]);

  // Coordinate loader dismissal once both map is loaded and data is compiled, with a safety fallback
  useEffect(() => {
    if (!isLiveLoading) return;

    // Safety fallback: if 6 seconds pass, dismiss the loader anyway to prevent softlock
    const fallbackTimeout = setTimeout(() => {
      console.warn("Loader safety timeout reached. Dismissing loader.");
      setIsLiveLoading(false);
      setIsInitialLoad(false);
    }, 6000);

    if (isMapLoaded && isDataCompiled) {
      // Add a small buffer (e.g. 500ms) for smooth rendering transition
      const successTimeout = setTimeout(() => {
        setIsLiveLoading(false);
        setIsInitialLoad(false);
      }, 500);
      return () => {
        clearTimeout(fallbackTimeout);
        clearTimeout(successTimeout);
      };
    }

    return () => clearTimeout(fallbackTimeout);
  }, [isMapLoaded, isDataCompiled, isLiveLoading]);

  // Onboarding Tour Trigger (after entering About Modal or manually requested).
  // Suppressed on mobile: the tour's tooltips anchor to fixed desktop pixel
  // positions and would point at nothing on a phone layout.
  useEffect(() => {
    if (!showAboutModal && !isLiveLoading && !isMobile) {
      const completed = localStorage.getItem('mtrh_onboarding_completed');
      if (!completed) {
        setOnboardingStep(0);
      }
    }
  }, [showAboutModal, isLiveLoading, isMobile]);

  // On mobile, route the system back gesture through open overlays (top-most
  // first) so it closes them instead of leaving the site.
  useBackGesture(isMobile, [
    { isOpen: isLightboxOpen, close: () => setIsLightboxOpen(false) },
    { isOpen: isSubmitOpen, close: () => setIsSubmitOpen(false) },
    { isOpen: isReportOpen, close: () => setIsReportOpen(false) },
    { isOpen: showAboutModal, close: () => setShowAboutModal(false) },
    { isOpen: !isLeftCollapsed, close: () => setIsLeftCollapsed(true) },
    { isOpen: !isRightCollapsed, close: () => setIsRightCollapsed(true) },
  ]);

  // Synchronize UI panels with onboarding steps
  useEffect(() => {
    if (onboardingStep === null) return;
    
    if (onboardingStep === 0) {
      setIsLeftCollapsed(false);
      setIsRightCollapsed(false);
    } else if (onboardingStep === 1) {
      setIsLeftCollapsed(false);
    } else if (onboardingStep === 3) {
      setIsTimelineCollapsed(false);
    } else if (onboardingStep === 6) {
      setIsRightCollapsed(false);
    }
  }, [onboardingStep]);

  const [isMapDarkMode, setIsMapDarkMode] = useState(false);
  const darkModeRef = useRef(isMapDarkMode);

  // Theme Constants
  const theme = {
    bg: isMapDarkMode ? '#000000' : '#ffffff',
    bgTransparent: isMapDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    text: isMapDarkMode ? '#ffffff' : '#000000',
    textDim: isMapDarkMode ? '#999999' : '#666666',
    border: isMapDarkMode ? '#ffffff' : '#000000',
    borderLight: isMapDarkMode ? '#333333' : '#eeeeee',
    invert: isMapDarkMode ? 'invert(1)' : 'none'
  };

  useEffect(() => {
    darkModeRef.current = isMapDarkMode;
  }, [isMapDarkMode]);

  const initialShouldRotate = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasLocation = params.has('lat') || params.has('lng') || params.has('zoom');
      const hasDeepLink = params.has('itemId') || params.has('termId') || params.has('featureId');
      return !hasLocation && !hasDeepLink;
    } catch (e) {
      return true;
    }
  })();

  const isMainMapRotatingRef = useRef(initialShouldRotate);
  const stopMainMapRotation = () => {
    isMainMapRotatingRef.current = false;
  };

  const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';
  const MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

  // Sync likes from Firestore
  useEffect(() => {
    const likesRef = collection(db, 'likes');
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const likesMap: Record<string, number> = {};
      snapshot.forEach((doc) => {
        likesMap[doc.id] = doc.data().count || 0;
      });
      setLikes(likesMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'likes');
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.email === 'jhuffman710@gmail.com') {
          setIsModeratorAuthenticated(true);
        }
      } else {
        // If we also had manual bypassed passcode state, keep it, otherwise reset
        // We'll let passcode state remain distinct
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Approved Submissions dynamically (Anyone can fetch these)
  useEffect(() => {
    const q = query(collection(db, 'submissions'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          categories: [data.category],
          description: data.description,
          date: data.date ? Number(data.date) : 0,
          coordinates: data.coordinates,
          images: data.images || [],
          source: data.source || 'User Submission',
          isSubmitted: true,
          type: 'Point',
          destinations: data.destinations || ['map'],
          codexParentId: data.codexParentId || '',
          timelineLayer: data.timelineLayer || '',
          timelineType: data.timelineType || 'event',
          timelineEnd: data.timelineEnd || '',
          timelineFatherId: data.timelineFatherId || '',
          timelineMotherId: data.timelineMotherId || '',
          timelineSpouseId: data.timelineSpouseId || ''
        });
      });
      setApprovedSubmissions(docs);
    }, (error) => {
      console.warn("Could not listen to approved submissions directly:", error);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Overrides dynamically (Anyone can fetch these to apply corrections)
  useEffect(() => {
    const q = collection(db, 'overrides');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const overridesMap: Record<string, any> = {};
      snapshot.forEach((doc) => {
        overridesMap[doc.id] = doc.data();
      });
      setOverrides(overridesMap);
    }, (error) => {
      console.warn("Could not listen to overrides directly. Fetching from server proxy...", error);
      fetchOverridesFromServer();
    });

    const fetchOverridesFromServer = async () => {
      try {
        const response = await fetch('/api/overrides');
        if (response.ok) {
          const data = await response.json();
          setOverrides(data.overrides || {});
        }
      } catch (err) {
        console.warn("Could not fetch overrides from server proxy:", err);
      }
    };

    fetchOverridesFromServer();

    return () => unsubscribe();
  }, []);

  // Listen to all submissions for moderators (Requires Auth or Bypass)
  useEffect(() => {
    if (!isModeratorAuthenticated) {
      setPendingSubmissions([]);
      return;
    }

    let isMounted = true;
    let fallbackInterval: any = null;

    // Define raw fetching from server-side bypass
    const fetchPendingFromServer = async () => {
      try {
        const authParams = await getModeratorHeadersAndBody();
        const response = await fetch('/api/moderate/pending', {
          method: 'POST',
          headers: authParams.headers,
          body: authParams.body
        });
        if (!response.ok) {
          throw new Error(`Server status ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setPendingSubmissions(data.pending || []);
        }
      } catch (err: any) {
        console.warn("Server-side pending submissions fetch failed:", err);
      }
    };

    // Try listening to firestore snapshot first if they have full permissions
    const q = collection(db, 'submissions');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending') {
          pending.push({
            id: doc.id,
            ...data
          });
        }
      });
      if (isMounted) {
        setPendingSubmissions(pending);
      }
    }, (error) => {
      console.warn("Could not load submissions list directly from Firestore client. Switching to secure server proxy...", error);
      // Fallback: Fetch once immediately, then poll every 5 seconds
      fetchPendingFromServer();
      if (isMounted && !fallbackInterval) {
        fallbackInterval = setInterval(fetchPendingFromServer, 5000);
      }
    });

    // Also fetch immediately on dependency triggers
    fetchPendingFromServer();

    return () => {
      isMounted = false;
      unsubscribe();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isModeratorAuthenticated, moderatorReloadTrigger]);

  // Listen to inaccuracy reports for moderators (similar to submissions)
  useEffect(() => {
    if (!isModeratorAuthenticated) {
      setReports([]);
      return;
    }

    let isMounted = true;
    let fallbackInterval: any = null;

    const fetchReportsFromServer = async () => {
      try {
        const authParams = await getModeratorHeadersAndBody();
        const response = await fetch('/api/moderate/reports', {
          method: 'POST',
          headers: authParams.headers,
          body: authParams.body
        });
        if (!response.ok) {
          throw new Error(`Server status ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setReports(data.reports || []);
        }
      } catch (err: any) {
        console.warn("Server-side reports fetch failed:", err);
      }
    };

    // Try listening to firestore snapshot first
    const q = collection(db, 'reports');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsList: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;

        reportsList.push({
          id: doc.id,
          ...data,
          createdAt
        });
      });

      // Sort by createdAt descending
      reportsList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      if (isMounted) {
        setReports(reportsList);
      }
    }, (error) => {
      console.warn("Could not load reports list directly from Firestore client. Switching to secure server proxy...", error);
      fetchReportsFromServer();
      if (isMounted && !fallbackInterval) {
        fallbackInterval = setInterval(fetchReportsFromServer, 5000);
      }
    });

    fetchReportsFromServer();

    return () => {
      isMounted = false;
      unsubscribe();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isModeratorAuthenticated, moderatorReloadTrigger]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedFeature) return;
    
    setIsSubmittingReport(true);
    setReportError(null);
    setReportSuccess(null);

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const reportData = {
      pointId: String(reportedFeature.id),
      pointName: String(reportedFeature.name || reportedFeature.title || 'Unnamed Point'),
      pointCategory: String(reportedFeature.category || reportedFeature.layer || 'General'),
      reason: reportReason,
      details: reportDetails.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Try server endpoint first
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server status ${response.status}`);
      }
      setReportSuccess("INACCURACY FLAG REGISTERED. WE ARE INVESTIGATING.");
      setReportDetails('');
    } catch (err: any) {
      console.warn("Server-side report submission failed, trying direct Firestore write:", err);
      try {
        // 2. Try client-side Firestore set
        const reportDocRef = doc(db, 'reports', reportId);
        await setDoc(reportDocRef, {
          pointId: reportData.pointId,
          pointName: reportData.pointName,
          pointCategory: reportData.pointCategory,
          reason: reportData.reason,
          details: reportData.details,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        setReportSuccess("INACCURACY FLAG REGISTERED (DIRECT ENTRY).");
        setReportDetails('');
      } catch (fallbackErr: any) {
        console.error("Firestore report creation failed:", fallbackErr);
        setReportError(`Transmission failed: ${fallbackErr.message || "Unknown write error"}`);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'delete') => {
    setSubmittingReportActionId(reportId);
    setModeratorError(null);

    try {
      // 1. Try server endpoint first
      const authParams = await getModeratorHeadersAndBody({ reportId, action });
      const response = await fetch('/api/moderate/report-action', {
        method: 'POST',
        headers: authParams.headers,
        body: authParams.body
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server status ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Server-side report action failed, falling back to direct Firestore:", err);
      try {
        // 2. Try client-side Firestore action
        const reportDocRef = doc(db, 'reports', reportId);
        if (action === 'resolve') {
          await updateDoc(reportDocRef, {
            status: 'resolved'
          });
        } else if (action === 'delete') {
          await deleteDoc(reportDocRef);
        }
      } catch (fallbackErr: any) {
        console.error("Firestore report action failed:", fallbackErr);
        setModeratorError(`Moderation action failed: ${fallbackErr.message || "Check permissions."}`);
      }
    } finally {
      setSubmittingReportActionId(null);
      setModeratorReloadTrigger(prev => prev + 1);
    }
  };

  const handleLike = async (anomalyId: string | number) => {
    if (anomalyId === undefined || anomalyId === null) return;
    const cleanId = String(anomalyId).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const likeDocRef = doc(db, 'likes', cleanId);
    
    const isLiked = userLikedIds.has(cleanId);
    const currentCount = likes[cleanId] || 0;
    
    try {
      if (isLiked) {
        // Toggle OFF: Unfavorite
        const newSet = new Set(userLikedIds);
        newSet.delete(cleanId);
        setUserLikedIds(newSet);
        
        // Optimistic UI update
        setLikes(prev => ({ ...prev, [cleanId]: Math.max(0, currentCount - 1) }));
        
        await updateDoc(likeDocRef, {
          count: increment(-1),
          updatedAt: serverTimestamp()
        });
      } else {
        // Toggle ON: Favorite
        const newSet = new Set(userLikedIds);
        newSet.add(cleanId);
        setUserLikedIds(newSet);

        // Optimistic UI update
        setLikes(prev => ({ ...prev, [cleanId]: currentCount + 1 }));

        const docSnap = await getDoc(likeDocRef);
        if (docSnap.exists()) {
          await updateDoc(likeDocRef, {
            count: increment(1),
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(likeDocRef, {
            count: 1,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setLikes(prev => ({ ...prev, [cleanId]: currentCount }));
      setUserLikedIds(prev => {
        const reverted = new Set(prev);
        if (isLiked) reverted.add(cleanId); else reverted.delete(cleanId);
        return reverted;
      });
      console.error("Like operation failed", error);
    }
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
    if (selectedFeature && activeAssets && activeAssets.length > 0) {
      setIsImageLoading(true);
    }
  }, [selectedFeature, activeAssets]);

  useEffect(() => {
    if (selectedFeature && activeAssets && activeAssets.length > 0) {
      const currentAsset = activeAssets[activeImageIndex];
      const currentUrl = currentAsset?.url;
      if (isVideoUrl(currentUrl) || isPdfUrl(currentUrl) || isAudioUrl(currentUrl) || currentAsset?.pdfUrl) {
        setIsImageLoading(false);
      } else {
        setIsImageLoading(true);
        // Safety timeout for hanging images
        const timeout = setTimeout(() => {
          setIsImageLoading(false);
        }, 10000);
        return () => clearTimeout(timeout);
      }
    }
  }, [activeImageIndex, selectedFeature, activeAssets]);

  useEffect(() => {
    if (isLightboxOpen && selectedFeature && activeAssets && activeAssets.length > 0) {
      setIsLightboxImageLoading(true);
    }
  }, [activeImageIndex, isLightboxOpen, selectedFeature, activeAssets]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFeature || !activeAssets || activeAssets.length === 0) return;
      
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
  }, [isLightboxOpen, selectedFeature, activeAssets]);

  // Dynamically load datasets on demand based on active layers
  useEffect(() => {
    const loadDatasets = async () => {
      // 1. UFO Datasets — loaded per layer instead of as one ~5.9MB bundle, so
      // toggling e.g. Brazillian Archives no longer downloads every UFO file.
      const ufoSources: { key: string; active: boolean; load: () => Promise<any[]> }[] = [
        {
          key: 'sightings', // records normalize to 'UFOs - Sightings'
          active: !!activeLayers['UFOs - Sightings'],
          load: async () => {
            const [a, b] = await Promise.all([
              import('./ufoData-1.json'),
              import('./ufoData-2.json')
            ]);
            return [...getSafeData(a), ...getSafeData(b)];
          }
        },
        {
          key: 'wargov', // records normalize to 'UFOs - War.gov'
          active: !!(activeLayers['UFOs - War.gov'] || activeLayers['Secret Government Programs']),
          load: async () => {
            const [a, b, c] = await Promise.all([
              import('./warGovData.json'),
              import('./warGovData-2.json'),
              import('./warGovData-3.json')
            ]);
            return [...getSafeData(a), ...getSafeData(b), ...getSafeData(c)];
          }
        },
        {
          key: 'brazilian',
          active: !!activeLayers['UFOs - Brazillian Archives'],
          load: async () => getSafeData(await import('./brazilianUfoData.json'))
        }
      ];
      for (const source of ufoSources) {
        if (source.active && !loadedUfoChunksRef.current.has(source.key)) {
          loadedUfoChunksRef.current.add(source.key);
          try {
            const records = await source.load();
            setUfoData(prev => [...prev, ...records]);
          } catch (err) {
            loadedUfoChunksRef.current.delete(source.key);
            console.error(`Failed to load UFO dataset chunk "${source.key}":`, err);
          }
        }
      }

      // 2. Archaeology Finds & Biblical Discoveries
      const hasArchaeologyActive = 
        activeLayers['Archaeological Finds'] || 
        activeLayers['Biblical Discoveries'] ||
        activeLayers['Rock Art & Cave Paintings'] ||
        activeLayers['Megaliths / Structures'] ||

        activeLayers['Burial Mounds'];
      if (hasArchaeologyActive && archaeologyData.length === 0) {
        try {
          const module = await import('./archaeologyData');
          setArchaeologyData(getSafeData(module.ARCHAEOLOGICAL_FINDS_DATA));
        } catch (err) {
          console.error("Failed to load archaeology finds:", err);
        }
      }

      // 3. Missing 411
      if (activeLayers['Missing 411'] && missing411Data.length === 0) {
        try {
          const module = await import('./missing411Data');
          setMissing411Data(getSafeData(module.MISSING_411_DATA));
        } catch (err) {
          console.error("Failed to load Missing 411 data:", err);
        }
      }

      // 4. Cave Systems
      if (activeLayers['Cave Systems'] && cavesData.length === 0) {
        try {
          const module = await import('./cavesData');
          setCavesData(getSafeData(module.CAVES_DATA));
        } catch (err) {
          console.error("Failed to load caves data:", err);
        }
      }

      // 4b. Alien Abductions
      if (activeLayers['Alien Abductions'] && alienAbductionData.length === 0) {
        try {
          const module = await import('./alienAbductionData');
          setAlienAbductionData(getSafeData(module.ALIEN_ABDUCTION_DATA));
        } catch (err) {
          console.error("Failed to load alien abductions data:", err);
        }
      }

      // 4c. Cattle Mutilations
      if (activeLayers['Cattle Mutilations'] && cattleMutilationData.length === 0) {
        try {
          const module = await import('./cattleMutilationData');
          setCattleMutilationData(getSafeData(module.CATTLE_MUTILATION_DATA));
        } catch (err) {
          console.error("Failed to load cattle mutilation data:", err);
        }
      }

      // 5. Core Rabbit Hole data
      const needsRabbitHole = Object.keys(activeLayers).some(k => 
        activeLayers[k] && 
        k !== 'UFOs - War.gov' && k !== 'UFOs - Brazillian Archives' && k !== 'UFOs - Sightings' && k !== 'Secret Government Programs' &&
        k !== 'Archaeological Finds' && k !== 'Biblical Discoveries' &&
        k !== 'Missing 411' && k !== 'Cave Systems' && k !== 'Alien Abductions' && k !== 'Cattle Mutilations'
      );
      if (needsRabbitHole && rabbitHoleData.length === 0) {
        try {
          const module = await import('./rabbitHoleData.json');
          setRabbitHoleData(getSafeData(module));
        } catch (err) {
          console.error("Failed to load core map data:", err);
        }
      }
    };

    loadDatasets();
  }, [activeLayers]);

  useEffect(() => {
    const compileVerifiedIntel = () => {
      try {
        setIsLiveLoading(true);
        setIsDataCompiled(false);
        const safeLocalData = getSafeData(rabbitHoleData);
        const safeUfoData = getSafeData(ufoData);
        const combinedRawData = [...safeLocalData, ...safeUfoData, ...archaeologyData, ...missing411Data, ...cavesData, ...alienAbductionData, ...cattleMutilationData];
        
        const initialBuffer = combinedRawData
          .map((item, idx) => processIncomingRecord(item, idx))
          .filter(Boolean);

        // Convert timeline items with coordinates to map pins
        const timelinePins = combinedTimelineItems.map(item => {
          const loc = TIMELINE_LOCATIONS[item.id];
          const override = overrides[String(item.id)];
          if (!loc && (!override || !override.coordinates)) return null;
          
          // Match with Codex node to pull images
          const codexNode = combinedCodexNodes.find(node => 
            node.timelineId === item.id ||
            node.mapFeatureId === item.id ||
            node.id === item.id ||
            (node.name && item.name && node.name.toLowerCase() === item.name.toLowerCase())
          );
          const resolvedImages = codexNode && codexNode.images ? codexNode.images : [];

          const lng = override && override.coordinates ? override.coordinates[0] : (loc ? loc.lng : 0);
          const lat = override && override.coordinates ? override.coordinates[1] : (loc ? loc.lat : 0);

          return {
            id: item.id,
            name: item.name,
            categories: [override?.category || loc?.category || 'Biblical Events'],
            category: override?.category || loc?.category || 'Biblical Events',
            type: 'Point',
            coordinates: [lng, lat],
            date: item.start,
            description: item.description,
            source: item.source || null,
            images: resolvedImages,
            isTimelinePin: true,
            isPeopleGroup: item.isPeopleGroup,
            subLabel: item.subLabel,
            locationName: override?.locationName || loc?.locationName || ''
          };
        }).filter(Boolean);

        initialBuffer.push(...timelinePins);

        console.log(`Initial compilation: ${initialBuffer.length} records processed.`);
        const catCounts: any = {};
        initialBuffer.forEach((f: any) => {
          catCounts[f.category] = (catCounts[f.category] || 0) + 1;
        });
        console.log("Loaded Categories:", catCounts);

        setPointsAndLinesData(initialBuffer);

        const minYear = 0;
        const maxYear = 2050;
        setYearRange({ start: minYear, end: maxYear });
        setTimelineWindowStart(minYear);
        setTimelineWindowSpan(maxYear - minYear);

        // Fetch additional records asynchronously without blocking the local data
        loadRemoteArchiveData();
      } catch (err) {
        console.error("Critical failure during map compilation pipeline: ", err);
      } finally {
        setTimeout(() => {
          setIsDataCompiled(true);
        }, 600);
      }
    };

    const loadRemoteArchiveData = async () => {
      try {
        const archiveRes = await fetch('/api/uap-archive');
        if (archiveRes.ok) {
          const archiveData = await archiveRes.json();
          if (archiveData.records && Array.isArray(archiveData.records)) {
            const remoteRecords = archiveData.records
              .map((item: any, idx: number) => processIncomingRecord(item, 100000 + idx))
              .filter(Boolean);
            
            setPointsAndLinesData(prev => {
              const combined = [...prev, ...remoteRecords];
              const uniqueMap = new Map();
              combined.forEach((item: any) => uniqueMap.set(item.id, item));
              return Array.from(uniqueMap.values()) as any[];
            });
          }
        }
      } catch (apiErr) {
        console.warn("Could not reach UAP archive scraping proxy:", apiErr);
      }
    };

    compileVerifiedIntel();
  }, [rabbitHoleData, ufoData, archaeologyData, missing411Data, cavesData, alienAbductionData, cattleMutilationData, overrides]);

  useEffect(() => {
    if (uniqueCategories.length > 0 && !hasRandomizedRef.current) {
      hasRandomizedRef.current = true;
      // Curated, deterministic boot layers. The old random 4-6 pick meant a
      // ~50% chance of downloading the multi-MB UFO datasets on first paint;
      // the shuffle button still offers the random dive on demand.
      const CURATED_INITIAL_LAYERS = ['Megaliths / Structures', 'Cryptid Sightings', 'D.U.M.B.\'s', 'Crop Circles'];
      const selected = CURATED_INITIAL_LAYERS.filter(cat => uniqueCategories.includes(cat));

      const initialActive: Record<string, boolean> = {};
      uniqueCategories.forEach(cat => {
        initialActive[cat] = selected.includes(cat);
      });
      setActiveLayers(initialActive);
    } else if (uniqueCategories.length > 0) {
      setActiveLayers(prev => {
        const updated = { ...prev };
        uniqueCategories.forEach(cat => {
          if (updated[cat] === undefined) {
            updated[cat] = false; // New categories default to off
          }
        });
        return updated;
      });
    }
  }, [uniqueCategories]);

  const handleRandomizeLayers = () => {
    const count = Math.floor(Math.random() * 3) + 4; // Choose 4, 5, or 6 layers
    const shuffled = [...uniqueCategories].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    const newActive: Record<string, boolean> = {};
    uniqueCategories.forEach(cat => {
      newActive[cat] = selected.includes(cat);
    });
    setActiveLayers(newActive);
  };

  const handleAllLayersOn = () => {
    const allActive: Record<string, boolean> = {};
    uniqueCategories.forEach(cat => {
      allActive[cat] = true;
    });
    setActiveLayers(allActive);
  };

  const handleAllLayersOff = () => {
    const allInactive: Record<string, boolean> = {};
    uniqueCategories.forEach(cat => {
      allInactive[cat] = false;
    });
    setActiveLayers(allInactive);
  };

  const visibleData = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    return combinedPointsAndLinesData.filter(item => {
      const hasActiveLayerMatch = item.categories.some((cat: string) => activeLayers[cat] !== false);
      const matchesTimeline = item.date ? (item.date < 0 || item.date > 2050 || (item.date >= yearRange.start && item.date <= yearRange.end)) : true;
      const matchesSearch = cleanQuery === '' || 
        item.name.toLowerCase().includes(cleanQuery) ||
        item.categories.some((cat: string) => cat.toLowerCase().includes(cleanQuery)) ||
        item.description.toLowerCase().includes(cleanQuery);

      return hasActiveLayerMatch && matchesTimeline && matchesSearch;
    });
  }, [combinedPointsAndLinesData, yearRange, activeLayers, searchQuery]);

  // Search across ALL data regardless of which layers are active
  const searchData = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (cleanQuery.length < 2) return [];
    return combinedPointsAndLinesData.filter(item => {
      const matchesTimeline = item.date ? (item.date < 0 || item.date > 2050 || (item.date >= yearRange.start && item.date <= yearRange.end)) : true;
      const matchesSearch =
        item.name.toLowerCase().includes(cleanQuery) ||
        item.categories.some((cat: string) => cat.toLowerCase().includes(cleanQuery)) ||
        item.description.toLowerCase().includes(cleanQuery);
      return matchesTimeline && matchesSearch;
    });
  }, [combinedPointsAndLinesData, yearRange, searchQuery]);

  const groupedLocations = useMemo(() => {
    const groups: Record<string, any[]> = {};
    uniqueCategories.forEach(cat => { groups[cat] = []; });
    visibleData.forEach(item => {
      // Do not show LineString features (tunnels/lines) in the left sidebar list
      if (item && item.type === 'LineString') return;
      item.categories.forEach((cat: string) => {
        if (groups[cat]) groups[cat].push(item);
      });
    });
    
    // Sort items within each layer
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const likesA = likes[String(a.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
        const likesB = likes[String(b.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
        
        if (likesB !== likesA) {
          return likesB - likesA; // Sort by likes descending
        }

        // Identify content tiers:
        // Tier 3: Has video content
        // Tier 2: Has photos / PDFs / other imagery but no video
        // Tier 1: Has no imagery at all
        const getTier = (item: any) => {
          const imgs = item.images || [];
          if (imgs.length === 0) return 1;
          const hasVideo = imgs.some(isVideoUrl);
          if (hasVideo) return 3;
          return 2;
        };

        const tierA = getTier(a);
        const tierB = getTier(b);

        if (tierB !== tierA) {
          return tierB - tierA; // Sort by tier descending (3 -> 2 -> 1)
        }
        
        return a.name.localeCompare(b.name); // Then alphabetically
      });
    });
    
    return groups;
  }, [visibleData, uniqueCategories, likes]);

  // Scroll to the selected feature in the left sidebar list when it changes
  useEffect(() => {
    if (!selectedFeature || currentPage !== 'map') return;

    // 1. Auto-expand the categories this location belongs to in the sidebar
    const categories = selectedFeature.categories || (selectedFeature.category ? [selectedFeature.category] : []);
    if (categories.length > 0) {
      setExpandedLayers(prev => {
        let updated = false;
        const next = { ...prev };
        categories.forEach((cat: string) => {
          if (!next[cat]) {
            next[cat] = true;
            updated = true;
          }
        });
        return updated ? next : prev;
      });

      // Auto-enable the layers if they are currently off
      setActiveLayers(prev => {
        let updated = false;
        const next = { ...prev };
        categories.forEach((cat: string) => {
          if (next[cat] === false) {
            next[cat] = true;
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }

    // 2. Expand visible counts if the item is pagination-hidden
    let updatedVisibleCounts = false;
    const newCounts = { ...visibleCounts };
    
    categories.forEach((cat: string) => {
      const locationsInLayer = groupedLocations[cat] || [];
      const itemIndex = locationsInLayer.findIndex(loc => loc.id === selectedFeature.id);
      if (itemIndex !== -1) {
        const currentLimit = visibleCounts[cat] || 100;
        if (itemIndex >= currentLimit) {
          // Set limit to include this item + buffer
          newCounts[cat] = itemIndex + 50;
          updatedVisibleCounts = true;
        }
      }
    });

    if (updatedVisibleCounts) {
      setVisibleCounts(newCounts);
    }

    // 3. Scroll to the element after a brief timeout to let DOM updates / animations settle
    const timer = setTimeout(() => {
      const element = document.getElementById(`sidebar-item-${selectedFeature.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedFeature, currentPage, groupedLocations, visibleCounts]);

  useEffect(() => {
    if (!mapboxgl.supported() || !bgMapContainer.current) return;

    const bgMap = new mapboxgl.Map({
      container: bgMapContainer.current,
      style: darkModeRef.current ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 3.5, // 2x larger still than 2.5
      projection: { name: 'globe' } as any,
      interactive: false,
      attributionControl: false
    });
    bgMapRef.current = bgMap;

    const hideLabels = () => {
      try {
        const style = bgMap.getStyle();
        if (style && style.layers) {
          for (const layer of style.layers) {
            if (layer.type === 'symbol' || layer.id.includes('label') || layer.id.includes('place') || layer.id.includes('country') || layer.id.includes('state')) {
              const currentVisibility = bgMap.getLayoutProperty(layer.id, 'visibility');
              if (currentVisibility !== 'none') {
                bgMap.setLayoutProperty(layer.id, 'visibility', 'none');
              }
            }
          }
        }
      } catch (e) {
        // Ignore style manipulation errors
      }
    };

    bgMap.on('style.load', () => {
      const isDark = darkModeRef.current;
      bgMap.setFog({
        color: isDark ? 'rgb(4, 4, 16)' : 'rgb(240, 243, 250)',
        'high-color': isDark ? 'rgb(12, 12, 36)' : 'rgb(200, 215, 240)',
        'space-color': isDark ? 'rgb(2, 2, 8)' : 'rgb(245, 247, 252)',
        'horizon-blend': 0.15,
        'star-intensity': isDark ? 0.35 : 0.0
      });
      hideLabels();
    });

    bgMap.on('styledata', hideLabels);
    bgMap.on('idle', hideLabels);

    if (bgMap.isStyleLoaded()) {
      hideLabels();
    }

    let animationFrameId: number;
    const rotateSpeed = -0.0125; // 3x slower rotation, halved again (from -0.025 to -0.0125)

    const rotate = () => {
      if (bgMapRef.current) {
        try {
          const center = bgMapRef.current.getCenter();
          center.lng = (center.lng + rotateSpeed) % 360;
          bgMapRef.current.setCenter(center);
        } catch (e) {
          // Ignore center manipulation error on unmount
        }
        animationFrameId = requestAnimationFrame(rotate);
      }
    };

    bgMap.once('load', () => {
      const params = new URLSearchParams(window.location.search);
      const hasLocation = params.has('lat') || params.has('lng') || params.has('zoom');
      const hasDeepLink = params.has('itemId') || params.has('termId') || params.has('featureId');
      if (!hasLocation && !hasDeepLink) {
        rotate();
      }
    });

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (bgMapRef.current) {
        bgMapRef.current.remove();
        bgMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!bgMapRef.current) return;
    bgMapRef.current.setStyle(isMapDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  }, [isMapDarkMode]);

  useEffect(() => {
    if (!mapboxgl.supported() || !mapContainer.current) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlLat = parseFloat(urlParams.get('lat') || '');
    const urlLng = parseFloat(urlParams.get('lng') || '');
    const urlZoom = parseFloat(urlParams.get('zoom') || '');

    const isTouchViewport = typeof window !== 'undefined' && window.innerWidth < 1024;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isMapDarkMode ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
      center: (!isNaN(urlLat) && !isNaN(urlLng)) ? [urlLng, urlLat] : [-98.5795, 39.8283],
      zoom: !isNaN(urlZoom) ? urlZoom : 4.0,
      projection: { name: 'globe' } as any,
      trackResize: true,
      // On touch, disable rotate/pitch so one-finger pan and pinch-zoom don't
      // fight an accidental two-finger rotation; keeps the map gesture model simple.
      ...(isTouchViewport ? { dragRotate: false, pitchWithRotate: false, touchPitch: false } : {})
    });
    if (isTouchViewport) {
      map.touchZoomRotate.disableRotation();
    }
    mapRef.current = map;

    // Stop main map rotation on any user interaction
    map.on('mousedown', stopMainMapRotation);
    map.on('touchstart', stopMainMapRotation);
    map.on('zoomstart', stopMainMapRotation);
    map.on('dragstart', stopMainMapRotation);
    map.on('rotatestart', stopMainMapRotation);
    map.on('movestart', (e) => {
      if (e.originalEvent) {
        stopMainMapRotation();
      }
    });


    let mainMapAnimFrameId: number;
    const rotateSpeed = -0.0125; // Same rotation speed (half of -0.025)

    const rotateMainMap = () => {
      if (mapRef.current && isMainMapRotatingRef.current) {
        try {
          const center = mapRef.current.getCenter();
          center.lng = (center.lng + rotateSpeed) % 360;
          mapRef.current.setCenter(center);
        } catch (e) {
          // Ignore center manipulation error on unmount
        }
        mainMapAnimFrameId = requestAnimationFrame(rotateMainMap);
      }
    };

    map.once('load', () => {
      setIsMapLoaded(true);
      rotateMainMap();
    });
    
    map.on('click', (e) => {
      if (isPinningOnMapRef.current) {
        const { lng, lat } = e.lngLat;
        setSubLongitude(lng.toFixed(6));
        setSubLatitude(lat.toFixed(6));
        setIsPinningOnMap(false);
        setIsSubmitOpen(true);
        (e as any)._clickHandled = true;
        return;
      }

      if ((e as any)._clickHandled) return;

      // 0. Prevent clearing selection when clicking on any travel waypoint details
      const travelFeatures = map.queryRenderedFeatures(e.point, {
        layers: [
          'selected-travel-waypoints-circles',
          'selected-travel-waypoints-labels',
          'selected-travel-waypoints-names'
        ].filter(id => map.getLayer(id))
      });
      if (travelFeatures && travelFeatures.length > 0) {
        (e as any)._clickHandled = true;
        return;
      }

      // 1. Check if we clicked on a master pin
      const pinFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['master-unclustered-pins', 'people-group-pins-symbol'].filter(id => map.getLayer(id))
      });

      if (pinFeatures && pinFeatures.length > 0) {
        const clickedId = pinFeatures[0].properties?.id;
        const matchedRecord = combinedPointsAndLinesData.find(item => String(item.id) === String(clickedId));
        if (matchedRecord) {
          (e as any)._clickHandled = true;
          handleLocationItemClick(matchedRecord);
          return;
        }
      }

      // 2. See if we clicked inside any National Park/Reserve boundary polygon on the map
      const clickedFeatures = map.queryRenderedFeatures(e.point);

      // If we clicked directly on our highlight layer, treat it as handled to prevent deselection
      const clickedHighlight = clickedFeatures.find(f => {
        return f.layer?.id === 'selected-park-highlight-fill' || f.layer?.id === 'selected-park-highlight-line';
      });

      if (clickedHighlight) {
        (e as any)._clickHandled = true;
        return;
      }

      const clickedPark = clickedFeatures.find(f => {
        if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') return false;
        const sourceLayer = f.sourceLayer || '';
        const layerId = f.layer?.id || '';
        return (
          sourceLayer.includes('landuse') || 
          sourceLayer.includes('national_park') || 
          sourceLayer.includes('park') ||
          layerId.includes('park') ||
          layerId.includes('landuse') ||
          f.properties?.class === 'national_park' ||
          f.properties?.class === 'park'
        );
      });

      if (clickedPark) {
        const featName = clickedPark.properties?.name || clickedPark.properties?.name_en || clickedPark.properties?.name_es;
        if (featName) {
          const matchedRecord = combinedPointsAndLinesData.find(item => {
            const isParkCat = item.categories && item.categories.includes('National Parks & Reserves');
            return isParkCat && matchParkName(featName, item.name);
          });
          if (matchedRecord) {
            (e as any)._clickHandled = true;
            handleLocationItemClick(matchedRecord);
            return;
          }
        }
      }

      // 3. Fallback check for line layers
      const lineFeatures = map.queryRenderedFeatures(e.point, {
        layers: (lineLayersRef.current || []).filter(id => map.getLayer(id))
      });

      if (lineFeatures && lineFeatures.length > 0) {
        return;
      }

      // 4. Otherwise, empty space click clears selection
      setSelectedFeature(null);
      setIsRightCollapsed(true);
      setActiveWaypointIndex(null);
    });

    map.on('style.load', () => {
      // Whiten/Darken land and common decorative layers
      const layersToColor = [
        'background',
        'landuse',
        'industrial',
        'hospital',
        'school',
        'glacier',
        'wood',
        'pitch'
      ];
      
      const themeColor = darkModeRef.current ? '#0a0a0a' : '#ffffff';
      const waterColor = darkModeRef.current ? '#1a1a1a' : '#f0f0f0';
      
      layersToColor.forEach(layer => {
        if (map.getLayer(layer)) {
          if (layer.includes('outline')) {
            map.setPaintProperty(layer, 'line-color', themeColor);
          } else if (layer === 'background') {
            map.setPaintProperty(layer, 'background-color', themeColor);
          } else {
            map.setPaintProperty(layer, 'fill-color', themeColor);
          }
        }
      });
      
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', waterColor);
      }

      const iconsToLoad = [
        'ancient-texts', 'bigfoot-sightings', 'blurred-on-google', 'burial-mounds',
        'crop-circles', 'cryptid-sightings', 'Megaliths', 'dumbs',
        'entrances-to-underworld', 'ghosts', 'giants', 'megaliths',
        'national-parks-reserves', 'ufo-sightings', 'map-pin', 'petroglyphs',
        'meteors', 'ley-lines', 'archaeological-finds', 'biblical-discoveries', 'geoglyphs'
      ];
      
      let loadedCount = 0;
      iconsToLoad.forEach(iconName => {
        const path = `/icons/icon-${iconName}.svg`;
        map.loadImage(path, (error, image) => {
          if (!error && image) {
            if (!map.hasImage(iconName)) map.addImage(iconName, image);
            loadedCount++;
            if (loadedCount === iconsToLoad.length) {
              setIsStyleLoaded(true);
            }
          } else {
            if (iconName === 'petroglyphs') {
              // Try loading cave drawings as a fallback for petroglyphs if the file is missing
              map.loadImage('/icons/icon-cave-drawings.svg', (fallbackError, fallbackImage) => {
                if (!fallbackError && fallbackImage) {
                  if (!map.hasImage('petroglyphs')) map.addImage('petroglyphs', fallbackImage);
                }
                loadedCount++;
                if (loadedCount === iconsToLoad.length) {
                  setIsStyleLoaded(true);
                }
              });
            } else {
              loadedCount++;
              if (loadedCount === iconsToLoad.length) {
                setIsStyleLoaded(true);
              }
            }
          }
        });
      });
    });

    return () => {
      if (mainMapAnimFrameId) {
        cancelAnimationFrame(mainMapAnimFrameId);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    setIsStyleLoaded(false);
    mapRef.current.setStyle(isMapDarkMode ? MAP_STYLE_DARK : MAP_STYLE_LIGHT);
  }, [isMapDarkMode]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.resize();
    }
  }, [isLeftCollapsed, isRightCollapsed, isTimelineCollapsed, selectedFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    // Dynamically style standard Mapbox layers for national parks (persistent full-time)
    const targetColor = layerColors['National Parks & Reserves'] || '#9FF3BC';
    const standardParkLayers = ['national-park', 'landuse-park', 'park-outline', 'national-park-line', 'landuse-park-outline'];
    standardParkLayers.forEach(layer => {
      if (map.getLayer(layer)) {
        if (layer.includes('outline') || layer.includes('line')) {
          map.setPaintProperty(layer, 'line-color', targetColor);
          map.setPaintProperty(layer, 'line-opacity', isMapDarkMode ? 0.35 : 0.20);
        } else {
          map.setPaintProperty(layer, 'fill-color', targetColor);
          map.setPaintProperty(layer, 'fill-opacity', isMapDarkMode ? 0.12 : 0.08);
        }
      }
    });

    // Register source and layers for national park dynamic highlight
    if (!map.getSource('selected-park-highlight-src')) {
      map.addSource('selected-park-highlight-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('selected-park-highlight-fill')) {
      map.addLayer({
        id: 'selected-park-highlight-fill',
        type: 'fill',
        source: 'selected-park-highlight-src',
        paint: {
          'fill-color': targetColor,
          'fill-opacity': isMapDarkMode ? 0.45 : 0.35,
          'fill-opacity-transition': { duration: 450 }
        }
      }, map.getLayer('master-unclustered-pins') ? 'master-unclustered-pins' : undefined);
    } else {
      map.setPaintProperty('selected-park-highlight-fill', 'fill-color', targetColor);
      map.setPaintProperty('selected-park-highlight-fill', 'fill-opacity', isMapDarkMode ? 0.45 : 0.35);
    }

    if (!map.getLayer('selected-park-highlight-line')) {
      map.addLayer({
        id: 'selected-park-highlight-line',
        type: 'line',
        source: 'selected-park-highlight-src',
        paint: {
          'line-color': targetColor,
          'line-width': 4.0,
          'line-opacity': 0.50,
          'line-opacity-transition': { duration: 450 },
          'line-width-transition': { duration: 450 }
        }
      }, map.getLayer('master-unclustered-pins') ? 'master-unclustered-pins' : undefined);
    } else {
      map.setPaintProperty('selected-park-highlight-line', 'line-color', targetColor);
      map.setPaintProperty('selected-park-highlight-line', 'line-width', 4.0);
      map.setPaintProperty('selected-park-highlight-line', 'line-opacity', 0.50);
    }

    const currentPoints = visibleData.filter(p => p.type === 'Point');
    currentPoints.sort((a, b) => {
      const likesA = likes[String(a.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
      const likesB = likes[String(b.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
      if (likesA !== likesB) return likesA - likesB;

      const getTier = (item: any) => {
        const imgs = item.images || [];
        if (imgs.length === 0) return 1;
        if (imgs.some(isVideoUrl)) return 3;
        return 2;
      };

      const tierA = getTier(a);
      const tierB = getTier(b);
      if (tierA !== tierB) return tierA - tierB;

      return b.name.localeCompare(a.name);
    });

    const currentLines = visibleData.filter(l => l.type === 'LineString');
    currentLines.sort((a, b) => {
      const likesA = likes[String(a.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
      const likesB = likes[String(b.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0;
      if (likesA !== likesB) return likesA - likesB;

      const getTier = (item: any) => {
        const imgs = item.images || [];
        if (imgs.length === 0) return 1;
        if (imgs.some(isVideoUrl)) return 3;
        return 2;
      };

      const tierA = getTier(a);
      const tierB = getTier(b);
      if (tierA !== tierB) return tierA - tierB;

      return b.name.localeCompare(a.name);
    });

    const pointsGeoJSON: any = {
      type: 'FeatureCollection',
      features: currentPoints.map(pt => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt.coordinates },
        properties: { id: pt.id, category: pt.categories[0], isPeopleGroup: pt.isPeopleGroup || false }
      }))
    };

    let circleColorExpression: any = '#b6a6ff';
    if (uniqueCategories.length > 0) {
      const matchExpr: any = ['match', ['get', 'category']];
      uniqueCategories.forEach(cat => {
        matchExpr.push(cat);
        matchExpr.push(layerColors[cat] || '#b6a6ff');
      });
      matchExpr.push('#b6a6ff'); // Default
      circleColorExpression = matchExpr;
    }

    const circleStrokeColor = isMapDarkMode ? '#000000' : '#FFFFFF';

    const source = map.getSource('master-anomalies-src');
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData(pointsGeoJSON);
    } else {
      map.addSource('master-anomalies-src', { type: 'geojson', data: pointsGeoJSON });
    }

    if (map.getLayer('master-unclustered-pins')) {
      map.setPaintProperty('master-unclustered-pins', 'circle-color', circleColorExpression);
      map.setPaintProperty('master-unclustered-pins', 'circle-stroke-width', 1);
      map.setPaintProperty('master-unclustered-pins', 'circle-stroke-color', circleStrokeColor);
      map.setPaintProperty('master-unclustered-pins', 'circle-opacity', 1.0);
      map.setPaintProperty('master-unclustered-pins', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        3, 3.5,
        12, 8
      ]);
      map.setFilter('master-unclustered-pins', ['!=', ['get', 'isPeopleGroup'], true]);
    } else {
      map.addLayer({
        id: 'master-unclustered-pins',
        type: 'circle',
        source: 'master-anomalies-src',
        filter: ['!=', ['get', 'isPeopleGroup'], true],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            3, 3.5,
            12, 8
          ],
          'circle-color': circleColorExpression,
          'circle-opacity': 1.0,
          'circle-stroke-width': 1,
          'circle-stroke-color': circleStrokeColor
        }
      });

      map.on('click', 'master-unclustered-pins', (e) => {
        if (!e.features || !e.features.length) return;
        (e as any)._clickHandled = true;
        const clickedId = e.features[0].properties?.id;
        const matchedRecord = combinedDataRef.current.find(item => String(item.id) === String(clickedId));
        if (matchedRecord) {
          handleLocationItemClick(matchedRecord);
        }
      });

      map.on('mousemove', 'master-unclustered-pins', (e) => {
        if (!e.features || !e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        
        const clickedId = e.features[0].properties?.id;

        // If the hovered feature is already selected, clear hover states and return early
        if (selectedFeatureRef.current && String(selectedFeatureRef.current.id) === String(clickedId)) {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove();
            hoverPopupRef.current = null;
          }
          hoveredFeatureIdRef.current = null;
          return;
        }

        if (hoveredFeatureIdRef.current === clickedId) return;
        
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
        
        hoveredFeatureIdRef.current = clickedId;
        
        const matchedRecord = combinedDataRef.current.find(item => String(item.id) === String(clickedId));
        if (matchedRecord) {
          const geometry = e.features[0].geometry;
          const coords = geometry.type === 'Point' 
            ? (geometry as any).coordinates as [number, number] 
            : [e.lngLat.lng, e.lngLat.lat] as [number, number];
            
          hoverTimeoutRef.current = setTimeout(() => {
            if (hoverPopupRef.current) hoverPopupRef.current.remove();
            
            const tooltipContainer = document.createElement('div');
            tooltipContainer.className = 'label-fade-in';
            // Simple Title Case: capitalize first letter of each word
            tooltipContainer.innerText = matchedRecord.name.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            tooltipContainer.style.background = darkModeRef.current ? '#ffffff' : '#000000';
            tooltipContainer.style.color = darkModeRef.current ? '#000000' : '#ffffff';
            tooltipContainer.style.padding = '0 12px';
            tooltipContainer.style.height = '22px';
            tooltipContainer.style.display = 'flex';
            tooltipContainer.style.alignItems = 'center';
            tooltipContainer.style.borderRadius = '50px';
            tooltipContainer.style.fontSize = '10px';
            tooltipContainer.style.fontWeight = '500';
            tooltipContainer.style.fontFamily = '"Space Mono", monospace';
            tooltipContainer.style.whiteSpace = 'nowrap';
            tooltipContainer.style.position = 'relative';
            tooltipContainer.style.pointerEvents = 'none';
            
            // Triangle arrow below bubble
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.bottom = '-8px';
            arrow.style.left = '50%';
            arrow.style.transform = 'translateX(-50%)';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderLeft = '8px solid transparent';
            arrow.style.borderRight = '8px solid transparent';
            arrow.style.borderTop = `8px solid ${darkModeRef.current ? '#ffffff' : '#000000'}`;
            tooltipContainer.appendChild(arrow);
            
            hoverPopupRef.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: 'hover-tooltip-popup',
              anchor: 'bottom',
              offset: [0, -17]
            })
            .setLngLat(coords)
            .setDOMContent(tooltipContainer)
            .addTo(map);
          }, 700);
        }
      });

      map.on('mouseleave', 'master-unclustered-pins', () => {
        map.getCanvas().style.cursor = '';
        hoveredFeatureIdRef.current = null;
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      });
    }

    if (!map.getLayer('people-group-pins-symbol')) {
      map.addLayer({
        id: 'people-group-pins-symbol',
        type: 'symbol',
        source: 'master-anomalies-src',
        filter: ['==', ['get', 'isPeopleGroup'], true],
        layout: {
          'text-field': '✖',
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            3, 18,
            12, 32
          ],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#BCA7C7',
          'text-halo-color': isMapDarkMode ? '#000000' : '#ffffff',
          'text-halo-width': 2.5
        }
      });

      map.on('click', 'people-group-pins-symbol', (e) => {
        if (!e.features || !e.features.length) return;
        (e as any)._clickHandled = true;
        const clickedId = e.features[0].properties?.id;
        const matchedRecord = combinedDataRef.current.find(item => String(item.id) === String(clickedId));
        if (matchedRecord) {
          handleLocationItemClick(matchedRecord);
        }
      });

      map.on('mousemove', 'people-group-pins-symbol', (e) => {
        if (!e.features || !e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        
        const clickedId = e.features[0].properties?.id;

        // If the hovered feature is already selected, clear hover states and return early
        if (selectedFeatureRef.current && String(selectedFeatureRef.current.id) === String(clickedId)) {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove();
            hoverPopupRef.current = null;
          }
          hoveredFeatureIdRef.current = null;
          return;
        }

        if (hoveredFeatureIdRef.current === clickedId) return;
        
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
        
        hoveredFeatureIdRef.current = clickedId;
        
        const matchedRecord = combinedDataRef.current.find(item => String(item.id) === String(clickedId));
        if (matchedRecord) {
          const geometry = e.features[0].geometry;
          const coords = geometry.type === 'Point' 
            ? (geometry as any).coordinates as [number, number] 
            : [e.lngLat.lng, e.lngLat.lat] as [number, number];
            
          hoverTimeoutRef.current = setTimeout(() => {
            if (hoverPopupRef.current) hoverPopupRef.current.remove();
            
            const tooltipContainer = document.createElement('div');
            tooltipContainer.className = 'label-fade-in';
            // Simple Title Case: capitalize first letter of each word
            tooltipContainer.innerText = matchedRecord.name.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            tooltipContainer.style.background = darkModeRef.current ? '#ffffff' : '#000000';
            tooltipContainer.style.color = darkModeRef.current ? '#000000' : '#ffffff';
            tooltipContainer.style.padding = '0 12px';
            tooltipContainer.style.height = '22px';
            tooltipContainer.style.display = 'flex';
            tooltipContainer.style.alignItems = 'center';
            tooltipContainer.style.borderRadius = '50px';
            tooltipContainer.style.fontSize = '10px';
            tooltipContainer.style.fontWeight = '500';
            tooltipContainer.style.fontFamily = '"Space Mono", monospace';
            tooltipContainer.style.whiteSpace = 'nowrap';
            tooltipContainer.style.position = 'relative';
            tooltipContainer.style.pointerEvents = 'none';
            
            // Triangle arrow below bubble
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.bottom = '-8px';
            arrow.style.left = '50%';
            arrow.style.transform = 'translateX(-50%)';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderLeft = '8px solid transparent';
            arrow.style.borderRight = '8px solid transparent';
            arrow.style.borderTop = `8px solid ${darkModeRef.current ? '#ffffff' : '#000000'}`;
            tooltipContainer.appendChild(arrow);
            
            hoverPopupRef.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: 'hover-tooltip-popup',
              anchor: 'bottom',
              offset: [0, -17]
            })
            .setLngLat(coords)
            .setDOMContent(tooltipContainer)
            .addTo(map);
          }, 700);
        }
      });

      map.on('mouseleave', 'people-group-pins-symbol', () => {
        map.getCanvas().style.cursor = '';
        hoveredFeatureIdRef.current = null;
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      });
    } else {
      map.setPaintProperty('people-group-pins-symbol', 'text-color', '#BCA7C7');
      map.setPaintProperty('people-group-pins-symbol', 'text-halo-color', isMapDarkMode ? '#000000' : '#ffffff');
    }

    lineLayersRef.current.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });
    lineLayersRef.current = [];

    currentLines.forEach((line, index) => {
      if (!line.coordinates || !Array.isArray(line.coordinates) || line.coordinates.length === 0) return;
      const verifiedCoords = line.coordinates.filter((coord: any) => Array.isArray(coord) && coord.length === 2 && isValidLngLat(coord[0], coord[1]));
      if (verifiedCoords.length < 2) return; 

      const sourceLayerId = `line-layer-${line.id}-${index}`;
      const lineColor = layerColors[line.categories[0]] || '#b6a6ff';

      try {
        map.addSource(sourceLayerId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: verifiedCoords }, properties: {} }
        });
        map.addLayer({
          id: sourceLayerId, type: 'line', source: sourceLayerId,
          paint: { 'line-color': lineColor, 'line-width': 2, 'line-opacity': 1.0 }
        });
        
        map.on('click', sourceLayerId, (e) => {
          (e as any)._clickHandled = true;
          handleLocationItemClick(line);
        });
        map.on('mouseenter', sourceLayerId, () => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', sourceLayerId, () => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
        });

        lineLayersRef.current.push(sourceLayerId);
      } catch (err) { console.error(err); }
    });

  }, [visibleData, isStyleLoaded, layerColors, pointsAndLinesData, isMapDarkMode]);

  const handleViewOnMap = (timelineItem: any) => {
    setCurrentPage('map');
    const mapRecord = combinedPointsAndLinesData.find(r => String(r.id) === String(timelineItem.id));
    if (mapRecord) {
      setActiveLayers(prev => ({
        ...prev,
        [mapRecord.category]: true
      }));
      setExpandedLayers(prev => ({
        ...prev,
        [mapRecord.category]: true
      }));
      setSearchQuery('');
      // Wait for map display and coordinate mapping
      setTimeout(() => {
        handleLocationItemClick(mapRecord);
      }, 50);
    }
  };

  const handleViewOnTimeline = (timelineItemId: string) => {
    setCurrentPage('timeline');
    const item = combinedTimelineItems.find(t => String(t.id) === String(timelineItemId));
    if (item) {
      setSelectedTimelineItem(item);
    }
  };

  const handleLocationItemClick = (feature: any) => {
    stopMainMapRotation();
    if (!feature || !feature.coordinates || !mapRef.current) return;

    // Record if hover popup was active to determine click transition style
    wasHoverTooltipVisibleRef.current = !!hoverPopupRef.current;

    // Immediately clear active hover states to smooth hover-to-click transition
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (hoverPopupRef.current) {
      hoverPopupRef.current.remove();
      hoverPopupRef.current = null;
    }
    hoveredFeatureIdRef.current = null;

    setSelectedFeature(feature);
    setIsRightCollapsed(false);
    setMobileSheetSnap('half'); // open the mobile sheet at peek height
    setActiveWaypointIndex(null);

    // Auto-expand the categories this location belongs to in the sidebar
    if (feature.categories && Array.isArray(feature.categories)) {
      setExpandedLayers(prev => {
        const next = { ...prev };
        feature.categories.forEach((cat: string) => {
          next[cat] = true;
        });
        return next;
      });
    } else if (feature.category) {
      setExpandedLayers(prev => ({
        ...prev,
        [feature.category]: true
      }));
    }

    if (feature.type === 'LineString' && Array.isArray(feature.coordinates) && feature.coordinates.length > 0) {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;

      feature.coordinates.forEach((coord: any) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }
      });

      if (minLng !== Infinity && maxLng !== -Infinity) {
        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 120, maxZoom: 8, duration: 1500 }
        );
        return;
      }
    }

    const flyTarget = feature.coordinates;
    mapRef.current.flyTo({ 
      center: flyTarget, 
      zoom: 10, 
      duration: 1500,
      essential: true
    });
  };

  useEffect(() => {
    if (mapRef.current && selectedFeature) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
      }

      const coords = selectedFeature.type === 'LineString' ? selectedFeature.coordinates[0] : selectedFeature.coordinates;
      const category = selectedFeature.categories[0];
      const color = layerColors[category] || '#b6a6ff';
      const icon = LAYER_CONFIG[category]?.icon || '/icons/icon-map-pin.svg';

      const el = document.createElement('div');
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.pointerEvents = 'none';

      // Inner element to apply transition animation safely without interfering with Mapbox's positioning transform style
      const inner = document.createElement('div');
      inner.style.display = 'flex';
      inner.style.flexDirection = 'column';
      inner.style.alignItems = 'center';

      // The label bubble
      const label = document.createElement('div');
      
      const useSlideUp = wasHoverTooltipVisibleRef.current;
      wasHoverTooltipVisibleRef.current = false; // Reset state immediately
      
      if (useSlideUp) {
        label.className = 'label-slide-up-from-hover';
      } else {
        label.className = 'label-fade-in';
      }
      // Simple Title Case: capitalize first letter of each word
      label.innerText = selectedFeature.name.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      label.style.background = isMapDarkMode ? '#ffffff' : '#000000';
      label.style.color = isMapDarkMode ? '#000000' : '#ffffff';
      label.style.padding = '0 12px';
      label.style.height = '22px';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.borderRadius = '50px';
      label.style.fontSize = '10px';
      label.style.fontWeight = '500';
      label.style.fontFamily = '"Space Mono", monospace';
      label.style.whiteSpace = 'nowrap';
      label.style.marginBottom = '14px';
      label.style.position = 'relative';

      // Triangle arrow below bubble
      const arrow = document.createElement('div');
      arrow.style.position = 'absolute';
      arrow.style.bottom = '-8px';
      arrow.style.left = '50%';
      arrow.style.transform = 'translateX(-50%)';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '8px solid transparent';
      arrow.style.borderRight = '8px solid transparent';
      arrow.style.borderTop = `8px solid ${isMapDarkMode ? '#ffffff' : '#000000'}`;
      label.appendChild(arrow);

      inner.appendChild(label);

      // Larger category icon with border
      const iconOuter = document.createElement('div');
      iconOuter.className = 'pin-bounce-in';
      iconOuter.style.width = '30px';
      iconOuter.style.height = '30px';
      iconOuter.style.display = 'flex';
      iconOuter.style.alignItems = 'center';
      iconOuter.style.justifyContent = 'center';
      iconOuter.style.boxSizing = 'border-box';

      if (selectedFeature.isPeopleGroup) {
        iconOuter.style.borderRadius = '0';
        iconOuter.style.background = 'transparent';
        iconOuter.style.border = 'none';
        iconOuter.style.boxShadow = 'none';

        const xSpan = document.createElement('span');
        xSpan.innerText = '✖';
        xSpan.style.fontFamily = '"Space Mono", monospace';
        xSpan.style.fontWeight = '900';
        xSpan.style.fontSize = '48px';
        xSpan.style.color = color;
        xSpan.style.lineHeight = '1';
        xSpan.style.webkitTextStroke = `3px ${color}`;
        xSpan.style.textShadow = isMapDarkMode
          ? '0 0 4px #000000, 0 0 4px #000000, 0 0 4px #000000'
          : '0 0 4px #ffffff, 0 0 4px #ffffff, 0 0 4px #ffffff';
        iconOuter.appendChild(xSpan);
      } else {
        iconOuter.style.borderRadius = '50%';
        iconOuter.style.background = color;
        iconOuter.style.border = `1px solid ${isMapDarkMode ? '#ffffff' : '#000000'}`;
        iconOuter.style.boxShadow = `0 3px 0 0 ${isMapDarkMode ? '#ffffff' : '#000000'}`;
        iconOuter.style.overflow = 'hidden';

        const img = document.createElement('img');
        img.src = icon;
        img.onerror = () => {
          img.src = '/icons/icon-cave-drawings.svg';
        };
        img.style.width = '30px';
        img.style.height = '30px';
        iconOuter.appendChild(img);
      }

      inner.appendChild(iconOuter);

      el.appendChild(inner);

      selectedMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, 15] 
      })
      .setLngLat(coords)
      .addTo(mapRef.current);

    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, [selectedFeature, layerColors, isMapDarkMode]);

  // Synchronize national park area boundary highlight dynamically using queryRenderedFeatures
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded || !map.isStyleLoaded()) return;

    const isPark = selectedFeature && selectedFeature.categories && selectedFeature.categories.includes('National Parks & Reserves');
    const targetName = isPark ? selectedFeature.name : '';

    const getGeometryWeight = (features: any[]): number => {
      if (!features) return 0;
      let weight = 0;
      features.forEach(f => {
        if (f.geometry && f.geometry.coordinates) {
          const checkCoords = (coords: any): void => {
            if (Array.isArray(coords)) {
              if (coords.length > 0 && typeof coords[0] === 'number') {
                weight++;
              } else {
                coords.forEach(checkCoords);
              }
            }
          };
          checkCoords(f.geometry.coordinates);
        }
      });
      return weight;
    };

    const getGeometryFingerprint = (geom: any): string => {
      if (!geom) return '';
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        const outerRing = geom.coordinates[0];
        if (outerRing.length > 0) {
          return `${geom.type}-${outerRing.length}-${outerRing[0][0]}-${outerRing[0][1]}`;
        }
      } else if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates[0] && geom.coordinates[0][0]) {
        const outerRing = geom.coordinates[0][0];
        if (outerRing.length > 0) {
          return `${geom.type}-${outerRing.length}-${outerRing[0][0]}-${outerRing[0][1]}`;
        }
      }
      return JSON.stringify(geom);
    };

    const updateSelectedParkHighlight = (): void => {
      if (!map || !map.isStyleLoaded()) return;

      const src = map.getSource('selected-park-highlight-src') as mapboxgl.GeoJSONSource;
      if (!src) return;

      if (!isPark) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      // 1. Immediately display the current cached geometries to prevent flickering during flights
      const cached = selectedParkGeomRef.current[targetName];
      if (cached && cached.features && cached.features.length > 0) {
        src.setData({
          type: 'FeatureCollection',
          features: cached.features
        });
      }

      const coords = selectedFeature.type === 'LineString' ? selectedFeature.coordinates[0] : selectedFeature.coordinates;
      let lng: number | null = null;
      let lat: number | null = null;
      if (coords) {
        if (typeof coords.lng === 'number' && typeof coords.lat === 'number') {
          lng = coords.lng;
          lat = coords.lat;
        } else if (Array.isArray(coords) && coords.length === 2) {
          lng = coords[0];
          lat = coords[1];
        }
      }

      if (lng === null || lat === null) return;

      // Ensure camera is within close proximity (1.5 degrees) before querying rendered map features
      const mapCenter = map.getCenter();
      const distLng = Math.abs(mapCenter.lng - lng);
      const distLat = Math.abs(mapCenter.lat - lat);
      if (distLng > 1.5 || distLat > 1.5) {
        if (!cached) {
          src.setData({ type: 'FeatureCollection', features: [] });
        }
        return;
      }

      const proj = map.project([lng, lat]);
      if (!proj || isNaN(proj.x) || isNaN(proj.y)) return;

      const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
        [proj.x - 850, proj.y - 850],
        [proj.x + 850, proj.y + 850]
      ];
      const renderedFeats = map.queryRenderedFeatures(bbox);

      // Fast deduplicator to prevent duplicate overlapping geometries and opacity stacking
      const seenFingerprints = new Set<string>();
      const deduplicateFeatures = (feats: mapboxgl.MapboxGeoJSONFeature[]) => {
        const unique: any[] = [];
        feats.forEach(f => {
          const fp = getGeometryFingerprint(f.geometry);
          if (!seenFingerprints.has(fp)) {
            seenFingerprints.add(fp);
            unique.push({
              type: 'Feature',
              geometry: f.geometry,
              properties: f.properties
            });
          }
        });
        return unique;
      };

      // Step 1: Scan for polygons that explicitly match the park name
      const nameMatchedFeatures = renderedFeats.filter(f => {
        if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') return false;
        
        const sourceLayer = f.sourceLayer || '';
        const layerId = f.layer?.id || '';
        
        const isParkLayerOrClass = 
          sourceLayer.includes('landuse') || 
          sourceLayer.includes('national_park') || 
          sourceLayer.includes('park') ||
          layerId.includes('park') ||
          layerId.includes('landuse') ||
          f.properties?.class === 'national_park' ||
          f.properties?.class === 'park';

        if (!isParkLayerOrClass) return false;

        const name = f.properties?.name || f.properties?.name_en || f.properties?.name_es;
        return name && matchParkName(name, targetName);
      });

      if (nameMatchedFeatures.length > 0) {
        const unique = deduplicateFeatures(nameMatchedFeatures);
        if (unique.length > 0) {
          const sorted = [...unique].sort((a, b) => {
            const nameA = a.properties?.name || a.properties?.name_en || a.properties?.name_es || '';
            const nameB = b.properties?.name || b.properties?.name_en || b.properties?.name_es || '';
            const scoreA = getMatchScore(nameA, targetName);
            const scoreB = getMatchScore(nameB, targetName);
            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }
            return getGeometryWeight([b]) - getGeometryWeight([a]);
          });
          const mapped = [sorted[0]];
          const name = sorted[0].properties?.name || sorted[0].properties?.name_en || sorted[0].properties?.name_es || '';
          const currentScore = getMatchScore(name, targetName);
          const cachedScore = cached ? (cached.score || 0) : 0;
          const currentWeight = getGeometryWeight(mapped);
          const cachedWeight = cached ? getGeometryWeight(cached.features) : 0;

          if (!cached || !cached.precise || currentScore > cachedScore || (currentScore === cachedScore && currentWeight > cachedWeight)) {
            selectedParkGeomRef.current[targetName] = { precise: true, score: currentScore, features: mapped };
            src.setData({
              type: 'FeatureCollection',
              features: mapped
            });
          }
        }
        return;
      }

      if (cached && cached.precise && cached.score === 100) {
        return;
      }

      // Step 2: Proximity Fallback 1 - Filter for features explicitly classed as national_park
      const nationalParkPolys = renderedFeats.filter(f => {
        if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') return false;
        
        const sourceLayer = f.sourceLayer || '';
        const layerId = f.layer?.id || '';
        
        return (
          f.properties?.class === 'national_park' ||
          sourceLayer.includes('national_park') ||
          layerId.includes('national-park')
        );
      });

      if (nationalParkPolys.length > 0) {
        const unique = deduplicateFeatures(nationalParkPolys);
        if (unique.length > 0) {
          const sorted = [...unique].sort((a, b) => getGeometryWeight([b]) - getGeometryWeight([a]));
          const mapped = [sorted[0]];
          const currentWeight = getGeometryWeight(mapped);
          const cachedWeight = cached ? getGeometryWeight(cached.features) : 0;

          if (!cached || (!cached.precise && currentWeight > cachedWeight)) {
            selectedParkGeomRef.current[targetName] = { precise: false, score: 0, features: mapped };
            src.setData({
              type: 'FeatureCollection',
              features: mapped
            });
          }
        }
        return;
      }

      // Step 3: Proximity Fallback 2 - Filter for general landuse or park polygons near coordinates
      const generalParkPolys = renderedFeats.filter(f => {
        if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') return false;
        
        const sourceLayer = f.sourceLayer || '';
        const layerId = f.layer?.id || '';
        
        return (
          f.properties?.class === 'park' ||
          sourceLayer.includes('landuse') ||
          sourceLayer.includes('park') ||
          layerId.includes('park') ||
          layerId.includes('landuse')
        );
      });

      if (generalParkPolys.length > 0) {
        const unique = deduplicateFeatures(generalParkPolys);
        if (unique.length > 0) {
          const sorted = [...unique].sort((a, b) => getGeometryWeight([b]) - getGeometryWeight([a]));
          const mapped = [sorted[0]];
          const currentWeight = getGeometryWeight(mapped);
          const cachedWeight = cached ? getGeometryWeight(cached.features) : 0;

          if (!cached || (!cached.precise && currentWeight > cachedWeight)) {
            selectedParkGeomRef.current[targetName] = { precise: false, score: 0, features: mapped };
            src.setData({
              type: 'FeatureCollection',
              features: mapped
            });
          }
        }
        return;
      }

      if (!cached) {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    // Debounce state scheduling to collapse hundreds of redundant tile/sourcedata trigger events
    let debounceTimeoutId: any = null;
    const scheduleUpdate = () => {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }
      debounceTimeoutId = setTimeout(() => {
        updateSelectedParkHighlight();
      }, 150);
    };

    // Initialize highlight immediately
    updateSelectedParkHighlight();

    // Setup an interval to progressive-query loaded tiles during the zoom flight, safely debounced
    let intervalId: any = null;
    let attemptsCount = 0;
    if (isPark) {
      intervalId = setInterval(() => {
        attemptsCount++;
        scheduleUpdate();
        if (attemptsCount >= 10) {
          clearInterval(intervalId);
        }
      }, 400);
    }

    const handleMapStable = () => {
      scheduleUpdate();
    };

    const handleSourceData = (e: mapboxgl.MapDataEvent) => {
      if (e.dataType === 'source') {
        if (e.sourceId === 'selected-park-highlight-src' || e.sourceId.startsWith('line-layer-')) return;
        scheduleUpdate();
      }
    };

    map.on('moveend', handleMapStable);
    map.on('idle', handleMapStable);
    map.on('sourcedata', handleSourceData);

    return () => {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (map) {
        map.off('moveend', handleMapStable);
        map.off('idle', handleMapStable);
        map.off('sourcedata', handleSourceData);
        // Clean up map source on unmount or selection change to prevent overlapping highlights during flight
        try {
          if (map.isStyleLoaded() && map.getSource('selected-park-highlight-src')) {
            const cleanSrc = map.getSource('selected-park-highlight-src') as mapboxgl.GeoJSONSource;
            cleanSrc.setData({ type: 'FeatureCollection', features: [] });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [selectedFeature, isStyleLoaded, isMapDarkMode, layerColors]);

  // Synchronize travel paths and waypoints for the selected figure dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    if (activeTravelPopupRef.current) {
      fadeOutPopup(activeTravelPopupRef.current);
      activeTravelPopupRef.current = null;
    }

    // Helper to dynamically register sources and layers to avoid race conditions
    const ensureTravelLayers = () => {
      if (!map.getSource('selected-travel-path-src')) {
        map.addSource('selected-travel-path-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      if (!map.getLayer('selected-travel-path-line')) {
        map.addLayer({
          id: 'selected-travel-path-line',
          type: 'line',
          source: 'selected-travel-path-src',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': 'visible'
          },
          paint: {
            'line-color': '#90C2FF',
            'line-width': 3.0,
            'line-opacity': 0.8,
            'line-dasharray': [1.5, 1.5]
          }
        });
      }

      if (!map.getSource('selected-travel-waypoints-src')) {
        map.addSource('selected-travel-waypoints-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      if (!map.getLayer('selected-travel-waypoints-circles')) {
        map.addLayer({
          id: 'selected-travel-waypoints-circles',
          type: 'circle',
          source: 'selected-travel-waypoints-src',
          layout: {
            'visibility': 'visible'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              3, 8,
              12, 11
            ],
            'circle-color': '#90C2FF',
            'circle-stroke-width': 2,
            'circle-stroke-color': isMapDarkMode ? '#000000' : '#ffffff',
            'circle-opacity': 1.0
          }
        });
      }

      if (!map.getLayer('selected-travel-waypoints-labels')) {
        map.addLayer({
          id: 'selected-travel-waypoints-labels',
          type: 'symbol',
          source: 'selected-travel-waypoints-src',
          layout: {
            'text-field': ['get', 'stopNumber'],
            'text-size': 9.5,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'visibility': 'visible'
          },
          paint: {
            'text-color': '#000000'
          }
        });
      }

      if (!map.getLayer('selected-travel-waypoints-names')) {
        map.addLayer({
          id: 'selected-travel-waypoints-names',
          type: 'symbol',
          source: 'selected-travel-waypoints-src',
          layout: {
            'text-field': ['get', 'locationName'],
            'text-size': 9,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'visibility': 'visible'
          },
          paint: {
            'text-color': isMapDarkMode ? '#ffffff' : '#000000',
            'text-halo-color': isMapDarkMode ? '#000000' : '#ffffff',
            'text-halo-width': 1.5
          }
        });

        // Hover / Click handlers for waypoint circles
        map.on('click', 'selected-travel-waypoints-circles', (e) => {
          if (!e.features || !e.features.length) return;
          (e as any)._clickHandled = true;
          const properties = e.features[0].properties;
          const geometry = e.features[0].geometry;
          
          if (properties && properties.locationName && geometry && geometry.type === 'Point') {
            const coords = (geometry as any).coordinates as [number, number];
            const stopNum = properties.stopNumber ? parseInt(properties.stopNumber, 10) : null;
            if (stopNum !== null) {
              setActiveWaypointIndex(stopNum - 1);
            }

            if (activeTravelPopupRef.current) {
              fadeOutPopup(activeTravelPopupRef.current);
            }

            activeTravelPopupRef.current = new mapboxgl.Popup({ closeButton: false, className: 'custom-mapbox-popup', anchor: 'bottom' })
              .setLngLat(coords)
              .setHTML(`<div style="font-family: 'Space Mono', monospace; font-size: 11px; padding: 4px; border-radius: 4px; max-width: 200px; text-align: left;">
                <strong style="display: block; margin-bottom: 2px; font-size: 12px; color: #fff;">${properties.locationName}</strong>
                ${properties.displayDate ? `<span style="font-size: 10px; font-style: italic; color: #aaa; display: block; margin-bottom: 6px;">${properties.displayDate}</span>` : ''}
                <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #ddd;">${properties.description || ''}</p>
              </div>`)
              .addTo(map);
          }
        });

        map.on('mouseenter', 'selected-travel-waypoints-circles', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'selected-travel-waypoints-circles', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    };

    // Ensure layers are registered on map style load
    ensureTravelLayers();

    const pathSource = map.getSource('selected-travel-path-src') as mapboxgl.GeoJSONSource;
    const waypointsSource = map.getSource('selected-travel-waypoints-src') as mapboxgl.GeoJSONSource;

    if (!pathSource || !waypointsSource) return;

    if (selectedFeature && BIBLICAL_TRAVEL_PATHS[selectedFeature.id]) {
      const travelPath = BIBLICAL_TRAVEL_PATHS[selectedFeature.id];
      const categoryColor = layerColors[selectedFeature.categories?.[0]] || '#90C2FF';

      // Update path line coordinates
      const coords = travelPath.waypoints.map(wp => [wp.lng, wp.lat]);
      pathSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords
          },
          properties: {}
        }]
      });

      // Update waypoint point features
      waypointsSource.setData({
        type: 'FeatureCollection',
        features: travelPath.waypoints.map((wp, idx) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [wp.lng, wp.lat]
          },
          properties: {
            id: `${travelPath.figureId}-wp-${idx}`,
            locationName: wp.locationName,
            displayDate: wp.displayDate,
            description: wp.description,
            stopNumber: String(idx + 1)
          }
        }))
      });

      // Set dynamic paint colors
      if (map.getLayer('selected-travel-path-line')) {
        map.setPaintProperty('selected-travel-path-line', 'line-color', categoryColor);
      }
      if (map.getLayer('selected-travel-waypoints-circles')) {
        map.setPaintProperty('selected-travel-waypoints-circles', 'circle-color', categoryColor);
      }
    } else {
      // Clear data when no travel path figure is selected
      pathSource.setData({ type: 'FeatureCollection', features: [] });
      waypointsSource.setData({ type: 'FeatureCollection', features: [] });
    }

    return () => {
      if (activeTravelPopupRef.current) {
        fadeOutPopup(activeTravelPopupRef.current);
        activeTravelPopupRef.current = null;
      }
    };
  }, [selectedFeature, isStyleLoaded, layerColors, isMapDarkMode]);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeAssets || activeAssets.length === 0) return;
    setActiveImageIndex(prev => (prev + 1) % activeAssets.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeAssets || activeAssets.length === 0) return;
    setActiveImageIndex(prev => (prev - 1 + activeAssets.length) % activeAssets.length);
  };

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLightboxImageLoading(true);
    setIsLightboxOpen(true);
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

  const renderMediaPreview = (url: string) => {
    if (!url) return null;
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(url) || url.startsWith('/uploads/');
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const isDvidshub = /dvidshub\.net\/video\//i.test(url);
    const isMp4 = /\.(mp4|webm|ogg|ogv)/i.test(url);

    if (isYoutube) {
      let embedId = '';
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        embedId = match[2];
      }
      if (embedId) {
        return (
          <div style={{ position: 'relative', width: '240px', aspectRatio: '16/9', border: `1px solid ${theme.border}`, marginTop: '4px', overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube.com/embed/${embedId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
          </div>
        );
      }
    }

    if (isDvidshub) {
      const embedUrl = getEmbedUrl(url);
      if (embedUrl) {
        return (
          <div style={{ position: 'relative', width: '240px', aspectRatio: '16/9', border: `1px solid ${theme.border}`, marginTop: '4px', overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
          </div>
        );
      }
    }

    if (isMp4) {
      const mimeType = url.toLowerCase().endsWith('.webm') ? 'video/webm' : url.toLowerCase().endsWith('.ogv') ? 'video/ogg' : 'video/mp4';
      return (
        <video 
          controls 
          style={{ maxWidth: '240px', maxHeight: '135px', border: `1px solid ${theme.border}`, marginTop: '4px', borderRadius: '2px' }}
        >
          <source src={url} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (isImage) {
      const finalUrl = cleanAndProxyImageUrl(url);
      return (
        <div style={{ marginTop: '4px' }}>
          <img 
            src={finalUrl} 
            alt="Submission Preview" 
            referrerPolicy="no-referrer"
            style={{ maxWidth: '240px', maxHeight: '135px', objectFit: 'contain', border: `1px solid ${theme.border}`, borderRadius: '2px' }}
          />
        </div>
      );
    }

    return null;
  };

  const getCategoryIcon = (category: string) => {
    return LAYER_CONFIG[category]?.icon || LAYER_CONFIG['Default'].icon;
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  return (
    <div style={{ width: scrollbarWidth ? `calc(100vw - ${scrollbarWidth}px)` : '100vw', minHeight: '100vh', background: '#ffffff', color: '#000000', fontFamily: '"Space Mono", monospace', overflowX: 'hidden', textAlign: 'left' }}>
      
      {/* GLOBAL FULL-SCREEN LOADER OVERLAY */}
      <AnimatePresence>
        {(isInitialLoad && isLiveLoading) && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: scrollbarWidth ? `calc(100vw - ${scrollbarWidth}px)` : '100vw',
              height: '100vh',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              zIndex: 99999,
              fontFamily: '"Space Mono", monospace'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #333', borderTopColor: '#b6a6ff', animation: 'spinMapAsset 0.8s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>INITIALIZING DATA CORES</span>
              <span style={{ fontSize: '10px', color: '#a3a3a3', letterSpacing: '0.5px' }}>Compiling archive mappings and coordinates...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative', 
          overflow: 'hidden',
          background: isMapDarkMode ? '#000000' : '#ffffff',
          transition: 'background-color 0.3s ease'
        }}
      >
        
        {/* GLOBAL BACKGROUND GLOBE MAP (VISIBLE ON TIMELINE & CODEX PAGES) */}
        <div
          ref={bgMapContainer}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            opacity: (currentPage === 'codex' || currentPage === 'timeline') ? 1.0 : 0,
            zIndex: 1,
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            visibility: (currentPage === 'codex' || currentPage === 'timeline') ? 'visible' : 'hidden'
          }}
        />
        
        {/* CENTER COMPONENT: FULL SCREEN MAP BASE LAYER - MOVED TO ROOT FOR TRANSPARENT HEADER */}
        <motion.div 
          initial={false}
          animate={{ 
            opacity: currentPage === 'map' ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 1,
            pointerEvents: currentPage === 'map' ? 'auto' : 'none'
          }}
        >
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          
          {/* DARK MODE TOGGLE */}

        </motion.div>

        {/* BRAND HEADER COMPONENT — compact on mobile, nav pill replaced by the bottom tab bar */}
        <header
          style={{
            height: isMobile ? '48px' : '118px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 0 0',
            flexShrink: 0,
            zIndex: 20,
            pointerEvents: 'none',
            position: 'relative',
            background: (currentPage === 'map' || currentPage === 'codex' || currentPage === 'timeline') ? 'transparent' : (isMapDarkMode ? '#000000' : '#ffffff'),
            transition: 'background-color 0.3s ease'
          }}
        >
          <img src="/mtrh-horiz-words.svg" alt="MTRH Logo" style={{ height: isMobile ? '36px' : '78px', width: isMobile ? '107px' : '232px', pointerEvents: 'auto', filter: theme.invert }} />

          {/* CENTER NAVIGATION PILL */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 30,
            display: isMobile ? 'none' : 'flex',
            gap: '8px',
            border: `1px solid ${theme.border}`,
            padding: '4px',
            borderRadius: '20px',
            background: theme.bgTransparent
          }}>
            <motion.button 
              onClick={() => setCurrentPage('map')}
              whileHover={{
                background: currentPage === 'map'
                  ? (isMapDarkMode ? '#cccccc' : '#333333')
                  : (isMapDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
              }}
              style={{
                background: currentPage === 'map' ? theme.text : 'transparent',
                color: currentPage === 'map' ? theme.bg : theme.text,
                border: 'none',
                padding: '6px 18px',
                fontSize: '10px',
                fontFamily: '"Space Mono", monospace',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.2s ease'
              }}
            >
              Map
            </motion.button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <motion.button 
                onClick={() => setCurrentPage('timeline')}
                whileHover={{
                  background: currentPage === 'timeline'
                    ? (isMapDarkMode ? '#cccccc' : '#333333')
                    : (isMapDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                }}
                style={{
                  background: currentPage === 'timeline' ? theme.text : 'transparent',
                  color: currentPage === 'timeline' ? theme.bg : theme.text,
                  border: 'none',
                  padding: '6px 18px',
                  fontSize: '10px',
                  fontFamily: '"Space Mono", monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s ease'
                }}
              >
                Timeline
              </motion.button>
              {onboardingStep === 4 && (
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  left: '-3px',
                  right: '-3px',
                  bottom: '-3px',
                  border: '3px solid #b6a6ff',
                  boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                  pointerEvents: 'none',
                  zIndex: 9999,
                  borderRadius: '19px',
                  animation: 'radar-pulse 2s infinite'
                }} />
              )}
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <motion.button 
                onClick={() => setCurrentPage('codex')}
                whileHover={{
                  background: currentPage === 'codex'
                    ? (isMapDarkMode ? '#cccccc' : '#333333')
                    : (isMapDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                }}
                style={{
                  background: currentPage === 'codex' ? theme.text : 'transparent',
                  color: currentPage === 'codex' ? theme.bg : theme.text,
                  border: 'none',
                  padding: '6px 18px',
                  fontSize: '10px',
                  fontFamily: '"Space Mono", monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s ease'
                }}
              >
                Codex
              </motion.button>
              {onboardingStep === 5 && (
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  left: '-3px',
                  right: '-3px',
                  bottom: '-3px',
                  border: '3px solid #b6a6ff',
                  boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                  pointerEvents: 'none',
                  zIndex: 9999,
                  borderRadius: '19px',
                  animation: 'radar-pulse 2s infinite'
                }} />
              )}
            </div>
          </div>

          {/* THEME TOGGLE: FIXED TO RIGHT — single row on mobile to fit the 48px header */}
          <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: isMobile ? 'none' : 'inline',
                fontSize: '9px',
                fontFamily: '"Space Mono", monospace',
                fontWeight: 700,
                color: theme.text,
                letterSpacing: '1px'
              }}>
                {isMapDarkMode ? 'DARK MODE' : 'LIGHT MODE'}
              </span>
              <button 
                onClick={() => setIsMapDarkMode(!isMapDarkMode)}
                style={{
                  width: '32px',
                  height: '16px',
                  borderRadius: '8px',
                  background: isMapDarkMode ? '#ffffff' : '#eee', 
                  border: `1px solid ${theme.border}`,
                  position: 'relative',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isMapDarkMode ? '#000' : '#000',
                  position: 'absolute',
                  top: '2px',
                  left: isMapDarkMode ? '19px' : '2px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </button>
            </div>

            {/* ACTION LINK BUTTONS FOR SUBMISSIONS AND DESIGNATED MODERATION */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <motion.button
                  onClick={() => {
                    setSubmissionSuccess(null);
                    setSubmissionError(null);
                    if (currentPage === 'codex') {
                      if (selectedCodexNode) {
                        let curr = selectedCodexNode;
                        let limit = 10;
                        while (curr && curr.parentId && limit > 0) {
                          const p = combinedCodexNodes.find((x: any) => x.id === curr.parentId);
                          if (!p) break;
                          curr = p;
                          limit--;
                        }
                        const rootId = curr?.id;
                        if (rootId === 'biblical-apocryphal') {
                          setSubCategory('Religion');
                        } else if (rootId === 'myths-legends-root') {
                          setSubCategory('Myths / Legends');
                        } else if (rootId === 'megaliths-structures') {
                          setSubCategory('Megaliths / Structures');
                        } else if (rootId === 'supernatural-anomalies') {
                          setSubCategory('Supernatural / Anomalies');
                        } else {
                          setSubCategory('Religion');
                        }
                      } else {
                        setSubCategory('Religion');
                      }
                    } else {
                      setSubCategory('UFOs - Sightings');
                    }
                    setIsSubmitOpen(true);
                  }}
                  whileHover={{
                    background: isMapDarkMode ? '#cccccc' : '#333333',
                    scale: 1.02
                  }}
                  style={{
                    background: isMapDarkMode ? '#ffffff' : '#000000',
                    color: isMapDarkMode ? '#000000' : '#ffffff',
                    border: `1px solid ${theme.border}`,
                    padding: '0 16px',
                    height: '32px',
                    fontSize: '9px',
                    fontFamily: '"Space Mono", monospace',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={10} strokeWidth={3} />
                  <span>SUBMIT INTEL</span>
                </motion.button>
                {currentPage === 'map' && onboardingStep === 7 && (
                  <div style={{
                    position: 'absolute',
                    top: '-3px',
                    left: '-3px',
                    right: '-3px',
                    bottom: '-3px',
                    border: '3px solid #b6a6ff',
                    boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    borderRadius: '19px',
                    animation: 'radar-pulse 2s infinite'
                  }} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* MOBILE BOTTOM TAB BAR — replaces the header nav pill below 1024px */}
        {isMobile && (
          <MobileTabBar currentPage={currentPage} setCurrentPage={setCurrentPage} theme={theme} />
        )}

        {/* MOBILE FLOATING LAYERS BUTTON — opens the layers sheet on the map */}
        {isMobile && currentPage === 'map' && isLeftCollapsed && (
          <button
            onClick={() => setIsLeftCollapsed(false)}
            style={{
              position: 'fixed',
              left: '16px',
              bottom: 'calc(56px + 16px + env(safe-area-inset-bottom, 0px))',
              zIndex: 400,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '20px',
              border: `1px solid ${theme.border}`,
              background: theme.bgTransparent,
              backdropFilter: 'blur(8px)',
              color: theme.text,
              fontFamily: '"Space Mono", monospace',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer'
            }}
          >
            <img src="/icons/icon-filter.svg" style={{ width: '16px', height: '16px', filter: theme.invert }} alt="" />
            LAYERS ({Object.values(activeLayers).filter(Boolean).length})
          </button>
        )}

        {/* CORE WORKSPACE FRAMING GRID — NOW FULL BLEED OVERLAY ENVIRONMENT */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
          {/* Map Overlay Panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              visibility: currentPage === 'map' ? 'visible' : 'hidden',
              opacity: currentPage === 'map' ? 1 : 0,
              transition: 'opacity 0.3s ease, visibility 0.3s ease',
              zIndex: currentPage === 'map' ? 10 : 0
            }}
          >
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', pointerEvents: 'none', width: '100%', height: '100%' }}>
          {onboardingStep === 2 && (
            <div style={{
              position: 'absolute',
              left: isLeftCollapsed ? '20px' : '320px',
              right: isRightCollapsed ? '20px' : '320px',
              top: 0,
              bottom: isTimelineCollapsed ? 0 : '150px',
              border: '3px solid #b6a6ff',
              boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'all 0.5s ease',
              animation: 'radar-pulse 2s infinite'
            }} />
          )}
          
          {/* PROTECTIVE SIDE STRIPS */}
          <motion.div 
            initial={false}
            animate={{ 
              bottom: isTimelineCollapsed ? '0px' : '150px',
              background: theme.bg,
              borderColor: theme.border
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', top: 0, left: 0, width: '20px', borderRight: '1px solid', borderTop: '1px solid', zIndex: 100, pointerEvents: 'auto' }} 
          />
          <motion.div 
            initial={false}
            animate={{ 
              bottom: isTimelineCollapsed ? '0px' : '150px',
              background: theme.bg,
              borderColor: theme.border
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', top: 0, right: 0, width: '20px', borderLeft: '1px solid', borderTop: '1px solid', zIndex: 100, pointerEvents: 'auto' }} 
          />

          {/* LEFT COMPONENT: FILTERS PANEL (desktop drawer) / LAYERS SHEET (mobile full-screen) */}
          <motion.div
            className="custom-sidebar-scrollbar"
            initial={false}
            animate={isMobile ? {
              x: isLeftCollapsed ? '-110%' : '0%',
              background: theme.bg,
              borderColor: theme.border,
              opacity: 1
            } : {
              left: isLeftCollapsed ? collapsedPanelOffset : 20,
              bottom: (isTimelineCollapsed ? 0 : 150) + tabBarOffset,
              background: theme.bg,
              borderColor: theme.border,
              opacity: 1
            }}
            transition={{
              x: { type: 'spring', stiffness: 320, damping: 34 },
              default: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
            }}
            style={isMobile ? {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: tabBarOffset,
              width: '100%',
              borderTop: '1px solid',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 45,
              fontFamily: '"Space Mono", monospace',
              pointerEvents: 'auto',
              color: theme.text
            } : {
              position: 'absolute',
              top: 0,
              width: `${sidePanelWidth}px`,
              borderRight: '1px solid',
              borderTop: '1px solid',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
              zIndex: 10,
              fontFamily: '"Space Mono", monospace',
              pointerEvents: 'auto',
              color: theme.text
            }}
          >
            {onboardingStep === 1 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '3px solid #b6a6ff',
                boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                pointerEvents: 'none',
                zIndex: 9999,
                animation: 'radar-pulse 2s infinite'
              }} />
            )}
            {/* ABSOLUTE POSITIONED FIXED BLACK TAB FOR LEFT SIDEBAR (desktop only) */}
            <motion.button
              whileHover={{ opacity: 0.8 }}
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              title={isLeftCollapsed ? "Maximize Filters" : "Minimize Filters"}
              style={{
                display: isMobile ? 'none' : 'flex',
                position: 'absolute',
                top: '-1px',
                right: '-20px',
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
                  transform: isLeftCollapsed ? 'rotate(180deg)' : 'none',
                  filter: theme.invert
                }}
              />
            </motion.button>

            <div style={{ height: '40px', padding: '0 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '0', background: theme.bg, flexShrink: 0, zIndex: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/icons/icon-filter.svg" style={{ width: '30px', height: '30px', filter: theme.invert }} alt="filter" />
                <span style={{ fontWeight: '700', fontSize: '20px', lineHeight: '24px', textTransform: 'uppercase', fontFamily: '"Space Mono", monospace' }}>{isMobile ? 'LAYERS' : 'FILTERS'}</span>
              </div>
              {isMobile && (
                <button
                  onClick={() => setIsLeftCollapsed(true)}
                  aria-label="Close layers"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: theme.text, display: 'flex' }}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
            
            <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, background: theme.bg, flexShrink: 0, zIndex: 100 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder="SEARCH ARCHIVES OR LOCATIONS..." 
                  value={searchQuery}
                  onFocus={() => setShowSearchResults(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 32px 10px 12px',
                    fontSize: '11px',
                    fontFamily: '"Space Mono", monospace',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: isMapDarkMode ? '#000000' : '#ffffff',
                    color: theme.text
                  }}
                />
                {searchQuery && (
                  <motion.button
                    whileHover={{ opacity: 0.7 }}
                    onClick={() => {
                      setSearchQuery('');
                      setGeocodeResults([]);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                    <X size={14} color="#000" />
                  </motion.button>
                )}

                {/* SEARCH RESULTS DROPDOWN */}
                <AnimatePresence>
                  {showSearchResults && (searchQuery.trim().length > 1) && (
                    <>
                      {/* OVERLAY TO CLOSE DROPDOWN */}
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                        onClick={() => setShowSearchResults(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                          position: 'absolute',
                          top: '42px',
                          left: 0,
                          right: 0,
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          maxHeight: '400px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          boxShadow: isMapDarkMode ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                      {/* RESEARCH DATA RESULTS */}
                      {searchData.length > 0 && (
                        <div style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
                          <div style={{ padding: '8px 12px', fontSize: '10px', background: isMapDarkMode ? '#1a1a1a' : '#f8f8f8', borderBottom: `1px solid ${theme.borderLight}`, fontWeight: 'bold' }}>RESEARCH ARCHIVES</div>
                          {searchData.slice(0, 10).map((item, idx) => (
                            <div 
                              key={`data-${idx}`}
                              onClick={() => handleSearchItemSelect(item)}
                              className={isMapDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}
                              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: idx < searchData.slice(0, 10).length - 1 ? `1px solid ${theme.borderLight}` : 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: layerColors[item.categories[0]] || (isMapDarkMode ? '#fff' : '#000') }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{item.name}</span>
                                <span style={{ fontSize: '9px', color: theme.textDim }}>
                                  {item.categories[0]}
                                  {activeLayers[item.categories[0]] === false && (
                                    <span style={{ marginLeft: '6px', opacity: 0.6 }}>(layer off — will enable)</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* GEOCODE RESULTS */}
                      {geocodeResults.length > 0 && (
                        <div>
                          <div style={{ padding: '8px 12px', fontSize: '10px', background: isMapDarkMode ? '#1a1a1a' : '#f8f8f8', borderBottom: `1px solid ${theme.borderLight}`, fontWeight: 'bold' }}>WORLD LOCATIONS</div>
                          {geocodeResults.map((result, idx) => (
                            <div 
                              key={`geo-${idx}`}
                              onClick={() => handleGeocodeSelect(result)}
                              className={isMapDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}
                              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: idx < geocodeResults.length - 1 ? `1px solid ${theme.borderLight}` : 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <img src="/icons/icon-map-pin.svg" style={{ width: '12px', filter: theme.invert }} alt="pin" />
                              <span style={{ fontSize: '11px' }}>{result.place_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchData.length === 0 && geocodeResults.length === 0 && !isSearchingGeocode && (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#999' }}>NO RESULTS FOUND</div>
                      )}

                      {isSearchingGeocode && (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#999' }}>SEARCHING...</div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: isMapDarkMode ? '#161616' : '#f0f0f0' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAllLayersOn}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '9px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    fontFamily: '"Space Mono", monospace',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: 'none',
                    color: theme.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Eye size={11} color={theme.text} />
                  ALL ON
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: isMapDarkMode ? '#161616' : '#f0f0f0' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAllLayersOff}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '9px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    fontFamily: '"Space Mono", monospace',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: 'none',
                    color: theme.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <EyeOff size={11} color={theme.text} />
                  ALL OFF
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: isMapDarkMode ? '#161616' : '#f0f0f0' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRandomizeLayers}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '9px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    fontFamily: '"Space Mono", monospace',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: 'none',
                    color: theme.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Shuffle size={11} color={theme.text} />
                  SHUFFLE
                </motion.button>
              </div>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, padding: '0 0 15px 0', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              {/* STICKY TOP SPACER FOR 15PX PADDING + MASKING */}
              <div style={{ position: 'sticky', top: 0, height: '15px', background: theme.bg, zIndex: 10, flexShrink: 0 }} />
              
              {uniqueCategories.map(layerName => {
                const isExpanded = !!expandedLayers[layerName];
                const locationsInLayer = groupedLocations[layerName] || [];
                const pillColor = layerColors[layerName] || '#e5e5e5';
                const isActive = activeLayers[layerName] !== false;

                return (
                  <div key={layerName} style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
                    {/* STICKY CONTAINER WITH BACKGROUND TO MASK SCROLLING TEXT */}
                    <div style={{ 
                      position: 'sticky', 
                      top: '15px', 
                      zIndex: 12, 
                      background: theme.bg,
                      padding: '3px 16px' 
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0', 
                          height: '32px',
                          justifyContent: 'space-between', 
                          cursor: 'pointer', 
                          background: isActive ? theme.bg : (isMapDarkMode ? '#1a1a1a' : '#EFEFEF'),
                          border: `1px solid ${theme.border}`,
                          borderRadius: '16px',
                          boxSizing: 'border-box',
                          color: theme.text,
                          transition: 'background 0.3s ease-in-out'
                        }}
                        onClick={() => setExpandedLayers(p => ({ ...p, [layerName]: !isExpanded }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, textAlign: 'left' }}>
                          <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                              src={getCategoryIcon(layerName)} 
                              onError={(e) => { e.currentTarget.src = '/icons/icon-cave-drawings.svg'; }}
                              style={{ width: '30px', height: '30px' }} 
                              alt={layerName} 
                            />
                          </div>
                          <span style={{ 
                            fontSize: '10px', 
                            lineHeight: '24px',
                            fontWeight: isActive ? '700' : '400', 
                            fontFamily: '"Space Mono", monospace', 
                            opacity: isActive ? 1 : 0.5,
                            transition: 'opacity 0.3s ease-in-out'
                          }}>
                            {toTitleCase(layerName)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }} onClick={e => e.stopPropagation()}>
                          <motion.button 
                            whileHover={{ opacity: 0.6 }}
                            onClick={() => setActiveLayers(p => ({ ...p, [layerName]: !p[layerName] }))} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            {isLayerLoading(layerName) ? (
                              <div style={{
                                width: '31px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isMapDarkMode ? '#333' : '#ddd'}`,
                                  borderTopColor: '#b6a6ff',
                                  animation: 'spinMapAsset 0.8s linear infinite'
                                }} />
                              </div>
                            ) : (
                              <img src={isActive ? "https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/icons/icon-eye-open.svg" : "https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/icons/icon-eye-closed.svg"} style={{ width: '31px', height: '30px', filter: theme.invert }} alt="toggle" />
                            )}
                          </motion.button>
                          <motion.button 
                            whileHover={{ opacity: 0.6 }}
                            onClick={() => setExpandedLayers(p => ({ ...p, [layerName]: !isExpanded }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <img src={isExpanded ? "https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/icons/icon-arrow-up.svg" : "https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/icons/icon-arrow-down.svg"} style={{ width: '30px', height: '30px', filter: theme.invert }} alt="expand" />
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: theme.bg, padding: '4px 0', textAlign: 'left', overflow: 'hidden' }}
                      >
                        <motion.div 
                          initial="hidden"
                          animate="show"
                          style={{ display: 'flex', flexDirection: 'column', paddingLeft: '22px', paddingRight: '16px' }}
                        >
                          {CATEGORY_DESCRIPTIONS[layerName] && (
                            <div style={{ 
                              fontSize: '10px', 
                              lineHeight: '1.4',
                              color: theme.textDim,
                              paddingBottom: '8px',
                              paddingLeft: '2px',
                              fontFamily: '"Space Mono", monospace',
                              fontStyle: 'italic'
                            }}>
                              {CATEGORY_DESCRIPTIONS[layerName]}
                            </div>
                          )}
                          <AnimatePresence mode="wait">
                            {isLayerLoading(layerName) ? (
                              <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '12px',
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isMapDarkMode ? '#333' : '#ddd'}`,
                                  borderTopColor: '#b6a6ff',
                                  animation: 'spinMapAsset 0.8s linear infinite'
                                }} />
                                <span style={{ fontSize: '9px', color: theme.textDim, letterSpacing: '1px' }}>RETRIEVING INTEL...</span>
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="content"
                                initial="hidden"
                                animate="show"
                                exit="hidden"
                                variants={{
                                  hidden: { opacity: 0 },
                                  show: {
                                    opacity: 1,
                                    transition: {
                                      staggerChildren: 0.03
                                    }
                                  }
                                }}
                                style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
                              >
                                {(() => {
                                  const maxVisible = visibleCounts[layerName] || 100;
                                  return (
                                    <>
                                      {locationsInLayer.slice(0, maxVisible).map(loc => {
                                        const isSelected = selectedFeature?.id === loc.id;
                                        const pillColor = layerColors[layerName] || '#e5e5e5';
                                        return (
                                          <motion.div 
                                            key={loc.id} 
                                            id={`sidebar-item-${loc.id}`}
                                            variants={{
                                              hidden: { opacity: 0, x: -10 },
                                              show: { opacity: 1, x: 0 }
                                            }}
                                            onClick={() => handleLocationItemClick(loc)} 
                                            onMouseEnter={(e) => {
                                              if (!isSelected) e.currentTarget.style.backgroundColor = isMapDarkMode ? 'rgba(255,255,255,0.1)' : pillColor;
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                            style={{ 
                                              height: '24px',
                                              borderRadius: '12px',
                                              padding: '0 12px 0 2px', 
                                              fontSize: '10px', 
                                              cursor: 'pointer', 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '8px', 
                                              background: isSelected ? theme.text : 'transparent', 
                                              color: isSelected ? theme.bg : theme.text,
                                              textAlign: 'left', 
                                              fontFamily: '"Space Mono", monospace', 
                                              textTransform: 'capitalize',
                                              margin: '2px 0',
                                              width: '100%',
                                              transition: 'background-color 0.2s ease, color 0.2s ease'
                                            }} 
                                            className="nested-item"
                                          >
                                            <div 
                                              style={{
                                                width: '24px',
                                                height: '24px',
                                                minWidth: '24px',
                                                backgroundColor: isSelected ? theme.bg : theme.text,
                                                WebkitMaskImage: 'url(/icons/icon-map-pin.svg)',
                                                maskImage: 'url(/icons/icon-map-pin.svg)',
                                                WebkitMaskSize: '24px 24px',
                                                maskSize: '24px 24px',
                                                WebkitMaskPosition: 'center',
                                                maskPosition: 'center',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskRepeat: 'no-repeat'
                                              }} 
                                            />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {toTitleCase(loc.name)}
                                            </span>
                                          </motion.div>
                                        );
                                      })}
                                      {locationsInLayer.length > maxVisible && (
                                        <div style={{ padding: '8px 12px', fontSize: '10px', color: theme.textDim, fontStyle: 'italic', borderTop: `1px solid ${theme.borderLight}`, marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <div>
                                            Showing first {maxVisible} of {locationsInLayer.length} results.
                                          </div>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleCounts(p => ({ ...p, [layerName]: (p[layerName] || 100) + 100 }));
                                              }}
                                              style={{
                                                height: '22px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                fontSize: '9px',
                                                fontWeight: '700',
                                                padding: '0 10px',
                                                borderRadius: '11px',
                                                background: layerColors[layerName] || '#b6a6ff',
                                                border: 'none',
                                                color: '#000000',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontFamily: '"Space Mono", monospace',
                                                fontStyle: 'normal',
                                                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                              }}
                                              className="interactive-tag-pill"
                                            >
                                              Load More
                                            </button>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleCounts(p => ({ ...p, [layerName]: locationsInLayer.length }));
                                              }}
                                              style={{
                                                height: '22px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                fontSize: '9px',
                                                fontWeight: '700',
                                                padding: '0 10px',
                                                borderRadius: '11px',
                                                background: layerColors[layerName] || '#b6a6ff',
                                                border: 'none',
                                                color: '#000000',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontFamily: '"Space Mono", monospace',
                                                fontStyle: 'normal',
                                                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                              }}
                                              className="interactive-tag-pill"
                                            >
                                              Load All
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                                {locationsInLayer.length === 0 && (
                                  <div style={{ padding: '8px 16px', fontSize: '9px', color: theme.textDim, fontFamily: '"Space Mono", monospace' }}>
                                    {!isActive ? "Toggle on visibility to view data" : "NO ASSETS IN RANGE, adjust timeline range sliders to discover more."}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* RIGHT COMPONENT: DOSSIER SIDEBAR (desktop) / BOTTOM SHEET (mobile) */}
          <motion.div
            initial={false}
            animate={isMobile ? {
              y: isRightCollapsed ? '110%' : '0%',
              height: mobileSheetSnap === 'full' ? '90vh' : '52vh',
              background: theme.bg,
              borderColor: theme.border,
              opacity: 1
            } : {
              right: isRightCollapsed ? collapsedPanelOffset : 20,
              bottom: (isTimelineCollapsed ? 0 : 150) + tabBarOffset,
              background: theme.bg,
              borderColor: theme.border,
              opacity: 1
            }}
            transition={{
              right: { type: 'spring', stiffness: 240, damping: 28 },
              y: { type: 'spring', stiffness: 320, damping: 34 },
              default: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
            }}
            style={isMobile ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: tabBarOffset,
              width: '100%',
              borderTop: '1px solid',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 40,
              fontFamily: '"Space Mono", monospace',
              pointerEvents: 'auto',
              color: theme.text,
              boxShadow: '0 -8px 24px rgba(0,0,0,0.35)'
            } : {
              position: 'absolute',
              top: 0,
              width: `${sidePanelWidth}px`,
              borderLeft: '1px solid',
              borderTop: '1px solid',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
              zIndex: 10,
              fontFamily: '"Space Mono", monospace',
              pointerEvents: 'auto',
              color: theme.text
            }}
          >
            {onboardingStep === 6 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '3px solid #b6a6ff',
                boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                pointerEvents: 'none',
                zIndex: 9999,
                animation: 'radar-pulse 2s infinite'
              }} />
            )}
            
            {/* MOBILE DRAG HANDLE — tap toggles half/full, drag down shrinks/dismisses, up expands */}
            {isMobile && (
              <div
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  sheetDragStartRef.current = { y: e.clientY, moved: false };
                }}
                onPointerMove={(e) => {
                  if (Math.abs(e.clientY - sheetDragStartRef.current.y) > 6) sheetDragStartRef.current.moved = true;
                }}
                onPointerUp={(e) => {
                  const dy = e.clientY - sheetDragStartRef.current.y;
                  if (!sheetDragStartRef.current.moved) {
                    // Tap: cycle snap height.
                    setMobileSheetSnap(prev => (prev === 'half' ? 'full' : 'half'));
                  } else if (dy > 70) {
                    // Drag down: collapse from half, or step full -> half.
                    if (mobileSheetSnap === 'full') setMobileSheetSnap('half');
                    else setIsRightCollapsed(true);
                  } else if (dy < -70) {
                    setMobileSheetSnap('full');
                  }
                }}
                style={{
                  flexShrink: 0,
                  height: '34px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'grab',
                  touchAction: 'none',
                  background: theme.bg,
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px'
                }}
              >
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: theme.textDim }} />
                <span style={{ fontSize: '7.5px', letterSpacing: '0.3em', color: theme.textDim }}>— CASE FILE —</span>
              </div>
            )}

            {/* ABSOLUTE POSITIONED FIXED BLACK TAB FOR RIGHT SIDEBAR (desktop only) */}
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
              />
            </motion.button>

            <AnimatePresence mode="wait">
              {selectedFeature ? (
                <motion.div 
                  key={selectedFeature.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}
                >
                  
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
                        <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={getCategoryIcon(selectedFeature.categories?.[0] || '')} 
                            onError={(e) => { e.currentTarget.src = '/icons/icon-cave-drawings.svg'; }}
                            style={{ width: '30px', height: '30px' }} 
                            alt="layer-icon" 
                          />
                        </div>
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '11px', 
                          letterSpacing: '1px', 
                          fontFamily: '"Space Mono", monospace' 
                        }}>
                          {toTitleCase(selectedFeature.categories?.[0] || 'DOSSIER')}
                        </span>
                      </div>
                  </div>

                  <div className="custom-sidebar-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', textAlign: 'left', paddingBottom: '15px' }}>
                    
                    {activeAssets && activeAssets.length > 0 && (
                      <div style={{ width: '100%', position: 'relative', borderBottom: `1px solid ${theme.border}` }}>
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
                                    onClick={handleOpenLightbox}
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
                                    onClick={handleOpenLightbox}
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
                                    key={`${selectedFeature.id}-${activeImageIndex}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: isImageLoading ? 0 : 1 }}
                                    transition={{ duration: 0.3 }}
                                    onClick={handleOpenLightbox}
                                    src={imgSrc} 
                                    alt={`${selectedFeature.name} asset viewport`} 
                                    referrerPolicy="no-referrer"
                                    onLoad={() => setIsImageLoading(false)}
                                    onError={(e) => {
                                      setIsImageLoading(false);
                                      if (curAsset.url) {
                                        setBrokenImages(prev => ({ ...prev, [curAsset.url]: true }));
                                      }
                                    }}
                                    style={{ 
                                        width: isBroken ? '48px' : '100%', 
                                         height: isBroken ? '48px' : '100%', 
                                         cursor: 'pointer',                        
                                         objectFit: isBroken ? 'contain' : 'cover',                     
                                         backgroundColor: 'transparent',           
                                         filter: isBroken ? (isMapDarkMode ? 'invert(1)' : 'none') : 'none'
                                      }}
                                  />
                                )}

                                {/* Little PDF Icon badge in top right corner if PDF url is associated */}
                                {showPdfBadge && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    height: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '10px', 
                                    fontWeight: '400', 
                                    padding: '0 12px', 
                                    borderRadius: '12px', 
                                    background: layerColors[selectedFeature.categories?.[0]] || '#e5e5e5', 
                                    border: 'none',
                                    color: '#000000',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontFamily: '"Space Mono", monospace',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                    zIndex: 5,
                                    gap: '6px'
                                  }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <span style={{ fontSize: '9px', fontWeight: 'bold' }}>PDF</span>
                                  </div>
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
                              <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
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
                                onClick={handleOpenLightbox} 
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

                    <div style={{ padding: '24px', textAlign: 'left' }}>
                      
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
                        {selectedFeature.isPeopleGroup && (
                          <span style={{
                            marginRight: '12px',
                            fontWeight: 900,
                            fontSize: '44px',
                            lineHeight: 1,
                            WebkitTextStroke: '3px currentColor',
                            flexShrink: 0
                          }}>✖</span>
                        )}
                        {toTitleCase(selectedFeature.name)}
                      </h1>

                      {selectedFeature.subLabel && (
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#ef4444',
                          fontFamily: '"Space Mono", monospace',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginBottom: '12px'
                        }}>
                          [{selectedFeature.subLabel}]
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleLike(selectedFeature.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isMapDarkMode ? '#fff' : '#000',
                            color: isMapDarkMode ? '#000' : '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: '"Space Mono", monospace',
                            opacity: userLikedIds.has(String(selectedFeature.id).replace(/[^a-zA-Z0-9_\-]/g, '_')) ? 1 : 0.7,
                            transition: 'opacity 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Heart size={14} fill={userLikedIds.has(String(selectedFeature.id).replace(/[^a-zA-Z0-9_\-]/g, '_')) ? (isMapDarkMode ? "#000" : "#fff") : "none"} />
                          <span>{likes[String(selectedFeature.id).replace(/[^a-zA-Z0-9_\-]/g, '_')] || 0}</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => {
                            setReportedFeature(selectedFeature);
                            setReportReason('Incorrect Coordinates / Location');
                            setReportDetails('');
                            setReportSuccess(null);
                            setReportError(null);
                            setIsReportOpen(true);
                          }}
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
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          title="Report inaccuracy / flag this point"
                        >
                          <Flag size={13} />
                          <span>FLAG</span>
                        </motion.button>

                        {combinedTimelineItems.some(t => String(t.id) === String(selectedFeature.id)) && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleViewOnTimeline(selectedFeature.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: 'transparent',
                              color: isMapDarkMode ? '#fff' : '#000',
                              border: `1px solid ${isMapDarkMode ? '#fff' : '#000'}`,
                              padding: '6px 12px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              fontFamily: '"Space Mono", monospace',
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span>TIMELINE VIEW</span>
                          </motion.button>
                        )}

                        {(() => {
                          const codexNode = getCodexTermForMapFeature(selectedFeature);
                          if (!codexNode) return null;
                          return (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.05 }}
                              onClick={() => {
                                setFocusedCodexTermId(codexNode.id);
                                setCurrentPage('codex');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'transparent',
                                color: isMapDarkMode ? '#fff' : '#000',
                                border: `1px solid ${isMapDarkMode ? '#fff' : '#000'}`,
                                padding: '6px 12px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                fontFamily: '"Space Mono", monospace',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>CODEX VIEW</span>
                            </motion.button>
                          );
                        })()}

                        {selectedFeature.socialLink && (
                          <motion.a
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                            href={selectedFeature.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
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
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none'
                            }}
                          >
                            {selectedFeature.socialLink.toLowerCase().includes('instagram.com') ? (
                              <Instagram size={13} />
                            ) : (
                              <ExternalLink size={13} />
                            )}
                            <span>
                              {selectedFeature.socialLink.toLowerCase().includes('instagram.com') ? 'INSTAGRAM' : 'X.COM'}
                            </span>
                          </motion.a>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', justifyContent: 'flex-start' }}>
                        {selectedFeature.categories?.map((tag: string) => (
                          <button 
                            key={tag} 
                            onClick={() => handleTagClick(tag)}
                            title={`Click to filter list by ${tag}`}
                            style={{ 
                              height: '24px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '10px', 
                              fontWeight: '400', 
                              padding: '0 12px', 
                              borderRadius: '12px', 
                              background: layerColors[tag] || '#e5e5e5', 
                              border: 'none',
                              color: '#000000',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontFamily: '"Space Mono", monospace',
                              transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                            }}
                            className="interactive-tag-pill"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        paddingTop: '0', 
                        marginBottom: '20px', 
                        textAlign: 'left' 
                      }}>
                        <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontStyle: 'italic', fontSize: '10px', lineHeight: '22px' }}>
                          DATE: <span style={{ fontStyle: 'normal', fontWeight: '400' }}>
                            {selectedFeature.displayDate || (selectedFeature.date !== null && selectedFeature.date !== undefined
                              ? (selectedFeature.date < 0 
                                ? `${Math.abs(selectedFeature.date).toLocaleString()} BC` 
                                : (selectedFeature.date > 2050 
                                  ? `${selectedFeature.date.toLocaleString()} AD (Future Prophecy)` 
                                  : `${selectedFeature.date.toLocaleString()} AD`))
                              : 'UNSPECIFIED')}
                          </span>
                        </div>
                        <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontStyle: 'italic', fontSize: '10px', lineHeight: '22px' }}>
                          LOCATION: <span style={{ fontStyle: 'normal', fontWeight: '400' }}>{(() => {
                              if (!selectedFeature.coordinates) return 'UNKNOWN';
                              const coordsStr = selectedFeature.type === 'LineString' 
                                ? `LINESTRING START: ${selectedFeature.coordinates[0][1].toFixed(4)}, ${selectedFeature.coordinates[0][0].toFixed(4)}`
                                : `${selectedFeature.coordinates[1].toFixed(4)}, ${selectedFeature.coordinates[0].toFixed(4)}`;
                              
                              if (selectedFeature.locationName) {
                                return `${selectedFeature.locationName} (${coordsStr})`;
                              }
                              return coordsStr;
                            })()}</span>
                        </div>
                        {selectedFeature.source && (
                          <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontStyle: 'italic', fontSize: '10px', lineHeight: '22px' }}>
                            SOURCE: <span style={{ fontStyle: 'normal', fontWeight: '400' }}>{selectedFeature.source}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ paddingTop: '0', textAlign: 'left' }}>
                        <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px' }}>DESCRIPTION:</div>
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
                          {selectedFeature.description}
                        </p>
                      </div>

                      {(() => {
                        const travelPath = BIBLICAL_TRAVEL_PATHS[selectedFeature.id];
                        if (!travelPath) return null;
                        const categoryColor = layerColors[selectedFeature.categories?.[0]] || '#90C2FF';
                        return (
                          <div style={{ marginTop: '24px', borderTop: `1px solid ${theme.borderLight || theme.border}`, paddingTop: '20px' }}>
                            <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              JOURNEY PATH & LOG
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative', paddingLeft: '14px' }}>
                              {/* Vertical line connecting steps */}
                              <div style={{
                                position: 'absolute',
                                left: '4px',
                                top: '8px',
                                bottom: '8px',
                                width: '1px',
                                borderLeft: `1.5px dashed ${theme.border}`
                              }} />

                              {travelPath.waypoints.map((wp, idx) => (
                                <div 
                                  key={idx} 
                                  onClick={() => {
                                    setActiveWaypointIndex(idx);
                                    if (mapRef.current) {
                                      mapRef.current.flyTo({
                                        center: [wp.lng, wp.lat],
                                        zoom: 8.5,
                                        duration: 1500,
                                        essential: true
                                      });
                                      
                                      // Trigger a temporary popup on the map for this waypoint
                                      if (activeTravelPopupRef.current) {
                                        fadeOutPopup(activeTravelPopupRef.current);
                                      }

                                      activeTravelPopupRef.current = new mapboxgl.Popup({ closeButton: false, className: 'custom-mapbox-popup', anchor: 'bottom' })
                                        .setLngLat([wp.lng, wp.lat])
                                        .setHTML(`<div style="font-family: 'Space Mono', monospace; font-size: 11px; padding: 4px; border-radius: 4px; max-width: 200px; text-align: left;">
                                          <strong style="display: block; margin-bottom: 2px; font-size: 12px; color: #fff;">${wp.locationName}</strong>
                                          ${wp.displayDate ? `<span style="font-size: 10px; font-style: italic; color: #aaa; display: block; margin-bottom: 6px;">${wp.displayDate}</span>` : ''}
                                          <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #ddd;">${wp.description || ''}</p>
                                        </div>`)
                                        .addTo(mapRef.current);
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    if (idx !== activeWaypointIndex) e.currentTarget.style.opacity = '0.9';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (idx !== activeWaypointIndex) e.currentTarget.style.opacity = '0.65';
                                  }}
                                  style={{
                                    position: 'relative',
                                    paddingBottom: idx === travelPath.waypoints.length - 1 ? '0' : '20px',
                                    cursor: 'pointer',
                                    opacity: idx === activeWaypointIndex ? 1.0 : 0.65,
                                    transition: 'opacity 0.2s ease',
                                    textAlign: 'left'
                                  }}
                                >
                                  {/* Stepper node circle */}
                                  <div style={{
                                    position: 'absolute',
                                    left: '-14px',
                                    top: idx === activeWaypointIndex ? '10px' : '4px',
                                    width: idx === activeWaypointIndex ? '9px' : '7px',
                                    height: idx === activeWaypointIndex ? '9px' : '7px',
                                    borderRadius: '50%',
                                    background: categoryColor,
                                    border: `1.5px solid ${theme.bg}`,
                                    boxShadow: `0 0 0 1px ${theme.border}`,
                                    transform: 'translateX(-50%)',
                                    transition: 'all 0.2s ease',
                                    zIndex: 2
                                  }} />

                                  {/* Waypoint details */}
                                  <div style={{ 
                                    fontFamily: '"Space Mono", monospace', 
                                    fontSize: '10px',
                                    background: idx === activeWaypointIndex 
                                      ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
                                      : 'transparent',
                                    borderRadius: '6px',
                                    padding: idx === activeWaypointIndex ? '6px 8px' : '0px',
                                    transition: 'all 0.2s ease',
                                    border: idx === activeWaypointIndex ? `1px solid ${categoryColor}` : 'none',
                                    paddingLeft: idx === activeWaypointIndex ? '8px' : '0px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <span style={{ 
                                        fontWeight: '700', 
                                        color: theme.text
                                      }}>{wp.locationName}</span>
                                      {wp.displayDate && (
                                        <span style={{ fontSize: '9px', opacity: 0.65, fontWeight: 'normal', color: theme.text }}>{wp.displayDate}</span>
                                      )}
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '9px', lineHeight: '14px', color: idx === activeWaypointIndex ? theme.text : theme.textDim }}>
                                      {wp.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {activeFigures && activeFigures.length > 0 && (
                        <div style={{ marginTop: '24px', borderTop: `1px solid ${theme.borderLight || theme.border}`, paddingTop: '20px' }}>
                          <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: '700', fontSize: '11px', lineHeight: '22px', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            ACTIVE FIGURES DURING EVENT
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeFigures.map(fig => (
                              <div 
                                key={fig.id}
                                onClick={() => {
                                  // Find figure in map dataset
                                  const matchedRecord = combinedPointsAndLinesData.find(item => String(item.id) === String(fig.id));
                                  if (matchedRecord) {
                                    handleLocationItemClick(matchedRecord);
                                  } else {
                                    // Or fly map to estimated coordinates
                                    if (fig.coords && mapRef.current) {
                                      mapRef.current.flyTo({
                                        center: fig.coords,
                                        zoom: 8.5,
                                        duration: 1500
                                      });
                                    }
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = isMapDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                  border: `1px solid ${theme.borderLight || theme.border}`
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"Space Mono", monospace', fontSize: '10px', fontWeight: '700' }}>
                                  <span style={{ color: theme.text }}>{fig.name}</span>
                                  <span style={{ opacity: 0.65, fontWeight: 'normal' }}>Age: {fig.age}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontFamily: '"Space Mono", monospace', fontSize: '9px', color: theme.textDim }}>
                                  <MapPin size={10} style={{ filter: theme.invert }} />
                                  <span>Location: {fig.locationName}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', color: theme.textDim, textAlign: 'center' }}
                >
                  <img src="/icons/icon-rabbit-hole.svg" alt="logo" style={{ width: '48px', height: '48px', opacity: 0.2, marginBottom: '16px', filter: theme.invert }} />
                  <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Select a coordinate</div>
                  <div style={{ fontSize: '9px', marginTop: '4px' }}>to view complete dossier archive.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* HORIZONTAL COMPONENT: TIMELINE CONTROLS AS FLOATING ABSOLUTE OVERLAY */}
          <motion.div
            initial={false}
            animate={{
              bottom: (isTimelineCollapsed ? -150 : 0) + tabBarOffset,
              background: theme.bg,
              borderColor: theme.border
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              height: '150px', 
              borderTop: '1px solid', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '0', 
              boxSizing: 'border-box', 
              zIndex: 15, 
              fontFamily: '"Space Mono", monospace',
              overflow: 'visible',
              pointerEvents: 'auto',
              color: theme.text
            }}
          >
            {onboardingStep === 3 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '3px solid #b6a6ff',
                boxShadow: '0 0 15px rgba(182, 166, 255, 0.5)',
                pointerEvents: 'none',
                zIndex: 9999,
                animation: 'radar-pulse 2s infinite'
              }} />
            )}

            {/* TIMELINE HINT TOOLTIP — portal escapes stacking contexts; AnimatePresence always mounted for exit anim */}
            {createPortal(
              <AnimatePresence>
                {showTimelineHint && hintAnchor && (() => {
                  const MARGIN = 20;
                  const TIP_W = 280;
                  const TIP_H = 120;
                  const clampedX = Math.max(
                    MARGIN + TIP_W / 2,
                    Math.min(window.innerWidth - MARGIN - TIP_W / 2, hintAnchor.x)
                  );
                  const rawTop = hintAnchor.y - 16;
                  const clampedTop = Math.max(MARGIN + TIP_H, rawTop);
                  return (
                    <div
                      key="timeline-hint-positioner"
                      style={{
                        position: 'fixed',
                        left: clampedX,
                        top: clampedTop,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 2147483647,
                        pointerEvents: 'auto',
                        width: `${TIP_W}px`,
                      }}
                    >
                      <motion.div
                        key="timeline-hint"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <div style={{
                          background: isMapDarkMode ? '#ffffff' : '#000000',
                          border: `2px solid ${isMapDarkMode ? '#ffffff' : '#000000'}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                          color: isMapDarkMode ? '#000000' : '#ffffff',
                          fontFamily: '"Space Mono", monospace',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          position: 'relative',
                        }}>
                          <div style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                            opacity: 0.5,
                          }}>
                            {hintSource === 'zoom' ? 'Zoom Controls' : hintSource === 'left' ? 'Start Range' : 'End Range'}
                          </div>
                          <div style={{ fontSize: '10px', lineHeight: '1.6', opacity: 0.85, paddingRight: '20px' }}>
                            Only locations within the black arrows are shown on the map & sidebar.
                          </div>
                          <button
                            onClick={() => setShowTimelineHint(false)}
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '12px',
                              background: 'none',
                              border: 'none',
                              color: isMapDarkMode ? '#000000' : '#ffffff',
                              cursor: 'pointer',
                              fontSize: '14px',
                              opacity: 0.4,
                              lineHeight: 1,
                              padding: 0,
                            }}
                            aria-label="Dismiss"
                          >✕</button>
                          <div style={{
                            position: 'absolute',
                            bottom: '-10px',
                            left: `calc(50% + ${hintAnchor.x - clampedX}px)`,
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '10px 8px 0 8px',
                            borderColor: `${isMapDarkMode ? '#ffffff' : '#000000'} transparent transparent transparent`,
                          }} />
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}
              </AnimatePresence>
            , document.body)}

            {/* ABSOLUTE POSITIONED FIXED BLACK TAB FOR TIMELINE BAR */}
            <motion.button 
              whileHover={{ opacity: 0.8 }}
              onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
              title={isTimelineCollapsed ? "Maximize Timeline" : "Minimize Timeline"}
              style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40px',
                height: '20px',
                background: theme.text,
                color: theme.bg,
                border: 'none',
                cursor: 'pointer',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: 0
              }}
            >
              <img 
                src="/icons/icon-arrow-left.svg" 
                alt="toggle" 
                style={{ 
                  width: '6px', 
                  height: '12px', 
                  transform: isTimelineCollapsed ? 'rotate(90deg)' : 'rotate(270deg)',
                  filter: isMapDarkMode ? 'brightness(0)' : 'none'
                }} 
              />
            </motion.button>

                  <div style={{ 
                    height: '40px', 
                    borderBottom: `1px solid ${theme.border}`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0 24px', 
                    background: isMapDarkMode ? theme.bg : '#ffffff', 
                    position: 'relative' 
                  }}>
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '0px' }}>
                      <img src="/icons/icon-timeline.svg" style={{ width: '30px', height: '30px', filter: theme.invert }} alt="timeline" />
                      <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>TIMELINE</span>
                    </div>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* ZOOM SLIDER AREA */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/icons/icon-zoom-out.svg" style={{ width: '24px', height: '24px', filter: theme.invert }} alt="zoom out" />
                        <input 
                          type="range" 
                          min="5" 
                          max={timeBounds.max - timeBounds.min}
                          value={timeBounds.max - timeBounds.min - timelineWindowSpan + 5}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const newSpan = (timeBounds.max - timeBounds.min) - val + 5;
                            
                            // Zoom from center
                            const currentCenter = timelineWindowStart + (timelineWindowSpan / 2);
                            let newStart = currentCenter - (newSpan / 2);
                            
                            // Constrain start
                            newStart = Math.max(timeBounds.min, Math.min(timeBounds.max - newSpan, newStart));
                            
                            setTimelineWindowSpan(newSpan);
                            setTimelineWindowStart(newStart);
                            triggerTimelineHint('zoom', zoomSliderRef);
                          }}
                          style={{ width: '120px', height: '2px', background: theme.text, outline: 'none', cursor: 'pointer' }}
                          className="timeline-zoom-slider"
                          ref={zoomSliderRef}
                        />
                        <img src="/icons/icon-zoom-in.svg" style={{ width: '24px', height: '24px', filter: theme.invert }} alt="zoom in" />
                      </div>

                      {/* RESET BUTTON */}
                      <button
                        onClick={() => {
                          setTimelineWindowStart(timeBounds.min);
                          setTimelineWindowSpan(timeBounds.max - timeBounds.min);
                          setYearRange({ start: timeBounds.min, end: timeBounds.max });
                        }}
                        title="Reset Timeline"
                        style={{
                          height: '32px',
                          padding: '0 12px',
                          background: 'transparent',
                          border: `1px solid ${theme.border}`,
                          color: theme.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          borderRadius: '16px',
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = theme.text;
                          e.currentTarget.style.color = theme.bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = theme.text;
                        }}
                      >
                        <RotateCcw size={10} strokeWidth={2.5} />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* TIMELINE MAIN BODY — pointer events cover mouse AND touch drags */}
                  <div
                    style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 30px', background: theme.bg, position: 'relative', overflow: 'hidden', touchAction: 'none' }}
              onPointerDown={(e) => {
                if (e.target instanceof HTMLInputElement) return; // Don't drag if clicking sliders
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsTimelineDragging(true);
                setDragStartX(e.clientX);
                setDragStartTimelineStart(timelineWindowStart);
              }}
              onPointerMove={(e) => {
                if (!isTimelineDragging || !timelineRef.current) return;
                const deltaX = e.clientX - dragStartX;
                const pixelWidth = timelineRef.current.clientWidth;
                const yearsPerPixel = timelineWindowSpan / pixelWidth;
                const yearDelta = deltaX * yearsPerPixel;

                let newStart = dragStartTimelineStart - yearDelta;
                // Constrain
                newStart = Math.max(timeBounds.min, Math.min(timeBounds.max - timelineWindowSpan, newStart));
                setTimelineWindowStart(newStart);
              }}
              onPointerUp={() => setIsTimelineDragging(false)}
              onPointerCancel={() => setIsTimelineDragging(false)}
            >
              
              {/* PAN LEFT BUTTON */}
              <motion.button 
                initial={false}
                animate={{ 
                  opacity: timelineWindowStart <= timeBounds.min ? 0 : 1,
                  pointerEvents: timelineWindowStart <= timeBounds.min ? 'none' : 'auto'
                }}
                whileHover={{ opacity: 0.7 }}
                onClick={() => setTimelineWindowStart(prev => Math.max(timeBounds.min, prev - (timelineWindowSpan * 0.1)))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isMapDarkMode ? 'transparent' : theme.bg,
                  border: `1px solid ${isMapDarkMode ? '#ffffff' : theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  marginRight: '12px',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
              >
                <img src="/icons/icon-arrow-left.svg" style={{ width: '10px', height: '18px', filter: isMapDarkMode ? 'brightness(0)' : 'brightness(0)' }} alt="pan left" />
              </motion.button>

              {/* TIMELINE VISUAL AREA */}
              <div ref={timelineRef} style={{ 
                flex: 1, 
                height: '100%', 
                position: 'relative', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                background: isMapDarkMode ? '#000000' : '#ffffff' 
              }}>
                <div style={{ flex: 1, position: 'relative', margin: '0 20px' }}>
                  {/* GENERATE DIVIDERS AND DOTS */}
                  {(() => {
                    const years = [];
                    
                    // Adaptive Intervals
                    let majorInterval = 10;
                    let mediumInterval = 5;
                    let minorInterval = 1;
                    
                    if (timelineWindowSpan > 500) {
                      majorInterval = 100; mediumInterval = 50; minorInterval = 10;
                    } else if (timelineWindowSpan > 200) {
                      majorInterval = 50; mediumInterval = 25; minorInterval = 5;
                    } else if (timelineWindowSpan > 100) {
                      majorInterval = 20; mediumInterval = 10; minorInterval = 2;
                    } else if (timelineWindowSpan > 50) {
                      majorInterval = 10; mediumInterval = 5; minorInterval = 1;
                    } else {
                      majorInterval = 5; mediumInterval = 1; minorInterval = 0.5;
                    }

                    // Start at a multiple of minorInterval
                    const startY = Math.floor(timelineWindowStart / minorInterval) * minorInterval;
                    for (let y = startY; y <= timelineWindowStart + timelineWindowSpan; y += minorInterval) {
                      years.push(y);
                    }
                    
                    const getX = (year: number) => {
                      return ((year - timelineWindowStart) / timelineWindowSpan) * 100;
                    };

                    return (
                      <>
                        {/* YEAR LABELS AND DIVIDERS */}
                        {years.map(y => {
                          const isMajor = y % majorInterval === 0;
                          const isMedium = y % mediumInterval === 0;
                          if (getX(y) < 0 || getX(y) > 100) return null;

                          return (
                            <React.Fragment key={y}>
                              <div style={{
                                position: 'absolute',
                                left: `${getX(y)}%`,
                                bottom: '38px',
                                height: isMajor ? '20px' : (isMedium ? '12px' : '8px'),
                                width: '1px',
                                background: isMajor ? theme.text : (isMapDarkMode ? '#444' : '#ccc'),
                                zIndex: 0 // Behind baseline
                              }} />
                              {isMajor && (
                                <div style={{
                                  position: 'absolute',
                                  left: `${getX(y)}%`,
                                  bottom: '18px',
                                  transform: 'translateX(-50%)',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  color: theme.text,
                                  zIndex: 1
                                }}>
                                  {y}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* THE HORIZONTAL BASE LINE - MOVED UP BY 10px to 38px */}
                        <div style={{ position: 'absolute', bottom: '38px', left: 0, right: 0, height: '1px', background: theme.text, zIndex: 1 }} />

                        {/* FEATURE DOTS INDICATORS - AGGREGATED BY DYNAMIC BUCKETS FOR PERFORMANCE AND CLUSTERING */}
                        {(() => {
                          const visibleFeatures = pointsAndLinesData.filter(f => {
                            const inWindow = f.date >= timelineWindowStart && f.date <= timelineWindowStart + timelineWindowSpan;
                            const isActive = f.categories.some((cat: string) => activeLayers[cat] !== false);
                            return inWindow && isActive;
                          });
                          
                          // Bucket size determines aggregation density based on current zoom level
                          const bucketSize = Math.max(0.1, timelineWindowSpan / 60);

                          interface BucketGroup {
                            count: number;
                            color: string;
                            features: any[];
                          }

                          const aggregated = visibleFeatures.reduce((acc, f) => {
                            const bucketIndex = Math.floor(f.date / bucketSize);
                            if (!acc[bucketIndex]) {
                              acc[bucketIndex] = {};
                            }
                            const cat = f.categories[0];
                            if (!acc[bucketIndex][cat]) {
                              acc[bucketIndex][cat] = { 
                                count: 0, 
                                color: (layerColors as any)[cat] || '#b6a6ff', 
                                features: [] 
                              };
                            }
                            acc[bucketIndex][cat].count += 1;
                            acc[bucketIndex][cat].features.push(f);
                            return acc;
                          }, {} as Record<number, Record<string, BucketGroup>>);

                          const currentGroups = Object.values(aggregated).flatMap(buckets => Object.values(buckets)) as BucketGroup[];
                          const localMaxCount = currentGroups.length > 0 ? Math.max(...currentGroups.map(g => g.count)) : 1;

                          return Object.entries(aggregated).flatMap(([bucketIdxStr, catGroups]) => {
                            const sortedCats = Object.keys(catGroups).sort();
                            
                            return sortedCats.map((cat, catIdx) => {
                              const data = catGroups[cat];
                              const { count, features } = data;
                              
                              // Position at the average date of points in this bucket for better accuracy
                              const centerYear = features.reduce((sum, f) => sum + f.date, 0) / count;
                              
                              // Scale size based on local max in current view
                              const rawSize = Math.min(6 + (Math.pow(count / localMaxCount, 0.3)) * 12, 20);
                              const size = Math.round(rawSize);
                              const verticalOffset = catIdx * (size + 1); // Stack vertically with offset
                              
                              return (
                                <motion.div 
                                  key={`bucket-${bucketIdxStr}-${cat}`}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  whileHover={{ scale: 1.1, zIndex: 100 }}
                                  onHoverStart={() => setHoveredBucket({ 
                                    count, 
                                    cat, 
                                    year: Math.round(centerYear), 
                                    x: getX(centerYear),
                                    bottom: 65 + verticalOffset + size + 15
                                  })}
                                  onHoverEnd={() => setHoveredBucket(null)}
                                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                  style={{
                                    position: 'absolute',
                                    left: `${getX(centerYear)}%`,
                                    bottom: `${65 + verticalOffset}px`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    borderRadius: '50%',
                                    background: data.color,
                                    border: `1px solid ${isMapDarkMode ? '#000000' : '#ffffff'}`,
                                    x: '-50%',
                                    cursor: 'pointer',
                                    zIndex: 5 + catIdx,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backfaceVisibility: 'hidden',
                                    WebkitFontSmoothing: 'antialiased'
                                  }}
                                  onClick={() => {
                                    // If it's a cluster and we're not already zoomed in significantly, zoom in
                                    // NEW: only zoom if the dates are actually spread out
                                    const distinctDates = new Set(features.map(f => f.date));
                                    const isSpread = distinctDates.size > 1;

                                    if (count > 1 && timelineWindowSpan > 0.01 && isSpread) {
                                      const newSpan = Math.max(0.01, timelineWindowSpan / 4);
                                      // Zoom into the center of the clicked bucket
                                      const newStart = Math.max(timeBounds.min, centerYear - newSpan / 2);
                                      
                                      // Smoothly animate both span and start
                                      animate(timelineWindowSpan, newSpan, {
                                        duration: 0.8,
                                        ease: [0.16, 1, 0.3, 1],
                                        onUpdate: (v) => setTimelineWindowSpan(v)
                                      });
                                      animate(timelineWindowStart, newStart, {
                                        duration: 0.8,
                                        ease: [0.16, 1, 0.3, 1],
                                        onUpdate: (v) => setTimelineWindowStart(v)
                                      });
                                    } else if (features.length > 0) {
                                      // Otherwise, just handle the click on the feature
                                      handleLocationItemClick(features[0]);
                                    }
                                  }}
                                />
                              );
                            });
                          });
                        })()}

                        {/* INPUTS FOR RANGE SELECTION (ON THE TIMELINE) AND HIGHLIGHT BAR */}
                        <div style={{
                          position: 'absolute',
                          bottom: '32px', // Moved up to prevent covering the date numbers on the bottom
                          left: '0px',
                          right: '0px',
                          height: '24px',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}>
                          {/* HIGHLIGHT BAR */}
                          <div style={{
                            position: 'absolute',
                            bottom: '0px',
                            left: `${getX(yearRange.start)}%`,
                            width: `${getX(yearRange.end) - getX(yearRange.start)}%`,
                            height: '24px',
                            background: isMapDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                            borderRadius: '2px',
                            zIndex: 1
                          }} />

                          {/* 
                            Calculation for aligned sliders:
                            We want the global range input (timeBounds.min to timeBounds.max) to stretch
                            such that the years in the input align with the years on the ruler.
                          */}
                          {(() => {
                            const windowEnd = timelineWindowStart + timelineWindowSpan;

                            const commonInputStyle: React.CSSProperties = {
                              position: 'absolute', 
                              width: '100%', 
                              height: '100%', 
                              background: 'transparent', 
                              appearance: 'none', 
                              pointerEvents: 'none', 
                              margin: 0, 
                              left: 0,
                              padding: 0,
                              boxSizing: 'border-box'
                            };


                            return (
                              <>
                                <input 
                                  type="range" 
                                  min={timelineWindowStart} 
                                  max={windowEnd} 
                                  step={0.1}
                                  value={yearRange.start}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const width = e.currentTarget.offsetWidth;
                                    const gap = width > 0 ? (12 / width) * timelineWindowSpan : 0;
                                    setYearRange(p => ({ ...p, start: Math.min(val, p.end - gap) }));
                                    const thumbRatio = (val - timelineWindowStart) / timelineWindowSpan;
                                    triggerTimelineHint('left', leftSliderRef, Math.max(0, Math.min(1, thumbRatio)));
                                  }}
                                  style={{ 
                                    ...commonInputStyle,
                                    zIndex: yearRange.start > (windowEnd + timelineWindowStart) / 2 ? 14 : 13
                                  }}
                                  className="figma-slider-thumb-left"
                                  ref={leftSliderRef}
                                />
                                <input 
                                  type="range" 
                                  min={timelineWindowStart} 
                                  max={windowEnd} 
                                  step={0.1}
                                  value={yearRange.end}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const width = e.currentTarget.offsetWidth;
                                    const gap = width > 0 ? (12 / width) * timelineWindowSpan : 0;
                                    setYearRange(p => ({ ...p, end: Math.max(val, p.start + gap) }));
                                    const thumbRatio = (val - timelineWindowStart) / timelineWindowSpan;
                                    triggerTimelineHint('right', rightSliderRef, Math.max(0, Math.min(1, thumbRatio)));
                                  }}
                                  style={{ 
                                    ...commonInputStyle,
                                    zIndex: 12
                                  }}
                                  className="figma-slider-thumb-right"
                                  ref={rightSliderRef}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* PAN RIGHT BUTTON */}
              <motion.button 
                initial={false}
                animate={{ 
                  opacity: (timelineWindowStart + timelineWindowSpan) >= timeBounds.max ? 0 : 1,
                  pointerEvents: (timelineWindowStart + timelineWindowSpan) >= timeBounds.max ? 'none' : 'auto'
                }}
                whileHover={{ opacity: 0.7 }}
                onClick={() => setTimelineWindowStart(prev => Math.min(timeBounds.max - timelineWindowSpan, prev + (timelineWindowSpan * 0.1)))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isMapDarkMode ? 'transparent' : theme.bg,
                  border: `1px solid ${isMapDarkMode ? '#ffffff' : theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  marginLeft: '12px',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
              >
                <img src="/icons/icon-arrow-left.svg" style={{ width: '10px', height: '18px', transform: 'rotate(180deg)', filter: isMapDarkMode ? 'brightness(0)' : 'brightness(0)' }} alt="pan right" />
              </motion.button>
            </div>

            {/* CUSTOM TIMELINE TOOLTIP OVERLAY - ALIGNED TO DOTS FIELD */}
            <div style={{ position: 'absolute', top: '40px', bottom: 0, left: '110px', right: '110px', pointerEvents: 'none', overflow: 'visible', zIndex: 1000 }}>
              <AnimatePresence>
                {hoveredBucket && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 5, x: '-50%' }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      left: `${hoveredBucket.x}%`,
                      bottom: `${hoveredBucket.bottom}px`,
                      background: '#000000',
                      color: '#ffffff',
                      padding: '0 12px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50px',
                      fontSize: '10px',
                      fontWeight: '500',
                      fontFamily: '"Space Mono", monospace',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {hoveredBucket.count} {hoveredBucket.cat.toUpperCase()} AROUND {hoveredBucket.year}
                    {/* Triangle arrow below bubble */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '0',
                      height: '0',
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '8px solid #000000'
                    }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
        </div>

        {/* Timeline Panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            pointerEvents: currentPage === 'timeline' ? 'auto' : 'none',
            visibility: currentPage === 'timeline' ? 'visible' : 'hidden',
            opacity: currentPage === 'timeline' ? 1 : 0,
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            zIndex: currentPage === 'timeline' ? 12 : 0
          }}
        >
          {mountedPages.timeline && <Suspense fallback={null}><TimelinePage
            theme={theme}
            isMapDarkMode={isMapDarkMode}
            isMobile={isMobile}
            timelineItems={combinedTimelineItems}
            selectedItem={selectedTimelineItem}
            setSelectedItem={setSelectedTimelineItem}
            onViewOnMap={handleViewOnMap}
            onFlagItem={(item) => {
              setReportedFeature(item);
              setReportReason('Incorrect Coordinates / Location');
              setReportDetails('');
              setReportSuccess(null);
              setReportError(null);
              setIsReportOpen(true);
            }}
            onViewOnCodex={(termId) => {
              setFocusedCodexTermId(termId);
              setCurrentPage('codex');
            }}
          /></Suspense>}
        </div>

        {/* Codex Panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            pointerEvents: currentPage === 'codex' ? 'auto' : 'none',
            visibility: currentPage === 'codex' ? 'visible' : 'hidden',
            opacity: currentPage === 'codex' ? 1 : 0,
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            zIndex: currentPage === 'codex' ? 12 : 0
          }}
        >
          {mountedPages.codex && <Suspense fallback={null}><CodexPage
            theme={theme}
            codexNodes={combinedCodexNodes}
            isMapDarkMode={isMapDarkMode}
            focusedTermId={focusedCodexTermId}
            onFocusedTermConsumed={() => setFocusedCodexTermId(null)}
            onViewOnMap={(layerName, featureSearchTerm) => {
              stopMainMapRotation();
              setCurrentPage('map');
              // Enable the layer on the map
              setActiveLayers(prev => ({
                ...prev,
                [layerName]: true
              }));
              // Expand the layer in the sidebar
              setExpandedLayers(prev => ({
                ...prev,
                [layerName]: true
              }));
              
              if (featureSearchTerm) {
                // Prioritize finding by exact ID match first
                let mapRecord = combinedPointsAndLinesData.find(r => String(r.id) === featureSearchTerm);
                
                // If not found, find by name containing search term
                if (!mapRecord) {
                  mapRecord = combinedPointsAndLinesData.find(r => 
                    String(r.name).toLowerCase().includes(featureSearchTerm.toLowerCase())
                  );
                }
                
                // Clear search query to keep all other layer assets visible on the map and sidebar list
                setSearchQuery('');

                if (mapRecord) {
                  setTimeout(() => {
                    handleLocationItemClick(mapRecord);
                  }, 100);
                }
              }
            }}
            onViewOnTimeline={(timelineId) => {
              handleViewOnTimeline(timelineId);
            }}
            onFlagItem={(item) => {
              setReportedFeature(item);
              setReportReason('Inaccurate Description');
              setReportDetails('');
              setReportSuccess(null);
              setReportError(null);
              setIsReportOpen(true);
            }}
            onSelectedTermChange={(node) => {
              setSelectedCodexNode(node);
            }}
          /></Suspense>}
        </div>
      </div>

      </div>      {/* FULL SCREEN LIGHTBOX MODAL ARCHITECTURE */}
      <AnimatePresence>
        {isLightboxOpen && selectedFeature && activeAssets && activeAssets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              // A swipe should page images, not close the lightbox.
              if (lightboxTouchRef.current.swiped) {
                lightboxTouchRef.current.swiped = false;
                return;
              }
              setIsLightboxOpen(false);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              lightboxTouchRef.current = { x: t.clientX, y: t.clientY, swiped: false };
            }}
            onTouchEnd={(e) => {
              if (!activeAssets || activeAssets.length < 2) return;
              const t = e.changedTouches[0];
              const dx = t.clientX - lightboxTouchRef.current.x;
              const dy = t.clientY - lightboxTouchRef.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                lightboxTouchRef.current.swiped = true;
                if (dx < 0) {
                  setActiveImageIndex(prev => (prev + 1) % activeAssets.length);
                } else {
                  setActiveImageIndex(prev => (prev - 1 + activeAssets.length) % activeAssets.length);
                }
              }
            }}
            style={{ position: 'fixed', top: 0, left: 0, width: scrollbarWidth ? `calc(100vw - ${scrollbarWidth}px)` : '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out', fontFamily: '"Space Mono", monospace' }}
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
                          key={`lightbox-pdf-${selectedFeature.id}-${activeImageIndex}`}
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
                          key={`lightbox-video-${selectedFeature.id}-${activeImageIndex}`}
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
                          key={`lightbox-audio-${selectedFeature.id}-${activeImageIndex}`}
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
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{selectedFeature.name} - DIRECT SIGNAL CAPTURE</p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.img 
                          key={`${selectedFeature.id}-${activeImageIndex}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: isLightboxImageLoading ? 0 : 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          src={imgSrc} 
                          alt="High resolution dossier archive asset" 
                          referrerPolicy="no-referrer"
                          onLoad={() => setIsLightboxImageLoading(false)}
                          onError={(e) => {
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
                        FILE ASSET {activeImageIndex + 1} OF {activeAssets.length} — {selectedFeature.name.toUpperCase()}
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
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ 
        background: isMapDarkMode ? '#ffffff' : '#000000', 
        color: isMapDarkMode ? '#000000' : '#ffffff', 
        minHeight: '270px', 
        boxSizing: 'border-box', 
        paddingTop: '50px',
        paddingBottom: '60px',
        display: 'flex', 
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        textAlign: 'left', 
        fontFamily: '"Space Mono", monospace',
        width: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          justifyContent: 'space-between',
          padding: '0 60px 0 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', alignSelf: 'stretch' }}>
            <img 
              src="/mtrh-horiz-words.svg" 
              alt="MTRH Logo" 
              style={{ 
                width: '232px', 
                height: '78px',
                display: 'block',
                filter: isMapDarkMode ? 'invert(1)' : 'none'
              }} 
            />
            <div style={{ 
              marginLeft: '35px',
              opacity: 0.5,
              color: isMapDarkMode ? '#000000' : '#ffffff', 
              fontSize: '10px', 
              fontWeight: 'normal', 
              lineHeight: '1.5', 
              textTransform: 'none' 
            }}>
              Copyright North Beast LLC 2026.<br /> All rights reserved.
            </div>
          </div>
          
          {/* RIGHT: CONTENT COLUMNS - Aligned right */}
          <div style={{ 
            display: 'flex', 
            gap: '80px'
          }}>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px 0', color: isMapDarkMode ? '#000000' : '#ffffff', textAlign: 'right', fontFamily: '"Space Mono", monospace' }}>FRIENDS</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '10px', fontWeight: 'bold', color: isMapDarkMode ? '#000000' : '#ffffff', textAlign: 'right', fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                <a href="https://northbeastclothing.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>NORTH BEAST CO.</a>
                <a href="https://blurrycreatures.com/?srsltid=AfmBOorjjAxrHwi6VEgrMm-dxLlVFFb_yFGO3YDacaky_IXZDdgcWNcg" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>BLURRY CREATURES</a>
                <a href="https://www.theconfessionalspodcast.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>THE CONFESSIONALS</a>
                <a href="https://www.instagram.com/giants_of_ancientamerica/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>GIANTS OF ANCIENT AMERICA</a>
                <a href="https://www.instagram.com/freetherabbitspodcast/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>FREE THE RABBITS</a>
                <a href="https://www.21cdstudios.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>21CD</a>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px 0', color: isMapDarkMode ? '#000000' : '#ffffff', textAlign: 'right', fontFamily: '"Space Mono", monospace' }}>CONTACT</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '10px', fontWeight: 'bold', color: isMapDarkMode ? '#000000' : '#ffffff', textAlign: 'right', fontFamily: '"Space Mono", monospace' }}>
                <span style={{ fontWeight: 'normal', textTransform: 'none' }}>Questions? Wanna help?</span>
                <a href="mailto:mappingtherabbithole@gmail.com" style={{ color: 'inherit', textDecoration: 'underline', textTransform: 'none' }}>mappingtherabbithole@gmail.com</a>
                
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <form 
                    action="https://www.paypal.com/donate" 
                    method="post" 
                    target="_blank" 
                    style={{ display: 'inline-block', margin: 0, padding: 0 }}
                  >
                    <input type="hidden" name="business" value="GZV5QVK7KNBVE" />
                    <input type="hidden" name="no_recurring" value="0" />
                    <input type="hidden" name="item_name" value="I do this because I love it! But anything is greatly appreciated!" />
                    <input type="hidden" name="currency_code" value="USD" />
                    <button 
                      type="submit"
                      style={{
                        width: '140px',
                        height: '30px',
                        backgroundColor: 'transparent',
                        color: isMapDarkMode ? '#000000' : '#ffffff',
                        border: `1.5px solid ${isMapDarkMode ? '#000000' : '#ffffff'}`,
                        padding: '0',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: '"Space Mono", monospace',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: '30px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = isMapDarkMode ? '#000000' : '#ffffff';
                        e.currentTarget.style.color = isMapDarkMode ? '#ffffff' : '#000000';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = isMapDarkMode ? '#000000' : '#ffffff';
                      }}
                    >
                      DONATE
                    </button>
                    <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" style={{ display: 'none' }} />
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        
        * {
          font-family: 'Space Mono', monospace !important;
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          height: 100%;
        }

        .custom-sidebar-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-track {
          background: ${isMapDarkMode ? '#000000' : '#ffffff'};
          border-left: 1px solid ${isMapDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: ${isMapDarkMode ? '#ffffff' : '#000000'};
          border-radius: 0px;
        }
        @supports not selector(::-webkit-scrollbar) {
          .custom-sidebar-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: ${isMapDarkMode ? '#ffffff #000000' : '#000000 #ffffff'};
          }
        }

        .custom-scrollbar {
          overflow-y: scroll;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isMapDarkMode ? '#000000' : '#ffffff'};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isMapDarkMode ? '#ffffff' : '#000000'};
          border-radius: 0px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isMapDarkMode ? '#cccccc' : '#333333'};
        }
        @supports not selector(::-webkit-scrollbar) {
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: ${isMapDarkMode ? '#ffffff #000000' : '#000000 #ffffff'};
          }
        }

        .timeline-zoom-slider { -webkit-appearance: none !important; appearance: none !important; }
        .timeline-zoom-slider::-webkit-slider-thumb { -webkit-appearance: none !important; appearance: none !important; width: 16px !important; height: 16px !important; border-radius: 50% !important; background: #ffffff !important; border: 2px solid #000000 !important; cursor: pointer !important; }
        
        .figma-slider-thumb-left::-webkit-slider-thumb { 
          -webkit-appearance: none !important; 
          appearance: none !important; 
          pointer-events: auto !important; 
          width: 12px !important; 
          height: 24px !important; 
          border-radius: 4px !important; 
          background-color: ${isMapDarkMode ? '#ffffff' : '#000000'} !important; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${isMapDarkMode ? 'black' : 'white'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='9 18 15 12 9 6'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          cursor: pointer !important; 
          border: ${isMapDarkMode ? '1px solid #000000' : 'none'} !important;
          margin-top: 0 !important;
        }
        .figma-slider-thumb-left::-moz-range-thumb { 
          appearance: none !important; 
          pointer-events: auto !important; 
          width: 12px !important; 
          height: 24px !important; 
          border-radius: 4px !important; 
          background-color: ${isMapDarkMode ? '#ffffff' : '#000000'} !important; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${isMapDarkMode ? 'black' : 'white'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='9 18 15 12 9 6'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          cursor: pointer !important; 
          border: ${isMapDarkMode ? '1px solid #000000' : 'none'} !important;
        }
        
        .figma-slider-thumb-right::-webkit-slider-thumb { 
          -webkit-appearance: none !important; 
          appearance: none !important; 
          pointer-events: auto !important; 
          width: 12px !important; 
          height: 24px !important; 
          border-radius: 4px !important; 
          background-color: ${isMapDarkMode ? '#ffffff' : '#000000'} !important; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${isMapDarkMode ? 'black' : 'white'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='15 18 9 12 15 6'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          cursor: pointer !important; 
          border: ${isMapDarkMode ? '1px solid #000000' : 'none'} !important;
          margin-top: 0 !important;
        }
        .figma-slider-thumb-right::-moz-range-thumb { 
          appearance: none !important; 
          pointer-events: auto !important; 
          width: 12px !important; 
          height: 24px !important; 
          border-radius: 4px !important; 
          background-color: ${isMapDarkMode ? '#ffffff' : '#000000'} !important; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${isMapDarkMode ? 'black' : 'white'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='15 18 9 12 15 6'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          cursor: pointer !important; 
          border: ${isMapDarkMode ? '1px solid #000000' : 'none'} !important;
        }
        
        .interactive-tag-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .interactive-tag-pill:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 2px solid #e5e5e5;
          border-top: 2px solid #000000;
          border-radius: 50%;
          animation: spinMapAsset 0.7s linear infinite;
        }

        .lightbox-nav-icon {
          filter: brightness(0) invert(1);
          transition: filter 0.2s ease;
        }
        
        button:hover .lightbox-nav-icon {
          filter: brightness(0);
        }

        @keyframes spinMapAsset {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes radar-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(182, 166, 255, 0.6);
            border-color: rgba(182, 166, 255, 0.8);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(182, 166, 255, 0);
            border-color: rgba(182, 166, 255, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(182, 166, 255, 0);
            border-color: rgba(182, 166, 255, 0);
          }
        }
      `}</style>

      {/* ABOUT MODAL */}
      <AnimatePresence>
        {showAboutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              fontFamily: '"Space Mono", monospace',
              padding: '20px'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                backgroundColor: '#ffffff',
                width: 'min(671px, calc(100vw - 24px))',
                height: 'min(530px, 90vh)',
                position: 'relative',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
            {/* TOP SECTION: 671x208 */}
            <div style={{
              backgroundImage: 'url("https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/overlay-map-bg-%402x.png")',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              height: '208px',
              minHeight: '208px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              flexShrink: 0
            }}>
              {/* LOGO BOX: 232x78 vertically centered on the left */}
              <div style={{
                position: 'absolute',
                left: '0',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#000000',
                width: '232px',
                height: '78px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 2
              }}>
                <img 
                  src="https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/mtrh-horiz-words.svg" 
                  alt="MTRH Logo" 
                  style={{ width: '232px', height: '78px' }} 
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* ICONS IMAGE: 312x208 on the right */}
              <img 
                src="https://raw.githubusercontent.com/northbeastclothing-design/MTRH/main/public/overlay-icons-%402x.png" 
                alt="Icons Grid" 
                style={{ 
                  position: 'absolute',
                  right: '0',
                  top: '0',
                  width: '312px',
                  height: '208px',
                  zIndex: 2,
                  objectFit: 'contain'
                }} 
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* BOTTOM SECTION CONTENT: remaining height is 268px */}
            <div style={{
              padding: '40px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center'
            }}>
              <h2 style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '28px',
                fontWeight: 'normal',
                marginBottom: '20px',
                color: '#000000',
                lineHeight: '1.2',
                width: 'min(570px, calc(100vw - 72px))',
                textAlign: 'center'
              }}>
                We are Mapping the Rabbit Hole
              </h2>
              
              <p style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '12px',
                lineHeight: '20px',
                color: '#000000',
                width: 'min(570px, calc(100vw - 72px))',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                We are mapping the weird. We are searching for patterns & parallels. From giant bones, to UFOs, to cryptids we are looking at them as a whole to see how they converge. This is forever a work in progress and we would love your help and input!
              </p>

              <p style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '11px',
                lineHeight: '18px',
                color: '#666666',
                width: 'min(570px, calc(100vw - 72px))',
                marginBottom: '30px',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                "It is the glory of God to conceal a thing: but the honour of kings is to search out a matter. - Proverbs 25:2"
              </p>

              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '30px'
              }}>
                <button 
                  onClick={() => setShowAboutModal(false)}
                  style={{
                    width: '200px',
                    height: '30px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: '1.5px solid #000000',
                    padding: '0',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: '"Space Mono", monospace',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '30px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#000000';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                >
                  EXPLORE
                </button>

                <form 
                  action="https://www.paypal.com/donate" 
                  method="post" 
                  target="_blank" 
                  style={{ display: 'inline-block', margin: 0, padding: 0 }}
                >
                  <input type="hidden" name="business" value="GZV5QVK7KNBVE" />
                  <input type="hidden" name="no_recurring" value="0" />
                  <input type="hidden" name="item_name" value="I do this because I love it! But anything is greatly appreciated!" />
                  <input type="hidden" name="currency_code" value="USD" />
                  <button 
                    type="submit"
                    style={{
                      width: '200px',
                      height: '30px',
                      backgroundColor: 'transparent',
                      color: '#000000',
                      border: '1.5px solid #000000',
                      padding: '0',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      fontFamily: '"Space Mono", monospace',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: '30px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#000000';
                    }}
                  >
                    DONATE
                  </button>
                  <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" style={{ display: 'none' }} />
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MAP PINNING MODE BANNER */}
      {isPinningOnMap && (
        <div style={{
          position: 'fixed',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#000000',
          color: '#ffffff',
          border: '1px solid #ffffff',
          padding: '12px 24px',
          zIndex: 999999,
          fontFamily: '"Space Mono", monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ff3333',
            animation: 'spinMapAsset 1s linear infinite'
          }} />
          <span>MAP PINNING MODE: CLICK ANYWHERE ON DETECTED RADAR AREAS TO CAPTURE LAT/LNG</span>
          <button 
            onClick={() => {
              setIsPinningOnMap(false);
              setIsSubmitOpen(true);
            }} 
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ff4d4d',
              cursor: 'pointer',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '10px',
              marginLeft: '12px'
            }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* SUBMISSION FORM MODAL OVERLAY */}
      <AnimatePresence>
        {isSubmitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              fontFamily: '"Space Mono", monospace',
              padding: '20px'
            }}
          >
            <motion.button 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ opacity: 0.7 }}
              onClick={() => setIsSubmitOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Space Mono", monospace', letterSpacing: '1px', zIndex: 10001, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src="/icons/icon-x.svg" style={{ width: '24px', height: '24px', filter: 'invert(1)' }} alt="close" />
              CLOSE
            </motion.button>

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                backgroundColor: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                color: isMapDarkMode ? '#ffffff' : '#000000',
                border: `1px solid ${theme.border}`,
                padding: '28px',
                width: '640px',
                maxWidth: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isMapDarkMode ? '0 10px 40px rgba(255,255,255,0.05)' : '0 15px 40px rgba(0,0,0,0.3)',
                textAlign: 'left'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '12px', marginBottom: '20px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Input Intel //</span>
                <p style={{ margin: 0, fontSize: '11px', color: theme.textDim, lineHeight: '16px' }}>
                  Thank you for contributing to mapping the rabbit hole. Your intelligence submissions help build our collective community map.
                </p>
              </div>

              {submissionSuccess ? (
                <div style={{ padding: '24px', border: '1px solid #00ff00', background: 'rgba(0,255,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <Check size={36} color="#00ff00" />
                  <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: '20px', color: '#00cc00', fontWeight: 'bold' }}>{submissionSuccess}</span>
                  <button 
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setIsSubmitOpen(false);
                    }}
                    style={{
                      background: theme.text,
                      color: theme.bg,
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '9px',
                      fontFamily: '"Space Mono", monospace',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    RETURN TO MAP
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!subName.trim() || !subCategory || !subDescription.trim()) {
                      setSubmissionError("All required attributes (Name, Category, Description) must be defined.");
                      return;
                    }

                    const hasCoords = subLatitude.trim() !== '' || subLongitude.trim() !== '';
                    let latNum = NaN;
                    let lngNum = NaN;
                    if (hasCoords) {
                      latNum = parseFloat(subLatitude);
                      lngNum = parseFloat(subLongitude);
                      if (isNaN(latNum) || isNaN(lngNum)) {
                        setSubmissionError("Coordinates must be valid numbers if provided.");
                        return;
                      }
                      if (!isValidLngLat(lngNum, latNum)) {
                        setSubmissionError("Coordinates must be within standard bounds (Latitude: -90 to 90, Longitude: -180 to 180).");
                        return;
                      }
                    }

                    if (subDestinations.length === 0) {
                      setSubmissionError("At least one destination registry must be selected.");
                      return;
                    }

                    setIsSubmitting(true);
                    setSubmissionError(null);
                    setSubmissionSuccess(null);

                    const submissionId = `user_${Date.now()}`;
                    const submissionData: any = {
                      name: subName.trim(),
                      category: subCategory,
                      description: subDescription.trim(),
                      images: subMediaList,
                      status: 'pending',
                      destinations: subDestinations,
                      codexParentId: subDestinations.includes('codex') ? subCodexParentId : '',
                      timelineLayer: subDestinations.includes('timeline') ? subTimelineLayer : '',
                      timelineType: subDestinations.includes('timeline') ? subTimelineType : 'event',
                      timelineEnd: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineEnd.trim() : '',
                      timelineFatherId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineFatherId : '',
                      timelineMotherId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineMotherId : '',
                      timelineSpouseId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineSpouseId : '',
                      submitterName: subSubmitterName.trim(),
                      submitterEmail: subSubmitterEmail.trim()
                    };

                    if (hasCoords) {
                      submissionData.coordinates = [lngNum, latNum];
                    }

                    if (subDate.trim()) {
                      submissionData.date = subDate.trim();
                    }
                    if (subSource.trim()) {
                      submissionData.source = subSource.trim();
                    }

                    try {
                      // First try our secure server-side Proxy API to bypass any client-side configuration/iframe constraints
                      const response = await fetch('/api/submissions/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: subName.trim(),
                          category: subCategory,
                          description: subDescription.trim(),
                          coordinates: hasCoords ? [lngNum, latNum] : null,
                          images: subMediaList,
                          date: subDate.trim() || undefined,
                          source: subSource.trim() || undefined,
                          destinations: subDestinations,
                          codexParentId: subDestinations.includes('codex') ? subCodexParentId : '',
                          timelineLayer: subDestinations.includes('timeline') ? subTimelineLayer : '',
                          timelineType: subDestinations.includes('timeline') ? subTimelineType : 'event',
                          timelineEnd: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineEnd.trim() : '',
                          timelineFatherId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineFatherId : '',
                          timelineMotherId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineMotherId : '',
                          timelineSpouseId: (subDestinations.includes('timeline') && subTimelineType === 'lifespan') ? subTimelineSpouseId : '',
                          submitterName: subSubmitterName.trim() || undefined,
                          submitterEmail: subSubmitterEmail.trim() || undefined
                        })
                      });
                      
                      if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error || `Server status ${response.status}`);
                      }

                      setSubmissionSuccess("TERRESTRIAL INTEL TRANSMITTED SUCCESSFULLY. YOUR SUBMISSION HAS BEEN REGISTERED FOR MODERATION REVIEW.");
                      setSubName('');
                      setSubDescription('');
                      setSubDate('');
                      setSubLatitude('');
                      setSubLongitude('');
                      setSubSource('');
                      setSubMediaList([]);
                      setSubDestinations(['map']);
                      setSubCodexParentId('');
                      setSubTimelineLayer('biblical-events');
                      setSubTimelineType('event');
                      setSubTimelineEnd('');
                      setSubTimelineFatherId('');
                      setSubTimelineMotherId('');
                      setSubTimelineSpouseId('');
                      setSubSubmitterName('');
                      setSubSubmitterEmail('');
                    } catch (err: any) {
                      console.warn("Server proxy submission failed, trying direct Firestore fallback:", err);
                      try {
                        await setDoc(doc(db, 'submissions', submissionId), {
                          ...submissionData,
                          createdAt: serverTimestamp()
                        });
                        setSubmissionSuccess("TERRESTRIAL INTEL TRANSMITTED SUCCESSFULLY (DIRECT ACCESS).");
                        setSubName('');
                        setSubDescription('');
                        setSubDate('');
                        setSubLatitude('');
                        setSubLongitude('');
                        setSubSource('');
                        setSubMediaList([]);
                        setSubDestinations(['map']);
                        setSubCodexParentId('');
                        setSubTimelineLayer('biblical-events');
                        setSubTimelineType('event');
                        setSubTimelineEnd('');
                        setSubTimelineFatherId('');
                        setSubTimelineMotherId('');
                        setSubTimelineSpouseId('');
                        setSubSubmitterName('');
                        setSubSubmitterEmail('');
                      } catch (fallbackErr: any) {
                        console.error("Firestore submission fallback error:", fallbackErr);
                        setSubmissionError(`Transmission Failure: ${fallbackErr.message || fallbackErr}`);
                      }
                    } finally {
                      setIsSubmitting(false);
                    }
                  }} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>NAME OF ANOMALY / SIGNATURE *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., Mount Shasta Entrance Shaft" 
                      value={subName} 
                      onChange={(e) => setSubName(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace'
                      }}
                    />
                                 {/* DESTINATION REGISTRIES */}
                  <div style={{ paddingTop: '12px' }}>
                    <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>DESTINATION REGISTRIES * (SELECT AT LEAST ONE)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '14px' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '11px', 
                        cursor: 'pointer', 
                        color: theme.text,
                        backgroundColor: subDestinations.includes('map') 
                          ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                          : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                        border: `1px solid ${subDestinations.includes('map') ? theme.border : theme.borderLight}`,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={subDestinations.includes('map')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubDestinations(prev => [...prev, 'map']);
                            } else {
                              setSubDestinations(prev => prev.filter(d => d !== 'map'));
                            }
                          }}
                          style={{ accentColor: theme.text }}
                        />
                        Interactive Map
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '11px', 
                        cursor: 'pointer', 
                        color: theme.text,
                        backgroundColor: subDestinations.includes('codex') 
                          ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                          : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                        border: `1px solid ${subDestinations.includes('codex') ? theme.border : theme.borderLight}`,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={subDestinations.includes('codex')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubDestinations(prev => [...prev, 'codex']);
                            } else {
                              setSubDestinations(prev => prev.filter(d => d !== 'codex'));
                            }
                          }}
                          style={{ accentColor: theme.text }}
                        />
                        Codex
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '11px', 
                        cursor: 'pointer', 
                        color: theme.text,
                        backgroundColor: subDestinations.includes('timeline') 
                          ? (isMapDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') 
                          : (isMapDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                        border: `1px solid ${subDestinations.includes('timeline') ? theme.border : theme.borderLight}`,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={subDestinations.includes('timeline')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubDestinations(prev => [...prev, 'timeline']);
                            } else {
                              setSubDestinations(prev => prev.filter(d => d !== 'timeline'));
                            }
                          }}
                          style={{ accentColor: theme.text }}
                        />
                        Timeline
                      </label>
                    </div>
                  </div>

                  {subDestinations.includes('map') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '12px', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textDim, letterSpacing: '0.5px' }}>MAP CONFIGURATION</div>
                      <div style={{ display: 'flex', gap: '16px', zIndex: 10002 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>REGISTRY LAYER / CODEX CATEGORY *</label>
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                              style={{
                                width: '100%',
                                background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                                border: `1px solid ${theme.border}`,
                                padding: '8px 12px',
                                fontSize: '11px',
                                color: theme.text,
                                fontFamily: '"Space Mono", monospace',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{ fontWeight: 'bold' }}>{subCategory}</span>
                              <ChevronDown size={12} style={{ color: theme.text, transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            
                            {isCategoryDropdownOpen && (
                              <>
                                <div 
                                  onClick={() => setIsCategoryDropdownOpen(false)}
                                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }} 
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  background: isMapDarkMode ? '#0d0d0d' : '#ffffff',
                                  border: `1px solid ${theme.border}`,
                                  borderTop: 'none',
                                  zIndex: 10001,
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  boxShadow: isMapDarkMode ? '0 5px 25px rgba(0,0,0,0.8)' : '0 5px 25px rgba(0,0,0,0.15)'
                                }}>
                                  {allIntelCategories.map(cat => (
                                    <div
                                      key={cat}
                                      onClick={() => {
                                        setSubCategory(cat);
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        color: theme.text,
                                        cursor: 'pointer',
                                        background: subCategory === cat ? (isMapDarkMode ? '#222' : '#eee') : 'transparent',
                                        transition: 'background 0.15s',
                                        borderBottom: `1px solid ${theme.borderLight}`,
                                        fontWeight: subCategory === cat ? 'bold' : 'normal',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = isMapDarkMode ? '#1a1a1a' : '#f5f5f5';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = subCategory === cat ? (isMapDarkMode ? '#222' : '#eee') : 'transparent';
                                      }}
                                    >
                                      {cat}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ width: '180px' }}>
                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>YEAR OF OCCURRENCE</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 1948" 
                            value={subDate} 
                            onChange={(e) => setSubDate(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          />
                        </div>
                      </div>

                      {/* Geolocation auto-pinpoint input block matching requirement 3 */}
                      <div style={{ background: isMapDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${theme.borderLight}`, padding: '14px', borderRadius: '2px' }}>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>GEOGRAPHIC GEO-SEARCH (AUTO-FILL COORDINATES)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Type place name/address (e.g., Mount Shasta, CA)..."
                            value={subLocationSearch}
                            onChange={(e) => setSubLocationSearch(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                await handleSubSearchGeocode();
                              }
                            }}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              padding: '6px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleSubSearchGeocode}
                            disabled={isSubGeocoding}
                            style={{
                              background: theme.text,
                              color: theme.bg,
                              border: 'none',
                              padding: '0 16px',
                              height: '32px',
                              borderRadius: '16px',
                              fontSize: '9px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: '"Space Mono", monospace',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}
                          >
                            {isSubGeocoding ? 'FINDING...' : 'RESOLVE'}
                          </button>
                        </div>
                        
                        {subGeocodeMsg && (
                          <div style={{ fontSize: '9px', color: subGeocodeMsg.type === 'error' ? '#ff3333' : '#00cc00', marginTop: '6px', fontWeight: 'bold' }}>
                            {subGeocodeMsg.text}
                          </div>
                        )}

                        {subGeocodeResults.length > 1 && (
                          <div style={{ 
                            marginTop: '8px', 
                            border: `1px solid ${theme.borderLight}`,
                            borderRadius: '2px',
                            background: isMapDarkMode ? '#111111' : '#fcfcfc',
                            maxHeight: '130px',
                            overflowY: 'auto',
                            textAlign: 'left'
                          }}>
                            <div style={{ padding: '4px 8px', fontSize: '8px', fontWeight: 'bold', color: theme.textDim, borderBottom: `1px solid ${theme.borderLight}`, letterSpacing: '0.5px' }}>
                              SUGGESTED MATCHES (CLICK TO PINPOINT):
                            </div>
                            {subGeocodeResults.map((feat) => {
                              const [lng, lat] = feat.center;
                              return (
                                <div 
                                  key={feat.id}
                                  onClick={() => {
                                    setSubLongitude(lng.toFixed(6));
                                    setSubLatitude(lat.toFixed(6));
                                    setSubLocationSearch(feat.place_name || feat.text);
                                    setSubGeocodeMsg({
                                      text: `SELECTED: ${feat.place_name || feat.text} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                                      type: 'success'
                                    });
                                    setSubGeocodeResults([]);
                                  }}
                                  style={{ 
                                    padding: '6px 8px', 
                                    fontSize: '9.5px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1px',
                                    borderBottom: `1px solid ${theme.borderLight}`
                                  }}
                                  className={isMapDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}
                                >
                                  <span style={{ fontWeight: 'bold', color: theme.text }}>{feat.place_name || feat.text}</span>
                                  <span style={{ fontSize: '8px', color: theme.textDim }}>Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Lat/Lng Pin coordinates */}
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>COORDINATES REGISTRATION (OPTIONAL)</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <input 
                            type="text" 
                            placeholder="Latitude (e.g. 41.4091)" 
                            value={subLatitude} 
                            onChange={(e) => setSubLatitude(e.target.value)}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          />
                          <input 
                            type="text" 
                            placeholder="Longitude (e.g. -122.1952)" 
                            value={subLongitude} 
                            onChange={(e) => setSubLongitude(e.target.value)}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsSubmitOpen(false);
                              setIsPinningOnMap(true);
                            }}
                            style={{
                              background: theme.text,
                              color: theme.bg,
                              border: 'none',
                              padding: '0 16px',
                              height: '32px',
                              borderRadius: '16px',
                              fontSize: '9px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              fontFamily: '"Space Mono", monospace',
                              boxSizing: 'border-box'
                            }}
                          >
                            <MapPin size={10} strokeWidth={2.5} />
                            <span>PIN MAP</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {subDestinations.includes('codex') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '12px', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textDim, letterSpacing: '0.5px' }}>CODEX CONFIGURATION</div>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>PARENT CODEX TERM</label>
                        <select
                          value={subCodexParentId}
                          onChange={(e) => setSubCodexParentId(e.target.value)}
                          style={{
                            width: '100%',
                            background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                            border: `1px solid ${theme.border}`,
                            padding: '8px 12px',
                            fontSize: '11px',
                            color: theme.text,
                            fontFamily: '"Space Mono", monospace'
                          }}
                        >
                          <option value="">None (Root Category)</option>
                          {[...combinedCodexNodes]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(node => (
                              <option key={node.id} value={node.id}>
                                {node.name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  )}

                  {subDestinations.includes('timeline') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: `2px solid ${theme.borderLight}`, paddingLeft: '12px', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textDim, letterSpacing: '0.5px' }}>TIMELINE CONFIGURATION</div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>TIMELINE LAYER / ERA *</label>
                          <select
                            value={subTimelineLayer}
                            onChange={(e) => setSubTimelineLayer(e.target.value)}
                            style={{
                              width: '100%',
                              background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          >
                            <option value="biblical-patriarchs">Biblical Bloodlines</option>
                            <option value="biblical-events">Biblical Events</option>
                            <option value="future-prophecy">Biblical Prophecy</option>
                            <option value="enochian-lore">Enochian Lore</option>
                            <option value="sumerian-kings">Sumerian Kings List</option>
                            <option value="greek-mythology">Greek Mythology</option>
                            <option value="merovingian-bloodlines">Merovingian Bloodlines</option>
                            <option value="royal-bloodlines">Royal Bloodlines</option>
                            <option value="illuminati-bloodlines">13 Illuminati Bloodlines</option>
                            <option value="black-nobility">13 Black Nobility Families</option>
                            <option value="secret-gov-programs">Secret Government Programs</option>
                            <option value="nasa-space">NASA / Space</option>
                            <option value="ancient-civilizations">Ancient People Groups</option>
                            <option value="alchemy-occult">The Occult</option>
                          </select>
                        </div>

                        <div style={{ width: '120px' }}>
                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>ENTRY TYPE</label>
                          <select
                            value={subTimelineType}
                            onChange={(e) => setSubTimelineType(e.target.value as 'event' | 'lifespan')}
                            style={{
                              width: '100%',
                              background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          >
                            <option value="event">Event</option>
                            <option value="lifespan">Lifespan</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>
                            {subTimelineType === 'lifespan' ? 'YEAR OF BIRTH (START) *' : 'YEAR OF OCCURRENCE *'}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. -1948 or 1350"
                            value={subDate}
                            onChange={(e) => setSubDate(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              padding: '8px 12px',
                              fontSize: '11px',
                              color: theme.text,
                              fontFamily: '"Space Mono", monospace'
                            }}
                          />
                        </div>

                        {subTimelineType === 'lifespan' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>YEAR OF DEATH (END)</label>
                            <input
                              type="text"
                              placeholder="e.g. -1800 or 1410 (optional)"
                              value={subTimelineEnd}
                              onChange={(e) => setSubTimelineEnd(e.target.value)}
                              style={{
                                width: '100%',
                                background: 'transparent',
                                border: `1px solid ${theme.border}`,
                                padding: '8px 12px',
                                fontSize: '11px',
                                color: theme.text,
                                fontFamily: '"Space Mono", monospace'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Lineage relationships for Lifespans */}
                      {subTimelineType === 'lifespan' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: isMapDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', padding: '10px', border: `1px solid ${theme.borderLight}` }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textDim, letterSpacing: '0.5px' }}>FAMILY TREE LINEAGE (OPTIONAL)</div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>FATHER</label>
                              <select
                                value={subTimelineFatherId}
                                onChange={(e) => setSubTimelineFatherId(e.target.value)}
                                style={{
                                  width: '100%',
                                  background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                                  border: `1px solid ${theme.border}`,
                                  padding: '4px 6px',
                                  fontSize: '9.5px',
                                  color: theme.text,
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <option value="">None</option>
                                {[...combinedTimelineItems]
                                  .filter(item => item.type === 'lifespan')
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))
                                }
                              </select>
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>MOTHER</label>
                              <select
                                value={subTimelineMotherId}
                                onChange={(e) => setSubTimelineMotherId(e.target.value)}
                                style={{
                                  width: '100%',
                                  background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                                  border: `1px solid ${theme.border}`,
                                  padding: '4px 6px',
                                  fontSize: '9.5px',
                                  color: theme.text,
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <option value="">None</option>
                                {[...combinedTimelineItems]
                                  .filter(item => item.type === 'lifespan')
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))
                                }
                              </select>
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: theme.text }}>SPOUSE</label>
                              <select
                                value={subTimelineSpouseId}
                                onChange={(e) => setSubTimelineSpouseId(e.target.value)}
                                style={{
                                  width: '100%',
                                  background: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                                  border: `1px solid ${theme.border}`,
                                  padding: '4px 6px',
                                  fontSize: '9.5px',
                                  color: theme.text,
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              >
                                <option value="">None</option>
                                {[...combinedTimelineItems]
                                  .filter(item => item.type === 'lifespan')
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
    </div>

                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>NARRATIVE RECORD & DATA LOG *</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Transcribe detailed observations, testimonies, spectral coordinates characteristics..." 
                      value={subDescription} 
                      onChange={(e) => setSubDescription(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>INVESTIGATIVE SOURCE ATTRIBUTION</label>
                      <input 
                        type="text" 
                        placeholder="e.g. US Air Force Project Blue Book Archives" 
                        value={subSource} 
                        onChange={(e) => setSubSource(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: `1px solid ${theme.border}`,
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: theme.text,
                          fontFamily: '"Space Mono", monospace'
                        }}
                      />
                    </div>
                  </div>

                  {/* Media Selector upload/link */}
                  <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: theme.text }}>MEDIA / INTEL FILES ATTACHMENT</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSubMediaType('url')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: subMediaType === 'url' ? theme.text : theme.textDim,
                            fontWeight: subMediaType === 'url' ? 'bold' : 'normal',
                            fontSize: '9px',
                            cursor: 'pointer',
                            textDecoration: subMediaType === 'url' ? 'underline' : 'none',
                            fontFamily: '"Space Mono", monospace'
                          }}
                        >
                          LINK URL
                        </button>
                        <span style={{ fontSize: '9px', color: theme.textDim }}>|</span>
                        <button
                          type="button"
                          onClick={() => setSubMediaType('upload')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: subMediaType === 'upload' ? theme.text : theme.textDim,
                            fontWeight: subMediaType === 'upload' ? 'bold' : 'normal',
                            fontSize: '9px',
                            cursor: 'pointer',
                            textDecoration: subMediaType === 'upload' ? 'underline' : 'none',
                            fontFamily: '"Space Mono", monospace'
                          }}
                        >
                          FILE UPLOAD
                        </button>
                      </div>
                    </div>

                    {subMediaType === 'url' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          placeholder="Paste image/PDF/audio/video URL directly..." 
                          value={subMediaInput} 
                          onChange={(e) => setSubMediaInput(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: `1px solid ${theme.border}`,
                            padding: '6px 12px',
                            fontSize: '10px',
                            color: theme.text,
                            fontFamily: '"Space Mono", monospace'
                          }}
                        />
                         <button 
                          type="button" 
                          onClick={() => {
                            const url = subMediaInput.trim();
                            if (!url) return;
                            setSubMediaList(prev => [...prev, url]);
                            setSubMediaInput('');
                          }}
                          style={{
                            background: 'transparent',
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            padding: '0 16px',
                            height: '32px',
                            borderRadius: '16px',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: '"Space Mono", monospace',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          LINK
                        </button>
                      </div>
                    ) : (
                      <div style={{ border: `1px dashed ${theme.border}`, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
                        <input 
                          type="file" 
                          accept="image/*,video/*,audio/*,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsUploading(true);
                            setSubmissionError(null);

                            const reader = new FileReader();
                            reader.onload = async () => {
                              const base64 = reader.result as string;
                              const base64Data = base64.split(',')[1] || base64;

                              try {
                                const response = await fetch('/api/upload', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    filename: file.name,
                                    fileData: base64Data
                                  })
                                });

                                if (!response.ok) {
                                  throw new Error(`Upload failed with status: ${response.status}`);
                                }

                                const data = await response.json();
                                if (data && data.url) {
                                  setSubMediaList(prev => [...prev, data.url]);
                                } else {
                                  throw new Error("Invalid response schema from upload endpoint");
                                }
                              } catch (err: any) {
                                console.error("Upload API Error:", err);
                                setSubmissionError(`Staging failed: ${err.message || err}`);
                              } finally {
                                setIsUploading(false);
                              }
                            };
                            
                            reader.onerror = () => {
                              setSubmissionError("Failed to read file local stream.");
                              setIsUploading(false);
                            };

                            reader.readAsDataURL(file);
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                        />
                        <Upload size={20} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '9px' }}>
                          {isUploading ? "UPLOADING FILE..." : "CLICK OR DRAG FILES HERE TO STAGE"}
                        </span>
                        <span style={{ fontSize: '8px', color: theme.textDim, marginTop: '4px' }}>PNG, JPG, MP4, MP3, PDF compatible</span>
                      </div>
                    )}

                    {/* Staged attachments */}
                    {subMediaList.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', background: isMapDarkMode ? '#141414' : '#fafafa', border: `1px solid ${theme.borderLight}`, padding: '8px' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 'bold' }}>STAGED INTEL ATTACHMENTS ({subMediaList.length})</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {subMediaList.map((url, idx) => {
                            const isFile = url.startsWith('/uploads/');
                            const displayName = isFile ? url.replace('/uploads/', '') : url;
                            return (
                              <div key={idx} style={{ padding: '4px 8px', background: isMapDarkMode ? '#222' : '#eeeeee', border: `1px solid ${theme.border}`, fontSize: '9px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setSubMediaList(prev => prev.filter((_, i) => i !== idx));
                                  }} 
                                  style={{ background: 'transparent', border: 'none', color: '#ff3333', cursor: 'pointer', padding: 0 }}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUBMITTER CONTACT INFO (OPTIONAL) */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>SUBMITTER NAME (OPTIONAL)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Agent Mulder" 
                        value={subSubmitterName} 
                        onChange={(e) => setSubSubmitterName(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: `1px solid ${theme.border}`,
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: theme.text,
                          fontFamily: '"Space Mono", monospace'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10.5px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: theme.text }}>SUBMITTER EMAIL (OPTIONAL)</label>
                      <input 
                        type="email" 
                        placeholder="e.g., mulder@fbi.gov" 
                        value={subSubmitterEmail} 
                        onChange={(e) => setSubSubmitterEmail(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: `1px solid ${theme.border}`,
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: theme.text,
                          fontFamily: '"Space Mono", monospace'
                        }}
                      />
                    </div>
                  </div>

                  {submissionError && (
                    <div style={{ color: '#ff3333', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ff3333', padding: '8px', background: 'rgba(255,0,0,0.02)' }}>
                      {submissionError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsSubmitOpen(false)} 
                      style={{
                        background: 'transparent',
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        padding: '0 20px',
                        height: '32px',
                        borderRadius: '16px',
                        fontSize: '9px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: '"Space Mono", monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      CANCEL
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || isUploading}
                      style={{
                        background: theme.text,
                        color: theme.bg,
                        border: 'none',
                        padding: '0 24px',
                        height: '32px',
                        borderRadius: '16px',
                        fontSize: '9px',
                        fontWeight: 700,
                        cursor: (isSubmitting || isUploading) ? 'not-allowed' : 'pointer',
                        fontFamily: '"Space Mono", monospace',
                        opacity: (isSubmitting || isUploading) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      {isSubmitting ? "TRANSMITTING..." : "SUBMIT INTEL"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INACCURACY REPORT MODAL */}
      <AnimatePresence>
        {isReportOpen && reportedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: '100%',
                maxWidth: '480px',
                background: isMapDarkMode ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                border: `1.5px solid ${isMapDarkMode ? '#ef4444' : '#b91c1c'}`,
                backdropFilter: 'blur(20px)',
                borderRadius: '8px',
                padding: '24px',
                color: theme.text,
                fontFamily: '"Space Mono", monospace',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flag size={18} style={{ color: isMapDarkMode ? '#ef4444' : '#b91c1c' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    FLAG ANOMALY INACCURACY
                  </span>
                </div>
                <button
                  onClick={() => setIsReportOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              {reportSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 204, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00cc00', margin: '0 auto' }}>
                    <Check size={28} />
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: '20px', color: '#00cc00', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {reportSuccess}
                  </div>
                  <button
                    onClick={() => setIsReportOpen(false)}
                    style={{
                      background: theme.text,
                      color: theme.bg,
                      border: 'none',
                      padding: '0 24px',
                      height: '32px',
                      borderRadius: '16px',
                      fontSize: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: '"Space Mono", monospace',
                      letterSpacing: '0.05em',
                      marginTop: '8px'
                    }}
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', lineHeight: '15px' }}>
                    You are flagging: <strong style={{ color: theme.text }}>{reportedFeature.name || reportedFeature.title || 'Unnamed Point'}</strong>
                    <br />
                    Layer: <strong style={{ color: theme.text }}>{reportedFeature.category || reportedFeature.layer || 'General'}</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      REASON FOR REPORT
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        style={{
                          width: '100%',
                          height: '36px',
                          background: isMapDarkMode ? '#000000' : '#ffffff',
                          color: theme.text,
                          border: `1.5px solid ${theme.border}`,
                          borderRadius: '4px',
                          padding: '0 12px',
                          fontSize: '11px',
                          fontFamily: '"Space Mono", monospace',
                          appearance: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Incorrect Coordinates / Location">Incorrect Coordinates / Location</option>
                        <option value="Inaccurate Description">Inaccurate Description</option>
                        <option value="Broken Link / Image">Broken Link / Image</option>
                        <option value="Duplicate Point">Duplicate Point</option>
                        <option value="Other / Wrong Layer">Other / Wrong Layer</option>
                      </select>
                      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: theme.textDim }}>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      SUPPORTING DETAILS (INACCURACY DESCRIPTION)
                    </label>
                    <textarea
                      required
                      placeholder="Please detail what is incorrect about this record, including correct coordinates, links, or references if possible..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      maxLength={2000}
                      style={{
                        width: '100%',
                        height: '110px',
                        background: isMapDarkMode ? '#000000' : '#ffffff',
                        color: theme.text,
                        border: `1.5px solid ${theme.border}`,
                        borderRadius: '4px',
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontFamily: '"Space Mono", monospace',
                        resize: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {reportError && (
                    <div style={{ color: '#ff3333', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ff3333', padding: '8px', background: 'rgba(255,0,0,0.02)' }}>
                      {reportError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setIsReportOpen(false)}
                      style={{
                        background: 'transparent',
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        padding: '0 20px',
                        height: '32px',
                        borderRadius: '16px',
                        fontSize: '9px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: '"Space Mono", monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      style={{
                        background: isMapDarkMode ? '#ef4444' : '#b91c1c',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0 24px',
                        height: '32px',
                        borderRadius: '16px',
                        fontSize: '9px',
                        fontWeight: 700,
                        cursor: isSubmittingReport ? 'not-allowed' : 'pointer',
                        fontFamily: '"Space Mono", monospace',
                        opacity: isSubmittingReport ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      {isSubmittingReport ? "TRANSMITTING..." : "SUBMIT REPORT"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODERATOR CONSOLE OVERLAY */}
      <AnimatePresence>
        {isModeratorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: isModMinimized ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              fontFamily: '"Space Mono", monospace',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                backgroundColor: isMapDarkMode ? '#0a0a0a' : '#ffffff',
                color: isMapDarkMode ? '#ffffff' : '#000000',
                border: `1.5px solid ${theme.border}`,
                padding: '28px',
                width: '720px',
                maxWidth: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isMapDarkMode ? '0 10px 40px rgba(255,255,255,0.05)' : '0 15px 40px rgba(0,0,0,0.3)',
                textAlign: 'left'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2.5px solid ${theme.border}`, paddingBottom: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={14} color={isMapDarkMode ? '#ffcc00' : '#000000'} />
                  <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '1px' }}>MTRH // DECISIONAL MODERATION DESK</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {isModeratorAuthenticated && (
                    <button 
                      onClick={() => setIsModMinimized(true)} 
                      title="Minimize modal to inspect underlay map"
                      style={{ 
                        background: 'transparent', 
                        border: '1px solid currentColor', 
                        borderRadius: '2px',
                        color: isMapDarkMode ? theme.textDim : '#000000', 
                        fontSize: '9px',
                        fontWeight: 'bold',
                        cursor: 'pointer', 
                        padding: '2px 8px', 
                        fontFamily: '"Space Mono", monospace' 
                      }}
                    >
                      MINIMIZE DESK
                    </button>
                  )}
                  <button onClick={() => setIsModeratorOpen(false)} style={{ background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!isModeratorAuthenticated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', padding: '36px 0' }}>
                  <ShieldAlert size={48} strokeWidth={1.5} color={isMapDarkMode ? '#ffcc00' : '#000000'} />
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '1px' }}>ADMIN SECURITY GATE SECUREMTRH_1</h4>
                    <p style={{ fontSize: '10px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: isMapDarkMode ? 'normal' : '500', margin: 0, width: '360px', lineHeight: '18px' }}>Authenticating under the owner account jhuffman710@gmail.com grants full write authority over map submissions.</p>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        setModeratorError(null);
                        await signInWithPopup(auth, new GoogleAuthProvider());
                      } catch (err: any) {
                        console.error("Popup sign-in error:", err);
                        setModeratorError(`Google login fail: ${err.message || err}`);
                      }
                    }}
                    style={{
                      background: isMapDarkMode ? '#ffffff' : '#000000',
                      color: isMapDarkMode ? '#000000' : '#ffffff',
                      border: `1px solid ${theme.border}`,
                      padding: '0 16px',
                      height: '32px',
                      borderRadius: '16px',
                      fontSize: '9px',
                      fontFamily: '"Space Mono", monospace',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    SIGN IN WITH GOOGLE
                  </button>

                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0', maxWidth: '300px' }}>
                    <div style={{ flex: 1, height: '1px', background: theme.borderLight }} />
                    <span style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: 'bold' }}>OR SECRETS BYPASS</span>
                    <div style={{ flex: 1, height: '1px', background: theme.borderLight }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '300px' }}>
                    <input
                      type="password"
                      placeholder="Enter secret codename..."
                      value={moderatorPasscode}
                      onChange={(e) => setModeratorPasscode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBypassAuth();
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        padding: '6px 12px',
                        height: '32px',
                        fontSize: '9px',
                        color: theme.text,
                        fontFamily: '"Space Mono", monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      onClick={() => {
                        handleBypassAuth();
                      }}
                      style={{
                        background: 'transparent',
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        padding: '0 16px',
                        height: '32px',
                        borderRadius: '16px',
                        fontSize: '9px',
                        fontFamily: '"Space Mono", monospace',
                        cursor: 'pointer',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      BYPASS
                    </button>
                  </div>

                  {moderatorError && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', maxWidth: '420px', marginTop: '4px' }}>
                      <span style={{ fontSize: '9px', color: '#ff3333', textAlign: 'center', fontWeight: 'bold' }}>{moderatorError}</span>
                      {moderatorError.includes('auth/unauthorized-domain') && (
                        <div style={{ 
                          background: isMapDarkMode ? 'rgba(255, 204, 0, 0.05)' : '#fff9e6', 
                          border: `1.5px solid ${isMapDarkMode ? '#ffcc00' : '#000000'}`, 
                          padding: '12px 16px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          lineHeight: '16px', 
                          color: '#000000', 
                          textAlign: 'left' 
                        }}>
                          <strong>SANDBOX DOMAIN AUTH REQUIREMENT:</strong> 
                          <br />
                          The current preview hostname (<code>{window.location.hostname}</code>) needs to be authorized under Firebase Auth Authorized Domains list.
                          <br /><br />
                          <strong>IMMEDIATE BYPASS:</strong> 
                          <br />
                          Simply type the secret administrative passcode in the box above and click <strong>BYPASS</strong>. This will authenticate you locally using our secure server-side administrative bypass and load the submissions list instantly!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isMapDarkMode ? '#141414' : '#f8f8f8', padding: '10px 14px', border: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffcc00' }} />
                      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        ACTIVE MOD DESK SESSION: {currentUser?.email || "Local Bypass Override Profile"}
                      </span>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await signOut(auth);
                          setIsModeratorAuthenticated(false);
                        } catch (err) {
                          setIsModeratorAuthenticated(false);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        color: '#ff4d4d',
                        border: 'none',
                        fontSize: '9px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontWeight: 'bold',
                        fontFamily: '"Space Mono", monospace'
                      }}
                    >
                      TERM SESSION
                    </button>
                  </div>

                  {moderatorError && (
                    <div style={{ color: '#ff3333', fontSize: '9px', fontWeight: 'bold', border: '1px solid #ff3333', padding: '8px', background: 'rgba(255,0,0,0.02)' }}>
                      {moderatorError}
                    </div>
                  )}

                  <div style={{ display: 'flex', borderBottom: `1px solid ${theme.borderLight}`, gap: '4px', marginBottom: '8px' }}>
                    <button
                      onClick={() => setActiveModTab('pending')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: '"Space Mono", monospace',
                        background: activeModTab === 'pending' ? (isMapDarkMode ? 'rgba(255, 204, 0, 0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                        color: activeModTab === 'pending' ? (isMapDarkMode ? '#ffcc00' : '#000000') : (isMapDarkMode ? '#999999' : '#666666'),
                        border: 'none',
                        borderBottom: activeModTab === 'pending' ? (isMapDarkMode ? '2.5px solid #ffcc00' : '2.5px solid #000000') : '2.5px solid transparent',
                        cursor: 'pointer',
                        letterSpacing: '0.5px'
                      }}
                    >
                      PENDING REVIEW ({pendingSubmissions.length})
                    </button>
                    <button
                      onClick={() => setActiveModTab('approved')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: '"Space Mono", monospace',
                        background: activeModTab === 'approved' ? (isMapDarkMode ? 'rgba(255, 204, 0, 0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                        color: activeModTab === 'approved' ? (isMapDarkMode ? '#ffcc00' : '#000000') : (isMapDarkMode ? '#999999' : '#666666'),
                        border: 'none',
                        borderBottom: activeModTab === 'approved' ? (isMapDarkMode ? '2.5px solid #ffcc00' : '2.5px solid #000000') : '2.5px solid transparent',
                        cursor: 'pointer',
                        letterSpacing: '0.5px'
                      }}
                    >
                      APPROVED INTEL AUDIT ({approvedSubmissions.length})
                    </button>
                    <button
                      onClick={() => setActiveModTab('reports')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: '"Space Mono", monospace',
                        background: activeModTab === 'reports' ? (isMapDarkMode ? 'rgba(255, 204, 0, 0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                        color: activeModTab === 'reports' ? (isMapDarkMode ? '#ffcc00' : '#000000') : (isMapDarkMode ? '#999999' : '#666666'),
                        border: 'none',
                        borderBottom: activeModTab === 'reports' ? (isMapDarkMode ? '2.5px solid #ffcc00' : '2.5px solid #000000') : '2.5px solid transparent',
                        cursor: 'pointer',
                        letterSpacing: '0.5px'
                      }}
                    >
                      INACCURACY REPORTS ({reports.filter(r => r.status === 'pending').length})
                    </button>
                  </div>

                  {activeModTab === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <span style={{ fontSize: '9.5px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        SUBMISSIONS PENDING FORMAL DECLASSIFICATION APPROVAL:
                      </span>

                      {pendingSubmissions.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', border: `1px dashed ${theme.borderLight}`, color: isMapDarkMode ? theme.textDim : '#000000', fontSize: '11px', fontWeight: 'bold' }}>
                          No unapproved user submissions at this time. Signals clear.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                          {pendingSubmissions.map((sub) => (
                            <div 
                              key={sub.id} 
                              style={{ 
                                border: `1.5px solid ${theme.border}`, 
                                padding: '16px', 
                                backgroundColor: isMapDarkMode ? '#111111' : '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: isMapDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'
                              }}
                            >
                              {editingSubId === sub.id ? (
                                renderEditForm(sub)
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: theme.text }}>{sub.name}</h5>
                                      <div style={{ display: 'flex', gap: '12px', fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: isMapDarkMode ? 'normal' : '500', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {(!sub.destinations || sub.destinations.includes('map')) && (
                                          <>
                                            <span>LAYER: <strong style={{ color: isMapDarkMode ? '#ffffff' : '#000000', textDecoration: isMapDarkMode ? 'none' : 'underline' }}>{sub.category}</strong></span>
                                            <span>COORDS: <strong style={{ color: isMapDarkMode ? '#ffffff' : '#000000' }}>[{sub.coordinates?.[1]}, {sub.coordinates?.[0]}]</strong></span>
                                          </>
                                        )}
                                        {sub.date && <span>YEAR: <strong style={{ color: isMapDarkMode ? '#ffffff' : '#000000' }}>{sub.date}</strong></span>}
                                      </div>

                                      {/* Destinations & Parenting Parameters */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        {(sub.destinations || ['map']).map((dest: string) => (
                                          <span 
                                            key={dest} 
                                            style={{ 
                                              fontSize: '8px', 
                                              fontWeight: 'bold', 
                                              padding: '1px 5px', 
                                              background: isMapDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', 
                                              color: theme.text,
                                              border: `1px solid ${theme.borderLight}`,
                                              borderRadius: '2px',
                                              textTransform: 'none'
                                            }}
                                          >
                                            {dest}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Codex Parent metadata */}
                                      {sub.destinations?.includes('codex') && (
                                        <div style={{ fontSize: '8.5px', color: theme.textDim, marginTop: '4px' }}>
                                          CODEX PARENT: <strong style={{ color: theme.text }}>{combinedCodexNodes.find(n => n.id === sub.codexParentId)?.name || 'Root Category'}</strong>
                                        </div>
                                      )}

                                      {/* Timeline configuration metadata */}
                                      {sub.destinations?.includes('timeline') && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                          <div style={{ fontSize: '8.5px', color: theme.textDim }}>
                                            TIMELINE ERA: <strong style={{ color: theme.text }}>{sub.timelineLayer}</strong> | TYPE: <strong style={{ color: theme.text }}>{sub.timelineType?.toUpperCase()}</strong>
                                            {sub.timelineType === 'lifespan' && sub.timelineEnd && (
                                              <> | DEATH YEAR: <strong style={{ color: theme.text }}>{sub.timelineEnd}</strong></>
                                            )}
                                          </div>
                                          {sub.timelineType === 'lifespan' && (sub.timelineFatherId || sub.timelineMotherId || sub.timelineSpouseId) && (
                                            <div style={{ fontSize: '8.5px', color: theme.textDim }}>
                                              {sub.timelineFatherId && <>FATHER: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineFatherId)?.name || sub.timelineFatherId}</strong> </>}
                                              {sub.timelineMotherId && <>MOTHER: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineMotherId)?.name || sub.timelineMotherId}</strong> </>}
                                              {sub.timelineSpouseId && <>SPOUSE: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineSpouseId)?.name || sub.timelineSpouseId}</strong> </>}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ padding: '2px 6px', background: isMapDarkMode ? '#ffa500' : '#000000', color: isMapDarkMode ? '#000000' : '#ffffff', fontSize: '8.5px', fontWeight: 'bold', borderRadius: '1.5px' }}>Pending</span>
                                  </div>

                                  <p style={{ margin: 0, fontSize: '10.5px', lineHeight: '16px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: isMapDarkMode ? 'normal' : '500', whiteSpace: 'pre-line' }}>
                                    {sub.description}
                                  </p>

                                  {sub.source && (
                                    <div style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontStyle: 'italic' }}>
                                      Source: <strong>{sub.source}</strong>
                                    </div>
                                  )}

                                  {(sub.submitterName || sub.submitterEmail) && (
                                    <div style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', borderTop: `1px dashed ${theme.borderLight}`, paddingTop: '4px', marginTop: '4px' }}>
                                      SUBMITTER CONTACT: <strong style={{ color: theme.text }}>{sub.submitterName || 'Anonymous'}</strong>
                                      {sub.submitterEmail && <> | <a href={`mailto:${sub.submitterEmail}`} style={{ color: '#b6a6ff', textDecoration: 'underline' }}>{sub.submitterEmail}</a></>}
                                    </div>
                                  )}

                                  {sub.images && sub.images.length > 0 && (
                                    <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: '10px' }}>
                                      <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: isMapDarkMode ? theme.text : '#000000' }}>ATTACHMENTS DETECTED:</span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                        {sub.images.map((imgUrl: string, index: number) => {
                                          const isFile = imgUrl.startsWith('/uploads/');
                                          const imgName = isFile ? imgUrl.replace('/uploads/', '') : imgUrl;
                                          return (
                                            <a 
                                              key={index}
                                              href={imgUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              style={{ 
                                                padding: '3px 8px', 
                                                background: isMapDarkMode ? '#222' : '#eee', 
                                                border: `1px solid ${theme.border}`, 
                                                fontSize: '9px', 
                                                color: theme.text,
                                                textDecoration: 'none'
                                              }}
                                            >
                                              [Link {index+1}: {imgName.slice(0, 30)}...]
                                            </a>
                                          );
                                        })}
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                                        {sub.images.map((imgUrl: string, index: number) => (
                                          <div key={index}>
                                            {renderMediaPreview(imgUrl)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.borderLight}`, paddingTop: '12px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      {sub.coordinates && Array.isArray(sub.coordinates) && sub.coordinates.length === 2 && isValidLngLat(sub.coordinates[0], sub.coordinates[1]) && (
                                        <button
                                          onClick={() => {
                                            if (mapRef.current) {
                                              const mockFeature = {
                                                id: sub.id,
                                                name: sub.name,
                                                description: sub.description,
                                                coordinates: sub.coordinates,
                                                categories: [sub.category],
                                                type: 'Point',
                                                isSubmitted: true
                                              };
                                              setSelectedFeature(mockFeature);
                                              mapRef.current.flyTo({ center: sub.coordinates, zoom: 14 });
                                              setIsModMinimized(true);
                                            }
                                          }}
                                          style={{
                                            background: 'transparent',
                                            color: theme.text,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: '16px',
                                            padding: '0 16px',
                                            height: '32px',
                                            fontSize: '9px',
                                            fontFamily: '"Space Mono", monospace',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxSizing: 'border-box'
                                          }}
                                        >
                                          <Eye size={12} />
                                          PREVIEW
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleStartEdit(sub)}
                                        style={{
                                          background: 'transparent',
                                          color: theme.text,
                                          border: `1px solid ${theme.border}`,
                                          borderRadius: '16px',
                                          padding: '0 16px',
                                          height: '32px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        EDIT INTEL
                                      </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                      <button
                                        disabled={submittingApprovalId !== null || submittingRejectionId !== null}
                                        onClick={async () => {
                                          setSubmittingRejectionId(sub.id);
                                          setModeratorError(null);
                                          try {
                                            const authParams = await getModeratorHeadersAndBody({ docId: sub.id });
                                            const response = await fetch('/api/moderate/reject', {
                                              method: 'POST',
                                              headers: authParams.headers,
                                              body: authParams.body
                                            });
                                            if (!response.ok) {
                                              const errData = await response.json();
                                              throw new Error(errData.error || `Server status ${response.status}`);
                                            }
                                          } catch (err: any) {
                                            console.warn("Server-side rejection failed, falling back to direct Firestore delete:", err);
                                            try {
                                              await deleteDoc(doc(db, 'submissions', sub.id));
                                            } catch (fallbackErr: any) {
                                              console.error("Firestore rejection fallback error:", fallbackErr);
                                              setModeratorError(`Moderation Failed: ${fallbackErr.message || "Ensure you are authorized or signed in."}`);
                                            }
                                          } finally {
                                            setSubmittingRejectionId(null);
                                            setModeratorReloadTrigger(prev => prev + 1);
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          color: isMapDarkMode ? '#ff3333' : '#d32f2f',
                                          border: isMapDarkMode ? '1px solid #ff3333' : '1.5px solid #d32f2f',
                                          padding: '0 16px',
                                          height: '32px',
                                          borderRadius: '16px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {submittingRejectionId === sub.id ? "REJECTING..." : "REJECT / DELETE"}
                                      </button>
                                      <button
                                        disabled={submittingApprovalId !== null || submittingRejectionId !== null}
                                        onClick={async () => {
                                          setSubmittingApprovalId(sub.id);
                                          setModeratorError(null);
                                          try {
                                            const authParams = await getModeratorHeadersAndBody({ docId: sub.id });
                                            const response = await fetch('/api/moderate/approve', {
                                              method: 'POST',
                                              headers: authParams.headers,
                                              body: authParams.body
                                            });
                                            if (!response.ok) {
                                              const errData = await response.json();
                                              throw new Error(errData.error || `Server status ${response.status}`);
                                            }
                                          } catch (err: any) {
                                            console.warn("Server-side approval failed, falling back to direct Firestore update:", err);
                                            try {
                                              await updateDoc(doc(db, 'submissions', sub.id), {
                                                status: 'approved'
                                              });
                                            } catch (fallbackErr: any) {
                                              console.error("Firestore approval fallback error:", fallbackErr);
                                              setModeratorError(`Moderation Failed: ${fallbackErr.message || "Ensure you are authorized or signed in."}`);
                                            }
                                          } finally {
                                            setSubmittingApprovalId(null);
                                            setModeratorReloadTrigger(prev => prev + 1);
                                          }
                                        }}
                                        style={{
                                          background: isMapDarkMode ? '#00cc00' : '#000000',
                                          color: isMapDarkMode ? '#000000' : '#ffffff',
                                          border: `1.5px solid ${isMapDarkMode ? '#00cc00' : '#000000'}`,
                                          padding: '0 16px',
                                          height: '32px',
                                          borderRadius: '16px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {submittingApprovalId === sub.id ? "APPROVING..." : "APPROVE ENTRY"}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeModTab === 'approved' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <span style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Approved Intel Audit Log (Revoke intel back to pending screen or purge wrong entries):
                      </span>

                      {approvedSubmissions.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', border: `1px dashed ${theme.borderLight}`, color: isMapDarkMode ? theme.textDim : '#000000', fontSize: '11px', fontWeight: 'bold' }}>
                          No registered approved user intel discovered in current cloud index.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                          {approvedSubmissions.map((sub) => (
                            <div 
                              key={sub.id} 
                              style={{ 
                                border: `1.5px solid ${theme.border}`, 
                                padding: '16px', 
                                backgroundColor: isMapDarkMode ? 'rgba(255,255,255,0.02)' : '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: isMapDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'
                              }}
                            >
                              {editingSubId === sub.id ? (
                                renderEditForm(sub)
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: theme.text }}>{sub.name}</h5>
                                      <div style={{ display: 'flex', gap: '12px', fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: isMapDarkMode ? 'normal' : '500', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {(!sub.destinations || sub.destinations.includes('map')) && (
                                          <>
                                            <span>LAYER: <strong style={{ color: isMapDarkMode ? (layerColors[sub.category] || '#b6a6ff') : '#000000', textDecoration: isMapDarkMode ? 'none' : 'underline' }}>{sub.category}</strong></span>
                                            <span>COORDS: <strong>[{sub.coordinates?.[1]}, {sub.coordinates?.[0]}]</strong></span>
                                          </>
                                        )}
                                        {sub.date ? <span>YEAR: <strong>{sub.date}</strong></span> : null}
                                      </div>

                                      {/* Destinations & Parenting Parameters */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        {(sub.destinations || ['map']).map((dest: string) => (
                                          <span 
                                            key={dest} 
                                            style={{ 
                                              fontSize: '8px', 
                                              fontWeight: 'bold', 
                                              padding: '1px 5px', 
                                              background: isMapDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', 
                                              color: theme.text,
                                              border: `1px solid ${theme.borderLight}`,
                                              borderRadius: '2px',
                                              textTransform: 'none'
                                            }}
                                          >
                                            {dest}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Codex Parent metadata */}
                                      {sub.destinations?.includes('codex') && (
                                        <div style={{ fontSize: '8.5px', color: theme.textDim, marginTop: '4px' }}>
                                          CODEX PARENT: <strong style={{ color: theme.text }}>{combinedCodexNodes.find(n => n.id === sub.codexParentId)?.name || 'Root Category'}</strong>
                                        </div>
                                      )}

                                      {/* Timeline configuration metadata */}
                                      {sub.destinations?.includes('timeline') && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                          <div style={{ fontSize: '8.5px', color: theme.textDim }}>
                                            TIMELINE ERA: <strong style={{ color: theme.text }}>{sub.timelineLayer}</strong> | TYPE: <strong style={{ color: theme.text }}>{sub.timelineType?.toUpperCase()}</strong>
                                            {sub.timelineType === 'lifespan' && sub.timelineEnd && (
                                              <> | DEATH YEAR: <strong style={{ color: theme.text }}>{sub.timelineEnd}</strong></>
                                            )}
                                          </div>
                                          {sub.timelineType === 'lifespan' && (sub.timelineFatherId || sub.timelineMotherId || sub.timelineSpouseId) && (
                                            <div style={{ fontSize: '8.5px', color: theme.textDim }}>
                                              {sub.timelineFatherId && <>FATHER: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineFatherId)?.name || sub.timelineFatherId}</strong> </>}
                                              {sub.timelineMotherId && <>MOTHER: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineMotherId)?.name || sub.timelineMotherId}</strong> </>}
                                              {sub.timelineSpouseId && <>SPOUSE: <strong style={{ color: theme.text }}>{combinedTimelineItems.find(t => t.id === sub.timelineSpouseId)?.name || sub.timelineSpouseId}</strong> </>}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ padding: '2px 6px', background: isMapDarkMode ? 'rgba(0, 204, 0, 0.1)' : '#000000', border: isMapDarkMode ? '1px solid #00cc00' : '1px solid #000000', color: isMapDarkMode ? '#00cc00' : '#ffffff', fontSize: '8.5px', fontWeight: 'bold', borderRadius: '1.5px' }}>Approved</span>
                                  </div>

                                  <p style={{ margin: 0, fontSize: '10.5px', lineHeight: '16px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: isMapDarkMode ? 'normal' : '500', whiteSpace: 'pre-line' }}>
                                    {sub.description}
                                  </p>

                                  {sub.source && (
                                    <div style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontStyle: 'italic' }}>
                                      Source: <strong>{sub.source}</strong>
                                    </div>
                                  )}

                                  {(sub.submitterName || sub.submitterEmail) && (
                                    <div style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', borderTop: `1px dashed ${theme.borderLight}`, paddingTop: '4px', marginTop: '4px' }}>
                                      SUBMITTER CONTACT: <strong style={{ color: theme.text }}>{sub.submitterName || 'Anonymous'}</strong>
                                      {sub.submitterEmail && <> | <a href={`mailto:${sub.submitterEmail}`} style={{ color: '#b6a6ff', textDecoration: 'underline' }}>{sub.submitterEmail}</a></>}
                                    </div>
                                  )}

                                  {sub.images && sub.images.length > 0 && (
                                    <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: '10px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: isMapDarkMode ? theme.text : '#000000' }}>ATTACHMENTS DETECTED:</span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                        {sub.images.map((imgUrl: string, index: number) => {
                                          const isFile = imgUrl.startsWith('/uploads/');
                                          const imgName = isFile ? imgUrl.replace('/uploads/', '') : imgUrl;
                                          return (
                                            <a 
                                              key={index}
                                              href={imgUrl} 
                                              target="_blank"  
                                              rel="noopener noreferrer" 
                                              style={{ 
                                                padding: '3px 8px', 
                                                background: isMapDarkMode ? '#222' : '#eee', 
                                                border: `1px solid ${theme.border}`, 
                                                fontSize: '9px', 
                                                color: theme.text,
                                                textDecoration: 'none'
                                              }}
                                            >
                                              [Link {index+1}: {imgName.slice(0, 30)}...]
                                            </a>
                                          );
                                        })}
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                                        {sub.images.map((imgUrl: string, index: number) => (
                                          <div key={index}>
                                            {renderMediaPreview(imgUrl)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.borderLight}`, paddingTop: '12px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      {sub.coordinates && Array.isArray(sub.coordinates) && sub.coordinates.length === 2 && isValidLngLat(sub.coordinates[0], sub.coordinates[1]) && (
                                        <button
                                          onClick={() => {
                                            if (mapRef.current) {
                                              const mockFeature = {
                                                id: sub.id,
                                                name: sub.name,
                                                description: sub.description,
                                                coordinates: sub.coordinates,
                                                categories: [sub.category],
                                                type: 'Point',
                                                isSubmitted: true
                                              };
                                              setSelectedFeature(mockFeature);
                                              mapRef.current.flyTo({ center: sub.coordinates, zoom: 14 });
                                              setIsModMinimized(true);
                                            }
                                          }}
                                          style={{
                                            background: 'transparent',
                                            color: theme.text,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: '16px',
                                            padding: '0 16px',
                                            height: '32px',
                                            fontSize: '9px',
                                            fontFamily: '"Space Mono", monospace',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxSizing: 'border-box'
                                          }}
                                        >
                                          <Eye size={12} />
                                          PREVIEW
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleStartEdit(sub)}
                                        style={{
                                          background: 'transparent',
                                          color: theme.text,
                                          border: `1px solid ${theme.border}`,
                                          borderRadius: '16px',
                                          padding: '0 16px',
                                          height: '32px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        EDIT INTEL
                                      </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                      <button
                                        disabled={submittingRevocationId !== null || submittingRejectionId !== null}
                                        onClick={async () => {
                                          setSubmittingRevocationId(sub.id);
                                          setModeratorError(null);
                                          try {
                                            const authParams = await getModeratorHeadersAndBody({ docId: sub.id });
                                            const response = await fetch('/api/moderate/revoke', {
                                              method: 'POST',
                                              headers: authParams.headers,
                                              body: authParams.body
                                            });
                                            if (!response.ok) {
                                              const errData = await response.json();
                                              throw new Error(errData.error || `Server status ${response.status}`);
                                            }
                                          } catch (err: any) {
                                            console.warn("Server-side revocation failed, trying direct Firestore fallback update:", err);
                                            try {
                                              await updateDoc(doc(db, 'submissions', sub.id), {
                                                status: 'pending'
                                              });
                                            } catch (fallbackErr: any) {
                                              console.error("Firestore revocation fallback error:", fallbackErr);
                                              setModeratorError(`Moderation Failed: ${fallbackErr.message || "Ensure you are authorized or signed in."}`);
                                            }
                                          } finally {
                                            setSubmittingRevocationId(null);
                                            setModeratorReloadTrigger(prev => prev + 1);
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          color: isMapDarkMode ? '#ffa500' : '#000000',
                                          border: isMapDarkMode ? '1px solid #ffa500' : '1.5px solid #000000',
                                          padding: '0 16px',
                                          height: '32px',
                                          borderRadius: '16px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {submittingRevocationId === sub.id ? "REVOKING..." : "REVOKE TO REVIEW"}
                                      </button>
                                      <button
                                        disabled={submittingRevocationId !== null || submittingRejectionId !== null}
                                        onClick={async () => {
                                          const confirmed = window.confirm("Are you sure you want to permanently delete this approved submission?");
                                          if (!confirmed) return;
                                          setSubmittingRejectionId(sub.id);
                                          setModeratorError(null);
                                          try {
                                            const authParams = await getModeratorHeadersAndBody({ docId: sub.id });
                                            const response = await fetch('/api/moderate/reject', {
                                              method: 'POST',
                                              headers: authParams.headers,
                                              body: authParams.body
                                            });
                                            if (!response.ok) {
                                              const errData = await response.json();
                                              throw new Error(errData.error || `Server status ${response.status}`);
                                            }
                                          } catch (err: any) {
                                            console.warn("Server-side rejection failed, falling back to direct Firestore delete:", err);
                                            try {
                                              await deleteDoc(doc(db, 'submissions', sub.id));
                                            } catch (fallbackErr: any) {
                                              console.error("Firestore rejection fallback error:", fallbackErr);
                                              setModeratorError(`Moderation Failed: ${fallbackErr.message || "Ensure you are authorized or signed in."}`);
                                            }
                                          } finally {
                                            setSubmittingRejectionId(null);
                                            setModeratorReloadTrigger(prev => prev + 1);
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          color: isMapDarkMode ? '#ff3333' : '#d32f2f',
                                          border: isMapDarkMode ? '1px solid #ff3333' : '1.5px solid #d32f2f',
                                          padding: '0 16px',
                                          height: '32px',
                                          borderRadius: '16px',
                                          fontSize: '9px',
                                          fontFamily: '"Space Mono", monospace',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {submittingRejectionId === sub.id ? "DELETING..." : "DELETE PERMANENTLY"}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeModTab === 'reports' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <span style={{ fontSize: '9px', color: isMapDarkMode ? theme.textDim : '#000000', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        INACCURACY REPORTS LOG:
                      </span>

                      {reports.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', border: `1px dashed ${theme.borderLight}`, color: isMapDarkMode ? theme.textDim : '#000000', fontSize: '11px', fontWeight: 'bold' }}>
                          No inaccuracy reports currently registered.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                          {reports.map((report) => (
                            <div 
                              key={report.id} 
                              style={{ 
                                border: `1.5px solid ${report.status === 'resolved' ? '#00cc00' : theme.border}`, 
                                padding: '16px', 
                                backgroundColor: isMapDarkMode ? 'rgba(255,255,255,0.02)' : '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: isMapDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'
                              }}
                            >
                              {editingReportId === report.id ? (
                                renderReportEditForm(report)
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: theme.text }}>
                                          {report.pointName}
                                        </h5>
                                        <span style={{ fontSize: '8px', padding: '2px 6px', background: layerColors[report.pointCategory] || '#e5e5e5', color: '#000', borderRadius: '4px', textTransform: 'none', fontFamily: '"Space Mono", monospace', fontWeight: 'bold' }}>
                                          {report.pointCategory}
                                        </span>
                                        <span style={{ 
                                          fontSize: '8px', 
                                          padding: '2px 6px', 
                                          background: report.status === 'resolved' ? 'rgba(0, 204, 0, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                                          color: report.status === 'resolved' ? '#00cc00' : '#ef4444', 
                                          border: `1px solid ${report.status === 'resolved' ? '#00cc00' : '#ef4444'}`,
                                          borderRadius: '4px', 
                                          textTransform: 'none', 
                                          fontFamily: '"Space Mono", monospace', 
                                          fontWeight: 'bold' 
                                        }}>
                                          {report.status}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '9px', color: theme.textDim, fontFamily: '"Space Mono", monospace' }}>
                                        TARGET ID: {report.pointId} | REPORT ID: {report.id}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: '10px', color: theme.textDim, whiteSpace: 'nowrap' }}>
                                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>

                                  <div style={{ padding: '10px', background: isMapDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${isMapDarkMode ? '#ef4444' : '#b91c1c'}`, fontSize: '11px', lineHeight: '16px', color: theme.text }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', color: isMapDarkMode ? '#ef4444' : '#b91c1c', marginBottom: '4px' }}>
                                      REASON: {report.reason}
                                    </div>
                                    {report.details || <em style={{ color: theme.textDim }}>No supporting details provided.</em>}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.borderLight}`, paddingTop: '12px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      {(() => {
                                        const mapRecord = combinedPointsAndLinesData.find(item => String(item.id) === String(report.pointId));
                                        if (!mapRecord || !mapRecord.coordinates) return null;
                                        return (
                                          <button
                                            onClick={() => {
                                              if (mapRef.current) {
                                                setSelectedFeature(mapRecord);
                                                mapRef.current.flyTo({ center: mapRecord.coordinates, zoom: 14 });
                                                setIsModMinimized(true);
                                              }
                                            }}
                                            style={{
                                              background: 'transparent',
                                              color: theme.text,
                                              border: `1px solid ${theme.border}`,
                                              borderRadius: '16px',
                                              padding: '0 16px',
                                              height: '32px',
                                              fontSize: '9px',
                                              fontFamily: '"Space Mono", monospace',
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              boxSizing: 'border-box'
                                            }}
                                          >
                                            <Eye size={12} />
                                            PREVIEW
                                          </button>
                                        );
                                      })()}

                                      {report.status === 'pending' && (
                                        <button
                                          onClick={() => {
                                            const mapRecord = combinedPointsAndLinesData.find(item => String(item.id) === String(report.pointId));
                                            const codexRecord = combinedCodexNodes.find(item => String(item.id) === String(report.pointId));
                                            
                                            setEditName(mapRecord?.name || codexRecord?.name || report.pointName || '');
                                            setEditDescription(mapRecord?.description || codexRecord?.description || '');
                                            setEditCategory(mapRecord?.category || report.pointCategory || '');
                                            setEditSource(mapRecord?.source || (codexRecord?.sources && codexRecord.sources[0]) || '');
                                            
                                            if (mapRecord?.coordinates && Array.isArray(mapRecord.coordinates) && mapRecord.coordinates.length === 2) {
                                              setEditLongitude(String(mapRecord.coordinates[0]));
                                              setEditLatitude(String(mapRecord.coordinates[1]));
                                            } else {
                                              setEditLongitude('');
                                              setEditLatitude('');
                                            }
                                            
                                            setEditCodexParentId(codexRecord?.parentId || '');
                                            setEditTimelineId(codexRecord?.timelineId || '');
                                            setEditMapFeatureId(codexRecord?.mapFeatureId || '');
                                            
                                            setEditingReportId(report.id);
                                          }}
                                          style={{
                                            background: 'transparent',
                                            color: theme.text,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: '16px',
                                            padding: '0 16px',
                                            height: '32px',
                                            fontSize: '9px',
                                            fontFamily: '"Space Mono", monospace',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxSizing: 'border-box'
                                          }}
                                        >
                                          EDIT
                                        </button>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        disabled={submittingReportActionId !== null}
                                        onClick={async () => {
                                          const confirmed = window.confirm("Are you sure you want to permanently delete this report?");
                                          if (!confirmed) return;
                                          await handleReportAction(report.id, 'delete');
                                        }}
                                  style={{
                                    background: 'transparent',
                                    color: isMapDarkMode ? '#ff3333' : '#d32f2f',
                                    border: isMapDarkMode ? '1px solid #ff3333' : '1.5px solid #d32f2f',
                                    padding: '0 16px',
                                    height: '32px',
                                    borderRadius: '16px',
                                    fontSize: '9px',
                                    fontFamily: '"Space Mono", monospace',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  {submittingReportActionId === report.id ? "DELETING..." : "DELETE REPORT"}
                                </button>
                                
                                {report.status === 'pending' && (
                                  <button
                                    disabled={submittingReportActionId !== null}
                                    onClick={async () => {
                                      await handleReportAction(report.id, 'resolve');
                                    }}
                                    style={{
                                      background: isMapDarkMode ? '#00cc00' : '#000000',
                                      color: isMapDarkMode ? '#000000' : '#ffffff',
                                      border: `1.5px solid ${isMapDarkMode ? '#00cc00' : '#000000'}`,
                                      padding: '0 16px',
                                      height: '32px',
                                      borderRadius: '16px',
                                      fontSize: '9px',
                                      fontFamily: '"Space Mono", monospace',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    {submittingReportActionId === report.id ? "RESOLVING..." : "MARK RESOLVED"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING WIDGET WHEN MINIMIZED */}
      {isModeratorOpen && isModMinimized && (
        <button
          onClick={() => setIsModMinimized(false)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 99999,
            background: isMapDarkMode ? '#111111' : '#ffffff',
            color: '#ffcc00',
            border: '2px solid #ffcc00',
            padding: '12px 20px',
            borderRadius: '24px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: '"Space Mono", monospace',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'none'
          }}
        >
          <Shield size={14} />
          <span>MAXIMIZE MOD DESK</span>
        </button>
      )}

      {/* ONBOARDING TOUR */}
      <AnimatePresence>
        {onboardingStep !== null && (
          <>
            {/* Dark semi-transparent backdrop for step 0 (Welcome Modal) */}
            {onboardingStep === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setOnboardingStep(null);
                  localStorage.setItem('mtrh_onboarding_completed', 'true');
                }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  zIndex: 99998,
                  pointerEvents: 'auto'
                }}
              />
            )}

            {/* Tooltip Dialog */}
            {(() => {
              const onboardingSteps = [
                {
                  title: "1. WELCOME TO MTRH GUIDE",
                  content: "This interactive portal maps global anomalies, classified files, and historic archives. Let's take a quick step-by-step tour to help you get started.",
                  placement: "center"
                },
                {
                  title: "2. ARCHIVE FILTERS",
                  content: "Toggle layers to filter map events (UFOs, Bigfoot, underworld entrances, D.U.M.B.s), click SHUFFLE to randomize active layers, or use the Search bar to scan archives.",
                  placement: "left-sidebar"
                },
                {
                  title: "3. INTERACTIVE MAP",
                  content: "Left-click and drag to move. Use the scroll wheel to zoom. Clicking pins or highlighted shapes unlocks their classified dossier.",
                  placement: "map-viewport"
                },
                {
                  title: "4. HISTORICAL TIMELINE",
                  content: "Drag the timeline slider or use the zoom buttons to restrict active markers to a specific year span. Perfect for tracking events over time.",
                  placement: "timeline"
                },
                {
                  title: "5. INTERACTIVE TIMELINE PAGE",
                  content: "Click this Timeline button in the header to switch to the full interactive timeline view. There you can explore detailed biblical genealogies, Sumerian kings list, Greek mythology, and Enochian lore.",
                  placement: "timeline-button"
                },
                {
                  title: "6. COMPREHENSIVE CODEX",
                  content: "Click the Codex button in the header to navigate to the Codex page, where you can browse the interconnected tree database of entities, megaliths, structures, and anomalies.",
                  placement: "codex-button"
                },
                {
                  title: "7. INTELLIGENCE DOSSIER",
                  content: "When you select a location, its full file opens here. Review images, transcripts, video attachments, and original source documents.",
                  placement: "right-sidebar"
                },
                {
                  title: "8. SUBMIT EVIDENCE",
                  content: "Discovered an anomaly or classified file? Submit it to our queue. Once verified, it will be mapped and published on the platform.",
                  placement: "submit-intel"
                }
              ];

              const currentStep = onboardingSteps[onboardingStep];
              if (!currentStep) return null;

              // Invert theme: black bg with white text on light mode, and white bg with black text on dark mode
              const tooltipTheme = {
                bg: isMapDarkMode ? '#ffffff' : '#000000',
                text: isMapDarkMode ? '#000000' : '#ffffff',
                textDim: isMapDarkMode ? '#666666' : '#cccccc',
                border: isMapDarkMode ? '#ffffff' : '#000000',
                borderLight: isMapDarkMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
                buttonBg: isMapDarkMode ? '#000000' : '#ffffff',
                buttonText: isMapDarkMode ? '#ffffff' : '#000000',
                buttonBorder: isMapDarkMode ? '#000000' : '#ffffff'
              };

              const tooltipStyle: React.CSSProperties = (() => {
                const common: React.CSSProperties = {
                  position: 'fixed',
                  zIndex: 100000,
                  width: '320px',
                  pointerEvents: 'auto'
                };

                switch (currentStep.placement) {
                  case 'timeline-button':
                  case 'codex-button':
                    return {
                      ...common,
                      left: '50%',
                      top: '89px', // Shifted down to align pointer perfectly with buttons
                      transform: 'translate(-50%, 0)',
                      width: '360px',
                    };
                  case 'center':
                    return {
                      ...common,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '450px',
                    };
                  case 'left-sidebar':
                    return {
                      ...common,
                      left: isLeftCollapsed ? '40px' : '340px',
                      top: '180px',
                      transform: 'translate(0, 0)',
                    };
                  case 'map-viewport':
                    return {
                      ...common,
                      left: '50%',
                      top: '40%',
                      transform: 'translate(-50%, -50%)',
                    };
                  case 'timeline':
                    return {
                      ...common,
                      left: '50%',
                      top: isTimelineCollapsed ? 'calc(100vh - 60px)' : 'calc(100vh - 190px)', // Shifted up by 20px to prevent overlap with the timeline drawer bar
                      transform: 'translate(-50%, -100%)',
                      width: '360px',
                    };
                  case 'right-sidebar':
                    return {
                      ...common,
                      left: isRightCollapsed ? 'calc(100vw - 370px)' : 'calc(100vw - 670px)',
                      top: '180px',
                      transform: 'translate(0, 0)',
                    };
                  case 'submit-intel':
                    return {
                      ...common,
                      left: 'calc(100vw - 340px)',
                      top: '100px',
                      transform: 'translate(0, 0)',
                    };
                  default:
                    return common;
                }
              })();

              const arrowStyle: React.CSSProperties = (() => {
                const common: React.CSSProperties = {
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                };

                switch (currentStep.placement) {
                  case 'timeline-button':
                    return {
                      ...common,
                      top: '-10px',
                      left: '158px',
                      borderWidth: '0 8px 10px 8px',
                      borderColor: `transparent transparent ${tooltipTheme.bg} transparent`,
                    };
                  case 'codex-button':
                    return {
                      ...common,
                      top: '-10px',
                      left: '242px',
                      borderWidth: '0 8px 10px 8px',
                      borderColor: `transparent transparent ${tooltipTheme.bg} transparent`,
                    };
                  case 'left-sidebar':
                    return {
                      ...common,
                      left: '-10px',
                      top: '32px',
                      borderWidth: '8px 10px 8px 0',
                      borderColor: `transparent ${tooltipTheme.bg} transparent transparent`,
                    };
                  case 'right-sidebar':
                    return {
                      ...common,
                      right: '-10px',
                      top: '32px',
                      borderWidth: '8px 0 8px 10px',
                      borderColor: `transparent transparent transparent ${tooltipTheme.bg}`,
                    };
                  case 'timeline':
                    return {
                      ...common,
                      bottom: '-10px',
                      left: '162px',
                      borderWidth: '10px 8px 0 8px',
                      borderColor: `${tooltipTheme.bg} transparent transparent transparent`,
                    };
                  case 'submit-intel':
                    return {
                      ...common,
                      top: '-10px',
                      right: '63px',
                      borderWidth: '0 8px 10px 8px',
                      borderColor: `transparent transparent ${tooltipTheme.bg} transparent`,
                    };
                  default:
                    return { display: 'none' };
                }
              })();

              const handleClose = () => {
                setOnboardingStep(null);
                localStorage.setItem('mtrh_onboarding_completed', 'true');
              };

              const handleNext = () => {
                if (onboardingStep === onboardingSteps.length - 1) {
                  handleClose();
                } else {
                  setOnboardingStep(prev => prev! + 1);
                }
              };

              return (
                <div style={tooltipStyle}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      width: '100%',
                      background: tooltipTheme.bg,
                      border: `2px solid ${tooltipTheme.border}`,
                      borderRadius: '16px',
                      padding: '24px',
                      color: tooltipTheme.text,
                      fontFamily: '"Space Mono", monospace',
                      boxSizing: 'border-box',
                      position: 'relative',
                      boxShadow: isMapDarkMode ? '0 10px 40px rgba(0, 0, 0, 0.4)' : '0 10px 40px rgba(0, 0, 0, 0.3)'
                    }}
                    role="dialog"
                    aria-labelledby="tour-title"
                  >
                    {/* Arrow Indicator */}
                    <div style={arrowStyle} />

                    <motion.div
                      key={`step-text-${onboardingStep}`}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <h3 
                        id="tour-title"
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                          borderBottom: `1px solid ${tooltipTheme.borderLight}`,
                          paddingBottom: '8px',
                          margin: '0 0 12px 0',
                          color: tooltipTheme.text,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{currentStep.title}</span>
                        <span style={{ fontSize: '9px', color: tooltipTheme.textDim, fontWeight: 'normal' }}>
                          {onboardingStep + 1} / {onboardingSteps.length}
                        </span>
                      </h3>

                      <p 
                        style={{
                          fontSize: '10px',
                          lineHeight: '1.6',
                          color: tooltipTheme.textDim,
                          margin: '0 0 20px 0',
                          textAlign: 'left'
                        }}
                      >
                        {currentStep.content}
                      </p>
                    </motion.div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={handleClose}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: tooltipTheme.textDim,
                          fontSize: '9px',
                          fontFamily: '"Space Mono", monospace',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '4px 0',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = tooltipTheme.text; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = tooltipTheme.textDim; }}
                      >
                        Skip Guide
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {onboardingStep > 0 && (
                          <button
                            onClick={() => setOnboardingStep(prev => prev! - 1)}
                            style={{
                              background: 'transparent',
                              color: tooltipTheme.text,
                              border: `1px solid ${tooltipTheme.border}`,
                              padding: '0 16px',
                              height: '32px',
                              fontSize: '9px',
                              fontFamily: '"Space Mono", monospace',
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderRadius: '16px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              transition: 'opacity 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                          >
                            Back
                          </button>
                        )}

                        <button
                          onClick={handleNext}
                          style={{
                            background: tooltipTheme.buttonBg,
                            color: tooltipTheme.buttonText,
                            border: `1px solid ${tooltipTheme.buttonBorder}`,
                            padding: '0 16px',
                            height: '32px',
                            fontSize: '9px',
                            fontFamily: '"Space Mono", monospace',
                            fontWeight: 700,
                            cursor: 'pointer',
                            borderRadius: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            transition: 'opacity 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                          {onboardingStep === onboardingSteps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })()
          }
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

  export default App;
