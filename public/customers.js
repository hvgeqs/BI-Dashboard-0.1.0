window.logout = function() {
    localStorage.removeItem('token');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 200);
    return false;
  };
  
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
  
    const dashboardLink = document.getElementById('dashboard-link');
    const logoutButton = document.getElementById('logout-button');
    const uploadSection = document.getElementById('upload-section');
    const manualEntrySection = document.getElementById('manual-entry-section');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mainContent = document.querySelector('.main-content');
    const customersTable = document.getElementById('customers-table');
    const customerCount = document.getElementById('customer-count');
    const modal = document.getElementById('modal');
    const closeModal = document.querySelector('.close');
    const modalForm = document.getElementById('modal-form');
  
    if (!sidebarToggle) {
      console.error('Sidebar toggle button not found. Check if id="sidebar-toggle" exists in HTML.');
    }
    if (!sidebar) {
      console.error('Sidebar not found. Check if id="sidebar" exists in HTML.');
    }
    if (!mainContent) {
      console.error('Main content not found. Check if class="main-content" exists in HTML.');
    }
    if (!dashboardLink) {
      console.error('Dashboard link not found. Check if id="dashboard-link" exists in HTML.');
    }
    if (!logoutButton) {
      console.error('Logout button not found. Check if id="logout-button" exists in HTML.');
    }
    if (!uploadSection) {
      console.error('Upload section not found. Check if id="upload-section" exists in HTML.');
    }
    if (!manualEntrySection) {
      console.error('Manual entry section not found. Check if id="manual-entry-section" exists in HTML.');
    }
    if (!customersTable) {
      console.error('Customers table not found. Check if id="customers-table" exists in HTML.');
    }
    if (!customerCount) {
      console.error('Customer count not found. Check if id="customer-count" exists in HTML.');
    }
    if (!modal) {
      console.error('Modal not found. Check if id="modal" exists in HTML.');
    }
    if (!closeModal) {
      console.error('Close modal button not found. Check if class="close" exists in HTML.');
    }
    if (!modalForm) {
      console.error('Modal form not found. Check if id="modal-form" exists in HTML.');
    }
  
    if (!sidebarToggle || !sidebar || !mainContent) {
      console.error('Required sidebar elements are missing. Sidebar toggle will not function.');
      return;
    }
  
    if (!token) {
      if (window.location.pathname !== '/index.html') {
        window.location.href = 'index.html';
      }
    } else {
      dashboardLink.style.display = 'block';
      logoutButton.style.display = 'block';
      uploadSection.style.display = 'block';
      manualEntrySection.style.display = 'block';
    }
  
    let charts = {};
  
    if (token) {
      loadCustomers();
  
      sidebarToggle.addEventListener('click', () => {
        if (!sidebar || !mainContent) {
          console.error('Sidebar or main content not available for toggle.');
          return;
        }
        sidebar.classList.toggle('open');
        mainContent.classList.toggle('sidebar-open');
      });
  
      const dropZone = document.getElementById('drop-zone');
      const fileInput = document.getElementById('file-input');
  
      if (!dropZone || !fileInput) {
        console.error('Drop zone or file input not found. Check if ids "drop-zone" and "file-input" exist in HTML.');
        return;
      }
  
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/plain') {
          uploadFile(file);
        } else {
          alert('Please drop a .txt file');
        }
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
      });
  
      const manualEntryForm = document.getElementById('manual-entry-form');
      if (!manualEntryForm) {
        console.error('Manual entry form not found. Check if id="manual-entry-form" exists in HTML.');
        return;
      }
  
      manualEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customer = {
          name: document.getElementById('name').value,
          birthday: document.getElementById('birthday').value,
          status: document.getElementById('status').value,
          arrival_date: document.getElementById('arrival_date').value,
          departure_date: document.getElementById('departure_date').value,
          room_unit: document.getElementById('room_unit').value,
          total_room_price: document.getElementById('total_room_price').value,
          cancellation_date: document.getElementById('cancellation_date').value || null
        };
        const response = await fetch('/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(customer)
        });
        if (response.ok) {
          alert('Customer added successfully');
          manualEntryForm.reset();
          loadCustomers();
        } else {
          alert(`Failed to add customer: ${response.status} - ${await response.text()}`);
        }
      });
  
      const modal = document.getElementById('modal');
      const closeModal = document.querySelector('.close');
      const modalForm = document.getElementById('modal-form');
  
      if (modal && closeModal && modalForm) {
        closeModal.addEventListener('click', () => {
          modal.style.display = 'none';
        });
  
        window.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.style.display = 'none';
          }
        });
  
        modalForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const customer = {
            name: document.getElementById('modal-name').value,
            birthday: document.getElementById('modal-birthday').value,
            status: document.getElementById('modal-status').value,
            arrival_date: document.getElementById('modal-arrival_date').value,
            departure_date: document.getElementById('modal-departure_date').value,
            room_unit: document.getElementById('modal-room_unit').value,
            total_room_price: document.getElementById('modal-total_room_price').value,
            cancellation_date: document.getElementById('modal-cancellation_date').value || null
          };
          const response = await fetch('/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(customer)
          });
          if (response.ok) {
            alert('Customer added successfully');
            modal.style.display = 'none';
            modalForm.reset();
            loadCustomers();
          } else {
            alert(`Failed to add customer: ${response.status} - ${await response.text()}`);
          }
        });
      } else {
        console.error('Modal or its components not found.');
      }
  
      async function loadCustomers() {
        try {
          const response = await fetch('/customers', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const customers = await response.json();
          const tbody = customersTable.querySelector('tbody');
          if (tbody && customerCount) {
            tbody.innerHTML = '';
            customers.forEach((customer, index) => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${index + 1}</td> <!-- Sequential number starting from 1 -->
                <td>${customer.name || ''}</td>
                <td>${customer.birthday || ''}</td>
                <td>${customer.status || ''}</td>
                <td>${customer.arrival_date || ''}</td>
                <td>${customer.departure_date || ''}</td>
                <td>${customer.room_unit || ''}</td>
                <td>$${parseFloat(customer.total_room_price || 0).toFixed(2)}</td>
                <td>${customer.cancellation_date || ''}</td>
                <td>
                  <button class="edit-btn" data-id="${customer._id || index}">Edit</button>
                  <button class="delete-btn" data-id="${customer._id || index}">Delete</button>
                </td>
              `;
              tbody.appendChild(row);
            });
  
            customerCount.textContent = `Total Customers: ${customers.length}`;
  
            document.querySelectorAll('.edit-btn').forEach(button => {
              button.addEventListener('click', () => editCustomer(button.dataset.id));
            });
  
            document.querySelectorAll('.delete-btn').forEach(button => {
              button.addEventListener('click', () => deleteCustomer(button.dataset.id));
            });
          } else {
            console.error('Table body or customer count not found for customers.');
          }
        } catch (error) {
          console.error('Error loading customers:', error);
          alert('Failed to load customers. Please check your server connection or try again later.');
        }
      }
  
      async function editCustomer(id) {
        console.log('Edit customer with ID:', id);
        alert('Edit functionality not fully implemented yet.');
      }
  
      async function deleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
          try {
            const response = await fetch(`/customers/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              alert('Customer deleted successfully');
              loadCustomers();
            } else {
              alert(`Failed to delete customer: ${response.status} - ${await response.text()}`);
            }
          } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer. Please try again later.');
          }
        }
      }
  
      async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        console.log('Uploading file:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        try {
          const response = await fetch('/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          if (response.ok) {
            const { customersLoaded, invalidLines } = await response.json();
            alert(`Uploaded successfully. ${customersLoaded} customers loaded, ${invalidLines} invalid lines skipped.`);
            loadCustomers();
          } else {
            const error = await response.text();
            alert(`Upload failed: ${response.status} - ${error}`);
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert('An error occurred while uploading. Please try again later.');
        }
      }
    }
  });