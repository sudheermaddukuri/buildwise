require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
dotenv.config();

const { connectToDatabase } = require('./config/db');
const homesRouter = require('./routes/homes');
const peopleRouter = require('./routes/people');
const onboardingRouter = require('./routes/onboarding');
const authRouter = require('./routes/auth');
const myRouter = require('./routes/my');
const templatesRouter = require('./routes/templates');
const messagesRouter = require('./routes/messages');
const fileStorageRouter = require('./routes/uploadToFileStorage');
const aiRouter = require('./routes/ai');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
{
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());
  app.use(
    cors({
      origin: function (origin, callback) {
        // allow non-browser or same-origin requests with no origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      optionsSuccessStatus: 204,
    })
  );
}
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/homes', homesRouter);
app.use('/api/people', peopleRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/my', myRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/homes', messagesRouter);
app.use('/api/file-storage', fileStorageRouter);
app.use('/api/ai', aiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 5051;

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', err);
});

(async () => {
  try {
    await connectToDatabase();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database connection failed. Server will continue to run. Reason:', err?.message || err);
  }
  app.listen(port, () => {
    console.log(`CustomHome API listening on http://localhost:${port}`);
  });
})();


