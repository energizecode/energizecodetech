// Smooth scroll + active state update + auto-close mobile menu
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    if (this.hash !== '') {
      e.preventDefault();
      const target = document.querySelector(this.hash);

      // Smooth scroll
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Update active class manually
      document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
    }

    // Close mobile navbar menu when link is clicked
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('#navMenu');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      navbarToggler.click(); // Simulate click to close the menu
    }
  });
});

// Highlight active section while scrolling
window.addEventListener('scroll', () => {
  let scrollPos = window.scrollY + 120; // offset for navbar height
  document.querySelectorAll('section[id]').forEach(section => {
    if (
      scrollPos >= section.offsetTop &&
      scrollPos < section.offsetTop + section.offsetHeight
    ) {
      let id = section.getAttribute('id');
      document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
      let activeLink = document.querySelector('.nav-link[href="#' + id + '"]');
      if (activeLink) activeLink.classList.add('active');
    }
  });
});

// Set footer year dynamically
document.addEventListener('DOMContentLoaded', function () {
  try {
    var yearEl = document.getElementById('footer-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  } catch (e) {
    // fail silently
    console.error('Error setting footer year', e);
  }

  // Load dynamic projects from localStorage
  loadDynamicProjects();
});

// ========================
// IndexedDB Functions
// ========================
const DB_NAME = 'EnergizeCodeDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

async function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject('Failed to open IndexedDB');
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getAllProjectsFromDB() {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject('Failed to get projects');
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// ========================
// Dynamic Projects Loader
// ========================
// Load projects from IndexedDB and populate the projects section
async function loadDynamicProjects() {
  const projects = await getAllProjectsFromDB();

  if (projects.length === 0) {
    console.log('No projects found in IndexedDB. Keeping static projects as displayed.');
    return;
  }

  const projectsContainer = document.querySelector('#projects .row.g-4');
  if (!projectsContainer) {
    console.warn('Projects container not found.');
    return;
  }

  // Append dynamic projects AFTER existing static ones (don't clear)
  projects.forEach((project, index) => {
    const delay = index * 80; // staggered AOS delay
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    col.setAttribute('data-aos', 'fade-up');
    col.setAttribute('data-aos-delay', delay);

    // Use data URLs directly (already stored)
    const previewVideoUrl = project.videoUrl || '';
    const modalVideoUrl = project.modalVideoUrl || '';
    const posterUrl = project.posterUrl || '';

    // Use an <img> tag for GIF previews, otherwise use a <video> preview
    const isGifPreview = typeof previewVideoUrl === 'string' && previewVideoUrl.match(/\.gif$/i);
    const mediaHtml = isGifPreview
      ? `<img class="project-preview" src="${previewVideoUrl}" alt="${project.title} preview" loading="lazy">`
      : `<video class="project-preview" autoplay muted loop playsinline poster="${posterUrl}">
           <source src="${previewVideoUrl}" type="video/mp4">
         </video>`;

    col.innerHTML = `
      <div class="project-card shadow-lg">
        <div class="media-wrap">
          ${mediaHtml}
        </div>
        <div class="project-overlay">
          <h5 class="mb-2">${project.title}</h5>
          <p class="small mb-3">${project.description}</p>
          <div class="d-flex gap-2">
            <button class="btn btn-warning btn-sm view-project" 
              data-title="${project.title}"
              data-description="${project.fullDescription}"
              data-features='${JSON.stringify(project.features)}'
              data-tech='${JSON.stringify(project.tech)}'
              data-challenges='${JSON.stringify(project.challenges)}'
              data-video="${modalVideoUrl}"
            >View Project</button>
            <a href="${project.websiteLink}" target="_blank" class="btn btn-outline-light btn-sm">Visit Website</a>
          </div>
        </div>
      </div>
    `;

    projectsContainer.appendChild(col);
  });

  // Reinitialize AOS for newly added elements
  try {
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  } catch (e) {
    console.warn('AOS refresh not available', e);
  }

  // Reattach modal handlers to new buttons
  attachProjectModalHandlers();
}

// Attach modal handlers to dynamically created .view-project buttons
function attachProjectModalHandlers() {
  const projectModal = document.getElementById('projectModal');
  const modalTitle = document.getElementById('projectModalLabel');
  const modalVideo = document.getElementById('modalVideo');
  const modalDescription = document.getElementById('modalDescription');
  const modalFeatures = document.getElementById('modalFeatures');
  const modalTech = document.getElementById('modalTech');
  const modalChallenges = document.getElementById('modalChallenges');

  document.querySelectorAll('.view-project').forEach(btn => {
    // Remove old listener by cloning (prevents duplicate listeners)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', function (e) {
      e.preventDefault();
      
      const title = this.dataset.title || '';
      const description = this.dataset.description || '';
      const features = JSON.parse(this.dataset.features || '[]');
      const tech = JSON.parse(this.dataset.tech || '[]');
      const challenges = JSON.parse(this.dataset.challenges || '[]');
      const videoSrc = this.dataset.video || '';

      if (modalTitle) modalTitle.textContent = title;
      if (modalDescription) modalDescription.textContent = description;
      if (modalFeatures) {
        modalFeatures.innerHTML = '';
        features.forEach(f => { const li = document.createElement('li'); li.textContent = f; modalFeatures.appendChild(li); });
      }
      if (modalTech) modalTech.textContent = tech.join(', ');
      if (modalChallenges) {
        modalChallenges.innerHTML = '';
        challenges.forEach(c => { const li = document.createElement('li'); li.textContent = c; modalChallenges.appendChild(li); });
      }

      if (modalVideo) {
        modalVideo.pause();
        modalVideo.querySelector('source').src = videoSrc;
        modalVideo.load();
        setTimeout(() => modalVideo.play().catch(() => {}), 300);
      }

      // Remove all stray backdrops
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      
      // Remove modal-open from body and show fresh
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      
      // Create fresh instance and show
      try {
        const bsModal = new bootstrap.Modal(projectModal, { backdrop: true });
        bsModal.show();
      } catch (err) {
        console.error('Modal error:', err);
      }
    });
  });

  // Clean up on close
  projectModal.addEventListener('hidden.bs.modal', function () {
    // Remove lingering backdrops
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.src = '';
      if (modalVideo.querySelector('source')) {
        modalVideo.querySelector('source').src = '';
      }
      modalVideo.load();
    }
  });
}

