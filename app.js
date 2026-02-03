import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

function createReservationCard(res) {
  const statusClass = res.status === "Pagado" ? "badge-paid" : "badge-pending";
  const statusIcon =
    res.status === "Pagado" ? '<i class="fas fa-check"></i>' : "";

  return `
        <div class="res-card" onclick="editReservation('${res.id}')">
            <div class="res-header">
                <div class="res-info">
                    <h3>${res.name}</h3>
                    <div class="sub-property">${res.property}</div>
                </div>
                <div class="badge ${statusClass}">
                    ${statusIcon} ${res.status}
                </div>
            </div>
            
            <div class="res-dates">
                <div class="date-item">
                    <div class="date-label">Entrada</div>
                    <div class="date-value">${res.checkIn}</div>
                </div>
                <i class="fas fa-arrow-right" style="color: #dee2e6; font-size: 0.8rem;"></i>
                <div class="date-item">
                    <div class="date-label">Salida</div>
                    <div class="date-value">${res.checkOut}</div>
                </div>
            </div>
            
            <div class="res-footer">
                <div class="res-source">${res.source}</div>
                <div class="res-guests">${res.guests} pers.</div>
            </div>
        </div>
    `;
}

// Navigation Management
function nav(viewId) {
  // Hide all sections
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active"));
  
  // Show target section
  const targetSection = document.getElementById("view-" + viewId);
  if (targetSection) targetSection.classList.add("active");

  // Update nav menu items (Desk & Mobile)
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((el) => {
    el.classList.remove("active");
    if (el.getAttribute("data-view") === viewId) {
      el.classList.add("active");
    }
  });

  // Close mobile menu if open
  closeMobileMenu();

  // Update title if needed
  const titleEl = document.getElementById("view-title");
  if (titleEl && viewId === "resumen") titleEl.textContent = "Resumen";
}

// Mobile Menu Controls
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMobileMenuBtn = document.getElementById('close-mobile-menu');

function openMobileMenu() {
    mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scroll
}

function closeMobileMenu() {
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore scroll
}

