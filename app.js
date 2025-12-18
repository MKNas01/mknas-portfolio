let audio; 
let transitionTimer;
let hasStarted = false; // Track if intro is active
let lastLogTime = 0; // Throttle phase logs
let globalMuted = false; // Default: Sound is ON

// Carousel Variables
let currentAngle = -45; 
const totalItems = 8; 
const anglePerItem = 360 / totalItems;

// Basic scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  2000
);
camera.position.z = 0;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
document.body.appendChild(renderer.domElement);

// World dimensions
const worldWidth = 2000;
const worldHeight = 1500;

// Star Texture
function createStarTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "white");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, size);
  return new THREE.CanvasTexture(canvas);
}
const starTexture = createStarTexture();

// Star Field
const starCount = 2000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * worldWidth;
  positions[i * 3 + 1] = (Math.random() - 0.5) * worldHeight;
  positions[i * 3 + 2] = -Math.random() * 1000 - 1;
}
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const basePositions = positions.slice();

const material = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 5,
  sizeAttenuation: true,
  map: starTexture,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthTest: false,
});
const stars = new THREE.Points(geometry, material);
scene.add(stars);

// Mouse variables
let normMouseX = 0, normMouseY = 0;
let isHover = false;
let lastColorUpdate = 0;
const colorThrottle = 16;

function updateMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  normMouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  normMouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  isHover = true;
  lastColorUpdate = Date.now();
}

renderer.domElement.addEventListener("mousemove", updateMouse);
renderer.domElement.addEventListener("mouseleave", () => {
  isHover = false;
});

// Visibility pause
let animationId = null;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (animationId) cancelAnimationFrame(animationId);
  } else if (hasStarted) {
    animate();
  }
});

// Animation loop
function animate() {
  animationId = requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  const positions = geometry.attributes.position.array;

  let velocity = 4;
  let resetDepth = 1500;

  if (hasStarted && audio && !audio.paused && audio.currentTime > 0) {
    const elapsed = audio.currentTime;
    if (Date.now() - lastLogTime > 1000) lastLogTime = Date.now();

    if (elapsed < 4.5) {
      velocity = 10; resetDepth = 2500;
    } else if (elapsed < 9) {
      velocity = 5; resetDepth = 1800;
    } else if (elapsed < 10.5) {
      velocity = 2.5; resetDepth = 1200;
    } else {
      velocity = 6; resetDepth = 2000;
    }
  }

  for (let i = 0; i < starCount; i++) {
    positions[i * 3 + 2] += velocity;
    if (positions[i * 3 + 2] > 0) {
      positions[i * 3 + 2] = -Math.random() * resetDepth - 1;
      basePositions[i * 3] = (Math.random() - 0.5) * worldWidth;
      basePositions[i * 3 + 1] = (Math.random() - 0.5) * worldHeight;
      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
    }
    if (isHover) {
      const waveX = Math.sin(time + basePositions[i * 3 + 1] * 0.01 + normMouseX * 10) * 15;
      const waveY = Math.cos(time + basePositions[i * 3] * 0.01 + normMouseY * 10) * 15;
      positions[i * 3] = basePositions[i * 3] + waveX;
      positions[i * 3 + 1] = basePositions[i * 3 + 1] + waveY;
    } else {
      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
    }
  }
  geometry.attributes.position.needsUpdate = true;

  if (isHover && Date.now() - lastColorUpdate > colorThrottle) {
    material.color.setHSL(Math.abs(normMouseX), 1, 0.5);
    lastColorUpdate = Date.now();
  } else if (!isHover) {
    material.color.set(0xffffff);
  }

  renderer.render(scene, camera);
}


// Resize Logic
let resizeTimeout;
function onResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scaleX = window.innerWidth / basePositions.length / 3;
    for (let i = 0; i < starCount; i++) {
      basePositions[i * 3] *= worldWidth / (window.innerWidth * 0.5);
      basePositions[i * 3 + 1] *= worldHeight / (window.innerHeight * 0.5);
      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
    }
    geometry.attributes.position.needsUpdate = true;
  }, 100);
}
window.addEventListener("resize", onResize);

function initAudio() {
  audio = new Audio("Audios/PS2_startup_screen_sound.mp3");
  audio.volume = 0.8;
  audio.preload = "auto";
  audio.muted = globalMuted;
  audio.addEventListener("error", (e) => console.error("Audio load failed:", e));
}

