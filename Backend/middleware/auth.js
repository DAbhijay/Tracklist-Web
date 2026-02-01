const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Demo user credentials (always available)
const DEMO_USER = {
  username: 'demo',
  password: 'demo123', // Plain text for demo, will be checked directly
  isDemo: true
};

const FAMILY_USERS = process.env.FAMILY_USERS ? 
  process.env.FAMILY_USERS.split(',').map(user => {
    const [username, hashedPassword] = user.split(':');
    return { username, hashedPassword, isDemo: false };
  }) : [];

/**
 * Login handler - validates credentials and returns JWT
 */
async function login(username, password) {
  // Check demo user
  if (username === DEMO_USER.username && password === DEMO_USER.password) {
    const token = jwt.sign(
      { username: DEMO_USER.username, isDemo: true },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return {
      success: true,
      token,
      user: {
        username: DEMO_USER.username,
        isDemo: true
      }
    };
  }

  // Check family users
  const user = FAMILY_USERS.find(u => u.username === username);
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
  if (!isValidPassword) {
    return { success: false, error: 'Invalid credentials' };
  }

  const token = jwt.sign(
    { username: user.username, isDemo: false },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    success: true,
    token,
    user: {
      username: user.username,
      isDemo: false
    }
  };
}

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware to check if user is demo user
 */
function isDemoUser(req) {
  return req.user && req.user.isDemo === true;
}

/**
 * Utility to hash password (for setup)
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

module.exports = {
  login,
  authenticateToken,
  isDemoUser,
  hashPassword
};