// ===== app.js =====

// ===== Konfigurasi Supabase =====
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Data Nama Berdasarkan Jabatan =====
const namaByJabatan = {
  Manager: ['Budi', 'Ali', 'Andy', 'Sinta', 'Riko'],
  Sales: ['Citra', 'Dewi', 'Elok', 'Fajar', 'Gina']
};

let currentCoords = { lat: null, lon: null };

// ===== Fungsi Tampilkan Form Absen =====
function showAbsen() {
  document.getElementById('content').innerHTML = `
    <h3>Form Absen Masuk</h3>
    <form id="absenForm">
      <input type="date" id="tanggal" required /><br>
      <input type="time" id="jam" required /><br>
      <select id="jabatan" required onchange="populateNama()">
        <option value="">Pilih Jabatan</option>
        ${Object.keys(namaByJabatan).map(j => `<option value="${j}">${j}</option>`).join('')}
      </select><br>
      <select id="nama" required>
        <option value="">Pilih Nama</option>
      </select><br>
      <input type="file" id="foto" accept="image/*" required /><br>
      <img id="preview" class="preview"/><br>
      <div id="map"></div><br>
      <button type="submit">Kirim</button>
    </form>
  `;

  document.getElementById("foto").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => document.getElementById("preview").src = e.target.result;
      reader.readAsDataURL(file);
    }
  });

  navigator.geolocation.getCurrentPosition(pos => {
    currentCoords = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
    const map = L.map('map').setView([currentCoords.lat, currentCoords.lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([currentCoords.lat, currentCoords.lon]).addTo(map).bindPopup("Lokasi Anda").openPopup();
  });

  document.getElementById("absenForm").onsubmit = submitAbsen;
}

// ===== Fungsi Isi Dropdown Nama =====
function populateNama() {
  const jabatan = document.getElementById("jabatan").value;
  const namaSelect = document.getElementById("nama");
  namaSelect.innerHTML = `<option value="">Pilih Nama</option>`;
  if (namaByJabatan[jabatan]) {
    namaByJabatan[jabatan].forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.text = n;
      namaSelect.appendChild(opt);
    });
  }
}

// ===== Fungsi Kirim Data =====
async function submitAbsen(e) {
  e.preventDefault();
  const tanggal = document.getElementById("tanggal").value;
  const jam = document.getElementById("jam").value;
  const jabatan = document.getElementById("jabatan").value;
  const nama = document.getElementById("nama").value;
  const fotoFile = document.getElementById("foto").files[0];
  const lat = currentCoords.lat;
  const lon = currentCoords.lon;

  const folder = `foto/${tanggal}`;
  const filePath = `${folder}/${Date.now()}.jpg`;

  // Cegah double absen
  const { data: existing, error: checkError } = await supabase
    .from("absensi")
    .select("*")
    .eq("tanggal", tanggal)
    .eq("nama", nama);

  if (existing && existing.length > 0) {
    alert("Nama ini sudah absen pada tanggal tersebut!");
    return;
  }

  const { error: uploadError } = await supabase.storage.from("foto-absen").upload(filePath, fotoFile);
  if (uploadError) {
    alert("Gagal upload foto.");
    return;
  }

  const { error: insertError } = await supabase.from("absensi").insert({
    tanggal, jam, jabatan, nama, lat, lon, foto_url: filePath
  });

  if (insertError) {
    alert("Gagal menyimpan data.");
  } else {
    alert("Absen berhasil!");
    document.getElementById("content").innerHTML = "";
  }
}

// ===== Fungsi Tarik Data =====
function showTarikData() {
  document.getElementById("content").innerHTML = `
    <h3>Tarik Data</h3>
    <input type="month" id="filterMonth" />
    <button onclick="tarikData()">Tampilkan</button>
    <table border="1" id="dataTable"></table><br>
    <button onclick="exportExcel()">Export Excel</button>
  `;
}

async function tarikData() {
  const month = document.getElementById("filterMonth").value;
  const [year, m] = month.split("-");
  const tanggalAwal = `${year}-${m}-01`;
  const tanggalAkhir = `${year}-${m}-31`;

  const { data, error } = await supabase
    .from("absensi")
    .select("*")
    .gte("tanggal", tanggalAwal)
    .lte("tanggal", tanggalAkhir);

  if (error) {
    alert("Gagal ambil data");
    return;
  }

  let html = "<tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>";
  data.forEach(row => {
    const url = supabase.storage.from("foto-absen").getPublicUrl(row.foto_url).data.publicUrl;
    html += `<tr><td>${row.tanggal}</td><td>${row.jam}</td><td>${row.jabatan}</td><td>${row.nama}</td><td>${row.lat}</td><td>${row.lon}</td><td><img src="${url}" width="50"/></td></tr>`;
  });
  document.getElementById("dataTable").innerHTML = html;
}

function exportExcel() {
  const table = document.getElementById("dataTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Absensi" });
  XLSX.writeFile(wb, "data_absensi.xlsx");
}