// ------------------------
// EmailJS integration (using direct API calls)
// ------------------------
const EMAILJS_USER_ID = 'MUBmSWByUs5C1Iak2';
const EMAILJS_SERVICE_ID = 'service_a4d7zqo';
const TEMPLATE_OWNER_ID = 'template_x77yi1t';
const TEMPLATE_AUTO_ID = 'template_9f7rgkg';
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('contact-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const templateParams = {
      user_name: contactForm.user_name.value || '',
      user_email: contactForm.user_email.value || '',
      message: contactForm.message.value || ''
    };

    // First: send contact message to owner
    const ownerRequest = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: TEMPLATE_OWNER_ID,
      user_id: EMAILJS_USER_ID,
      template_params: templateParams
    };

    fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ownerRequest)
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to send owner email');
        }
        // After owner email is sent, send autoresponse to submitter
        // Note: Auto-reply template uses "email" variable instead of "user_email"
        const autoReplyParams = {
          user_name: templateParams.user_name,
          email: templateParams.user_email  // Map user_email to email for auto-reply template
        };

        const autoReplyRequest = {
          service_id: EMAILJS_SERVICE_ID,
          template_id: TEMPLATE_AUTO_ID,
          user_id: EMAILJS_USER_ID,
          template_params: autoReplyParams
        };

        return fetch(EMAILJS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(autoReplyRequest)
        });
      })
      .then(function (response) {
        if (response.ok) {
          alert('Message sent successfully! You will receive an autoresponse shortly.');
          contactForm.reset();
        } else {
          throw new Error('Failed to send autoresponse');
        }
      })
      .catch(function (err) {
        console.error('Email error:', err);
        alert('Failed to send message. Please try again or contact us via WhatsApp.');
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      });
  });
});

// Toggle WhatsApp sticky icon visibility based on Contact section position
window.addEventListener('scroll', () => {
  const contactSection = document.getElementById('contact');
  const whatsappIcon = document.querySelector('.whatsapp-sticky');
  
  if (contactSection && whatsappIcon) {
    const contactTop = contactSection.offsetTop;
    const scrollPos = window.scrollY + 100; // Add buffer for nav height
    
    // Hide icon when Contact section is reached
    if (scrollPos >= contactTop) {
      whatsappIcon.classList.add('hidden');
      whatsappIcon.classList.remove('visible');
    } else {
      whatsappIcon.classList.remove('hidden');
      whatsappIcon.classList.add('visible');
    }
  }
}, { passive: true });

// ------------------------
// AOS (Animate On Scroll) initialization and Project modal logic
// ------------------------
document.addEventListener('DOMContentLoaded', function () {
  // Initialize AOS if available
  try {
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, once: true, easing: 'ease-in-out' });
    }
  } catch (e) {
    console.warn('AOS not available', e);
  }

  // Modal DOM references
  const projectModal = document.getElementById('projectModal');
  const modalTitle = document.getElementById('projectModalLabel');
  const modalVideo = document.getElementById('modalVideo');
  const modalDescription = document.getElementById('modalDescription');
  const modalFeatures = document.getElementById('modalFeatures');
  const modalTech = document.getElementById('modalTech');
  const modalChallenges = document.getElementById('modalChallenges');

  // Attach click handlers to View Project buttons
  document.querySelectorAll('.view-project').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const title = this.dataset.title || '';
      const description = this.dataset.description || '';
      const features = JSON.parse(this.dataset.features || '[]');
      const tech = JSON.parse(this.dataset.tech || '[]');
      const challenges = JSON.parse(this.dataset.challenges || '[]');
      const videoSrc = this.dataset.video || '';

      // Populate modal
      if (modalTitle) modalTitle.textContent = title;
      if (modalDescription) modalDescription.textContent = description;
      if (modalFeatures) {
        modalFeatures.innerHTML = '';
        features.forEach(f => { const li = document.createElement('li'); li.textContent = f; modalFeatures.appendChild(li); });
      }
      if (modalTech) modalTech.textContent = tech.join(', ');
      if (modalChallenges) {
        modalChallenges.innerHTML = '';
        challenges.forEach(c => { const li = document.createElement('li'); li.textContent = c; modalChallenges.appendChild(li); });
      }

      // Set modal video src and play
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.querySelector('source').src = videoSrc;
        modalVideo.load();
        setTimeout(() => modalVideo.play().catch(() => {}), 300);
      }

      // Show modal (Bootstrap)
      try {
        const bsModal = new bootstrap.Modal(projectModal);
        bsModal.show();
      } catch (err) {
        console.error('Bootstrap modal error', err);
      }
    });
  });

  // Pause modal video when modal is closed
  if (projectModal) {
    projectModal.addEventListener('hidden.bs.modal', function () {
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.querySelector('source').src = '';
        modalVideo.load();
      }
    });
  }
});
