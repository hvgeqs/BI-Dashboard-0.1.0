const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 3000;

const TOTAL_ROOMS = 1000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 1024 * 1024 * 10 },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'uploads/tmp'),
}));
app.use(express.static('public'));

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  if (token !== '1') return res.status(403).json({ error: 'Invalid token' });
  next();
};

const customersFile = path.join(__dirname, 'public', 'customers.json');
let customers = [];

const loadCustomers = async () => {
  try {
    const data = await fs.readFile(customersFile, 'utf8');
    customers = JSON.parse(data).map(c => ({ ...c, _id: c._id || uuidv4() }));
  } catch (error) {
    console.error('Error loading customers:', error);
    customers = [];
    await saveCustomers();
  }
};

const saveCustomers = async () => {
  try {
    await fs.writeFile(customersFile, JSON.stringify(customers, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving customers:', error);
  }
};

loadCustomers();

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === '1' && password === '1') {
    res.json({ token: '1' });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const selectedYear = parseInt(year, 10);
    const selectedMonth = parseInt(month, 10) - 1;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const totalAvailableRoomNights = TOTAL_ROOMS * daysInMonth;

    const filteredBookings = customers.filter(c => {
      const arrival = new Date(c.arrival_date);
      const departure = new Date(c.departure_date);
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth, daysInMonth);
      return !isNaN(arrival.getTime()) && !isNaN(departure.getTime()) && 
             arrival <= end && departure >= start;
    });

    const weeklyOccupancy = [0, 0, 0, 0];
    const weeklyADR = [0, 0, 0, 0];
    const weeks = [[1, 7], [8, 14], [15, 21], [22, daysInMonth]];

    for (let week = 0; week < 4; week++) {
      const [startDay, endDay] = weeks[week];
      let weekRoomNights = 0;
      let weekRevenue = 0;
      const weekDays = endDay - startDay + 1;

      for (let day = startDay; day <= endDay; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        const dailyBookings = filteredBookings.filter(b => {
          const arrival = new Date(b.arrival_date);
          const departure = new Date(b.departure_date);
          return !isNaN(arrival.getTime()) && !isNaN(departure.getTime()) && 
                 arrival <= date && departure >= date;
        });
        const dailyOccupied = Math.min(dailyBookings.length, TOTAL_ROOMS);
        weekRoomNights += dailyOccupied;

        const stayLength = dailyBookings.map(b => Math.ceil((new Date(b.departure_date) - new Date(b.arrival_date)) / (1000 * 60 * 60 * 24)));
        const nightlyRates = dailyBookings.map((b, i) => parseFloat(b.total_room_price) / Math.max(1, stayLength[i] || 1));
        weekRevenue += dailyOccupied * (nightlyRates.reduce((sum, rate) => sum + (rate || 0), 0) / Math.max(1, dailyBookings.length));
      }

      const availableRoomNights = TOTAL_ROOMS * weekDays;
      weeklyOccupancy[week] = weekRoomNights > 0 ? (weekRoomNights / availableRoomNights) * 100 : 0;
      weeklyADR[week] = weekRoomNights > 0 ? weekRevenue / weekRoomNights : 0;
    }

    let totalRoomNights = 0;
    let totalRevenue = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dailyBookings = filteredBookings.filter(b => {
        const arrival = new Date(b.arrival_date);
        const departure = new Date(b.departure_date);
        return !isNaN(arrival.getTime()) && !isNaN(departure.getTime()) && 
               arrival <= date && departure >= date;
      });
      const dailyOccupied = Math.min(dailyBookings.length, TOTAL_ROOMS);
      totalRoomNights += dailyOccupied;

      const stayLength = dailyBookings.map(b => Math.ceil((new Date(b.departure_date) - new Date(b.arrival_date)) / (1000 * 60 * 60 * 24)));
      const nightlyRates = dailyBookings.map((b, i) => parseFloat(b.total_room_price) / Math.max(1, stayLength[i] || 1));
      totalRevenue += dailyOccupied * (nightlyRates.reduce((sum, rate) => sum + (rate || 0), 0) / Math.max(1, dailyBookings.length));
    }

    const occupancyRate = totalRoomNights > 0 ? (totalRoomNights / totalAvailableRoomNights) * 100 : 0;
    const adr = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

    const currentMonthArrivals = filteredBookings.filter(c => {
      const arrival = new Date(c.arrival_date);
      return !isNaN(arrival.getTime()) && arrival.getMonth() === selectedMonth && arrival.getFullYear() === selectedYear;
    }).length;
    const currentYearArrivals = filteredBookings.filter(c => {
      const arrival = new Date(c.arrival_date);
      return !isNaN(arrival.getTime()) && arrival.getFullYear() === selectedYear;
    }).length;
    const memberArrivals = filteredBookings.filter(c => c.status === 'member' && c.arrival_date).length;
    const generalArrivals = filteredBookings.filter(c => c.status === 'general' && c.arrival_date).length;
    const today = new Date(selectedYear, selectedMonth, daysInMonth);
    const todayArrivals = filteredBookings.filter(c => {
      const arrival = new Date(c.arrival_date);
      return !isNaN(arrival.getTime()) && arrival.toDateString() === today.toDateString();
    }).length;
    const todayDepartures = filteredBookings.filter(c => {
      const departure = new Date(c.departure_date);
      return !isNaN(departure.getTime()) && departure.toDateString() === today.toDateString();
    }).length;

    const guestBirthdays = customers.filter(c => {
      const birthday = new Date(c.birthday);
      return !isNaN(birthday.getTime()) && 
             birthday.getMonth() === selectedMonth && 
             birthday.getFullYear() <= selectedYear;
    }).map(c => ({
      name: c.name || 'N/A',
      room_unit: c.room_unit || 'N/A',
      birthday: c.birthday || 'N/A'
    }));

    const ageGroups = {
      Child: filteredBookings.filter(c => {
        const birthday = new Date(c.birthday);
        return !isNaN(birthday.getTime()) && calculateAge(birthday) <= 17;
      }).length,
      Adult: filteredBookings.filter(c => {
        const birthday = new Date(c.birthday);
        return !isNaN(birthday.getTime()) && calculateAge(birthday) >= 18 && calculateAge(birthday) <= 25;
      }).length,
      MiddleAge: filteredBookings.filter(c => {
        const birthday = new Date(c.birthday);
        return !isNaN(birthday.getTime()) && calculateAge(birthday) >= 26 && calculateAge(birthday) <= 64;
      }).length,
      Elder: filteredBookings.filter(c => {
        const birthday = new Date(c.birthday);
        return !isNaN(birthday.getTime()) && calculateAge(birthday) >= 65;
      }).length
    };

    const canceledBookings = filteredBookings.filter(c => c.cancellation_date && c.cancellation_date !== '' && !isNaN(new Date(c.cancellation_date).getTime())).length;
    const canceledPercentage = filteredBookings.length > 0 ? (canceledBookings / filteredBookings.length) * 100 : 0;

    const mostFrequentUnits = Object.entries(
      filteredBookings.reduce((acc, curr) => {
        acc[curr.room_unit] = (acc[curr.room_unit] || 0) + 1;
        return acc;
      }, {})
    ).map(([unit, count]) => ({ unit, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const totalIncomeMonth = filteredBookings.filter(c => {
      const arrival = new Date(c.arrival_date);
      return !isNaN(arrival.getTime()) && arrival.getMonth() === selectedMonth && arrival.getFullYear() === selectedYear;
    }).reduce((sum, curr) => sum + (parseFloat(curr.total_room_price) || 0), 0);
    const totalIncomeYear = filteredBookings.filter(c => {
      const arrival = new Date(c.arrival_date);
      return !isNaN(arrival.getTime()) && arrival.getFullYear() === selectedYear;
    }).reduce((sum, curr) => sum + (parseFloat(curr.total_room_price) || 0), 0);

    res.json({
      currentMonthArrivals,
      currentYearArrivals,
      memberArrivals,
      generalArrivals,
      todayArrivals,
      todayDepartures,
      guestBirthdays,
      ageGroups,
      canceledBookings,
      canceledPercentage,
      mostFrequentUnits,
      totalIncomeMonth,
      totalIncomeYear,
      occupancyRate,
      adr,
      weeklyOccupancy,
      weeklyADR
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function calculateAge(birthday) {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }
  return age;
}

app.get('/customers', authenticateToken, (req, res) => {
  res.json(customers);
});

app.post('/upload', authenticateToken, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.files.file;
    console.log('Uploaded file:', {
      name: file.name,
      mimetype: file.mimetype,
      size: file.size,
      tempFilePath: file.tempFilePath || 'No temp file path'
    });

    if (!file.tempFilePath || typeof file.tempFilePath !== 'string' || file.tempFilePath.trim() === '') {
      if (file.data) {
        const text = file.data.toString('utf8');
        const lines = text.trim().split('\n').map(line => line.trim());
        let customersLoaded = 0;
        let invalidLines = 0;

        for (const line of lines) {
          try {
            const [name, birthday, status, arrival_date, departure_date, room_unit, total_room_price, cancellation_date = ''] = line.split(',').map(item => item.trim());
            if (name && birthday && status && arrival_date && departure_date && room_unit && total_room_price) {
              customers.push({
                _id: uuidv4(),
                name,
                birthday,
                status,
                arrival_date,
                departure_date,
                room_unit,
                total_room_price: parseFloat(total_room_price),
                cancellation_date: cancellation_date || null
              });
              customersLoaded++;
            } else {
              invalidLines++;
            }
          } catch (error) {
            invalidLines++;
          }
        }

        await saveCustomers();
        return res.json({ customersLoaded, invalidLines });
      } else {
        throw new Error('Invalid or missing temporary file path and no file data available');
      }
    }

    try {
      await fs.access(file.tempFilePath, fs.constants.R_OK);
    } catch (error) {
      console.error('File access error:', error);
      throw new Error('Temporary file is not accessible');
    }

    const text = await fs.readFile(file.tempFilePath, 'utf8');
    const lines = text.trim().split('\n').map(line => line.trim());
    let customersLoaded = 0;
    let invalidLines = 0;

    for (const line of lines) {
      try {
        const [name, birthday, status, arrival_date, departure_date, room_unit, total_room_price, cancellation_date = ''] = line.split(',').map(item => item.trim());
        if (name && birthday && status && arrival_date && departure_date && room_unit && total_room_price) {
          customers.push({
            _id: uuidv4(),
            name,
            birthday,
            status,
            arrival_date,
            departure_date,
            room_unit,
            total_room_price: parseFloat(total_room_price),
            cancellation_date: cancellation_date || null
          });
          customersLoaded++;
        } else {
          invalidLines++;
        }
      } catch (error) {
        invalidLines++;
      }
    }

    await saveCustomers();
    res.json({ customersLoaded, invalidLines });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

app.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const customer = { ...req.body, _id: uuidv4() };
    customers.push(customer);
    await saveCustomers();
    res.status(200).send('Customer added successfully');
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/customers/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const initialLength = customers.length;
    customers = customers.filter(c => c._id !== id);
    if (customers.length < initialLength) {
      await saveCustomers();
      res.status(200).send('Customer deleted successfully');
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});