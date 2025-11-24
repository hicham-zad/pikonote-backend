import { getUserIdFromToken } from "../services/authService.js";
import { StatusCodes } from "http-status-codes";

import validator from "validator";

const authenticateUser = async (req, res, next) => {
  const authorization = req.headers.authorization;

  try {
    req.user = await getUserIdFromToken(authorization);
    next();
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: error.message });
  }
};

// Validate registration data
const validateRegistration = (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check required fields
    if (!email || !password || !name) {
      throw new BadRequestError("Email, password, and name are required");
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      throw new BadRequestError("Please provide a valid email");
    }

    // Validate password length
    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters long");
    }

    // Validate name length
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new BadRequestError("Name must be at least 2 characters long");
    }

    if (trimmedName.length > 50) {
      throw new BadRequestError("Name cannot exceed 50 characters");
    }

    // Sanitize data
    req.body.email = email.toLowerCase().trim();
    req.body.name = trimmedName;

    next();
  } catch (error) {
    return res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

// Validate login data
const validateLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      throw new BadRequestError("Please provide a valid email");
    }

    // Sanitize email
    req.body.email = email.toLowerCase().trim();

    next();
  } catch (error) {
    return res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

// Validate profile update data
const validateProfileUpdate = (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    // Validate name if provided
    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        throw new BadRequestError("Name must be at least 2 characters long");
      }
      if (trimmedName.length > 50) {
        throw new BadRequestError("Name cannot exceed 50 characters");
      }
      req.body.name = trimmedName;
    }

    // Validate avatar URL if provided
    if (avatar && avatar !== null && !validator.isURL(avatar)) {
      throw new BadRequestError("Avatar must be a valid URL");
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = ['name', 'avatar'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    req.body = updateData;

    next();
  } catch (error) {
    return res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

export { 
  authenticateUser, 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate 
};