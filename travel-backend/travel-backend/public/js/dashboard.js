// ============================================
// ADMIN DASHBOARD - ENHANCED FUNCTIONALITY
// ============================================

// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = '/';
}

// Update admin name and avatar
const adminNameElement = document.getElementById('admin-name');
const userAvatarElement = document.getElementById('user-avatar');
if (adminNameElement) {
    adminNameElement.textContent = user.name || 'Admin';
}
if (userAvatarElement && user.name) {
    userAvatarElement.textContent = user.name.charAt(0).toUpperCase();
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// ============================================
// DATA MANAGEMENT
// ============================================

let allTrips = [];
let currentFilter = 'all';
let searchQuery = '';

// Fetch all trips
async function loadTrips() {
    try {
        const response = await fetch('/api/trips', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load trips');
        }

        const data = await response.json();
        console.log('Loaded trips from server:', data);
        allTrips = data.trips;
        displayTrips(getFilteredTrips());
        updateStats(allTrips);
    } catch (error) {
        console.error('Error loading trips:', error);
        document.getElementById('trips-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Failed to load trips</h3>
                <p>Please try refreshing the page</p>
                <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// STATISTICS
// ============================================

function updateStats(trips) {
    document.getElementById('total-trips').textContent = trips.length;
    document.getElementById('pending-trips').textContent = trips.filter(t => t.status === 'pending').length;
    document.getElementById('contacted-trips').textContent = trips.filter(t => t.status === 'contacted').length;
    document.getElementById('completed-trips').textContent = trips.filter(t => t.status === 'completed').length;
}

// ============================================
// FILTERING & SEARCH
// ============================================

function getFilteredTrips() {
    let filtered = allTrips;

    // Apply status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(t => t.status === currentFilter);
    }

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
            t.fullName.toLowerCase().includes(query) ||
            t.email.toLowerCase().includes(query) ||
            t.destination.toLowerCase().includes(query) ||
            (t.phone && t.phone.toLowerCase().includes(query))
        );
    }

    return filtered;
}

function filterTrips(filter) {
    currentFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    displayTrips(getFilteredTrips());
}

// Search functionality with debouncing
let searchTimeout;
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value;
            displayTrips(getFilteredTrips());
        }, 300); // Debounce for 300ms
    });
}

// ============================================
// DISPLAY TRIPS
// ============================================

