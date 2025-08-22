// MedTracker Application
class MedTracker {
    constructor() {
        this.medications = [];
        this.medicationHistory = {};
        this.notificationInterval = null;
        this.init();
    }

    // Initialize the application
    init() {
        try {
            this.loadFromStorage();
            this.setupEventListeners();
            this.initializeTheme();
            this.updateCurrentDate();
            this.renderMedications();
            this.updateStats();
            this.checkNotificationPermission();
            this.startNotificationTimer();

            // Check for notification banner
            setTimeout(() => {
                if (Notification.permission === 'default' && this.medications.length > 0) {
                    this.showNotificationBanner();
                }
            }, 2000);
        } catch (error) {
            console.error('Error initializing MedTracker:', error);
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        try {
            // Theme toggle
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleTheme();
                });
            }

            // Add medication button in header
            const addMedBtn = document.getElementById('addMedBtn');
            if (addMedBtn) {
                addMedBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openAddMedicationModal();
                });
            }

            // Medication form
            const medicationForm = document.getElementById('medicationForm');
            if (medicationForm) {
                medicationForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveMedication();
                });
            }

            // Frequency change handler
            const medFrequency = document.getElementById('medFrequency');
            if (medFrequency) {
                medFrequency.addEventListener('change', () => {
                    this.updateTimeInputs();
                });
            }

            // Modal overlay click to close
            const modalOverlay = document.getElementById('modalOverlay');
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        this.closeAddMedicationModal();
                    }
                });
            }

            // Modal close button
            const modalClose = document.getElementById('modalClose');
            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    this.closeAddMedicationModal();
                });
            }

            // Cancel button
            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeAddMedicationModal();
                });
            }

            // Notification banner buttons
            const enableNotifications = document.getElementById('enableNotifications');
            const dismissNotifications = document.getElementById('dismissNotifications');

            if (enableNotifications) {
                enableNotifications.addEventListener('click', () => {
                    this.requestNotificationPermission();
                });
            }

            if (dismissNotifications) {
                dismissNotifications.addEventListener('click', () => {
                    this.hideNotificationBanner();
                });
            }

        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // Theme Management
    initializeTheme() {
        const savedTheme = localStorage.getItem('medtracker_theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-color-scheme', theme);
        localStorage.setItem('medtracker_theme', theme);

        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    // Date Management
    updateCurrentDate() {
        const currentDate = document.getElementById('currentDate');
        if (currentDate) {
            const today = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            currentDate.textContent = today.toLocaleDateString('en-US', options);
        }
    }

    // Storage Management
    loadFromStorage() {
        try {
            const savedMedications = localStorage.getItem('medtracker_medications');
            const savedHistory = localStorage.getItem('medtracker_history');

            if (savedMedications) {
                this.medications = JSON.parse(savedMedications);
            }

            if (savedHistory) {
                this.medicationHistory = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.medications = [];
            this.medicationHistory = {};
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('medtracker_medications', JSON.stringify(this.medications));
            localStorage.setItem('medtracker_history', JSON.stringify(this.medicationHistory));
        } catch (error) {
            console.error('Error saving to storage:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    // Medication Management
    openAddMedicationModal() {
        const modal = document.getElementById('modalOverlay');
        const form = document.getElementById('medicationForm');

        if (modal && form) {
            form.reset();
            this.updateTimeInputs();
            modal.classList.add('active');
        }
    }

    closeAddMedicationModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    updateTimeInputs() {
        const frequency = document.getElementById('medFrequency').value;
        const timeInputsContainer = document.getElementById('timeInputs');

        if (!timeInputsContainer) return;

        timeInputsContainer.innerHTML = '';

        if (!frequency) return;

        const timeSlots = this.getTimeSlots(frequency);

        timeSlots.forEach((slot, index) => {
            const timeInputGroup = document.createElement('div');
            timeInputGroup.className = 'time-input-group';

            timeInputGroup.innerHTML = `
                <label>${slot.label}:</label>
                <input 
                    type="time" 
                    name="time_${index}" 
                    value="${slot.defaultTime}"
                    required
                >
            `;

            timeInputsContainer.appendChild(timeInputGroup);
        });
    }

    getTimeSlots(frequency) {
        switch (frequency) {
            case 'daily':
                return [{ label: 'Time', defaultTime: '09:00' }];
            case 'twice_daily':
                return [
                    { label: 'Morning', defaultTime: '09:00' },
                    { label: 'Evening', defaultTime: '21:00' }
                ];
            case 'three_times':
                return [
                    { label: 'Morning', defaultTime: '08:00' },
                    { label: 'Afternoon', defaultTime: '14:00' },
                    { label: 'Evening', defaultTime: '21:00' }
                ];
            case 'weekly':
                return [{ label: 'Weekly', defaultTime: '09:00' }];
            case 'as_needed':
                return [];
            default:
                return [];
        }
    }

    saveMedication() {
        try {
            const form = document.getElementById('medicationForm');
            const formData = new FormData(form);

            const medication = {
                id: 'med_' + Date.now(),
                name: formData.get('medName').trim(),
                dosage: formData.get('medDosage').trim(),
                frequency: formData.get('medFrequency'),
                notes: formData.get('medNotes') || '',
                createdAt: new Date().toISOString(),
                times: []
            };

            // Collect time inputs
            const timeInputs = document.querySelectorAll('[name^="time_"]');
            timeInputs.forEach(input => {
                if (input.value) {
                    medication.times.push(input.value);
                }
            });

            // Validate required fields
            if (!medication.name || !medication.dosage || !medication.frequency) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (medication.frequency !== 'as_needed' && medication.times.length === 0) {
                this.showToast('Please set at least one time for reminders', 'error');
                return;
            }

            // Add to medications list
            this.medications.push(medication);
            this.saveToStorage();

            // Update UI
            this.renderMedications();
            this.updateStats();
            this.closeAddMedicationModal();

            this.showToast('Medication added successfully!', 'success');

            // Check notification permission after adding first medication
            if (this.medications.length === 1) {
                setTimeout(() => {
                    if (Notification.permission === 'default') {
                        this.showNotificationBanner();
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Error saving medication:', error);
            this.showToast('Error saving medication', 'error');
        }
    }

    deleteMedication(medicationId) {
        if (confirm('Are you sure you want to delete this medication?')) {
            this.medications = this.medications.filter(med => med.id !== medicationId);
            this.saveToStorage();
            this.renderMedications();
            this.updateStats();
            this.showToast('Medication deleted', 'info');
        }
    }

    markMedicationTaken(medicationId) {
        const today = new Date().toDateString();

        if (!this.medicationHistory[today]) {
            this.medicationHistory[today] = {};
        }

        if (!this.medicationHistory[today][medicationId]) {
            this.medicationHistory[today][medicationId] = [];
        }

        const now = new Date();
        this.medicationHistory[today][medicationId].push({
            takenAt: now.toISOString(),
            status: 'taken'
        });

        this.saveToStorage();
        this.renderMedications();
        this.updateStats();
        this.showToast('Medication marked as taken!', 'success');
    }

    // UI Rendering
    renderMedications() {
        const medicationsGrid = document.getElementById('medicationsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!medicationsGrid || !emptyState) return;

        if (this.medications.length === 0) {
            medicationsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        medicationsGrid.style.display = 'grid';

        medicationsGrid.innerHTML = this.medications.map(medication => {
            const status = this.getMedicationStatus(medication);
            const nextDoseTime = this.getNextDoseTime(medication);

            return `
                <div class="medication-card animate-fade-in">
                    <div class="medication-header">
                        <div>
                            <div class="medication-name">${medication.name}</div>
                            <div class="medication-dosage">${medication.dosage}</div>
                        </div>
                        <div class="medication-actions">
                            <button class="btn btn--small btn--secondary" 
                                    onclick="medTracker.deleteMedication('${medication.id}')"
                                    title="Delete medication">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div class="medication-info">
                        ${nextDoseTime ? `
                            <div class="medication-time">
                                ⏰ Next dose: ${nextDoseTime}
                            </div>
                        ` : ''}
                        <div class="medication-frequency">
                            📋 ${this.getFrequencyLabel(medication.frequency)}
                        </div>
                        ${medication.notes ? `
                            <div class="medication-notes">
                                📝 ${medication.notes}
                            </div>
                        ` : ''}
                    </div>

                    <div class="medication-status">
                        <span class="status-badge status-badge--${status.type}">
                            ${status.label}
                        </span>
                        ${status.type !== 'taken' ? `
                            <button class="btn btn--small btn--primary" 
                                    onclick="medTracker.markMedicationTaken('${medication.id}')">
                                ✅ Mark Taken
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getMedicationStatus(medication) {
        const today = new Date().toDateString();
        const history = this.medicationHistory[today];

        if (history && history[medication.id] && history[medication.id].length > 0) {
            return { type: 'taken', label: 'Taken Today' };
        }

        if (medication.frequency === 'as_needed') {
            return { type: 'upcoming', label: 'As Needed' };
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        for (const timeStr of medication.times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const medicationTime = hours * 60 + minutes;

            if (currentTime >= medicationTime + 60) { // 1 hour grace period
                return { type: 'missed', label: 'Missed' };
            } else if (currentTime >= medicationTime) {
                return { type: 'upcoming', label: 'Due Now' };
            }
        }

        return { type: 'upcoming', label: 'Upcoming' };
    }

    getNextDoseTime(medication) {
        if (medication.frequency === 'as_needed') {
            return null;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // Find next dose today
        for (const timeStr of medication.times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const medicationTime = hours * 60 + minutes;

            if (medicationTime > currentTime) {
                return timeStr;
            }
        }

        // If no more doses today, return first dose tomorrow
        if (medication.times.length > 0) {
            return `Tomorrow at ${medication.times[0]}`;
        }

        return null;
    }

    getFrequencyLabel(frequency) {
        const labels = {
            'daily': 'Once Daily',
            'twice_daily': 'Twice Daily',
            'three_times': 'Three Times Daily',
            'weekly': 'Weekly',
            'as_needed': 'As Needed'
        };
        return labels[frequency] || frequency;
    }

    updateStats() {
        const totalMeds = document.getElementById('totalMeds');
        const todayTaken = document.getElementById('todayTaken');
        const adherenceRate = document.getElementById('adherenceRate');
        const progressFill = document.getElementById('progressFill');

        if (!totalMeds || !todayTaken || !adherenceRate || !progressFill) return;

        const today = new Date().toDateString();
        const todayHistory = this.medicationHistory[today] || {};

        const totalMedications = this.medications.length;
        const takenToday = Object.keys(todayHistory).filter(medId => {
            return todayHistory[medId] && todayHistory[medId].length > 0;
        }).length;

        const adherence = totalMedications > 0 ? Math.round((takenToday / totalMedications) * 100) : 0;

        totalMeds.textContent = totalMedications;
        todayTaken.textContent = takenToday;
        adherenceRate.textContent = `${adherence}%`;
        progressFill.style.width = `${adherence}%`;
    }

    // Notification Management
    checkNotificationPermission() {
        if ('Notification' in window) {
            console.log('Notification permission:', Notification.permission);
        } else {
            console.log('This browser does not support desktop notification');
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.showToast('Notifications enabled!', 'success');
                    this.hideNotificationBanner();
                } else {
                    this.showToast('Notifications permission denied', 'error');
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                this.showToast('Error enabling notifications', 'error');
            }
        }
    }

    showNotificationBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner && Notification.permission === 'default') {
            banner.classList.add('show');
        }
    }

    hideNotificationBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner) {
            banner.classList.remove('show');
        }
    }

    startNotificationTimer() {
        // Clear existing interval
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
        }

        // Check every minute
        this.notificationInterval = setInterval(() => {
            this.checkForDueMedications();
        }, 60000);

        // Also check immediately
        this.checkForDueMedications();
    }

    checkForDueMedications() {
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const today = new Date().toDateString();
        const todayHistory = this.medicationHistory[today] || {};

        this.medications.forEach(medication => {
            // Skip as-needed medications
            if (medication.frequency === 'as_needed') return;

            // Check if already taken today
            const takenToday = todayHistory[medication.id] && todayHistory[medication.id].length > 0;
            if (takenToday && medication.frequency === 'daily') return;

            // Check each scheduled time
            medication.times.forEach(timeStr => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const medicationTime = hours * 60 + minutes;

                // If current time matches medication time (within 1 minute)
                if (Math.abs(currentTime - medicationTime) <= 1) {
                    this.showMedicationNotification(medication);
                }
            });
        });
    }

    showMedicationNotification(medication) {
        try {
            const notification = new Notification(`💊 MedTracker Reminder`, {
                body: `Time to take ${medication.name} (${medication.dosage})`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>',
                tag: medication.id, // Prevent duplicate notifications
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.medTracker = new MedTracker();
});
