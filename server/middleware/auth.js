import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

async function protect(req, res, next) {
  let token;

  // 1. Get the token from the header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // 2. Verify JWT token (custom JWT, not Supabase Auth)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Get user from Supabase users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      throw new Error('Invalid token - user not found');
    }

    // 4. Attach user to request
    req.user = { 
        id: user.id, 
        email: user.email,
        username: user.username
    };
    
    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
}

export default protect;