import jwt from 'jsonwebtoken'
import userModel from '../models/User.js'

async function protect(req, res, next) {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
            req.user = await userModel.findById(decoded.id).select('-password');
            next();
        });
    }catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
}

export default protect;