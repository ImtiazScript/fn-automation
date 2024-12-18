//? ===================================================== Admin Routes =====================================================
import express from "express";
// Reference: https://www.npmjs.com/package/base-auth-handler
import { requireAuth, validateRequest } from "base-auth-handler";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
import verifyActiveUser from "../../middlewares/verifyActiveUserMiddleware.js";
import { multerUploadUserProfile } from "../../config/multerConfig.js";
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
  activateUser,
  updateFnServiceCompanyAdmin,
  deleteUser,
  getAllActiveProviders,
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
  .put(
    requireAuth,
    verifyAdmin,
    multerUploadUserProfile.single("profileImage"),
    updateAdminProfile
  );

//* ==================== Admin User Management Routes ====================
router.post("/get-users/page/:page", requireAuth, verifyActiveUser, verifyAdmin, getAllUsers);
router.patch("/activate-user", requireAuth, verifyActiveUser, verifyAdmin, adminUserBlockingDataValidation, validateRequest, activateUser);
router.patch("/block-user", requireAuth, verifyActiveUser, verifyAdmin, adminUserBlockingDataValidation, validateRequest, blockUser);
router.patch("/unblock-user", requireAuth, verifyActiveUser, verifyAdmin, adminUserBlockingDataValidation, validateRequest, unBlockUser);
router.put("/update-user", requireAuth, verifyActiveUser, verifyAdmin, adminUserUpdateDataValidation, validateRequest, updateUserData);
router.put("/update-admin/:userId", requireAuth, verifyActiveUser, verifyAdmin, validateRequest, updateFnServiceCompanyAdmin);
router.delete("/delete-user/:userId", requireAuth, verifyActiveUser, verifyAdmin, validateRequest, deleteUser);
router.get("/get-providers", requireAuth, verifyActiveUser, verifyAdmin, getAllActiveProviders);

export default router;