// Sidebar Navigation Actions
function handleNavClick(viewId) {
    nav(viewId);
    if (viewId === 'galeria') loadGalleryAdmin();
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', closeMobileMenu);

// Calendar Generation (Ported from Lestudi)
function generarCalendario(reservas) {
  const contenedor = document.getElementById("calendario-container");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const todasLasPropiedades = ["Camper Avan"]; // In a real app, this could be dynamic
  const hoyZero = new Date();
  hoyZero.setHours(0, 0, 0, 0);

  const mesesMostrar = 12;

  for (let i = 0; i < mesesMostrar; i++) {
    const fechaMes = new Date(hoyZero.getFullYear(), hoyZero.getMonth() + i, 1);
    const año = fechaMes.getFullYear();
    const mes = fechaMes.getMonth();
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const nombreMes = fechaMes.toLocaleString("es-ES", { month: "long", year: "numeric" }).toUpperCase();

    let htmlTabla = `
      <div class="calendar-month-table-wrapper">
        <div class="calendar-month-header">${nombreMes}</div>
        <table class="calendar-month-table calendar-table">
          <thead>
            <tr class="calendar-table-header">
              <th class="room-col">Unidad</th>`;

    for (let d = 1; d <= diasEnMes; d++) {
      const diaSemana = new Date(año, mes, d).getDay();
      const esFinde = diaSemana === 0 || diaSemana === 6;
      const bgClass = esFinde ? 'style="background:#fef2f2; color:#f87171"' : "";
      htmlTabla += `<th ${bgClass}>${d}</th>`;
    }
    htmlTabla += `</tr></thead><tbody>`;

    todasLasPropiedades.forEach((prop) => {
      htmlTabla += `<tr class="calendar-row">
        <td class="room-label">${prop}</td>`;

      for (let d = 1; d <= diasEnMes; d++) {
        const fechaActual = new Date(año, mes, d);
        fechaActual.setHours(0, 0, 0, 0);

        const coincidencias = reservas.filter((r) => {
          if (r.property !== prop) return false;
          const rIn = new Date(r.checkIn);
          rIn.setHours(0, 0, 0, 0);
          const rOut = new Date(r.checkOut);
          rOut.setHours(0, 0, 0, 0);
          return fechaActual >= rIn && fechaActual < rOut;
        });

        if (coincidencias.length > 0) {
          const reserva = coincidencias[0];
          const rIn = new Date(reserva.checkIn);
          rIn.setHours(0, 0, 0, 0);
          const rOut = new Date(reserva.checkOut);
          rOut.setHours(0, 0, 0, 0);

          const esInicioBarra = fechaActual.getTime() === rIn.getTime() || d === 1;

          if (esInicioBarra) {
            const diasRestantesMes = diasEnMes - d + 1;
            const fechaInicioCalculo = d === 1 && rIn < fechaActual ? fechaActual : rIn;
            const duracion = Math.ceil((rOut - fechaInicioCalculo) / (1000 * 60 * 60 * 24));
            const colspan = Math.min(diasRestantesMes, duracion);

            let statusClass = "bar-future";
            if (coincidencias.length > 1) statusClass = "bar-conflict";
            else if (rOut.getTime() < hoyZero.getTime()) statusClass = "bar-past";
            else if (rIn <= hoyZero && rOut > hoyZero) statusClass = "bar-active";

            const info = coincidencias.length > 1 ? `⚠️ (${coincidencias.length})` : reserva.name;

            htmlTabla += `
              <td colspan="${colspan}">
                <div class="calendar-bar ${statusClass}" title="${reserva.name}" onclick="editReservation('${reserva.id}')">
                  ${info} <span class="bar-info">${reserva.price}€</span>
                </div>
              </td>`;
            d += colspan - 1;
          }
        } else {
          htmlTabla += `<td></td>`;
        }
      }
      htmlTabla += `</tr>`;
    });

    htmlTabla += `</tbody></table></div>`;
    contenedor.innerHTML += htmlTabla;
  }
}

// Media Gallery Logic (Firebase Storage)
async function loadGalleryAdmin() {
    const grid = document.getElementById('gallery-admin-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">Cargando...</div>';

    const listRef = ref(storage, 'gallery');
    try {
        const res = await listAll(listRef);
        if (res.items.length === 0) {
            grid.innerHTML = '<div class="no-data">La galería está vacía.</div>';
            return;
        }

        grid.innerHTML = '';
        for (const itemRef of res.items) {
            const url = await getDownloadURL(itemRef);
            const isVideo = itemRef.name.match(/\.(mp4|webm|ogg)$/i);
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'gallery-item';
            itemDiv.style.position = 'relative';
            
            itemDiv.innerHTML = `
                ${isVideo ? `<video src="${url}"></video>` : `<img src="${url}">`}
                <button class="btn-delete-overlay" onclick="deleteMedia('${itemRef.fullPath}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            grid.appendChild(itemDiv);
        }
    } catch (error) {
        console.error("Error loading gallery:", error);
        grid.innerHTML = '<div class="error">Error al cargar galería.</div>';
    }
}

async function uploadMedia(file) {
    if (!file) return;
    const grid = document.getElementById('gallery-admin-grid');
    const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
    
    try {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Subiendo...';
        document.body.appendChild(overlay);

        await uploadBytes(storageRef, file);
        document.body.removeChild(overlay);
        loadGalleryAdmin();
    } catch (error) {
        console.error("Error uploading:", error);
        alert("Error al subir archivo.");
    }
}

async function deleteMedia(path) {
    if (confirm('¿Eliminar este archivo de la galería?')) {
        const fileRef = ref(storage, path);
        try {
            await deleteObject(fileRef);
            loadGalleryAdmin();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error al eliminar.");
        }
    }
}

window.deleteMedia = deleteMedia; // Expose for onclick


// Memory cache for editing
let currentReservations = [];

function renderReservations(reservations) {
    const contenedor = document.getElementById('reservations-grid');
    if (!contenedor) return;

    const searchTerm = document.getElementById('reservation-search')?.value.toLowerCase() || "";
    const statusFilter = document.getElementById('status-filter')?.value || "all";

    contenedor.innerHTML = '';
    currentReservations = reservations; // Update cache

    const filtered = reservations.filter(res => {
        const name = res.name?.toLowerCase() || "";
        const phone = res.phone || "";
        const email = res.email?.toLowerCase() || "";
        
        const matchesSearch = name.includes(searchTerm) || 
                             phone.includes(searchTerm) || 
                             email.includes(searchTerm);
        
        const matchesStatus = statusFilter === "all" || res.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        contenedor.innerHTML = '<div class="no-data">No se encontraron reservas.</div>';
        return;
    }

    filtered.forEach(res => {
        contenedor.innerHTML += createReservationCard(res);
    });
}

function listenToReservations() {
  const grid = document.getElementById("reservations-grid");
  if (!grid) return;

  const q = query(collection(db, "reservations"), orderBy("checkIn", "desc"));

  onSnapshot(q, (snapshot) => {
    const reservations = [];
    snapshot.forEach((doc) => {
      reservations.push({ id: doc.id, ...doc.data() });
    });
    
    renderReservations(reservations); // Call the new render function

    // Update Calendar View
    generarCalendario(reservations);
  }, (error) => {
    console.error("Error fetching reservations: ", error);
    grid.innerHTML = '<div class="error">Error al cargar datos.</div>';
  });
}

// ... existing DOM elements ...
const modal = document.getElementById('reservation-modal');
const form = document.getElementById('reservation-form');
const btnNew = document.getElementById('new-reservation-btn');
const btnCancel = document.getElementById('cancel-reservation');
const btnClose = document.getElementById('close-modal');
const nightsDisplay = document.getElementById('nights-count');
const checkInInput = form.querySelector('input[name="checkIn"]');
const checkOutInput = form.querySelector('input[name="checkOut"]');

// ... existing Modal Controls ...
function openModal() {
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('reservation-id').value = '';
    document.getElementById('modal-title-text').textContent = 'Nueva Reserva';
    document.getElementById('delete-reservation').style.display = 'none';
    nightsDisplay.textContent = '0';
    // Reset deposit field if needed (reset() usually handles inputs but good to be explicit)
    form.querySelector('input[name="depositAmount"]').value = '';
}

function editReservation(id) {
    const res = currentReservations.find(r => r.id === id);
    if (!res) return;

    document.getElementById('reservation-id').value = res.id;
    document.getElementById('modal-title-text').textContent = 'Editar Reserva';
    document.getElementById('delete-reservation').style.display = 'block';

    // Populate form fields
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            if (input.name === 'isPaid') input.checked = res.status === 'Pagado';
            if (input.name === 'isDepositOk') input.checked = res.isDepositOk;
        } else if (res[input.name] !== undefined) {
            input.value = res[input.name];
        }
    });

    calculateNights();
    openModal();
}

async function deleteReservation() {
    const id = document.getElementById('reservation-id').value;
    if (!id) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
        try {
            await deleteDoc(doc(db, "reservations", id));
            closeModal();
        } catch (error) {
            console.error("Error deleting reservation: ", error);
            alert("Error al eliminar la reserva.");
        }
    }
}

function calculateNights() {
    const start = new Date(checkInInput.value);
    const end = new Date(checkOutInput.value);
    
    if (start && end && end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        nightsDisplay.textContent = diffDays;
    } else {
        nightsDisplay.textContent = '0';
    }
}

// ... existing Firestore Saving ...
async function saveReservation(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {
        bookingDate: formData.get('bookingDate'),
        source: "Directa", // Simplified
        property: "Camper Avan", // Simplified
        name: formData.get('name'),
        nationality: formData.get('nationality'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        checkIn: formData.get('checkIn'),
        checkOut: formData.get('checkOut'),
        guests: parseInt(formData.get('guests')),
        price: parseFloat(formData.get('price')) || 0,
        status: formData.get('isPaid') === 'on' ? 'Pagado' : 'Pendiente',
        isDepositOk: formData.get('isDepositOk') === 'on',
        depositAmount: parseFloat(formData.get('depositAmount')) || 0,
        createdAt: new Date().toISOString()
    };

    try {
        const resId = formData.get('id');
        if (resId) {
            // Update existing
            await updateDoc(doc(db, "reservations", resId), data);
        } else {
            // Add new
            await addDoc(collection(db, "reservations"), data);
        }
        closeModal();
    } catch (error) {
        console.error("Error saving reservation: ", error);
        alert("Error al guardar la reserva. Revisa las reglas de Firestore.");
    }
}

// Event Listeners with safety checks
if (btnNew) btnNew.addEventListener('click', openModal);
if (btnCancel) btnCancel.addEventListener('click', closeModal);
if (btnClose) btnClose.addEventListener('click', closeModal);
if (checkInInput) checkInInput.addEventListener('change', calculateNights);
if (checkOutInput) checkOutInput.addEventListener('change', calculateNights);
if (form) form.addEventListener('submit', saveReservation);

const btnDelete = document.getElementById('delete-reservation');
if (btnDelete) btnDelete.addEventListener('click', deleteReservation);

// Logout logic
const handleLogout = async (e) => {
    e.preventDefault();
    if (confirm('¿Cerrar sesión?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
};

const logoutBtn = document.getElementById('logout-btn');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

// Media Upload Listener
const uploadInput = document.getElementById('upload-media');
if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
        if (e.target.files[0]) uploadMedia(e.target.files[0]);
    });
}

// Search and Filter Listeners
const searchInput = document.getElementById('reservation-search');
const statusFilter = document.getElementById('status-filter');

if (searchInput) {
    searchInput.addEventListener('input', () => renderReservations(currentReservations));
}
if (statusFilter) {
    statusFilter.addEventListener('change', () => renderReservations(currentReservations));
}

// Expose to global scope for onclick in HTML strings
window.editReservation = editReservation;
window.openModal = openModal;
window.closeModal = closeModal;
window.nav = nav;
window.handleNavClick = handleNavClick;
document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        const viewId = item.getAttribute("data-view");
        if (viewId) handleNavClick(viewId);
    });
});

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log("Autocaravana app starting with Firebase...");
  nav("resumen"); // Set default view
  listenToReservations();
});
