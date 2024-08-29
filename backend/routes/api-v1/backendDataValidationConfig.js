import { body } from "express-validator";

// ============================= User Routes Data Validation =============================

const userSignUpDataValidation = [
  body("name").trim().notEmpty().withMessage("A valid name must be provided."),
  body("email").isEmail().withMessage("Provide a valid email."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("A password must be provided."),
];

const userSignInDataValidation = [
  body("email").isEmail().withMessage("Provide a valid email."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("A valid password must be provided."),
];

// ============================= Admin Routes Data Validation =============================

const adminSignUpDataValidation = [
  body("name").trim().notEmpty().withMessage("A valid name must be provided."),
  body("email").isEmail().withMessage("Provide a valid email."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("A password must be provided."),
  body("adminRegistrationKey")
    .trim()
    .notEmpty()
    .withMessage("A valid Admin Registration Key must be provided."),
];

const adminSignInDataValidation = [
  body("email").isEmail().withMessage("Provide a valid email."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("A valid password must be provided."),
];

const adminUserBlockingDataValidation = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("A valid User Id must be provided."),
];

const adminUserUpdateDataValidation = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("A valid User Id must be provided."),
  body("name").trim().notEmpty().withMessage("A valid name must be provided."),
  body("email").isEmail().withMessage("Provide a valid email."),
];

const addCronDataValidation = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("A valid User Id must be provided."),
  body("centerZip").trim().notEmpty().withMessage("A valid centerZip must be provided."),
  body("cronStartAt")
    .isISO8601()
    .withMessage("Provide a valid cronStartAt in ISO 8601 format."),
  body("cronEndAt")
    .isISO8601()
    .withMessage("Provide a valid cronEndAt in ISO 8601 format."),
  body("workingWindowStartAt")
    .isISO8601()
    .withMessage("Provide a valid workingWindowStartAt in ISO 8601 format."),
  body("workingWindowEndAt")
    .isISO8601()
    .withMessage("Provide a valid workingWindowEndAt in ISO 8601 format."),
  body("drivingRadius").trim().notEmpty().withMessage("A valid drivingRadius must be provided."),
  body("totalRequested").trim().notEmpty().withMessage("A valid totalRequested must be provided."),
  body("status").trim().notEmpty().withMessage("A valid status must be provided."),
  body("deleted").trim().notEmpty().withMessage("A valid deleted must be provided."),
];

const updateCronDataValidation = [
  body("cronId")
    .trim()
    .notEmpty()
    .withMessage("A valid cron id must be provided."),

  body("centerZip")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("A valid centerZip must be provided."),

  body("cronStartAt")
    .optional()
    .isISO8601()
    .withMessage("Provide a valid cronStartAt in ISO 8601 format."),

  body("cronEndAt")
    .optional()
    .isISO8601()
    .withMessage("Provide a valid cronEndAt in ISO 8601 format."),

  body("workingWindowStartAt")
    .optional()
    .isISO8601()
    .withMessage("Provide a valid workingWindowStartAt in ISO 8601 format."),

  body("workingWindowEndAt")
    .optional()
    .isISO8601()
    .withMessage("Provide a valid workingWindowEndAt in ISO 8601 format."),

  body("drivingRadius")
    .optional()
    .isNumeric()
    .withMessage("A valid drivingRadius must be provided."),

  body("totalRequested")
    .optional()
    .isNumeric()
    .withMessage("A valid totalRequested must be provided."),

  body("status")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("A valid status must be provided."),

  body("deleted")
    .optional()
    .isBoolean()
    .withMessage("A valid deleted status must be provided.")
];

export {
  userSignUpDataValidation,
  userSignInDataValidation,
  adminSignUpDataValidation,
  adminSignInDataValidation,
  adminUserBlockingDataValidation,
  adminUserUpdateDataValidation,
  addCronDataValidation,
  updateCronDataValidation
};