function startIntro() {
  if (hasStarted) return;
  hasStarted = true;
  audio.muted = globalMuted;
  
  animate();

  audio.play()
    .then(() => {
      transitionTimer = setTimeout(() => transitionToPortfolio(true), 15080);
    })
    .catch((e) => {
      console.error("Play failed:", e);
      transitionTimer = setTimeout(() => transitionToPortfolio(true), 15080);
    });

  const overlay = document.getElementById("start-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.style.display = "none";
  }, 300);
}

function transitionToPortfolio(saveSession = false) {
  if (transitionTimer) clearTimeout(transitionTimer);
  if (audio) {
    audio.pause();
    audio.currentTime = 0; 
  }

  if (saveSession) {
    sessionStorage.setItem('portfolio_visited', 'true');
  }

  const canvas = renderer.domElement;
  const portfolio = document.getElementById("portfolio-carousel");

  canvas.style.transition = "opacity 0.1s ease-out";
  canvas.style.opacity = "0";

  setTimeout(() => {
    canvas.style.display = "none";
    portfolio.classList.add("revealed");
    initCarousel();
    initModals();
  }, 500); 
}

function skipIntro() {
  console.log("Skipping Intro...");
  transitionToPortfolio(true);
  
  const overlay = document.getElementById("start-overlay");
  overlay.style.display = "none";
}

function initMuteToggle() {
  const toggleBtn = document.getElementById("audio-toggle");
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    globalMuted = !globalMuted;
    if (globalMuted) toggleBtn.classList.remove("active");
    else toggleBtn.classList.add("active");
    if (audio) audio.muted = globalMuted;
  });
}

function initCarousel() {
  if (document.querySelector('.carousel-rotation-direction').hasAttribute('data-init')) return;
  document.querySelector('.carousel-rotation-direction').setAttribute('data-init', 'true');

  const carousel = document.querySelector(".carousel-rotation-direction");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const navSfxPath = "Audios/audio_backward_forward_button_event.wav";
  const hoverSfxPath = "Audios/audio_card_hover_sound_effect.mp3";
  
  function playSound(path, volume = 0.5) {
    if (globalMuted) return;
    const sfx = new Audio(path);
    sfx.volume = volume;
    sfx.play().catch((e) => console.warn("Audio play blocked", e));
  }

  const translateZ = -35;
  function updateCarousel() {
    carousel.style.transform = `translateZ(${translateZ}rem) rotateY(${currentAngle}deg)`;
  }

  function goNext() {
    currentAngle -= anglePerItem;
    updateCarousel();
    playSound(navSfxPath, 0.6);
  }

  function goPrev() {
    currentAngle += anglePerItem;
    updateCarousel();
    playSound(navSfxPath, 0.6);
  }

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);

  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("portfolio-carousel").classList.contains("revealed")) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      goNext(); highlightButton(nextBtn);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      goPrev(); highlightButton(prevBtn);
    }
  });

  function highlightButton(btn) {
    btn.style.background = "rgba(100, 180, 255, 0.6)";
    btn.style.boxShadow = "0 0 20px rgba(100, 180, 255, 0.8)";
    btn.style.transform = "translateY(-50%) scale(0.95)";
    btn.style.color = "white";
    setTimeout(() => {
      btn.style.background = ""; btn.style.boxShadow = ""; btn.style.transform = ""; btn.style.color = "";
    }, 200);
  }

  const cards = document.querySelectorAll(".project-card");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => playSound(hoverSfxPath, 0.4));
  });

  updateCarousel();
}

