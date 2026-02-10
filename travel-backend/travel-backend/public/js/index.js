document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');

    if (toggle) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }

    // Trip form reveal
    const planBtn = document.getElementById("plan-btn");
    const tripPage = document.getElementById("trip-page");
    const closeTripPage = document.getElementById("close-trip-page");

    // NEW: Event delegation for destination cards (replaces inline onclick)
    document.querySelectorAll('.card').forEach(card => {
        // Only add listener if it has a data-destination attribute
        if (card.dataset.destination) {
            card.addEventListener('click', () => {
                openTripPlanner(card.dataset.destination);
            });
            card.style.cursor = 'pointer'; // Ensure cursor shows it's clickable
        }
    });

    // Function to open the planner, optionally with a destination pre-filled
    window.openTripPlanner = function (destination = '') { // Make global if needed, or scoped
        tripPage.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (destination) {
            const destInput = document.querySelector('#trip-form input[name="destination"]');
            if (destInput) {
                destInput.value = destination;
            }
        }
    }

    if (planBtn) {
        planBtn.addEventListener("click", () => openTripPlanner());
    }

    if (closeTripPage) {
        closeTripPage.addEventListener("click", () => {
            tripPage.classList.remove('active');
            document.body.style.overflow = '';
        });
    }


    // ------------------ DAY/NIGHT TOGGLE SCRIPT ------------------
    const dayBackground = document.getElementById('day-background');
    const timeToggle = document.getElementById('time-toggle');

    // Function that manually flips the background layer
    function toggleBackground() {
        // If opacity is 0 (night), change to 1 (day), otherwise change to 0
        if (dayBackground.style.opacity === '0' || dayBackground.style.opacity === '') {
            dayBackground.style.opacity = '1';
            timeToggle.innerHTML = '🌞';
        } else {
            dayBackground.style.opacity = '0';
            timeToggle.innerHTML = '🌙';
        }
    }

    // Function to set the initial background based on the current system time
    function setTimeBasedBackgroundOnLoad() {
        const now = new Date();
        const hour = now.getHours();
        // 6 AM to 6 PM is daytime
        const isDayTime = hour >= 6 && hour < 18;

        if (isDayTime) {
            dayBackground.style.opacity = '1';
            timeToggle.innerHTML = '🌞';
        } else {
            dayBackground.style.opacity = '0';
            timeToggle.innerHTML = '🌙';
        }
    }

    // Listener for the toggle button click
    if (timeToggle) {
        timeToggle.addEventListener('click', toggleBackground);
    }

    // ------------------ TOAST FUNCTION ------------------
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return; // Guard clause

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = type === 'success' ? '✅' : '❌';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400); // Wait for fade out transition
        }, 3000);
    }

    // ------------------ TRIP FORM SUBMISSION ------------------
    const tripForm = document.getElementById('trip-form');

    if (tripForm) {
        tripForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission (page reload)

            // Get the submit button to toggle state
            const submitBtn = tripForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            // 1. Show Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Processing...';
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';

            // 2. Gather data from the form
            const formData = new FormData(tripForm);
            const data = Object.fromEntries(formData.entries());

            // 3. Send data to the backend
            try {
                const response = await fetch('/api/plan-trip', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Success!
                    showToast(result.message, 'success');
                    tripForm.reset();
                    // Close the modal after a short delay
                    setTimeout(() => {
                        document.getElementById("trip-page").classList.remove('active');
                        document.body.style.overflow = '';
                    }, 1500);
                } else {
                    // Server returned an error
                    showToast(result.message, 'error');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                showToast('Failed to connect to the server.', 'error');
            } finally {
                // 4. Reset Button State (Always runs, success or fail)
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        });
    }

    // ------------------ NEWSLETTER SUBMISSION ------------------
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value;

            console.log(`Newsletter Subscription: ${email}`);
            showToast('Subscribed successfully! Check your inbox.', 'success');
            newsletterForm.reset();
        });
    }

    // ------------------ SPLASH FADE SCRIPT ------------------
    const splash = document.getElementById("splash");
    if (splash) {
        setTimeout(() => {
            splash.classList.add("hide");
        }, 2000);
    }

    // Initial check for day/night background when the page loads
    setTimeBasedBackgroundOnLoad();


    // ------------------ AUTHENTICATION MODAL ------------------
    const authModal = document.getElementById('auth-modal');
    const closeAuthModal = document.getElementById('close-auth-modal');
    const signInBtn = document.getElementById('sign-in-btn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const authError = document.getElementById('auth-error');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Open auth modal
    if (signInBtn) {
        signInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close auth modal
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', () => {
            authModal.classList.remove('active');
            document.body.style.overflow = '';
            hideAuthError();
        });
    }

    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding form
            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${tabName}-form`) {
                    form.classList.add('active');
                }
            });

            hideAuthError();
        });
    });

    // Show error message
    function showAuthError(message) {
        if (authError) {
            authError.textContent = message;
            authError.classList.add('show');
        }
    }

    // Hide error message
    function hideAuthError() {
        if (authError) authError.classList.remove('show');
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthError();

            const formData = new FormData(loginForm);
            const data = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Logging in...';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Save token to localStorage
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));

                    showToast('Login successful! Welcome back.', 'success');
                    authModal.classList.remove('active');
                    document.body.style.overflow = '';
                    loginForm.reset();

                    // Redirect to dashboard based on role
                    setTimeout(() => {
                        if (result.user.role === 'admin') {
                            window.location.href = '/dashboard.html';
                        } else {
                            window.location.href = '/my-trips.html';
                        }
                    }, 1000);
                } else {
                    showAuthError(result.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login error:', error);
                showAuthError('Failed to connect to server.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthError();

            const formData = new FormData(signupForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            };

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Creating account...';

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Save token to localStorage
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));

                    showToast('Account created successfully! Welcome aboard.', 'success');
                    authModal.classList.remove('active');
                    document.body.style.overflow = '';
                    signupForm.reset();

                    // Redirect to user dashboard
                    setTimeout(() => {
                        window.location.href = '/my-trips.html';
                    }, 1000);
                } else {
                    if (result.errors && result.errors.length > 0) {
                        showAuthError(result.errors[0].msg);
                    } else {
                        showAuthError(result.error || 'Signup failed. Please try again.');
                    }
                }
            } catch (error) {
                console.error('Signup error:', error);
                showAuthError('Failed to connect to server.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }
});
