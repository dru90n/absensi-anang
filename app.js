// ===== app.js =====

const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentCoords = { lat: null, lon: null };

function showAbsen() {
  const html = `
    <h3>Form Absen Masuk</h3>
    <input type="text" id="tanggal" readonly />
    <input type="text" id="jam" readonly />
    <select id="jabatan">
      <option value="">Pilih Jabatan</option>
      <option value="Manager">Manager</option>
      <option value="Sales">Sales</option>
    </select>
    <input type="text" id="nama" placeholder="Nama Anda" />
    <input type="file" id="foto" accept="image/*" capture="environment" onchange="previewFoto()" />
    <img id="preview" src="" alt="Preview" style="max-width: 100px; display:block;" />
    <div id="map" style="height: 200px;"></div>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  document.getElementById('content').innerHTML = html;

  const now = new Date();
  document.getElementById('tanggal').value = now.toISOString().split('T')[0];
  document.getElementById('jam').value = now.toTimeString().split(' ')[0];

  getLocation(true);
}

function getLocation(showMap = false) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentCoords.lat = pos.coords.latitude;
      currentCoords.lon = pos.coords.longitude;

      if (showMap) {
        setTimeout(() => {
          const mapEl = document.getElementById('map');
          if (!mapEl) return;
          const map = L.map('map').setView([currentCoords.lat, currentCoords.lon], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          L.marker([currentCoords.lat, currentCoords.lon]).addTo(map)
            .bindPopup('Lokasi Anda').openPopup();
        }, 500);
      }
    });
  } else {
    alert("Geolocation tidak didukung browser Anda.");
  }
}

function previewFoto() {
  const file = document.getElementById('foto').files[0];
  const preview = document.getElementById('preview');
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
}

async function submitAbsen() {
  if (!currentCoords.lat || !currentCoords.lon) {
    alert("Lokasi belum terdeteksi. Mohon tunggu sebentar dan pastikan GPS aktif.");
    return;
  }

  const tanggal = document.getElementById('tanggal').value;
  const jam = document.getElementById('jam').value;
  const jabatan = document.getElementById('jabatan').value;
  const nama = document.getElementById('nama').value;
  const fotoFile = document.getElementById('foto').files[0];

  if (!jabatan || !nama || !fotoFile) {
    alert("Semua field wajib diisi.");
    return;
  }

  const fileExt = fotoFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `foto/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('absensi-foto').upload(filePath, fotoFile);
  if (uploadError) {
    alert("Gagal upload foto.");
    return;
  }

  const { error: insertError } = await supabase.from('absensi').insert([{
    tanggal,
    jam,
    jabatan,
    nama,
    lat: currentCoords.lat,
    lon: currentCoords.lon,
    foto_url: filePath
  }]);

  if (insertError) {
    alert("Gagal menyimpan absensi.");
  } else {
    alert("Absen berhasil!");
    showAbsen();
  }
}
