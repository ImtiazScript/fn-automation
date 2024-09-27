//? ===================================================== User Routes =====================================================
import express from "express";
// Reference: https://www.npmjs.com/package/base-auth-handler
import { requireAuth, validateRequest } from "base-auth-handler";
import verifyUser from "../../middlewares/verifyUserMiddleware.js";
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  fetchUserContext,
} from "../../controllers/userController.js";
import { userSignUpDataValidation, userSignInDataValidation } from "./backendDataValidationConfig.js";
import { multerUploadUserProfile } from "../../config/multerConfig.js";
const router = express.Router();

//* ==================== Authentication Routes ====================
router.post("/", userSignUpDataValidation, validateRequest, registerUser);
router.post("/auth", userSignInDataValidation, validateRequest, authUser);
router.post("/logout", logoutUser);

//* ==================== Reset password Routes ====================
router.post("/forgot-password", validateRequest, forgotPassword);
router.post("/reset-password", validateRequest, resetPassword);

//* ==================== Onboarding ====================
router.get("/user-context", validateRequest, verifyUser, fetchUserContext);

//* ==================== User Profile Routes ====================
router
  .route("/profile")
  .get(requireAuth, verifyUser, getUserProfile)
  .put(
    requireAuth,
    verifyUser,
    multerUploadUserProfile.single("profileImage"),
    updateUserProfile
  );

export default router;
