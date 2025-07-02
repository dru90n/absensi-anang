// Ganti dengan URL dan API KEY milik kamu
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    <input type="file" id="foto" accept="image/*" capture="environment" />
    <div id="map" class="map"></div>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  document.getElementById('content').innerHTML = html;

  const now = new Date();
  document.getElementById('tanggal').value = now.toISOString().split('T')[0];
  document.getElementById('jam').value = now.toTimeString().split(' ')[0];

  getLocation(true);
}

let currentCoords = { lat: null, lon: null };
function getLocation(showMap = false) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentCoords.lat = pos.coords.latitude;
      currentCoords.lon = pos.coords.longitude;
      if (showMap) {
        const map = L.map('map').setView([currentCoords.lat, currentCoords.lon], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([currentCoords.lat, currentCoords.lon]).addTo(map).bindPopup('Lokasi Anda').openPopup();
      }
    }, err => alert('Gagal ambil lokasi: ' + err.message));
  } else {
    alert('Browser tidak mendukung GPS');
  }
}

async function submitAbsen() {
  const tanggal = document.getElementById('tanggal').value;
  const jam = document.getElementById('jam').value;
  const jabatan = document.getElementById('jabatan').value;
  const nama = document.getElementById('nama').value;
  const foto = document.getElementById('foto').files[0];

  if (!jabatan || !nama || !foto || !currentCoords.lat) return alert('Lengkapi semua data!');

  const fileExt = foto.name.split('.').pop();
  const fileName = `${nama}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage.from('foto-absen').upload(filePath, foto);
  if (uploadError) return alert('Gagal upload foto: ' + uploadError.message);

  const { data: urlData } = supabase.storage.from('foto-absen').getPublicUrl(filePath);
  const foto_url = urlData.publicUrl;

  const { error } = await supabase.from('absensi').insert([{
    tanggal, jam, jabatan, nama,
    latitude: currentCoords.lat,
    longitude: currentCoords.lon,
    foto_url
  }]);
  if (error) alert('Gagal simpan absen: ' + error.message);
  else alert('Absen berhasil disimpan!');
}

function showTarikData() {
  const html = `
    <h3>Tarik Data Absensi</h3>
    <input type="password" id="password" placeholder="Masukkan Password" />
    <input type="month" id="bulan" />
    <button onclick="tarikData()">Tarik Data</button>
    <div id="data"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function tarikData() {
  const pass = document.getElementById('password').value;
  if (pass !== 'admin123') return alert('Password salah!');
  const bulan = document.getElementById('bulan').value;
  if (!bulan) return alert('Pilih bulan dulu.');

  const awal = `${bulan}-01`;
  const akhir = `${bulan}-31`;

  const { data, error } = await supabase.from('absensi')
    .select('*')
    .gte('tanggal', awal).lte('tanggal', akhir);

  if (error) return alert('Gagal tarik data: ' + error.message);

  let html = `<table id="tabel"><thead><tr>
    <th>No</th><th>Tanggal</th><th>Jam</th><th>Nama</th><th>Jabatan</th><th>Koordinat</th><th>Foto</th>
  </tr></thead><tbody>`;
  data.forEach((d, i) => {
    html += `<tr>
      <td>${i+1}</td><td>${d.tanggal}</td><td>${d.jam}</td><td>${d.nama}</td>
      <td>${d.jabatan}</td><td>${d.latitude},${d.longitude}</td>
      <td><a href="${d.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });
  html += '</tbody></table>';
  html += '<br><button onclick="exportToExcel()">Export ke XLS</button>';
  document.getElementById('data').innerHTML = html;
}

function exportToExcel() {
  const table = document.getElementById("tabel").outerHTML;
  const blob = new Blob(["\ufeff" + table], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "absensi.xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