function displayTrips(trips) {
    const container = document.getElementById('trips-container');

    if (trips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No trip requests found</h3>
                <p>No requests match the current filter${searchQuery ? ' or search query' : ''}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="trips-grid">
            ${trips.map(trip => createTripCard(trip)).join('')}
        </div>
    `;

    // Re-initialize icons for the newly added content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function createTripCard(trip) {
    const statusColors = {
        pending: 'pending',
        contacted: 'contacted',
        completed: 'completed'
    };

    return `
        <div class="trip-card">
            <div class="trip-header">
                <div class="trip-title-section">
                    <h3 class="trip-destination">
                        <i data-lucide="map-pin" style="width: 20px; height: 20px; color: var(--color-accent);"></i>
                        ${trip.destination}
                    </h3>
                    <div class="trip-meta">
                        <span class="trip-meta-item">
                            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                            ${trip.fullName}
                        </span>
                        <span class="trip-meta-item">
                            <i data-lucide="mail" style="width: 14px; height: 14px;"></i>
                            ${trip.email}
                        </span>
                        ${trip.phone ? `
                        <span class="trip-meta-item">
                            <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                            ${trip.phone}
                        </span>
                        ` : ''}
                        <span class="trip-meta-item">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            ${new Date(trip.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div class="trip-actions">
                    <span class="status-badge ${statusColors[trip.status]}">
                        ${trip.status}
                    </span>
                    <select class="status-select" data-id="${trip._id}" data-original-value="${trip.status}">
                        <option value="pending" ${trip.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="contacted" ${trip.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="completed" ${trip.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${trip._id}">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        Delete
                    </button>
                </div>
            </div>
            <div class="trip-details">
                <div class="detail-item">
                    <span class="detail-label">
                        <i data-lucide="plane-takeoff" style="width: 12px; height: 12px;"></i>
                        Departure
                    </span>
                    <span class="detail-value">${trip.departureCity}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">
                        <i data-lucide="calendar-days" style="width: 12px; height: 12px;"></i>
                        Travel Date
                    </span>
                    <span class="detail-value">${new Date(trip.takeOffDay).toLocaleDateString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">
                        <i data-lucide="calendar-check" style="width: 12px; height: 12px;"></i>
                        Return Date
                    </span>
                    <span class="detail-value">${trip.returnDate ? new Date(trip.returnDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">
                        <i data-lucide="users" style="width: 12px; height: 12px;"></i>
                        Travelers
                    </span>
                    <span class="detail-value">${trip.people} ${trip.people === 1 ? 'person' : 'people'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">
                        <i data-lucide="file-text" style="width: 12px; height: 12px;"></i>
                        Visa Type
                    </span>
                    <span class="detail-value">${trip.visaType}</span>
                </div>
                ${trip.preferences ? `
                <div class="detail-item detail-preferences">
                    <span class="detail-label">
                        <i data-lucide="message-square" style="width: 12px; height: 12px;"></i>
                        Preferences
                    </span>
                    <span class="detail-value">${trip.preferences}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================
// UPDATE TRIP STATUS
// ============================================

async function updateStatus(tripId, newStatus) {
    const selectElement = document.querySelector(`select[data-id="${tripId}"]`);
    const originalStatus = selectElement.getAttribute('data-original-value') || 'pending';

    try {
        selectElement.disabled = true;
        const response = await fetch(`/api/trips/${tripId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            const data = await response.json();

            // Update local data
            const trip = allTrips.find(t => t._id === tripId);
            if (trip) trip.status = newStatus;

            // Update the original value
            selectElement.setAttribute('data-original-value', newStatus);

            // Refresh display
            await loadTrips();

            // Show success notification
            showToast('Success', 'Trip status updated successfully', 'success');

        } else {
            const errorData = await response.json();
            console.error('Update failed response:', errorData);
            throw new Error(errorData.error || 'Server rejected update');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error', `Failed to update status: ${error.message}`, 'error');
        selectElement.value = originalStatus; // Revert
    } finally {
        selectElement.disabled = false;
    }
}

// ============================================
// DELETE TRIP
// ============================================

async function deleteTrip(tripId) {
    if (!confirm('Are you sure you want to delete this trip request? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/trips/${tripId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Remove from local data
            allTrips = allTrips.filter(t => t._id !== tripId);

            // Refresh display
            displayTrips(getFilteredTrips());
            updateStats(allTrips);

            showToast('Success', 'Trip request deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete trip');
        }
    } catch (error) {
        console.error('Error deleting trip:', error);
        showToast('Error', 'Failed to delete trip request', 'error');
    }
}

// ============================================
// EXPORT TO CSV
// ============================================

function exportToCSV() {
    if (allTrips.length === 0) {
        showToast('Info', 'No trips to export', 'info');
        return;
    }

    const headers = ['Full Name', 'Email', 'Phone', 'Destination', 'Departure City', 'Takeoff Date', 'Return Date', 'People', 'Visa Type', 'Status', 'Preferences', 'Created At'];

    const csvContent = [
        headers.join(','),
        ...allTrips.map(trip => [
            `"${trip.fullName}"`,
            `"${trip.email}"`,
            `"${trip.phone || 'N/A'}"`,
            `"${trip.destination}"`,
            `"${trip.departureCity}"`,
            `"${new Date(trip.takeOffDay).toLocaleDateString()}"`,
            `"${trip.returnDate ? new Date(trip.returnDate).toLocaleDateString() : 'N/A'}"`,
            trip.people,
            `"${trip.visaType}"`,
            `"${trip.status}"`,
            `"${trip.preferences || 'None'}"`,
            `"${new Date(trip.createdAt).toLocaleString()}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `trip-requests-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Success', 'Trip requests exported successfully', 'success');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${iconMap[type]} toast-icon" style="color: var(--color-${type}); font-size: 20px;"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        filterTrips(btn.dataset.filter);
    });
});

// Export CSV button
const exportCsvBtn = document.getElementById('export-csv-btn');
if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
}

// Event delegation for trip cards
document.getElementById('trips-container').addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
        updateStatus(e.target.dataset.id, e.target.value);
    }
});

document.getElementById('trips-container').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        deleteTrip(deleteBtn.dataset.id);
    }
});

// ============================================
// SIDEBAR TOGGLE FUNCTIONALITY
// ============================================
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const mainContent = document.querySelector('.main-content');

// Create overlay element
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

function toggleSidebar() {
    sidebar.classList.toggle('open');
    // Overlay visibility is handled by CSS based on sidebar.open class sibling selector
    // But for robustness/if CSS selector fails:
    overlay.style.opacity = sidebar.classList.contains('open') ? '1' : '0';
    overlay.style.visibility = sidebar.classList.contains('open') ? 'visible' : 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
}

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
}

if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
}

if (overlay) {
    overlay.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking a nav link on mobile
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    });
});

// ============================================
// INITIALIZE
// ============================================

// Load trips on page load
loadTrips();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
