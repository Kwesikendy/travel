
// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/';
}

// Display user name
const userNameEl = document.getElementById('user-name');
if (userNameEl) {
    userNameEl.textContent = user.name || 'Traveler';
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

// Fetch user's trips
async function loadTrips() {
    try {
        const response = await fetch('/api/trips/my', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load trips');
        }

        const data = await response.json();
        displayTrips(data.trips);
        updateStats(data.trips);
    } catch (error) {
        console.error('Error loading trips:', error);
        document.getElementById('trips-container').innerHTML = `
            <div class="empty-state">
                <h3>❌ Failed to load trips</h3>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

function updateStats(trips) {
    const totalTripsEl = document.getElementById('total-trips');
    const pendingTripsEl = document.getElementById('pending-trips');
    const completedTripsEl = document.getElementById('completed-trips');

    if (totalTripsEl) totalTripsEl.textContent = trips.length;
    if (pendingTripsEl) pendingTripsEl.textContent = trips.filter(t => t.status === 'pending').length;
    if (completedTripsEl) completedTripsEl.textContent = trips.filter(t => t.status === 'completed').length;
}

function displayTrips(trips) {
    const container = document.getElementById('trips-container');

    if (trips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧳</div>
                <h3>No trips booked yet</h3>
                <p>Start planning your next adventure today!</p>
                <a href="/?plan=true" class="btn btn-primary" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 8px;">
                    <i data-lucide="plus-circle"></i> Plan Your First Trip
                </a>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const statusColors = {
        pending: 'pending',
        contacted: 'contacted',
        completed: 'completed'
    };

    container.innerHTML = `
        <div class="trips-grid">
            ${trips.map(trip => `
                <div class="trip-card">
                    <div class="trip-header">
                        <div class="trip-title-section">
                            <h3 class="trip-destination">
                                <i data-lucide="map-pin" style="width: 20px; height: 20px; color: var(--color-accent);"></i>
                                ${trip.destination}
                            </h3>
                            <div class="trip-meta">
                                <span class="trip-meta-item">
                                    <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                                    Requested: ${new Date(trip.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div class="trip-actions">
                            <span class="status-badge ${statusColors[trip.status]}">
                                ${trip.status}
                            </span>
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
                        <div class="detail-item detail-preferences" style="grid-column: 1 / -1;">
                            <span class="detail-label">
                                <i data-lucide="message-square" style="width: 12px; height: 12px;"></i>
                                Preferences
                            </span>
                            <span class="detail-value">${trip.preferences}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Ensure icons init on load too (for static sidebar)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load trips on page load
loadTrips();
