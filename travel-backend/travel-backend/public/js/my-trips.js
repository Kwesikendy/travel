
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/';
        return;
    }

    // 2. Display User Name (Hero Section)
    const userGreetingEl = document.getElementById('user-greeting-name');
    if (userGreetingEl) {
        userGreetingEl.textContent = user.name ? user.name.split(' ')[0] : 'Traveler';
    }

    // 3. Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }

    // 4. Modal Logic
    const tripPage = document.getElementById("trip-page");
    const closeTripPage = document.getElementById("close-trip-page");
    const tripForm = document.getElementById("trip-form");

    // Open Modal Function
    const openModal = () => {
        if (tripPage) {
            tripPage.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Pre-fill
            if (user && user.email && tripForm) {
                const nameInput = tripForm.querySelector('input[name="fullName"]');
                const emailInput = tripForm.querySelector('input[name="email"]');
                const phoneInput = tripForm.querySelector('input[name="phone"]');

                if (nameInput) nameInput.value = user.name || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput && user.phone) phoneInput.value = user.phone;
            }
        }
    };

    // Close Modal Function
    const closeModal = () => {
        if (tripPage) {
            tripPage.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // Event Listeners for Opening Modal
    // We have multiple buttons: Nav link, Action button, and potentially empty state button
    const planTriggerIds = ['plan-btn-nav', 'plan-btn-action'];
    planTriggerIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal();
            });
        }
    });

    // Delegate event for dynamic empty state button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('plan-trigger-btn')) {
            e.preventDefault();
            openModal();
        }
    });

    // Close Listeners
    if (closeTripPage) closeTripPage.addEventListener('click', closeModal);
    if (tripPage) {
        tripPage.addEventListener('click', (e) => {
            if (e.target === tripPage) closeModal();
        });
    }

    // 5. Load Trips Function
    async function loadTrips() {
        const grid = document.getElementById('trips-grid');
        if (!grid) return;

        try {
            const response = await fetch('/api/trips/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to load trips');

            const data = await response.json();
            const trips = data.trips || [];

            updateStats(trips);
            displayTrips(trips);

        } catch (error) {
            console.error('Error loading trips:', error);
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #ff6b6b; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px;">
                    <h3 style="margin-bottom: 10px;">Unable to load trips</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Retry</button>
                </div>
            `;
        }
    }

    function updateStats(trips) {
        const total = trips.length;
        const pending = trips.filter(t => t.status === 'pending').length;
        const completed = trips.filter(t => t.status === 'completed' || t.status === 'approved').length; // Assuming 'approved' counts as completed-ish for now

        const totalEl = document.getElementById('total-trips');
        const pendingEl = document.getElementById('pending-trips');
        const completedEl = document.getElementById('completed-trips');

        if (totalEl) totalEl.textContent = total;
        if (pendingEl) pendingEl.textContent = pending;
        if (completedEl) completedEl.textContent = completed;
    }

    function displayTrips(trips) {
        const grid = document.getElementById('trips-grid');
        const emptyTemplate = document.getElementById('empty-state-template');

        if (trips.length === 0) {
            grid.innerHTML = '';
            if (emptyTemplate) {
                const clone = emptyTemplate.content.cloneNode(true);
                grid.appendChild(clone);
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        grid.innerHTML = trips.map(trip => {
            let statusColor = '#f4c542'; // Pending (Yellow)
            if (trip.status === 'completed' || trip.status === 'approved') statusColor = '#4CAF50'; // Green
            if (trip.status === 'cancelled' || trip.status === 'rejected') statusColor = '#ff6b6b'; // Red

            const date = new Date(trip.takeOffDay).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

            return `
            <div class="trip-glass-card" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 25px; color: white; transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; gap: 15px; position: relative; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                
                <!-- Status Badge -->
                <div style="position: absolute; top: 15px; right: 15px; background: ${statusColor}; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; color: #1a1a2e; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                    ${trip.status}
                </div>

                <!-- Icon & Destination -->
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="map-pin" style="width: 24px; height: 24px; color: #d1a340;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.4rem; font-weight: 600;">${trip.destination}</h3>
                        <p style="margin: 0; opacity: 0.7; font-size: 0.9rem;">${trip.visaType} Visa</p>
                    </div>
                </div>

                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 5px 0;"></div>

                <!-- Details Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem; opacity: 0.9;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="calendar" style="width: 16px; color: #f4c542;"></i>
                        <span>${date}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="users" style="width: 16px; color: #f4c542;"></i>
                        <span>${trip.people} Travelers</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; grid-column: span 2;">
                        <i data-lucide="plane-takeoff" style="width: 16px; color: #f4c542;"></i>
                        <span>From ${trip.departureCity}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // 6. Form Submission Logic
    if (tripForm) {
        tripForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = tripForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            const formData = new FormData(tripForm);
            const data = Object.fromEntries(formData.entries()); // Simple for now
            // Note: If you need to handle checkboxes or multiple select, you might need more complex FormData handling.

            try {
                const response = await fetch('/api/plan-trip', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Assuming API might need auth eventually, good practice
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Success! ' + (result.message || 'Trip request submitted.'));
                    tripForm.reset();
                    closeModal();
                    loadTrips(); // Refresh the grid
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error(error);
                alert('Error: ' + error.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }


    // Initial Load
    loadTrips();

    // 7. Splash Screen & Background Logic
    const splash = document.getElementById('splash');
    const dayBackground = document.getElementById('day-background');

    // Background Logic (Day: 4am - 3pm)
    function updateBackground() {
        if (!dayBackground) return;
        const hour = new Date().getHours();
        const isDayTime = hour >= 4 && hour < 15;
        dayBackground.style.opacity = isDayTime ? '1' : '0';
    }

    // Run on load
    updateBackground();
    // Update every minute
    setInterval(updateBackground, 60000);

    // Splash Screen Removal
    if (splash) {
        // Ensure it stays for at least a moment to look nice
        setTimeout(() => {
            splash.style.transition = 'opacity 0.5s ease';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 500);
        }, 1500);
    }
});
