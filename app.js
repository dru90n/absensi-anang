// ===== Supabase Config =====
const SUPABASE_URL = 'https://ejpdrxpvdvdzrlvepixs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGRyeHB2ZHZkenJsdmVwaXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzEwMjEsImV4cCI6MjA2NzAwNzAyMX0.iCj-Glpi3aLdkXtx7sWxgCMtWGCoJMGrbiUi4Z9bKec';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Global =====
let currentCoords = { lat: null, lon: null };

const namaByJabatan = {
  Manager: ["Budi", "Ali", "Andy", "Sinta", "Riko"],
  Sales: ["Citra", "Dewi", "Elok", "Fajar", "Gina"]
};

// ===== Absen Form =====
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
  initMap();
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

function previewFoto(event) {
  const reader = new FileReader();
  reader.onload = () => document.getElementById("preview").src = reader.result;
  reader.readAsDataURL(event.target.files[0]);
}

function initMap() {
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    currentCoords = { lat, lon };
    const map = L.map('map').setView([lat, lon], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup("Lokasi Anda").openPopup();
  }, () => alert("Gagal mengambil lokasi"));
}

async function submitAbsen() {
  const tanggal = document.getElementById("tanggal").value;
  const jam = document.getElementById("jam").value;
  const jabatan = document.getElementById("jabatan").value;
  const nama = document.getElementById("nama").value;
  const fotoFile = document.getElementById("foto").files[0];

  if (!tanggal || !jam || !jabatan || !nama || !fotoFile)
    return alert("Isi semua field!");

  const { data: existing } = await supabase.from("absensi")
    .select("*").eq("tanggal", tanggal).eq("nama", nama);

  if (existing.length > 0)
    return alert("Sudah absen hari ini!");

  const filename = `${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("foto-absen")
    .upload(`${tanggal}/${filename}`, fotoFile);

  if (uploadError) return alert("Gagal upload foto.");

  const foto_url = `foto-absen/${tanggal}/${filename}`;
  const { error } = await supabase.from("absensi").insert([{
    tanggal, jam, jabatan, nama,
    lat: currentCoords.lat, lon: currentCoords.lon,
    foto_url
  }]);

  if (error) return alert("Gagal menyimpan data.");
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

  const { data, error } = await supabase.from("absensi")
    .select("*").gte("tanggal", start).lte("tanggal", end);

  if (error) return alert("Gagal ambil data");

  let html = `<table><tr><th>Tanggal</th><th>Jam</th><th>Jabatan</th><th>Nama</th><th>Lat</th><th>Lon</th><th>Foto</th></tr>`;
  data.forEach(d => {
    html += `<tr>
      <td>${d.tanggal}</td><td>${d.jam}</td><td>${d.jabatan}</td><td>${d.nama}</td>
      <td>${d.lat}</td><td>${d.lon}</td>
      <td><a href="https://ejpdrxpvdvdzrlvepixs.supabase.co/storage/v1/object/public/${d.foto_url}" target="_blank">Lihat</a></td>
    </tr>`;
  });
  html += `</table><br><button onclick='exportXLS(${JSON.stringify(data)})'>Export XLS</button>`;
  document.getElementById("tabel").innerHTML = html;
}

function exportXLS(data) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Absen");
  XLSX.writeFile(wb, "absensi.xlsx");
}
