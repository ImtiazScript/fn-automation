//? ===================================================== Admin Routes =====================================================
import express from "express";
// Reference: https://www.npmjs.com/package/base-auth-handler
import { requireAuth, validateRequest } from "base-auth-handler";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
import {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAllUsers,
  updateUserData,
  blockUser,
  unBlockUser,
} from "../../controllers/adminController.js";
import {
  adminSignInDataValidation,
  adminSignUpDataValidation,
  adminUserBlockingDataValidation,
  adminUserUpdateDataValidation,
} from "./backendDataValidationConfig.js";
const router = express.Router();

//* ==================== Authentication Routes ====================
router.post("/", adminSignUpDataValidation, validateRequest, registerAdmin);
router.post("/auth", adminSignInDataValidation, validateRequest, authAdmin);
router.post("/logout", logoutAdmin);

//* ==================== Admin Profile Routes ====================
router
  .route("/profile")
  .get(requireAuth, verifyAdmin, getAdminProfile)
  .put(requireAuth, verifyAdmin, updateAdminProfile);

//* ==================== Admin User Management Routes ====================
router.post("/get-users", requireAuth, verifyAdmin, getAllUsers);
router.patch("/block-user", requireAuth, verifyAdmin, adminUserBlockingDataValidation, validateRequest, blockUser);
router.patch("/unblock-user", requireAuth, verifyAdmin, adminUserBlockingDataValidation, validateRequest, unBlockUser);
router.put("/update-user", requireAuth, verifyAdmin, adminUserUpdateDataValidation, validateRequest, updateUserData);

export default router;
