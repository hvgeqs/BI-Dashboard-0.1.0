document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  if (token && window.location.pathname !== '/index.html') {
    window.location.href = 'dashboard.html';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 200);
      } else {
        const error = await response.text();
        errorMessage.textContent = error || 'Login failed. Please check your credentials.';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.textContent = 'An error occurred. Please try again later.';
    }
  });
});