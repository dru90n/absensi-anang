// ===== app.js =====

// Inisialisasi Supabase
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentCoords = { lat: null, lon: null };

function showAbsen() {
  const html = `
    <h3>Form Absen Masuk</h3>
    <input type="text" id="tanggal" readonly />
    <input type="text" id="jam" readonly />
    <select id="jabatan">
      <option value="">Pilih Jabatan</option>
      <option value="Tulip">Tulip</option>
      <option value="Orchid">Orchid</option>
    </select>
    <input type="text" id="nama" placeholder="Nama Anda" />
    <input type="file" id="foto" accept="image/*" capture="environment" onchange="previewFoto()" />
    <img id="preview" src="" alt="Preview" style="max-width: 100px; display:block;" />
    <div id="map" style="height: 200px; margin: 10px 0;"></div>
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
          L.marker([currentCoords.lat, currentCoords.lon]).addTo(map).bindPopup('Lokasi Anda').openPopup();
        }, 500);
      }
    }, () => {
      alert("Gagal mendeteksi lokasi.");
    });
  } else {
    alert("Geolocation tidak didukung browser ini.");
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

  if (!jabatan || !nama || !fotoFile || !currentCoords.lat) {
    alert("Semua field dan lokasi wajib diisi.");
    return;
  }

  const folderName = tanggal;
  const fileExt = fotoFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${folderName}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('foto-absen').upload(filePath, fotoFile);
  if (uploadError) {
    console.error(uploadError);
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
    console.error(insertError);
    alert("Gagal menyimpan data.");
  } else {
    alert("Absen berhasil!");
    showAbsen();
  }
}

function showTarikData() {
  const html = `
    <h3>Tarik Data Absensi</h3>
    <input type="password" id="admin-pass" placeholder="Password Admin" />
    <input type="month" id="bulan" />
    <button onclick="tarikData()">Tampilkan</button>
    <div id="hasil-tabel"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function tarikData() {
  const pass = document.getElementById('admin-pass').value;
  if (pass !== 'admin123') {
    alert("Password salah.");
    return;
  }

  const bulan = document.getElementById('bulan').value;
  if (!bulan) {
    alert("Pilih bulan terlebih dahulu.");
    return;
  }

  const [year, month] = bulan.split("-");
  const awal = `${year}-${month}-01`;
  const akhir = `${year}-${month}-31`;

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .gte('tanggal', awal)
    .lte('tanggal', akhir);

  if (error) {
    alert("Gagal ambil data.");
    return;
  }

  let html = `
    <table border="1" cellpadding="4">
      <tr>
        <th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th>
      </tr>
  `;
  data.forEach(row => {
    html += `
      <tr>
        <td>${row.tanggal}</td>
        <td>${row.jam}</td>
        <td>${row.jabatan}</td>
        <td>${row.nama}</td>
        <td>${row.lat}</td>
        <td>${row.lon}</td>
        <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/foto-absen/${row.foto_url}" target="_blank">Lihat</a></td>
      </tr>
    `;
  });
  html += `</table><br><button onclick="exportToExcel()">Export ke XLS</button>`;
  document.getElementById('hasil-tabel').innerHTML = html;
}

function exportToExcel() {
  const table = document.querySelector("table");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Absensi" });
  XLSX.writeFile(wb, "absensi.xlsx");
}
