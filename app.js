// Inisialisasi Supabase
const SUPABASE_URL = "https://zbunmfsedqalvvadwgkk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidW5tZnNlZHFhbHZ2YWR3Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjE2NTUsImV4cCI6MjA2NjgzNzY1NX0.wUEGv5FavNSQT3iNlo6WnW_d3TcDVxRTx8sI6xD-wxQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login password
function checkPassword() {
  const pass = document.getElementById('password-input').value;
  if (pass === 'default123') {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
  } else {
    alert('Password salah!');
  }
}

// === NEW ORDER ===
function showNewOrder() {
  const html = `
    <h3>New Order</h3>
    <input type="text" id="order_number" placeholder="Nomor Order" readonly />
    <input type="date" id="order_date" />

    <select id="room_category" onchange="updateRoomOptions()">
      <option value="">Pilih Kategori</option>
      <option value="Tulip">Tulip</option>
      <option value="Orchid">Orchid</option>
    </select>

    <input type="text" id="room_name" placeholder="Nama Ruang" />
    <input type="number" id="vouchers" placeholder="Jumlah Voucher" oninput="updateRoomOptions()" />
    <input type="number" id="extra_hours" placeholder="Jam Tambahan" oninput="updateRoomOptions()" />
    <input type="text" id="total_bill" placeholder="Total Bill" readonly />

    <select id="payment_method">
      <option value="Cash">Cash</option>
      <option value="Transfer">Transfer</option>
      <option value="Pay Later">Pay Later</option>
    </select>

    <button onclick="simpanOrder()">Simpan</button>
  `;
  document.getElementById('content-section').innerHTML = html;
  document.getElementById('order_number').value = 'ORD' + Date.now();
  document.getElementById('order_date').valueAsDate = new Date();
}

function updateRoomOptions() {
  const category = document.getElementById('room_category').value;
  const v = parseInt(document.getElementById('vouchers')?.value || 0);
  const h = parseInt(document.getElementById('extra_hours')?.value || 0);
  const totalInput = document.getElementById('total_bill');

  let total = 0;
  if (category === 'Tulip') {
    total = v * 1000 + h * 350;
  } else if (category === 'Orchid') {
    total = v * 750 + h * 250;
  }

  if (totalInput) {
    totalInput.value = total;
  }
}

async function simpanOrder() {
  const orderNumber = document.getElementById("order_number").value;
  const orderDate = document.getElementById("order_date").value;
  const roomCategory = document.getElementById("room_category").value;
  const roomName = document.getElementById("room_name").value;
  const vouchers = parseInt(document.getElementById("vouchers").value || 0);
  const extraHours = parseInt(document.getElementById("extra_hours").value || 0);
  const totalBill = parseFloat(document.getElementById("total_bill").value || 0);
  const paymentMethod = document.getElementById("payment_method").value;
  const paymentStatus = paymentMethod === "Pay Later" ? "Belum Lunas" : "Lunas";

  const { data, error } = await supabase.from("orders").insert([
    {
      order_number: orderNumber,
      order_date: orderDate,
      room_category: roomCategory,
      room_name: roomName,
      vouchers,
      extra_hours: extraHours,
      total_bill: totalBill,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      created_at: new Date().toISOString()
    }
  ]);

  if (error) {
    alert("Gagal menyimpan: " + error.message);
    console.error(error);
  } else {
    alert("Order berhasil disimpan!");
    document.getElementById("content-section").innerHTML = "";
  }
}

// === EDIT ORDER ===
function showEditOrder() {
  const html = `
    <h3>Edit Order</h3>
    <input type="text" id="search_order" placeholder="Masukkan Nomor Order atau Tanggal (YYYY-MM-DD)" />
    <button onclick="cariOrder()">Cari</button>
    <div id="edit-result"></div>
  `;
  document.getElementById('content-section').innerHTML = html;
}

async function cariOrder() {
  const keyword = document.getElementById("search_order").value.trim();
  if (!keyword) return alert("Masukkan nomor order atau tanggal");

  let { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`order_number.eq.${keyword},order_date.eq.${keyword}`);

  if (error || !data.length) {
    document.getElementById("edit-result").innerHTML = "Order tidak ditemukan.";
    return;
  }

  const order = data[0];
  const html = `
    <p><b>Nomor:</b> ${order.order_number}</p>
    <p><b>Tanggal:</b> ${order.order_date}</p>
    <p><b>Ruang:</b> ${order.room_name}</p>
    <p><b>Status Pembayaran:</b> ${order.payment_status}</p>

    <select id="new_payment_status">
      <option value="Lunas" ${order.payment_status === "Lunas" ? "selected" : ""}>Lunas</option>
      <option value="Belum Lunas" ${order.payment_status === "Belum Lunas" ? "selected" : ""}>Belum Lunas</option>
    </select>

    <button onclick="updateOrder('${order.order_number}')">Simpan Perubahan</button>
  `;
  document.getElementById("edit-result").innerHTML = html;
}

async function updateOrder(order_number) {
  const newStatus = document.getElementById("new_payment_status").value;

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: newStatus })
    .eq("order_number", order_number);

  if (error) {
    alert("Gagal update: " + error.message);
  } else {
    alert("Berhasil diperbarui!");
    document.getElementById("content-section").innerHTML = "";
  }
}

// === TARIK DATA ===
function showTarikData() {
  const html = `
    <h3>Tarik Data</h3>
    <label>Dari:</label>
    <input type="date" id="start_date" />
    <label>Sampai:</label>
    <input type="date" id="end_date" />
    <button onclick="tarikData()">Tarik</button>
    <div id="data-result"></div>
  `;
  document.getElementById('content-section').innerHTML = html;
}

async function tarikData() {
  const start = document.getElementById("start_date").value;
  const end = document.getElementById("end_date").value;

  if (!start || !end) {
    alert("Lengkapi kedua tanggal");
    return;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("order_date", start)
    .lte("order_date", end);

  if (error) {
    alert("Gagal tarik data: " + error.message);
    return;
  }

  let html = `<p>Ditemukan ${data.length} data:</p><ul>`;
  data.forEach(d => {
    html += `<li><b>${d.order_number}</b> (${d.order_date}) - ${d.room_name} - ${d.total_bill} - ${d.payment_status}</li>`;
  });
  html += `</ul>`;

  document.getElementById("data-result").innerHTML = html;
}
