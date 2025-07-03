// ===== app.js =====

const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentCoords = { lat: null, lon: null };

const namaByJabatan = {
  Manager: ['Budi', 'Ali', 'Andy'],
  Sales: ['Citra', 'Dewi', 'Elok']
};

function showAbsen() {
  const now = new Date();
  const tanggal = now.toISOString().split('T')[0];
  const jam = now.toTimeString().split(' ')[0];

  const html = `
    <h3>Form Absen Masuk</h3>
    <input type="text" id="tanggal" value="${tanggal}" readonly />
    <input type="text" id="jam" value="${jam}" readonly />
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
    <div id="map" style="height: 200px;"></div>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  document.getElementById('content').innerHTML = html;

  getLocation(true);
}

function updateNamaOptions() {
  const jabatan = document.getElementById('jabatan').value;
  const namaSelect = document.getElementById('nama');
  namaSelect.innerHTML = '<option value="">Pilih Nama</option>';
  if (namaByJabatan[jabatan]) {
    namaByJabatan[jabatan].forEach(nama => {
      const opt = document.createElement('option');
      opt.value = nama;
      opt.textContent = nama;
      namaSelect.appendChild(opt);
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
          const map = L.map('map').setView([currentCoords.lat, currentCoords.lon], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          L.marker([currentCoords.lat, currentCoords.lon]).addTo(map)
            .bindPopup('Lokasi Anda').openPopup();
        }, 500);
      }
    }, () => alert("Gagal mendapatkan lokasi. Pastikan GPS aktif."));
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

  const { data: existing, error: checkError } = await supabase
    .from('absensi')
    .select('*')
    .eq('tanggal', tanggal)
    .eq('nama', nama);

  if (existing.length > 0) {
    alert("Anda sudah absen hari ini.");
    return;
  }

  const folder = tanggal;
  const fileExt = fotoFile.name.split('.').pop();
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

function showTarikData() {
  const html = `
    <h3>Tarik Data</h3>
    <input type="password" id="tarikPassword" placeholder="Masukkan Password" />
    <input type="month" id="bulan" />
    <button onclick="tarikData()">Tarik</button>
    <div id="hasil"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function tarikData() {
  const password = document.getElementById('tarikPassword').value;
  const bulan = document.getElementById('bulan').value;
  if (password !== 'default123') {
    alert("Password salah");
    return;
  }
  if (!bulan) {
    alert("Masukkan bulan.");
    return;
  }

  const [tahun, bln] = bulan.split('-');
  const awal = `${tahun}-${bln}-01`;
  const akhir = `${tahun}-${bln}-31`;

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .gte('tanggal', awal)
    .lte('tanggal', akhir);

  if (error) {
    console.error(error);
    alert("Gagal ambil data");
    return;
  }

  let table = '<table border="1"><tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>';
  data.forEach(row => {
    table += `<tr>
      <td>${row.tanggal}</td>
      <td>${row.jam}</td>
      <td>${row.jabatan}</td>
      <td>${row.nama}</td>
      <td>${row.lat}</td>
      <td>${row.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/foto-absen/${row.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });
  table += '</table><br><button onclick="exportToExcel()">Export to XLS</button>';
  document.getElementById('hasil').innerHTML = table;
  window._tarikData = data;
}

function exportToExcel() {
  const data = window._tarikData || [];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Absensi");
  XLSX.writeFile(wb, "absensi.xlsx");
}
