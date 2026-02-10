
// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/';
}

// Display user name
const userNameEl = document.getElementById('user-name');
if (userNameEl) {
    userNameEl.textContent = `👤 ${user.name || 'User'}`;
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
                <h3>🧳 No trips yet</h3>
                <p>Start planning your next adventure!</p>
                <a href="/" class="btn btn-primary">✈️ Plan Your First Trip</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="trips-grid">
            ${trips.map(trip => `
                <div class="trip-card">
                    <div class="trip-header">
                        <div>
                            <div class="trip-destination">🌏 ${trip.destination}</div>
                            <div class="trip-date">📅 Requested on ${new Date(trip.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span class="status-badge status-${trip.status}">${trip.status}</span>
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
                            <span class="detail-label">👥 Travelers</span>
                            <span class="detail-value">${trip.people} ${trip.people === 1 ? 'person' : 'people'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📋 Visa Type</span>
                            <span class="detail-value">${trip.visaType}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Load trips on page load
loadTrips();
