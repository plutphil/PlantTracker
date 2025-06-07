let db;
let plants = [];
let selectedPlantIndex = null;
let dialog;
let settingsModal;

const request = indexedDB.open('PlantDB', 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore('plants', { keyPath: 'id', autoIncrement: true });
};

function loadPlants() {
  const tx = db.transaction('plants', 'readonly');
  const store = tx.objectStore('plants');
  const request = store.getAll();

  request.onsuccess = () => {
    plants = request.result;
    renderPlantList();
  };
}

request.onsuccess = e => {
  db = e.target.result;
  loadPlants();
};

request.onerror = e => {
  alert('Database error: ' + e.target.errorCode);
};



window.onload = () => {
  dialog = new bootstrap.Modal(document.getElementById('dialog'));
  settingsModal = new bootstrap.Modal(document.getElementById('settings-dialog'));

};

function savePlants() {
  const tx = db.transaction('plants', 'readwrite');
  const store = tx.objectStore('plants');
  store.clear(); // clear existing data
  plants.forEach(p => store.add(p));
}

function renderPlantList() {
  document.getElementById('plant-list').innerHTML = plants.map((p, i) => `
        <div class="col-6 col-md-4 col-lg-3 mb-3">
          <div class="card" onclick="openPlant(${i})">
            <img src="${p.image || ''}" class="card-img-top" />
            <div class="card-body">
              <h5 class="card-title">${p.name}</h5>
            </div>
          </div>
        </div>
      `).join('');
}

function openAddPlantDialog() {
  document.getElementById('dialog-title').textContent = 'Add Plant';
  document.getElementById('dialog-body').innerHTML = `
  <div class="card" style="width: 200px;">
        <img id="photoPreviewImage" src="" class="card-img-top" alt="Photo Preview" style="height: 200px; object-fit: cover;">
        
      </div>
    <input class="form-control my-1" id="plant-name" placeholder="Name" />
    <input class="form-control my-1" id="plant-location" placeholder="Location" />
    <input type="file" accept="image/*" capture="environment" class="form-control my-1" id="plant-photo" />
    <button class="btn btn-primary" id="openCameraBtn">Open Camera</button>
    `;
    
  const previewImage = document.getElementById('photoPreviewImage');
  const photoInput = document.getElementById('plant-photo');
  
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  let cameraBlob=null;
  document.getElementById('dialog-submit').onclick = () => {
    const name = document.getElementById('plant-name').value;
    const location = document.getElementById('plant-location').value;
    const file = document.getElementById('plant-photo').files[0];
    const reader = new FileReader();

    const addPlant = (image) => {
      console.log(image)
      const newPlant = { name, location, image, size: 0, logs: [], sizeLogs: [] };
      const tx = db.transaction('plants', 'readwrite');
      const store = tx.objectStore('plants');
      const req = store.add(newPlant);
      req.onsuccess = () => {
        loadPlants();
        dialog.hide();
      };
    };
    console.log(previewImage, cameraBlob)
    if (cameraBlob!=null) {
      // Prefer camera photo if availablea
      reader.onload = e => addPlant(e.target.result);
      reader.readAsDataURL(cameraBlob);
    } else if (file) {
      reader.onload = e => addPlant(e.target.result);
      reader.readAsDataURL(file);
    } else {
      addPlant('');
    }
  };
  function openCameraModal(){
    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'), {
      backdrop: false, // Don't interfere with the existing backdrop
      focus: false     // Avoid taking focus from the current modal
    });
    cameraModal.show();
  }
  document.getElementById('openCameraBtn').addEventListener('click', openCameraModal);
  previewImage.addEventListener('click', openCameraModal);
  
  onPhotoAccepted = function (blob) {
    console.log("Photo accepted! Blob size:", blob.size);

    const imageUrl = URL.createObjectURL(blob);
    const imageElement = document.getElementById('photoPreviewImage');
    imageElement.src = imageUrl;
    cameraBlob = blob;

    /*const previewModal = new bootstrap.Modal(document.getElementById('photoPreviewModal'), {
      backdrop: false,
      focus: false
    });
    previewModal.show();*/
  };
  dialog.show();
}


function openPlant(index) {
  selectedPlantIndex = index;
  const p = plants[index];
  document.getElementById('plant-title').textContent = p.name;
  document.getElementById('plant-location').textContent = p.location;
  document.getElementById('plant-size').textContent = p.size;
  document.getElementById('plant-image').src = p.image || '';
  document.getElementById('main-screen').classList.add('d-none');
  document.getElementById('plant-screen').classList.remove('d-none');
  renderLogList();
  renderSizeChart();
}

