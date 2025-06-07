const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');

const acceptBtn = document.getElementById('acceptBtn');
const redoBtn = document.getElementById('redoBtn');

const switchCameraBtn = document.getElementById('switchCameraBtn');
const toggleFlashBtn = document.getElementById('toggleFlashBtn');

// IndexedDB setup
const dbName = 'PhotoDB';
let camdb;
let cameras = [];
let currentStream = null;
let currentCameraIndex = 0;
const openDB = indexedDB.open(dbName, 1);
openDB.onupgradeneeded = () => {
    camdb = openDB.result;
    camdb.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
};
openDB.onsuccess = () => camdb = openDB.result;
function resetView() {
    photoPreview.style.display = 'none';
    video.style.display = 'block';
    previewButtons.style.display = 'none';
    captureBtn.style.display = 'inline-block';
}

async function getCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameras = devices.filter(d => d.kind === 'videoinput');
  console.log(cameras)
}
async function startCamera(index = 0, withTorch = false) {
    stopStream();
    const deviceId = cameras[index]?.deviceId;
    const constraints = { video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: 800,
          height: 800
    }};

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (mediaStream) {
            var video = document.querySelector('video');
            video.srcObject = mediaStream;
            currentStream = mediaStream;

            video.onloadedmetadata = function (e) {
                video.play();
            };
        })
        .catch(function (err) { 
            console.log(err.name + ": " + err.message); 
        }); // always check for errors at the end.*/

    //currentStream = await cameras[0].getUserMedia(constraints);
    //video.srcObject = currentStream;
}
// Open camera when modal opens
document.getElementById('cameraModal').addEventListener('shown.bs.modal', async () => {
    //const stream = await navigator.mediaDevices.g etUserMedia({ video: true });

    /*var constraints = { video: { width: 800, height: 800 },facingMode: "environment"};

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (mediaStream) {
            var video = document.querySelector('video');
            video.srcObject = mediaStream;
            currentStream = mediaStream;

            video.onloadedmetadata = function (e) {
                video.play();
            };
        })
        .catch(function (err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.*/

    startCamera(currentCameraIndex);


    //video.srcObject = stream;
});
function stopStream() {
    currentStream = video.srcObject;
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        currentStream = null;
    }
    resetView();
}
// Stop camera when modal closes
document.getElementById('cameraModal').addEventListener('hidden.bs.modal', () => {
    stopStream();
});



// Capture and store photo
captureBtn.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    /*canvas.toBlob(blob => {
        const tx = camdb.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.add({ blob });
        alert('Photo saved to IndexedDB!');
    }, 'image/jpeg');*/
    canvas.toBlob(blob => {
        capturedBlob = blob;
        const url = URL.createObjectURL(blob);
        photoPreview.src = url;
        video.style.display = 'none';
        photoPreview.style.display = 'block';
        captureBtn.style.display = 'none';
        previewButtons.style.display = 'block';
    }, 'image/jpeg');
});


// Redo photo
redoBtn.addEventListener('click', () => {
    capturedBlob = null;
    resetView();
});

// Accept photo and save to IndexedDB
acceptBtn.addEventListener('click', () => {
    if (!capturedBlob) return;
    const tx = camdb.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    store.add({ blob: capturedBlob });
    tx.oncomplete = () => {
        //alert('Photo saved!');
        bootstrap.Modal.getInstance(document.getElementById('cameraModal')).hide();
        onPhotoAccepted(capturedBlob);
    };
});

// Example callback
onPhotoAccepted = function (blob) {
    console.log("Photo accepted! Blob size:", blob.size);
    // You can do anything here with the blob, e.g., upload to server
}

async function toggleFlash() {
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    if (capabilities.torch) {
        flashOn = !flashOn;
        await track.applyConstraints({ advanced: [{ torch: flashOn }] });
        toggleFlashBtn.classList.toggle('btn-outline-warning', !flashOn);
    } else {
        //alert("Flash not supported on this device.");
    }
}

switchCameraBtn.addEventListener('click', async () => {
    getCameras();
    if (cameras.length < 2) {
        console.log("No other camera found.");
        return; //alert("No other camera found.");
    }
    currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
    await startCamera(currentCameraIndex);
});

toggleFlashBtn.addEventListener('click', toggleFlash);