// ---- MODAL LOGIC ----
let typingTimeout;
const modalContents = {
  about: `
    <h2>About Kabiru Muhammed Nasiru</h2>
    <p>AI Engineer & Front-End Developer (First Class Honors, 4.69/5.0 CGPA in Computer Engineering) excelling in AI-driven accessibility tools. Master JavaScript (React, Vue.js, Next.js), ML (Gemini API, TensorFlow, Computer Vision), and Flutter for on-device real-time integrations via PHP/Twig, WebSockets, and Swagger. Thrive in agile teams with CI/CD, AWS/Huawei Cloud, and Git; spearheaded award-winning PathPilot (Top 10/300+ at ISEP2.0) ideation and pitches. Ready to fuel Fintech innovation with sharp problem-solving and entrepreneurial grit.</p>
    <h3>Education</h3>
    <p>Ahmadu Bello University, Zaria - BEng. Computer Engineering (Major: Artificial Intelligence), 2018–2025, CGPA: 4.69</p>
    <h3>Certifications</h3>
    <ul>
      <li>ALXAICE Program Certificate – AI Career Essentials</li>
      <li>Huawei – HCIA Artificial Intelligence</li>
      <li>Amazon Web Service – AWS Academy Cloud Foundations</li>
      <li>GreatLearning – Introduction to Artificial Intelligence</li>
      <li>Simplilearn – Artificial Intelligence Beginners Guide</li>
      <li>HNG Finalist Certificate (Front-End Development)</li>
    </ul>
    <h3>Achievements</h3>
    <ul>
      <li>DNS Research Support Grant Winner</li>
      <li>2nd Runner-Up, ICEFE Student Enterprise Pitch (ISEC 2.0) - Awarded for PathPilot's innovative AI navigation solution (Sep 2025).</li>
      <li>Most Dedicated Award (Award of Honor & Personality Distinction) - Presented by the Department of Computer Engineering, Ahmadu Bello University Zaria (Sep 2025).</li>
    </ul>
    <h3>Skills</h3>
    <ul>
      <li>JavaScript | React | Vue.js | Next.js</li>
      <li>Machine Learning | Tensorflow | Computer Vision</li>
      <li>PHP | Twig</li>
      <li>Tailwind CSS | WebSockets | Swagger</li>
      <li>AWS | Huawei Cloud | Vercel | Render</li>
      <li>Git | GitHub | CI/CD</li>
      <li>Communication | Collaboration | Problem Solving | Technical Pitches</li>
      <li>HTML5 & CSS3 (Flexbox, Grid, Animations)</li>
      <li>TypeScript</li>
      <li>Convex</li>
    </ul>
    <h3>Contact</h3>
    <p>Email: <a href="mailto:nasirumuhammedkabiru@gmail.com">nasirumuhammedkabiru@gmail.com</a></p>
    <p>Phone: 08148038006</p>
    <p>Location: Kubwa, Abuja</p>
    <p>GitHub: <a href="https://github.com/MKNas01" target="_blank">github.com/MKNas01</a></p>
    <p>LinkedIn: <a href="https://www.linkedin.com/in/mknas/" target="_blank">linkedin.com/in/mknas</a></p>
  `,
  pathpilot: `
    <h2>PathPilot: AI-Powered Navigation Tool for Visually Impaired Users</h2>
    <p>Integrated lightweight Gemini-based obstacle detection model optimized for on-device Flutter deployment, integrating Google Maps for real-time audio feedback on hazards and enabling independent mobility in urban environments like Zaria.</p>
    <ul>
      <li>Led AI feature ideation and integration, including voice-activated triggers, motion-based auto-detection via sensors, and haptic synchronization with model outputs, enhancing hands-free navigation and reducing user interactions by 20% in prototypes.</li>
      <li>Optimized model for sub-100ms latency on low-end Android devices, incorporating multi-sensory cues like directional vibrations and POI descriptions, ensuring seamless, battery-efficient performance for safe exploration and emergency alerts.</li>
    </ul>
    <p>GitHub: <a href="https://github.com/Abdoul2146/pathpilot" target="_blank">View on GitHub</a> (Repository may be private or forthcoming)</p>
  `,
  tickify: `
    <h2>Tickify Ticket Management App</h2>
    <p>Developed a scalable ticket management web application using React, Vue.js, and Twig (PHP), integrating authentication, CRUD operations, and local data persistence.</p>
    <ul>
      <li>Collaborated with cross-functional teams in an agile workflow to design and optimize UI components, ensuring high performance and responsive layouts across frameworks.</li>
      <li>Implemented form validation, dynamic dashboards, and toast-based feedback systems to enhance usability and reliability.</li>
      <li>Gained hands-on experience with version control (Git/GitHub), CI/CD workflows, and deployment on Render, improving app scalability and maintainability.</li>
    </ul>
    <h3>Live Demos</h3>
    <ul>
      <li>React Version: <a href="https://tickify-react.netlify.app/" target="_blank">View Live</a></li>
      <li>Vue Version: <a href="https://tickify-vue.netlify.app/" target="_blank">View Live</a></li>
      <li>Twig/PHP Version: <a href="https://tickify-twig.onrender.com/" target="_blank">View Live</a></li>
    </ul>
    <h3>GitHub Repositories</h3>
    <ul>
      <li>React: <a href="https://github.com/MKNas01/tickify-react" target="_blank">View Code</a></li>
      <li>Vue: <a href="https://github.com/MKNas01/tickify-vue" target="_blank">View Code</a></li>
      <li>Twig: <a href="https://github.com/MKNas01/tickify-twig" target="_blank">View Code</a></li>
    </ul>
  `,
  surveillance: `
    <h2>Surveillance System for Car Theft Mitigation</h2>
    <p>Led the design and development of intuitive user and security web applications using Figma for wireframing and Next.js for responsive single-page applications, enabling real-time vehicle monitoring and theft alerts at Ahmadu Bello University, Zaria.</p>
    <ul>
      <li>Integrated backend APIs via Swagger documentation and WebSockets for seamless data synchronization, implementing features like vehicle registration, activity logs, searchable reports, and pop-up confirmations for exit validations.</li>
      <li>Deployed applications on Vercel with Tailwind CSS for mobile-responsive styling and secure authentication, enhancing user experience through modular dashboards, analytics visualizations, and end-to-end frontend-backend connectivity.</li>
    </ul>
    <p>GitHub: <a href="https://github.com/Cyberguru1/abu_nrf_edu_sec" target="_blank">View on GitHub</a></p>
    <p>Live Demo: <a href="https://v0-modern-campus-landing-page.vercel.app/" target="_blank">View Live</a></p>
  `,
  audiophile: `
    <h2>Audiophile E-Commerce Site</h2>
    <p>Developed Next.js 14 e-commerce platform with TypeScript, Tailwind, and Convex for dynamic product filtering and cart management.</p>
    <ul>
      <li>Implemented react-hook-form validation for checkout and SendGrid emails for anonymous order confirmations.</li>
      <li>Deployed responsive site to Netlify with Convex DB, optimizing for 98% Lighthouse score.</li>
    </ul>
    <p>Live Demo: <a href="https://audiophile-mk.netlify.app/" target="_blank">View Live</a></p>
    <p>GitHub: <a href="https://github.com/MKNas01/Audiophile" target="_blank">View Code</a></p>
  `,
  framez: `
    <h2>Framez Social Media App</h2>
    <p>Engineered React Native app with Convex auth/storage for real-time feeds, likes, comments, and profiles using Expo SecureStore.</p>
    <ul>
      <li>Added theme toggle, search filtering, and modal navigation with React Navigation v7 for gesture-based UX.</li>
      <li>Deployed production APK via EAS to Appetize.io with ImagePicker and context state for accessible interactions.</li>
    </ul>
    <p>Live Demo: <a href="https://appetize.io/app/b_mqyqayabzqe3jjvb223fp3h4ma?device=pixel7&os=15.0&scale=75" target="_blank">View Live on Appetize.io</a></p>
    <p>GitHub: <a href="https://github.com/MKNas01/framez" target="_blank">View Code</a></p>
  `,
  legalwatchdog: `
    <h2>LegalWatchDog</h2>
    <p>An AI-powered monitoring platform that automates legal and policy monitoring across jurisdictions. Tracks, summarizes, and validates real-time legal updates, turning complex data into actionable insights.</p>
    <h3>Key Benefits</h3>
    <ul>
      <li>Saves Time: No more manually checking multiple government sites</li>
      <li>Reduces Risk: Alerts ensure nothing critical is missed</li>
      <li>Increases Clarity: AI summaries simplify complex language</li>
      <li>Centralized Monitoring: Everything organized in one dashboard</li>
      <li>Better Decisions: Confidence scoring shows reliability</li>
    </ul>
    <h3>Core Features</h3>
    <ul>
      <li>Create Project: Organize monitoring into separate topics.</li>
      <li>Add Jurisdiction: Define regions or legal domains.</li>
      <li>Add Sources: Add and validate websites for AI monitoring.</li>
      <li>AI Web Monitoring: Continuously checks for updates and detects changes.</li>
      <li>AI Summarization: Converts changes into clear, structured summaries with confidence levels.</li>
    </ul>
    <p>Tech Stack: Vue.js (Frontend).</p>
    <p>GitHub (Frontend): <a href="https://github.com/emerjent/legalwatchdog-fe/" target="_blank">View Code</a></p>
  `,
  tourwidget: `
    <h2>TourWidget — Product Tours & Onboarding Made Simple</h2>
    <p>TourWidget is the easiest way to create beautiful, interactive product tours and onboarding experiences for your web application. Build tours visually in our dashboard and embed them anywhere with a single line of code.</p>
    <p>Live App: <a href="https://tourwidget.vercel.app" target="_blank">https://tourwidget.vercel.app</a></p>
    <p>Widget Script: <a href="https://tourwidget-onboarding.vercel.app/tour.js" target="_blank">https://tourwidget-onboarding.vercel.app/tour.js</a></p>
    <h3>Features</h3>
    <ul>
      <li>No-Code Editor: Create and edit tours directly from a user-friendly dashboard.</li>
      <li>Element Targeting: Highlight any element using CSS selectors (ids, classes) or data-tour attributes.</li>
      <li>Smart Positioning: Tooltips automatically position themselves (Top, Bottom, Left, Right) for the best fit.</li>
      <li>Analytics & Insights: Real-Time Data, Engagement Charts, User Metrics.</li>
    </ul>
    <h3>Tech Stack</h3>
    <ul>
      <li>Framework: Next.js 14 (App Router)</li>
      <li>Styling: Tailwind CSS & Shadcn/UI</li>
      <li>Database & Auth: Supabase</li>
      <li>State Management: Zustand</li>
      <li>Visualization: Recharts</li>
      <li>Icons: Lucide React</li>
    </ul>
    <p>GitHub: <a href="https://github.com/seyiadisa/hng-onboarding-app" target="_blank">View on GitHub</a></p>
  `,
};

