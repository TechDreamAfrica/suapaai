// Landing Page JavaScript

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Theme Toggle
const themeToggleLanding = document.getElementById('theme-toggle-landing');
const htmlElement = document.documentElement;

// Force light mode on initial load
const savedTheme = localStorage.getItem('theme') || 'light';

// Ensure we start in the correct mode
if (savedTheme === 'dark') {
    htmlElement.classList.add('dark');
} else {
    htmlElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
}

// Theme toggle functionality
themeToggleLanding?.addEventListener('click', () => {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            mobileMenu?.classList.add('hidden');
        }
    });
});

// Carousel Functionality
let currentSlide = 0;
const carouselTrack = document.querySelector('.carousel-track');
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.carousel-indicator');
const prevBtn = document.getElementById('prev-slide');
const nextBtn = document.getElementById('next-slide');

function updateCarousel() {
    if (!carouselTrack) return;

    const slideWidth = slides[0].offsetWidth;
    carouselTrack.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

    // Update indicators
    indicators.forEach((indicator, index) => {
        if (index === currentSlide) {
            indicator.classList.remove('bg-gray-300', 'dark:bg-gray-600');
            indicator.classList.add('bg-blue-600');
        } else {
            indicator.classList.remove('bg-blue-600');
            indicator.classList.add('bg-gray-300', 'dark:bg-gray-600');
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateCarousel();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateCarousel();
}

nextBtn?.addEventListener('click', nextSlide);
prevBtn?.addEventListener('click', prevSlide);

// Indicator clicks
indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
        currentSlide = index;
        updateCarousel();
    });
});

// Auto-advance carousel
let autoAdvance = setInterval(nextSlide, 5000);

// Pause auto-advance on hover
const carouselContainer = document.getElementById('features-carousel');
carouselContainer?.addEventListener('mouseenter', () => {
    clearInterval(autoAdvance);
});

carouselContainer?.addEventListener('mouseleave', () => {
    autoAdvance = setInterval(nextSlide, 5000);
});

// Update carousel on window resize
window.addEventListener('resize', updateCarousel);

// Intersection Observer for Fade-in Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Navbar background change on scroll
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav?.classList.add('shadow-md');
    } else {
        nav?.classList.remove('shadow-md');
    }
});

// Pricing Plan Hover Effects
const pricingCards = document.querySelectorAll('#pricing > div > div > div');
pricingCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', function() {
        if (!this.classList.contains('scale-105')) {
            this.style.transform = 'translateY(0)';
        }
    });
});
