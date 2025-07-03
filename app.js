// ====== app.js ======

// Inisialisasi Supabase
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Koordinat Global
let currentCoords = { lat: null, lon: null };

// Nama per jabatan
const namaByJabatan = {
  Manager: ["Budi", "Ali", "Andy", "Sinta", "Riko"],
  Sales: ["Citra", "Dewi", "Elok", "Fajar", "Gina"]
};

// ===== Tampilkan Form Absen =====
function showAbsen() {
  document.getElementById("content").innerHTML = `
    <h3>Form Absen Masuk</h3>
    <input type="date" id="tanggal" value="${new Date().toISOString().slice(0, 10)}"><br>
    <input type="time" id="jam" value="${new Date().toTimeString().slice(0, 8)}"><br>
    <select id="jabatan" onchange="populateNama()">
      <option value="">Pilih Jabatan</option>
      ${Object.keys(namaByJabatan).map(j => `<option value="${j}">${j}</option>`).join("")}
    </select><br>
    <select id="nama">
      <option value="">Pilih Nama</option>
    </select><br>
    <input type="file" id="foto" accept="image/*" capture="environment" onchange="previewFoto(event)"><br>
    <img id="preview" width="150"><br>
    <div id="map" style="height: 200px;"></div><br>
    <button onclick="submitAbsen()">Kirim</button>
  `;
  getLocationWithMap();
}

function populateNama() {
  const jabatan = document.getElementById("jabatan").value;
  const namaSelect = document.getElementById("nama");
  namaSelect.innerHTML = `<option value="">Pilih Nama</option>`;
  if (namaByJabatan[jabatan]) {
    namaByJabatan[jabatan].forEach(n => {
      namaSelect.innerHTML += `<option value="${n}">${n}</option>`;
    });
  }
}

function previewFoto(e) {
  const reader = new FileReader();
  reader.onload = () => document.getElementById("preview").src = reader.result;
  reader.readAsDataURL(e.target.files[0]);
}

function getLocationWithMap() {
  if (!navigator.geolocation) return alert("GPS tidak tersedia.");
  navigator.geolocation.getCurrentPosition(pos => {
    currentCoords.lat = pos.coords.latitude;
    currentCoords.lon = pos.coords.longitude;

    setTimeout(() => {
      const map = L.map('map').setView([currentCoords.lat, currentCoords.lon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([currentCoords.lat, currentCoords.lon]).addTo(map).bindPopup("Lokasi Anda").openPopup();
    }, 500);
  }, () => alert("Gagal ambil lokasi."));
}

async function submitAbsen() {
  const tanggal = document.getElementById("tanggal").value;
  const jam = document.getElementById("jam").value;
  const jabatan = document.getElementById("jabatan").value;
  const nama = document.getElementById("nama").value;
  const fotoFile = document.getElementById("foto").files[0];

  if (!tanggal || !jam || !jabatan || !nama || !fotoFile) return alert("Isi semua field!");

  // Cek duplikat
  const { data: existing, error: cekError } = await supabase
    .from("absensi")
    .select("*")
    .eq("tanggal", tanggal)
    .eq("nama", nama);

  if (existing.length > 0) return alert("Nama ini sudah absen hari ini!");

  // Upload foto ke folder berdasarkan tanggal
  const filename = `${Date.now()}.jpg`;
  const folder = `${tanggal}`;
  const fullPath = `${folder}/${filename}`;

  const { error: uploadError } = await supabase.storage.from("foto-absen").upload(fullPath, fotoFile);
  if (uploadError) {
    console.error(uploadError);
    return alert("Gagal upload foto.");
  }

  // Simpan ke database
  const { error } = await supabase.from("absensi").insert([{
    tanggal,
    jam,
    jabatan,
    nama,
    lat: currentCoords.lat,
    lon: currentCoords.lon,
    foto_url: `foto-absen/${fullPath}`
  }]);

  if (error) {
    console.error(error);
    return alert("Gagal menyimpan data.");
  }

  alert("Absen berhasil!");
  showAbsen();
}

// ===== Tarik Data =====
function showTarikData() {
  const pw = prompt("Masukkan password admin:");
  if (pw !== "admin123") return alert("Salah password!");
  document.getElementById("content").innerHTML = `
    <h3>Tarik Data</h3>
    <input type="date" id="start">
    <input type="date" id="end">
    <button onclick="tarikData()">Tarik</button>
    <div id="tabel"></div>
  `;
}

async function tarikData() {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const { data, error } = await supabase
    .from("absensi")
    .select("*")
    .gte("tanggal", start)
    .lte("tanggal", end);

  if (error) {
    console.error(error);
    return alert("Gagal ambil data");
  }

  let html = `<table border=1><tr>
    <th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th>
    <th>Lat</th><th>Lon</th><th>Foto</th></tr>`;
  data.forEach(d => {
    html += `<tr>
      <td>${d.tanggal}</td><td>${d.jam}</td><td>${d.jabatan}</td><td>${d.nama}</td>
      <td>${d.lat}</td><td>${d.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/${d.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });
  html += `</table><br><button onclick='exportXLS()'>Export XLS</button>`;
  document.getElementById("tabel").innerHTML = html;
}

// ===== Export XLS =====
function exportXLS() {
  const table = document.querySelector("table");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Absensi" });
  XLSX.writeFile(wb, "absensi.xlsx");
}