function initModals() {
  const modal = document.getElementById("details-modal");
  const modalBody = document.getElementById("modal-body");
  const closeBtn = document.getElementById("close-modal");
  const detailLinks = document.querySelectorAll(".project-card a[data-modal]");

  const openSfx = "Audios/swish-sound-modal-open.mp3";
  const closeSfx = "Audios/collapse-sound-modal-close.mp3";

  function playModalSound(path) {
    if (globalMuted) return;
    const sfx = new Audio(path);
    sfx.volume = 0.5;
    sfx.play().catch(e => console.warn("Audio play blocked", e));
  }

  function typeTitle(element, text) {
    element.innerHTML = ""; 
    element.innerHTML += '<span class="modal-typing-cursor"></span>';
    const cursor = element.querySelector('.modal-typing-cursor');
    
    let i = 0;
    function type() {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text.charAt(i));
        i++;
        typingTimeout = setTimeout(type, 40); 
      } else {
        setTimeout(() => cursor.remove(), 1000);
      }
    }
    type();
  }

  detailLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      playModalSound(openSfx);
      const modalId = link.dataset.modal;
      modalBody.innerHTML = modalContents[modalId] || "<p>Details not available.</p>";
      const titleEl = modalBody.querySelector('h2');
      if (titleEl) {
        const fullText = titleEl.innerText;
        typeTitle(titleEl, fullText);
      }
      modal.classList.add("active");
    });
  });

  function closeModal() {
    if (!modal.classList.contains("active")) return;
    playModalSound(closeSfx);
    clearTimeout(typingTimeout);
    modal.classList.remove("active");
  }

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
}


document.addEventListener("DOMContentLoaded", () => {
  initAudio();
  initMuteToggle();

  // 1. Check Session Storage (Refresh Logic)
  // If user has visited this session, skip intro immediately
  if (sessionStorage.getItem('portfolio_visited') === 'true') {
    const overlay = document.getElementById("start-overlay");
    overlay.style.display = "none";
    transitionToPortfolio(false); 
  } else {
    const overlay = document.getElementById("start-overlay");
    const startBtn = document.getElementById("start-btn");
    const skipBtn = document.getElementById("skip-btn");

    overlay.addEventListener("click", startIntro);
    
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startIntro();
    });

    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      skipIntro();
    });
  }
});