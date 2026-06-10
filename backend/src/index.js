const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const { initRealtime } = require('./realtime');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const visitRoutes = require('./routes/visits');

const labsRoutes = require('./routes/labs');
const imagingRoutes = require('./routes/imaging');
const radiationRoutes = require('./routes/radiation');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const scansRoutes = require('./routes/scans');
const workflowRoutes = require('./routes/workflow');


const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);

app.use('/api/labs', labsRoutes);
app.use('/api/imaging', imagingRoutes);
app.use('/api/radiation', radiationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/scans', scansRoutes);
app.use('/api/workflow', workflowRoutes);



// Static files for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Nuclear Oncology API is running' });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initRealtime(server);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (REST + WebSocket)`);
});