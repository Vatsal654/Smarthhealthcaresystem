const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const doctorRoutes = require('./routes/doctor.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const chatRoutes = require('./routes/chat.routes');
const videoRoutes = require('./routes/video.routes');
const aiRoutes = require('./routes/ai.routes');
const mapsRoutes = require('./routes/maps.routes');
const profileRoutes = require('./routes/profile.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins =
  process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()) || [
    'http://localhost:3000',
  ];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'shs-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
