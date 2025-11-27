import supabase from "../config/supabase.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

//Register a new user
async function registerUser(req, res) {
  const { username, email, password } = req.body;
  try {
    // 1. Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create user in Supabase users table
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ 
        username, 
        email, 
        password_hash: passwordHash 
      }])
      .select()
      .single();

    if (error) {
      console.error("Registration error:", error);
      return res.status(400).json({ message: "Failed to create user" });
    }

    if (user) {
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
}

//Login user
async function loginUser(req, res) {
  const { email, password } = req.body;
  try {
    // 1. Find user by email with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (isMatch) {
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error", error.message);
    res.status(500).json({ message: "Server error" });
  }
}

// getMe - Get user profile
async function getMe(req, res) {
  try {
    // req.user.id is set by auth middleware
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .eq('id', req.user.id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error("Get user error:", error.message);
    res.status(404).json({ message: "User Not Found" });
  }
}

export { registerUser, loginUser, getMe };
