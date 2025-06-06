const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');

const acceptBtn = document.getElementById('acceptBtn');
const redoBtn = document.getElementById('redoBtn');

// IndexedDB setup
const dbName = 'PhotoDB';
let camdb;
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
// Open camera when modal opens
document.getElementById('cameraModal').addEventListener('shown.bs.modal', async () => {
    //const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    var constraints = { video: { width: 800, height: 800, facingMode: "environment" } };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
      var video = document.querySelector('video');
      video.srcObject = mediaStream;
      video.onloadedmetadata = function(e) {
        video.play();
      };
    })
    .catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.


    //video.srcObject = stream;
});

// Stop camera when modal closes
document.getElementById('cameraModal').addEventListener('hidden.bs.modal', () => {
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    resetView();
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
function onPhotoAccepted(blob) {
    console.log("Photo accepted! Blob size:", blob.size);
    // You can do anything here with the blob, e.g., upload to server
}