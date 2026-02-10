
// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = '/';
}

const adminNameElement = document.getElementById('admin-name');
if (adminNameElement) {
    adminNameElement.textContent = user.name || 'Admin';
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

let allTrips = [];
let currentFilter = 'all';

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
        displayTrips(allTrips);
        updateStats(allTrips);
    } catch (error) {
        console.error('Error loading trips:', error);
        document.getElementById('trips-container').innerHTML = `
            <div class="empty-state">
                <h3>❌ Failed to load trips</h3>
                <p>Please try refreshing the page</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">${error.message}</p>
            </div>
        `;
    }
}

function updateStats(trips) {
    document.getElementById('total-trips').textContent = trips.length;
    document.getElementById('pending-trips').textContent = trips.filter(t => t.status === 'pending').length;
    document.getElementById('contacted-trips').textContent = trips.filter(t => t.status === 'contacted').length;
    document.getElementById('completed-trips').textContent = trips.filter(t => t.status === 'completed').length;
}

function displayTrips(trips) {
    const container = document.getElementById('trips-container');

    if (trips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📭 No trip requests</h3>
                <p>No requests match the current filter</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="trips-grid">
            ${trips.map(trip => `
                <div class="trip-card">
                    <div class="trip-header">
                        <div class="trip-info">
                            <h3>🌏 ${trip.destination}</h3>
                            <div class="trip-meta">
                                👤 ${trip.fullName} • 📧 ${trip.email} • 📞 ${trip.phone || 'N/A'}
                            </div>
                            <div class="trip-meta">
                                📅 Requested: ${new Date(trip.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="trip-actions">
                            <select class="status-select" data-id="${trip._id}" data-original-value="${trip.status}">
                                <option value="pending" ${trip.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="contacted" ${trip.status === 'contacted' ? 'selected' : ''}>📞 Contacted</option>
                                <option value="completed" ${trip.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                            </select>
                            <button class="btn btn-danger delete-btn" data-id="${trip._id}">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="trip-details">
                        <div class="detail-item">
                            <span class="detail-label">🛫 Departure</span>
                            <span class="detail-value">${trip.departureCity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📆 Travel Date</span>
                            <span class="detail-value">${new Date(trip.takeOffDay).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🔙 Return Date</span>
                            <span class="detail-value">${trip.returnDate ? new Date(trip.returnDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">👥 Travelers</span>
                            <span class="detail-value">${trip.people} ${trip.people === 1 ? 'person' : 'people'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📋 Visa Type</span>
                            <span class="detail-value">${trip.visaType}</span>
                        </div>
                        ${trip.preferences ? `
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <span class="detail-label">💭 Preferences</span>
                            <span class="detail-value">${trip.preferences}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update trip status
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

            // Update the original value so we know what to revert to if next change fails
            selectElement.setAttribute('data-original-value', newStatus);

            // RE-FETCH ALL DATA from server to prove it is live
            await loadTrips();

            // Show small toast instead of alert for better UX
            const toast = document.createElement('div');
            toast.textContent = '✅ Status updated';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.background = '#4caf50';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '5px';
            toast.style.zIndex = '1000';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);

        } else {
            const errorData = await response.json();
            console.error('Update failed response:', errorData);
            throw new Error(errorData.error || 'Server rejected update');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert(`❌ Failed to update status: ${error.message}`);
        selectElement.value = originalStatus; // Revert
    } finally {
        selectElement.disabled = false;
    }
}

// Delete trip
async function deleteTrip(tripId) {
    if (!confirm('Are you sure you want to delete this trip request?')) {
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
            filterTrips(currentFilter);
            updateStats(allTrips);
        }
    } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Failed to delete trip');
    }
}

// Filter trips
function filterTrips(filter) {
    currentFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Filter and display
    const filtered = filter === 'all'
        ? allTrips
        : allTrips.filter(t => t.status === filter);

    displayTrips(filtered);
}

// Setup filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        filterTrips(btn.dataset.filter);
    });
});

// Initialize event delegation
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

// Load trips on page load
loadTrips();