function renderLogList() {
  const logs = plants[selectedPlantIndex].logs;
  document.getElementById('log-list').innerHTML = logs.map(log => `
        <div class="mb-2">
          <div>${log.text || ''}</div>
          ${log.image ? `<img src="${log.image}" class="img-fluid rounded mt-1" />` : ''}
          <small class="text-muted">${new Date(log.date).toLocaleString()}</small>
        </div>
      `).join('');
}

function renderSizeChart() {
  const plant = plants[selectedPlantIndex];
  const ctx = document.getElementById('size-plot').getContext('2d');
  if (window.sizeChart) window.sizeChart.destroy();
  window.sizeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: plant.sizeLogs.map(l => new Date(l.date).toLocaleDateString()),
      datasets: [{ label: 'Size (cm)', data: plant.sizeLogs.map(l => l.size), borderColor: 'green', fill: false }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function updatePlantInDB(index) {
  const plant = plants[index];
  const tx = db.transaction('plants', 'readwrite');
  const store = tx.objectStore('plants');
  store.put(plant);
}

function openAddLogDialog() {
  document.getElementById('dialog-title').textContent = 'Add Log';
  document.getElementById('dialog-body').innerHTML = `
        <textarea class="form-control my-1" id="log-text" placeholder="Observation"></textarea>
        <input type="file" accept="image/*" capture="environment" class="form-control my-1" id="log-photo" />
      `;
  document.getElementById('dialog-submit').onclick = () => {
    const text = document.getElementById('log-text').value;
    const file = document.getElementById('log-photo').files[0];
    const reader = new FileReader();
    reader.onload = e => {
      plants[selectedPlantIndex].logs.push({ text, image: e.target.result, date: new Date() });
      savePlants();
      renderLogList();
      dialog.hide();
    };
    if (file) reader.readAsDataURL(file);
    else {
      plants[selectedPlantIndex].logs.push({ text, image: '', date: new Date() });
      updatePlantInDB(selectedPlantIndex);
      renderLogList();
      dialog.hide();
    }
  };
  dialog.show();
}

function openAddSizeDialog() {
  document.getElementById('dialog-title').textContent = 'Add Size';
  document.getElementById('dialog-body').innerHTML = `
        <input type="number" class="form-control my-1" id="log-size" placeholder="Size in cm" />
      `;
  document.getElementById('dialog-submit').onclick = () => {
    const size = parseFloat(document.getElementById('log-size').value);
    if (!isNaN(size)) {
      plants[selectedPlantIndex].size = size;
      plants[selectedPlantIndex].sizeLogs.push({ size, date: new Date() });
      updatePlantInDB(selectedPlantIndex);
      renderSizeChart();
      document.getElementById('plant-size').textContent = size;
    }
    dialog.hide();
  };
  dialog.show();
}

function showMainScreen() {
  document.getElementById('plant-screen').classList.add('d-none');
  document.getElementById('main-screen').classList.remove('d-none');
}

function openSettings() {
  navigator.storage.estimate().then(e => {
    const used = (e.usage / 1024 / 1024).toFixed(2);
    const quota = (e.quota / 1024 / 1024).toFixed(2);
    document.getElementById('storage-usage').textContent = `${used} MB / ${quota} MB`;
    settingsModal.show();
  });
}

function confirmDeletePlant() {
  if (confirm('Are you sure you want to delete this plant? This action cannot be undone.')) {
    deletePlant(selectedPlantIndex);
  }
}

function deletePlant(index) {
  const plant = plants[index];
  const tx = db.transaction('plants', 'readwrite');
  const store = tx.objectStore('plants');
  const deleteRequest = store.delete(plant.id);

  deleteRequest.onsuccess = () => {
    plants.splice(index, 1);
    showMainScreen();
    loadPlants();
  };

  deleteRequest.onerror = () => {
    alert('Failed to delete plant.');
  };
}

function exportData() {
  const tx1 = db.transaction('plants', 'readonly');
  const store1 = tx1.objectStore('plants');

  const plantsRequest = store1.getAll();

  plantsRequest.onsuccess = () => {
    const plantsData = plantsRequest.result;
    const exportObj = plantsData;
    const blob = new Blob([JSON.stringify(exportObj)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plant_data.json';
    a.click();
    
  };
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const data = JSON.parse(reader.result);
    const plants = data;

    const tx1 = db.transaction('plants', 'readwrite');
    const store1 = tx1.objectStore('plants');
    plants.forEach(p => store1.add(p));

    await tx1.complete;

    loadPlants(); // reload UI
    alert('Import complete!');
  };
  reader.readAsText(file);
}

function base64ToBlob(base64) {
  const [prefix, data] = base64.split(',');
  const mime = prefix.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}
