import jwt from "jsonwebtoken";
import { UnAuthenticatedError } from "../errors/index.js";
import User from "../models/User.js";

// Service function to get user from JWT token
const getUserIdFromToken = async (token) => {
  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    // Check if user exists
    if (!user) {
      throw new UnAuthenticatedError("User not found");
    }

    return user;
  } catch (error) {
    console.error("Error decoding token:", error);
    throw new UnAuthenticatedError("Invalid Token");
  }
};

export { getUserIdFromToken };