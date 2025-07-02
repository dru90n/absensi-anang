// ===== app.js =====

// Inisialisasi Supabase
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Koordinat global (penting: jangan gunakan let di dalam fungsi!)
var currentCoords = { lat: null, lon: null };

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
    }, () => {
      alert("Gagal mengambil lokasi.");
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
  const tanggal = document.getElementById('tanggal').value;
  const jam = document.getElementById('jam').value;
  const jabatan = document.getElementById('jabatan').value;
  const nama = document.getElementById('nama').value;
  const fotoFile = document.getElementById('foto').files[0];

  if (!jabatan || !nama || !fotoFile || !currentCoords.lat || !currentCoords.lon) {
    alert("Semua field wajib diisi dan lokasi harus aktif.");
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

// Tambahkan kembali fitur Tarik Data
function showTarikData() {
  const html = `
    <h3>Tarik Data Absensi</h3>
    <input type="password" id="admin-pass" placeholder="Masukkan Password" />
    <button onclick="loadTarikData()">Lihat Data</button>
    <div id="data-section"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function loadTarikData() {
  const pass = document.getElementById('admin-pass').value;
  if (pass !== 'admin123') {
    alert("Password salah.");
    return;
  }

  const { data, error } = await supabase.from('absensi').select('*').order('tanggal', { ascending: false });

  if (error) {
    alert("Gagal mengambil data.");
    return;
  }

  let html = `<table border="1" cellpadding="4"><tr>
    <th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th>
  </tr>`;

  data.forEach(row => {
    html += `<tr>
      <td>${row.tanggal}</td>
      <td>${row.jam}</td>
      <td>${row.jabatan}</td>
      <td>${row.nama}</td>
      <td>${row.lat}</td>
      <td>${row.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/absensi-foto/${row.foto_url}" target="_blank">Lihat Foto</a></td>
    </tr>`;
  });

  html += `</table><br><button onclick="exportToCSV()">Export ke CSV</button>`;

  document.getElementById('data-section').innerHTML = html;
}

function exportToCSV() {
  const table = document.querySelector("#data-section table");
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");
  for (let row of rows) {
    const cols = row.querySelectorAll("td, th");
    const rowData = [...cols].map(col => `"${col.innerText}"`).join(",");
    csv.push(rowData);
  }

  const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(csvFile);
  const a = document.createElement("a");
  a.href = url;
  a.download = "absensi.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
