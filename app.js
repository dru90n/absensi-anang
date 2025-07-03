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
    <select id="jabatan" onchange="updateNamaOptions()">
      <option value="">Pilih Jabatan</option>
      <option value="Manager">Manager</option>
      <option value="Sales">Sales</option>
    </select>
    <select id="nama">
      <option value="">Pilih Nama</option>
    </select>
    <input type="file" id="foto" accept="image/*" capture="environment" onchange="previewFoto()" />
    <img id="preview" src="" alt="Preview" style="max-width: 100px; display:block;" />
    <div id="map" style="height: 200px; margin-top:10px;"></div>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  document.getElementById('content').innerHTML = html;

  const now = new Date();
  document.getElementById('tanggal').value = now.toISOString().split('T')[0];
  document.getElementById('jam').value = now.toTimeString().split(' ')[0];

  getLocation(true);
}

function updateNamaOptions() {
  const jabatan = document.getElementById('jabatan').value;
  const namaSelect = document.getElementById('nama');
  namaSelect.innerHTML = '<option value="">Pilih Nama</option>';

  const namaManager = ['Budi', 'Ali', 'Andy'];
  const namaSales = ['Citra', 'Dewi', 'Elok'];
  let list = [];

  if (jabatan === 'Manager') list = namaManager;
  else if (jabatan === 'Sales') list = namaSales;

  list.forEach(nama => {
    const opt = document.createElement('option');
    opt.value = nama;
    opt.textContent = nama;
    namaSelect.appendChild(opt);
  });
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
  const tanggal = document.getElementById('tanggal').value;
  const jam = document.getElementById('jam').value;
  const jabatan = document.getElementById('jabatan').value;
  const nama = document.getElementById('nama').value;
  const fotoFile = document.getElementById('foto').files[0];

  if (!jabatan || !nama || !fotoFile) {
    alert("Semua field wajib diisi.");
    return;
  }

  if (!currentCoords.lat || !currentCoords.lon) {
    alert("Lokasi belum terdeteksi. Mohon tunggu sebentar dan pastikan GPS aktif.");
    return;
  }

  // Cek apakah sudah absen hari ini
  const { data: existing, error: checkError } = await supabase
    .from('absensi')
    .select('*')
    .eq('nama', nama)
    .eq('tanggal', tanggal);

  if (checkError) {
    alert("Gagal memeriksa data sebelumnya.");
    return;
  }

  if (existing.length > 0) {
    alert("Nama ini sudah absen hari ini.");
    return;
  }

  const fileExt = fotoFile.name.split('.').pop();
  const folder = `foto/${tanggal}`;
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

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
    alert("Gagal menyimpan absensi.");
  } else {
    alert("Absen berhasil!");
    showAbsen();
  }
}

async function showTarikData() {
  const pass = prompt("Masukkan password untuk mengakses data:");
  if (pass !== "default123") return;

  const html = `
    <h3>Tarik Data Absensi</h3>
    <label>Dari Tanggal: <input type="date" id="dari" /></label>
    <label>Sampai Tanggal: <input type="date" id="sampai" /></label>
    <button onclick="tarikData()">Tarik</button>
    <table border="1" id="tabelData" style="margin-top:10px;"></table>
    <button onclick="exportXLS()">Export ke XLS</button>
  `;
  document.getElementById('content').innerHTML = html;
}

async function tarikData() {
  const dari = document.getElementById('dari').value;
  const sampai = document.getElementById('sampai').value;
  if (!dari || !sampai) {
    alert("Isi range tanggal.");
    return;
  }

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
    .order('tanggal', { ascending: true });

  if (error) {
    console.error(error);
    alert("Gagal ambil data");
    return;
  }

  let html = `<tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>`;
  data.forEach(row => {
    html += `<tr>
      <td>${row.tanggal}</td>
      <td>${row.jam}</td>
      <td>${row.jabatan}</td>
      <td>${row.nama}</td>
      <td>${row.lat}</td>
      <td>${row.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/foto-absen/${row.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });

  document.getElementById('tabelData').innerHTML = html;
}

function exportXLS() {
  const table = document.getElementById("tabelData");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Absensi" });
  XLSX.writeFile(wb, "absensi.xlsx");
}
