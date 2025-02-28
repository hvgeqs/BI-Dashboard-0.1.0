window.logout = function() {
  localStorage.removeItem('token');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 200);
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  const logoutButton = document.getElementById('logout-button');
  const uploadSection = document.getElementById('upload-section');
  const manualEntrySection = document.getElementById('manual-entry-section');
  const customersLink = document.getElementById('customers-link');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const mainContent = document.querySelector('.main-content');

  if (!sidebarToggle) console.error('Sidebar toggle button not found.');
  if (!sidebar) console.error('Sidebar not found.');
  if (!mainContent) console.error('Main content not found.');
  if (!logoutButton) console.error('Logout button not found.');
  if (!uploadSection) console.error('Upload section not found.');
  if (!manualEntrySection) console.error('Manual entry section not found.');
  if (!customersLink) console.error('Customers link not found.');

  if (!sidebarToggle || !sidebar || !mainContent) {
    console.error('Required sidebar elements are missing.');
    return;
  }

  if (!token) {
    if (window.location.pathname !== '/index.html') {
      window.location.href = 'index.html';
    }
  } else {
    logoutButton.style.display = 'block';
    uploadSection.style.display = 'block';
    manualEntrySection.style.display = 'block';
    customersLink.style.display = 'block';
  }

  let charts = {};

  if (token) {
    updateDashboard();

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
      console.error('Drop zone or file input not found.');
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
      console.error('Manual entry form not found.');
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
        updateDashboard();
      } else {
        alert(`Failed to add customer: ${response.status} - ${await response.text()}`);
      }
    });

    document.getElementById('year').addEventListener('change', updateDashboard);
    document.getElementById('month').addEventListener('change', updateDashboard);

    window.addEventListener('resize', () => {
      Object.values(charts).forEach(chart => {
        if (chart) chart.resize();
      });
    });
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
        updateDashboard();
      } else {
        const error = await response.text();
        alert(`Upload failed: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading.');
    }
  }

  async function updateDashboard() {
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    try {
      const response = await fetch(`/dashboard?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const formatDate = (dateStr) => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';

      const getCardDimensions = () => {
        const card = document.querySelector('.card');
        if (!card) return { width: 325, height: 245 };
        return {
          width: Math.max(325, card.offsetWidth - 25),
          height: Math.max(245, card.offsetHeight - 105)
        };
      };

      if (!charts.arrivalsChart) {
        const { width, height } = getCardDimensions();
        charts.arrivalsChart = new Chart(document.getElementById('arrivalsChart'), {
          type: 'bar',
          data: { labels: ['Selected Month', 'Selected Year'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.arrivalsChart.data.datasets = [{
        label: 'Bookings',
        data: [data.currentMonthArrivals || 0, data.currentYearArrivals || 0],
        backgroundColor: '#36A2EB'
      }];
      charts.arrivalsChart.update();

      if (!charts.memberVsGeneralChart) {
        const { width, height } = getCardDimensions();
        charts.memberVsGeneralChart = new Chart(document.getElementById('memberVsGeneralChart'), {
          type: 'pie',
          data: { labels: ['Member', 'General'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.memberVsGeneralChart.data.datasets = [{
        data: [data.memberArrivals || 0, data.generalArrivals || 0],
        backgroundColor: ['#36A2EB', '#4BC0C0']
      }];
      charts.memberVsGeneralChart.update();

      if (!charts.todayChart) {
        const { width, height } = getCardDimensions();
        charts.todayChart = new Chart(document.getElementById('todayChart'), {
          type: 'bar',
          data: { labels: ['Arrivals', 'Departures'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.todayChart.data.datasets = [{
        label: 'Today',
        data: [data.todayArrivals || 0, data.todayDepartures || 0],
        backgroundColor: ['#4BC0C0', '#FF6384']
      }];
      charts.todayChart.update();

      if (!charts.occupancyAdrChart) {
        const { width, height } = getCardDimensions();
        charts.occupancyAdrChart = new Chart(document.getElementById('occupancyAdrChart'), {
          type: 'line',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
              {
                label: 'Occupancy Rate (%)',
                data: [data.weeklyOccupancy[0] || 0, data.weeklyOccupancy[1] || 0, data.weeklyOccupancy[2] || 0, data.weeklyOccupancy[3] || 0],
                borderColor: '#36A2EB',
                fill: false,
                tension: 0.1
              },
              {
                label: 'ADR ($)',
                data: [data.weeklyADR[0] || 0, data.weeklyADR[1] || 0, data.weeklyADR[2] || 0, data.weeklyADR[3] || 0],
                borderColor: '#4BC0C0',
                fill: false,
                tension: 0.1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: {
              y: { beginAtZero: true, suggestedMax: 250, ticks: { font: { size: 10 } } },
              x: { ticks: { font: { size: 10 } } }
            },
            plugins: { title: { display: false }, legend: { position: 'top', labels: { font: { size: 10 } } } },
            layout: { padding: 0 }
          }
        });
      } else {
        const { width, height } = getCardDimensions();
        charts.occupancyAdrChart.options.width = width;
        charts.occupancyAdrChart.options.height = height;
        charts.occupancyAdrChart.data.datasets[0].data = [data.weeklyOccupancy[0] || 0, data.weeklyOccupancy[1] || 0, data.weeklyOccupancy[2] || 0, data.weeklyOccupancy[3] || 0];
        charts.occupancyAdrChart.data.datasets[1].data = [data.weeklyADR[0] || 0, data.weeklyADR[1] || 0, data.weeklyADR[2] || 0, data.weeklyADR[3] || 0];
        charts.occupancyAdrChart.resize();
        charts.occupancyAdrChart.update();
      }

      const birthdayTable = document.getElementById('guest-birthdays-table');
      console.log('Guest Birthdays Data:', data.guestBirthdays);
      if (birthdayTable) {
        const tbody = birthdayTable.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = '';
          if (data.guestBirthdays && data.guestBirthdays.length > 0) {
            console.log(`Found ${data.guestBirthdays.length} birthdays for ${month}/${year}`);
            data.guestBirthdays.forEach(b => {
              if (b.name && b.room_unit && b.birthday) {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${b.name || 'N/A'}</td>
                  <td>${b.room_unit || 'N/A'}</td>
                  <td>${b.birthday || 'N/A'}</td>
                `;
                tbody.appendChild(row);
              } else {
                console.warn('Incomplete guest birthday data:', b);
              }
            });
          } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">No birthdays this month</td>';
            tbody.appendChild(row);
            console.warn('No guest birthdays found for this month.');
          }
        } else {
          console.error('Table body not found for guest birthdays.');
        }
      } else {
        console.error('Guest birthdays table not found.');
      }

      if (!charts.ageGroupChart) {
        const { width, height } = getCardDimensions();
        charts.ageGroupChart = new Chart(document.getElementById('ageGroupChart'), {
          type: 'bar',
          data: { labels: ['Child (0-17)', 'Adult (18-25)', 'Middle Age (26-64)', 'Elder (65+)'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.ageGroupChart.data.datasets = [{
        label: 'Guests',
        data: [data.ageGroups.Child || 0, data.ageGroups.Adult || 0, data.ageGroups.MiddleAge || 0, data.ageGroups.Elder || 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0', '#FFCE56']
      }];
      charts.ageGroupChart.update();

      if (!charts.canceledBookingsChart) {
        const { width, height } = getCardDimensions();
        charts.canceledBookingsChart = new Chart(document.getElementById('canceledBookingsChart'), {
          type: 'bar',
          data: { labels: ['Canceled', 'Percentage'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.canceledBookingsChart.data.datasets = [{
        label: 'Current Month',
        data: [data.canceledBookings || 0, data.canceledPercentage || 0],
        backgroundColor: '#FF6384'
      }];
      charts.canceledBookingsChart.update();

      if (!charts.frequentUnitsChart) {
        const { width, height } = getCardDimensions();
        charts.frequentUnitsChart = new Chart(document.getElementById('frequentUnitsChart'), {
          type: 'bar',
          data: { labels: [], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.frequentUnitsChart.data.labels = (data.mostFrequentUnits || []).map(u => u.unit || '');
      charts.frequentUnitsChart.data.datasets = [{
        label: 'Bookings',
        data: (data.mostFrequentUnits || []).map(u => u.count || 0),
        backgroundColor: '#36A2EB'
      }];
      charts.frequentUnitsChart.update();

      if (!charts.incomeChart) {
        const { width, height } = getCardDimensions();
        charts.incomeChart = new Chart(document.getElementById('incomeChart'), {
          type: 'bar',
          data: { labels: ['Current Month', 'Current Year'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            width: width,
            height: height,
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } } },
            plugins: { title: { display: false } },
            layout: { padding: 0 }
          }
        });
      }
      charts.incomeChart.data.datasets = [{
        label: 'Total Income ($)',
        data: [data.totalIncomeMonth || 0, data.totalIncomeYear || 0],
        backgroundColor: '#FFCE56'
      }];
      charts.incomeChart.update();
    } catch (error) {
      console.error('Error updating dashboard:', error);
      alert(`Failed to load dashboard data: ${error.message}`);
    }
  }
});