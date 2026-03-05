// ========================
// Admin Project Manager
// ========================
// Using IndexedDB for storage (50MB+ limit instead of localStorage 5-10MB limit)
const DB_NAME = 'EnergizeCodeDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

// Initialize IndexedDB
function initializeDB() {
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

// Get all projects from IndexedDB
async function getAllProjects() {
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

// Save projects to IndexedDB
async function saveProjects(projects) {
  try {
    const db = await initializeDB();
    
    // Check available storage quota
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      console.log(`Storage used: ${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear old data
      const clearRequest = store.clear();
      clearRequest.onerror = () => {
        console.error('Clear error:', clearRequest.error);
        reject('Failed to clear existing projects');
      };
      
      // Add new projects one by one
      let addedCount = 0;
      projects.forEach((project, index) => {
        const addRequest = store.add(project);
        addRequest.onerror = () => {
          console.error(`Error adding project ${index}:`, addRequest.error);
          reject(`Failed to add project: ${addRequest.error}`);
        };
        addRequest.onsuccess = () => {
          addedCount++;
          console.log(`Project ${addedCount}/${projects.length} added`);
        };
      });
      
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject('Failed to save projects: ' + transaction.error);
      };
      
      transaction.oncomplete = () => {
        console.log('All projects saved successfully');
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Error saving projects:', error);
    throw error;
  }
}

// Delete single project from IndexedDB
async function deleteProjectFromDB(id) {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onerror = () => reject('Failed to delete project');
      request.onsuccess = () => resolve(true);
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  initializeAdmin();
});

function initializeAdmin() {
  // Attach form submit handler
  const form = document.getElementById('add-project-form');
  if (form) {
    form.addEventListener('submit', handleAddProject);
  }

  // Attach array input buttons
  document.getElementById('addFeatureBtn')?.addEventListener('click', () => addArrayItem('featureInput', 'featuresList'));
  document.getElementById('addTechBtn')?.addEventListener('click', () => addArrayItem('techInput', 'techList'));
  document.getElementById('addChallengeBtn')?.addEventListener('click', () => addArrayItem('challengeInput', 'challengesList'));

  // Allow Enter key in array inputs
  document.getElementById('featureInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addArrayItem('featureInput', 'featuresList'); }
  });
  document.getElementById('techInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addArrayItem('techInput', 'techList'); }
  });
  document.getElementById('challengeInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addArrayItem('challengeInput', 'challengesList'); }
  });

  // File upload handlers
  document.getElementById('projectVideoFile')?.addEventListener('change', handleVideoFileChange);
  document.getElementById('projectModalVideoFile')?.addEventListener('change', handleModalVideoFileChange);
  document.getElementById('projectPoster')?.addEventListener('change', handlePosterFileChange);

  // Load and display existing projects
  displayProjects();
}

// Handle video file selection
function handleVideoFileChange(e) {
  const file = e.target.files[0];
  if (file) {
    const fileNameEl = document.getElementById('videoFileName');
    fileNameEl.textContent = `✓ Selected: ${file.name} (${(file.size / (1024*1024)).toFixed(2)}MB)`;
    fileNameEl.style.display = 'block';
  }
}

// Handle modal video file selection
function handleModalVideoFileChange(e) {
  const file = e.target.files[0];
  if (file) {
    const fileNameEl = document.getElementById('modalVideoFileName');
    fileNameEl.textContent = `✓ Selected: ${file.name} (${(file.size / (1024*1024)).toFixed(2)}MB)`;
    fileNameEl.style.display = 'block';
  }
}

// Handle poster image file selection
function handlePosterFileChange(e) {
  const file = e.target.files[0];
  if (file) {
    const fileNameEl = document.getElementById('posterFileName');
    fileNameEl.textContent = `✓ Selected: ${file.name}`;
    fileNameEl.style.display = 'block';
  }
}

// Convert file to Blob (more efficient than Base64)
function fileToBlob(file) {
  return Promise.resolve(file);
}

// Convert Blob back to data URL on-the-fly (only when needed)
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Add item to array (features, tech, challenges)
function addArrayItem(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const value = input.value.trim();

  if (!value) {
    alert('Please enter a value.');
    return;
  }

  if (!list.querySelector(`[data-value="${value}"]`)) {
    const item = document.createElement('span');
    item.className = 'array-item';
    item.dataset.value = value;
    item.innerHTML = `${value} <span class="remove-item" onclick="this.parentElement.remove()">✕</span>`;
    list.appendChild(item);
    input.value = '';
  } else {
    alert('This item already exists.');
  }
}

// Get array values from list
function getArrayValues(listId) {
  const list = document.getElementById(listId);
  return Array.from(list.querySelectorAll('.array-item')).map(item => item.dataset.value);
}

// Handle Add Project form submission
async function handleAddProject(e) {
  e.preventDefault();

  // Get form values
  const title = document.getElementById('projectTitle').value.trim();
  const description = document.getElementById('projectDescription').value.trim();
  const fullDescription = document.getElementById('projectFullDescription').value.trim();
  const videoFile = document.getElementById('projectVideoFile').files[0];
  const modalVideoFile = document.getElementById('projectModalVideoFile').files[0];
  const posterFile = document.getElementById('projectPoster').files[0];
  const websiteLink = document.getElementById('projectLink').value.trim() || '#';

  const features = getArrayValues('featuresList');
  const tech = getArrayValues('techList');
  const challenges = getArrayValues('challengesList');

  // Validation
  if (!videoFile) {
    showAlert('Please select a preview video file.', 'warning');
    return;
  }

  if (!modalVideoFile) {
    showAlert('Please select a detailed video file.', 'warning');
    return;
  }

  if (!features.length || !tech.length || !challenges.length) {
    showAlert('Please add at least one feature, technology, and challenge.', 'warning');
    return;
  }

  try {
    showAlert('Processing files... This may take a moment.', 'info');
    
    console.log('File sizes:', {
      previewVideo: (videoFile.size / 1024 / 1024).toFixed(2) + 'MB',
      modalVideo: (modalVideoFile.size / 1024 / 1024).toFixed(2) + 'MB',
      poster: posterFile ? (posterFile.size / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'
    });

    // Read files as data URLs
    const videoUrl = await blobToDataUrl(videoFile);
    const modalVideoUrl = await blobToDataUrl(modalVideoFile);
    const posterUrl = posterFile ? await blobToDataUrl(posterFile) : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22400%22%3E%3Crect fill=%22%23333%22 width=%22600%22 height=%22400%22/%3E%3C/svg%3E';

    console.log('Files converted to URLs');

    // Create project object with both videos
    const project = {
      id: Date.now(),
      title,
      description,
      fullDescription,
      videoUrl, // Preview video (autoplay on card)
      modalVideoUrl, // Detailed video (shown in modal)
      posterUrl,
      websiteLink,
      features,
      tech,
      challenges,
      createdAt: new Date().toISOString()
    };

    console.log('Saving project to IndexedDB...');
    
    // Save to IndexedDB
    const projects = await getAllProjects();
    projects.push(project);
    await saveProjects(projects);

    console.log('Project saved successfully');

    // Reset form and refresh display
    document.getElementById('add-project-form').reset();
    document.getElementById('featuresList').innerHTML = '';
    document.getElementById('techList').innerHTML = '';
    document.getElementById('challengesList').innerHTML = '';
    document.getElementById('videoFileName').style.display = 'none';
    document.getElementById('modalVideoFileName').style.display = 'none';
    document.getElementById('posterFileName').style.display = 'none';

    showAlert('Project added successfully! 🎉', 'success');
    await displayProjects();
  } catch (error) {
    console.error('Error processing files:', error);
    showAlert('Error: ' + error.message, 'danger');
  }
}

// Get all projects from IndexedDB
async function getAllProjects() {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => {
        console.error('Get all error:', request.error);
        reject('Failed to get projects: ' + request.error);
      };
      request.onsuccess = () => {
        console.log('Retrieved projects:', request.result.length);
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Display all projects in the list
async function displayProjects() {
  try {
    const projects = await getAllProjects();
    const container = document.getElementById('projectsContainer');
    const count = document.getElementById('projectCount');

    count.textContent = projects.length;

    if (projects.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-5">No projects yet. Add one above to get started!</p>';
      return;
    }

    container.innerHTML = projects.map(project => `
      <div class="project-card shadow-lg admin-card" data-id="${project.id}">
        <div class="media-wrap">
          <img class="project-preview" src="${project.posterUrl || project.videoUrl || 'assets/images/placeholder.jpg'}" alt="${project.title} preview" loading="lazy">
        </div>
        <div class="project-card-header">${project.title}</div>
        <div class="project-overlay">
          <h5 class="mb-2">${project.title}</h5>
          <p class="small mb-3">${project.description}</p>
          <div class="d-flex gap-2">
            <button class="btn btn-warning btn-sm" onclick="editProject(${project.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject(${project.id})"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error displaying projects:', error);
  }
}

// Delete project
async function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  
  try {
    await deleteProjectFromDB(id);
    showAlert('Project deleted.', 'info');
    displayProjects();
  } catch (error) {
    console.error('Error deleting project:', error);
    showAlert('Error deleting project.', 'danger');
  }
}

// Edit project (populate form with existing data)
async function editProject(id) {
  try {
    const projects = await getAllProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Populate form
    document.getElementById('projectTitle').value = project.title;
    document.getElementById('projectDescription').value = project.description;
    document.getElementById('projectFullDescription').value = project.fullDescription;
    document.getElementById('projectLink').value = project.websiteLink;

    // File inputs: clear them (user can re-upload if needed)
    document.getElementById('projectVideoFile').value = '';
    document.getElementById('projectModalVideoFile').value = '';
    document.getElementById('projectPoster').value = '';
    document.getElementById('videoFileName').textContent = '(Current: preview video stored)';
    document.getElementById('videoFileName').style.display = 'block';
    document.getElementById('modalVideoFileName').textContent = '(Current: detailed video stored)';
    document.getElementById('modalVideoFileName').style.display = 'block';
    document.getElementById('posterFileName').textContent = '(Current: poster stored)';
    document.getElementById('posterFileName').style.display = 'block';

    // Populate arrays
    populateArrayDisplay('featuresList', project.features);
    populateArrayDisplay('techList', project.tech);
    populateArrayDisplay('challengesList', project.challenges);

    // Change button to Update and add Delete
    const form = document.getElementById('add-project-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<i class="fas fa-sync me-2"></i> Update Project';
    submitBtn.dataset.editId = id;

    form.onsubmit = function (e) {
      e.preventDefault();
      handleUpdateProject(id);
      submitBtn.innerHTML = originalText;
      delete submitBtn.dataset.editId;
      form.onsubmit = handleAddProject;
    };

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error editing project:', error);
    showAlert('Error loading project.', 'danger');
  }
}

// Handle update project
async function handleUpdateProject(id) {
  const projects = await getAllProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return;

  try {
    const videoFile = document.getElementById('projectVideoFile').files[0];
    const modalVideoFile = document.getElementById('projectModalVideoFile').files[0];
    const posterFile = document.getElementById('projectPoster').files[0];

    // Convert new files if uploaded, otherwise keep existing
    let videoUrl = projects[index].videoUrl;
    let modalVideoUrl = projects[index].modalVideoUrl;
    let posterUrl = projects[index].posterUrl;

    if (videoFile) {
      videoUrl = await blobToDataUrl(videoFile);
    }
    if (modalVideoFile) {
      modalVideoUrl = await blobToDataUrl(modalVideoFile);
    }
    if (posterFile) {
      posterUrl = await blobToDataUrl(posterFile);
    }

    // Update project
    projects[index] = {
      ...projects[index],
      title: document.getElementById('projectTitle').value.trim(),
      description: document.getElementById('projectDescription').value.trim(),
      fullDescription: document.getElementById('projectFullDescription').value.trim(),
      videoUrl,
      modalVideoUrl,
      posterUrl,
      websiteLink: document.getElementById('projectLink').value.trim() || '#',
      features: getArrayValues('featuresList'),
      tech: getArrayValues('techList'),
      challenges: getArrayValues('challengesList')
    };

    await saveProjects(projects);
    showAlert('Project updated! 🎉', 'success');

    // Reset form
    document.getElementById('add-project-form').reset();
    document.getElementById('featuresList').innerHTML = '';
    document.getElementById('techList').innerHTML = '';
    document.getElementById('challengesList').innerHTML = '';
    document.getElementById('videoFileName').style.display = 'none';
    document.getElementById('modalVideoFileName').style.display = 'none';
    document.getElementById('posterFileName').style.display = 'none';
    await displayProjects();
  } catch (error) {
    console.error('Error updating project:', error);
    showAlert('Error updating project: ' + error.message, 'danger');
  }
}

// Populate array display for editing
function populateArrayDisplay(listId, items) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  items.forEach(value => {
    const item = document.createElement('span');
    item.className = 'array-item';
    item.dataset.value = value;
    item.innerHTML = `${value} <span class="remove-item" onclick="this.parentElement.remove()">✕</span>`;
    list.appendChild(item);
  });
}

// Show alert messages
function showAlert(message, type = 'info') {
  const alertDiv = document.getElementById('formAlert');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertDiv.style.display = 'block';

  setTimeout(() => {
    alertDiv.style.display = 'none';
  }, 5000);
}
