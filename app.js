// ===== app.js =====

const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentCoords = { lat: null, lon: null };

const namaPerJabatan = {
  Manager: ["Budi", "Ali", "Andy", "Sinta", "Rina"],
  Sales: ["Citra", "Dewi", "Elok", "Fajar", "Gilang"]
};

function showAbsen() {
  const html = `
    <h3>Form Absen Masuk</h3>
    <input type="text" id="tanggal" readonly />
    <input type="text" id="jam" readonly />
    <select id="jabatan" onchange="loadNama()">
      <option value="">Pilih Jabatan</option>
      <option value="Manager">Manager</option>
      <option value="Sales">Sales</option>
    </select>
    <select id="nama">
      <option value="">Pilih Nama</option>
    </select>
    <input type="file" id="foto" accept="image/*" capture="environment" onchange="previewFoto()" />
    <img id="preview" src="" alt="Preview" style="max-width: 100px; display:block; margin:10px 0;" />
    <div id="map" style="height: 200px; margin-bottom: 10px;"></div>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  document.getElementById('content').innerHTML = html;

  const now = new Date();
  document.getElementById('tanggal').value = now.toISOString().split('T')[0];
  document.getElementById('jam').value = now.toTimeString().split(' ')[0];

  getLocation(true);
}

function loadNama() {
  const jabatan = document.getElementById('jabatan').value;
  const namaDropdown = document.getElementById('nama');
  namaDropdown.innerHTML = '<option value="">Pilih Nama</option>';

  if (namaPerJabatan[jabatan]) {
    namaPerJabatan[jabatan].forEach(nama => {
      const opt = document.createElement('option');
      opt.value = nama;
      opt.textContent = nama;
      namaDropdown.appendChild(opt);
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

  // Cek duplikat
  const { data: existing, error: errCheck } = await supabase
    .from('absensi')
    .select('*')
    .eq('tanggal', tanggal)
    .eq('nama', nama);

  if (existing && existing.length > 0) {
    alert("Anda sudah absen hari ini!");
    return;
  }

  const folder = `foto/${tanggal}`;
  const fileExt = fotoFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('foto-absen').upload(filePath, fotoFile);
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

function showTarikData() {
  const html = `
    <h3>Tarik Data Absensi</h3>
    <input type="password" id="tarikPassword" placeholder="Masukkan Password" />
    <input type="month" id="bulanTarik" />
    <button onclick="tarikData()">Tarik Data</button>
    <div id="hasilTarik"></div>
  `;
  document.getElementById('content').innerHTML = html;
}

async function tarikData() {
  const pass = document.getElementById('tarikPassword').value;
  const bulan = document.getElementById('bulanTarik').value;

  if (pass !== "admin123") {
    alert("Password salah");
    return;
  }

  if (!bulan) {
    alert("Pilih bulan terlebih dahulu.");
    return;
  }

  const [tahun, bulanAngka] = bulan.split('-');
  const awal = `${tahun}-${bulanAngka}-01`;
  const akhir = `${tahun}-${bulanAngka}-31`;

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .gte('tanggal', awal)
    .lte('tanggal', akhir);

  if (error) {
    console.log(error);
    alert("Gagal ambil data");
    return;
  }

  if (data.length === 0) {
    alert("Tidak ada data pada bulan ini.");
    return;
  }

  let html = `<table border="1"><tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>`;
  data.forEach(d => {
    const link = `${SUPABASE_URL}/storage/v1/object/public/foto-absen/${d.foto_url}`;
    html += `<tr><td>${d.tanggal}</td><td>${d.jam}</td><td>${d.jabatan}</td><td>${d.nama}</td><td>${d.lat}</td><td>${d.lon}</td><td><a href="${link}" target="_blank">Lihat</a></td></tr>`;
  });
  html += `</table><br><button onclick="exportToXLS(${JSON.stringify(data).replace(/"/g, '&quot;')})">Export ke Excel</button>`;

  document.getElementById('hasilTarik').innerHTML = html;
}

function exportToXLS(jsonData) {
  const data = JSON.parse(JSON.stringify(jsonData));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Absensi");
  XLSX.writeFile(wb, "absensi.xlsx");
}
