const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/groups',  require('./routes/groups'));
app.use('/api/persons', require('./routes/persons'));
app.use('/api/reports', require('./routes/reports'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Rapoarte Vestitori running on port ${PORT}`));
