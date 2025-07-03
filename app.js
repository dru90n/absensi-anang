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

  const namaOptions = {
    Manager: ['Budi', 'Ali', 'Andy', 'Rina', 'Hana'],
    Sales: ['Citra', 'Dewi', 'Elok', 'Santi', 'Dian']
  };

  if (jabatan && namaOptions[jabatan]) {
    namaOptions[jabatan].forEach(nama => {
      const option = document.createElement('option');
      option.value = nama;
      option.textContent = nama;
      namaSelect.appendChild(option);
    });
  }
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
    alert("Lokasi belum terdeteksi.");
    return;
  }

  const checkDup = await supabase.from('absensi')
    .select('*')
    .eq('nama', nama)
    .eq('tanggal', tanggal);

  if (checkDup.data.length > 0) {
    alert("Anda sudah absen hari ini.");
    return;
  }

  const folder = tanggal;
  const fileExt = fotoFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `foto-absen/${folder}/${fileName}`;

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
    alert("Gagal menyimpan absensi.");
  } else {
    alert("Absen berhasil!");
    showAbsen();
  }
}

function showTarikData() {
  const html = `
    <h3>Tarik Data Absensi</h3>
    <input type="password" id="tarik-password" placeholder="Masukkan Password" />
    <input type="month" id="tarik-bulan" />
    <button onclick="prosesTarikData()">Tarik</button>
    <div id="hasil-tarik"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function prosesTarikData() {
  const pass = document.getElementById('tarik-password').value;
  if (pass !== 'default123') {
    alert("Password salah.");
    return;
  }

  const bulan = document.getElementById('tarik-bulan').value;
  if (!bulan) return;
  const [year, month] = bulan.split('-');
  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-31`;

  const { data, error } = await supabase.from('absensi')
    .select('*')
    .gte('tanggal', start)
    .lte('tanggal', end)
    .order('tanggal');

  if (error) {
    alert("Gagal ambil data");
    return;
  }

  let html = '<table><tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>';
  data.forEach(row => {
    html += `<tr>
      <td>${row.tanggal}</td>
      <td>${row.jam}</td>
      <td>${row.jabatan}</td>
      <td>${row.nama}</td>
      <td>${row.lat}</td>
      <td>${row.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/${row.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });
  html += '</table><br><button onclick="exportToExcel()">Export ke Excel</button>';
  document.getElementById('hasil-tarik').innerHTML = html;

  window.absensiExport = data;
}

function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(window.absensiExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Absensi");
  XLSX.writeFile(wb, "data_absensi.xlsx");
}
