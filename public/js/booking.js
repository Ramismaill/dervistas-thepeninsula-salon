// SERVICE DATA STRUCTURE
const servicesData = [
    { category: "Featured", items: [
        { name: "Blow-Dry (Fön)", price: 70 },
        { name: "Hair Cut (Saç Kesim)", price: 135 },
        { name: "Collagen Treatment", price: 270 } 
    ]},
    { category: "Hair Styling & Cutting", items: [
        { name: "Owner Hair Cut", price: 180 },
        { name: "Curling Iron (Maşa)", price: 110 },
        { name: "Bun (Topuz)", price: 110 },
        { name: "Bride's Hair In Salon", price: 550 },
        { name: "Micro Welding", price: 12 }
    ]},
    { category: "Hair Coloring", items: [
        { name: "Root Coloring", price: 135 },
        { name: "Full Head Coloring", price: 240 },
        { name: "Balayage / Foils", price: 430 },
        { name: "Full Head Decoloration", price: 440 },
        { name: "Pigmentation", price: 160 }
    ]},
    { category: "Nails", items: [
        { name: "Manicure", price: 70 },
        { name: "Pedicure", price: 80 },
        { name: "Gel Polish", price: 90 },
        { name: "Nail Extension", price: 270 },
        { name: "Nail Extension Removing", price: 250 }
    ]},
    { category: "Beauty & Makeup", items: [
        { name: "Eyebrow Shaping", price: 35 },
        { name: "Eyelash/Eyebrow Lifting", price: 230 },
        { name: "Eyelash Extensions", price: 140 },
        { name: "Daily Make-Up", price: 110 },
        { name: "Night/Party Make-Up", price: 180 },
        { name: "Bridal Make-Up", price: 410 }
    ]}
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Date Picker
    flatpickr("#datePicker", {
        minDate: "today",
        dateFormat: "Y-m-d",
        disable: [
            function(date) {
                return (date.getDay() === 0); // Disable Sundays
            }
        ]
    });

    // 2. Populate Time Slots (07:00 to 23:30)
    const timeSelect = document.getElementById('timeSlot');
    let startHour = 7;
    let endHour = 23;
    
    for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            let hourStr = h.toString().padStart(2, '0');
            let minStr = m.toString().padStart(2, '0');
            let timeStr = `${hourStr}:${minStr}`;
            let option = document.createElement('option');
            option.value = timeStr;
            option.text = timeStr;
            timeSelect.appendChild(option);
        }
    }

    // 3. Render Services
    renderServices();

    // 4. Form Submission
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);

    // 5. Scroll Animations
    initializeScrollAnimations();

    // 6. Time change warning
    document.getElementById('timeSlot').addEventListener('change', checkTimeWarning);
});

function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-reveal]').forEach(el => {
        observer.observe(el);
    });
}

function toggleGuestFields(isGuest) {
    document.getElementById('guestField').style.display = isGuest ? 'flex' : 'none';
    document.getElementById('externalField').style.display = isGuest ? 'none' : 'flex';
    
    document.getElementById('roomNumber').required = isGuest;
    document.getElementById('phone').required = !isGuest;
}

function toggleServicesSection() {
    const servicesSection = document.getElementById('servicesSection');
    const toggleBtn = document.getElementById('servicesToggleBtn');
    
    if (servicesSection.style.display === 'none') {
        servicesSection.style.display = 'block';
        toggleBtn.classList.add('active');
    } else {
        servicesSection.style.display = 'none';
        toggleBtn.classList.remove('active');
    }
}

function renderServices() {
    const featuredContainer = document.getElementById('featuredServices');
    const fullMenuContainer = document.getElementById('fullMenu');

    servicesData.forEach(section => {
        if (section.category === 'Featured') {
            featuredContainer.innerHTML = section.items.map(item => createServiceItem(item)).join('');
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'service-category';
            const categoryHtml = `
                <h4>${section.category}</h4>
                <div class="service-list">
                    ${section.items.map(item => createServiceItem(item)).join('')}
                </div>
            `;
            wrapper.innerHTML = categoryHtml;
            fullMenuContainer.appendChild(wrapper);
        }
    });
}

function createServiceItem(item) {
    return `
        <label class="service-checkbox">
            <span>${item.name}</span>
            <input type="checkbox" name="services" value="${item.name}" data-price="${item.price}" onchange="updateSelectedServices()">
        </label>
    `;
}

function updateSelectedServices() {
    const checkboxes = document.querySelectorAll('input[name="services"]:checked');
    const displayDiv = document.getElementById('selectedServicesDisplay');
    
    // Update checkbox styling
    document.querySelectorAll('.service-checkbox').forEach(checkbox => {
        if (checkbox.querySelector('input').checked) {
            checkbox.classList.add('selected');
        } else {
            checkbox.classList.remove('selected');
        }
    });

    // Display selected services
    if (checkboxes.length > 0) {
        const selectedList = Array.from(checkboxes).map(cb => cb.value).join(', ');
        displayDiv.classList.add('active');
        displayDiv.innerHTML = `
            <h4>Selected Services:</h4>
            <div class="selected-services-list">
                ${Array.from(checkboxes).map(cb => `<div class="selected-service-tag">${cb.value}</div>`).join('')}
            </div>
        `;
    } else {
        displayDiv.classList.remove('active');
    }
}

function checkTimeWarning() {
    const time = document.getElementById('timeSlot').value;
    const timeWarning = document.getElementById('timeWarning');
    
    if (time) {
        const [h, m] = time.split(':').map(Number);
        const timeVal = h + (m / 60);
        
        if (timeVal < 9.0 || timeVal > 19.75) {
            timeWarning.style.display = 'block';
            timeWarning.innerText = `⚠ Selected time (${time}) incurs a double service charge.`;
        } else {
            timeWarning.style.display = 'none';
        }
    }
}

function filterServices() {
    const term = document.getElementById('serviceSearch').value.toLowerCase();
    const items = document.querySelectorAll('.service-checkbox');
    
    items.forEach(item => {
        const text = item.querySelector('span').innerText.toLowerCase();
        if (text.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    // Validation: At least one service
    const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'));
    if (selectedServices.length === 0) {
        alert("Please select at least one service.");
        return;
    }

    // Calculate total price
    let totalPrice = 0;
    selectedServices.forEach(service => {
        const price = parseFloat(service.getAttribute('data-price')) || 0;
        totalPrice += price;
    });

    const formData = {
        guest_type: document.querySelector('input[name="isGuest"]:checked').value === 'yes' ? 'hotel_guest' : 'external',
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        room_number: document.getElementById('roomNumber').value || 'N/A',
        phone_number: document.getElementById('phone').value,
        appointment_date: document.getElementById('datePicker').value,
        appointment_time: document.getElementById('timeSlot').value,
        services: selectedServices.map(s => s.value).join(', '),
        total_price_euro: totalPrice
    };

    try {
        // Send to your backend
        const response = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (response.ok || result.success) {
            // Show confirmation modal
            showConfirmationModal();
        } else {
            alert("Error: " + (result.error || result.message || "Unknown error"));
        }
    } catch (err) {
        // Even if backend fails, show confirmation modal (request was made)
        console.error("Error:", err);
        alert("Error submitting booking: " + err.message);
    }
}

function showConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.add('active');
}

function closeConfirmation() {
    window.location.href = 'index.html';
}