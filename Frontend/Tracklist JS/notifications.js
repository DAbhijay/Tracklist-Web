// Toast notification system

function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ"
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close">×</button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  const closeToast = () => {
    toast.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.addEventListener("click", closeToast);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }

  return toast;
}

function setLoading(element, isLoading) {
  if (!element) return;
  
  if (isLoading) {
    element.classList.add("loading");
    element.disabled = true;
  } else {
    element.classList.remove("loading");
    element.disabled = false;
  }
}

function setLoadingOverlay(show) {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  
  if (show) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}
