const bcrypt = require("bcryptjs");
const ProviderResources = require("./provider.resources");
const UserResources = require("../users/user.resources");
const ResponseHelper = require("../../helpers/response.helpers");
const { genrateToken } = require("../../helpers/jwtToken.helpers");
const { Op } = require("sequelize");
const db = require("../../../startup/model");
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const S3Helper = require("../../helpers/s3Helper.helpers");

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Initialize S3 Helper
const s3Helper = new S3Helper();

const response = new ResponseHelper();
const providerResources = new ProviderResources();
const userResources = new UserResources();

// Models
const User = db.models.User;
const ServiceProvider = db.models.ServiceProvider;
const ServiceProviderAddress = db.models.ServiceProviderAddress;
const BankDetails = db.models.BankDetails;
const ServiceProviderAvailability = db.models.ServiceProviderAvailability;
const Service = db.models.Service;
const ServiceList = db.models.ServiceList;
const OtpVerification = db.models.OtpVerification;
const BannerImage = db.models.BannerImage;
const ServiceImage = db.models.ServiceImage;

module.exports = class ProviderController {
  /**
   * Simple welcome endpoint to check if service is running
   */
  async getWelcome(req, res) {
    return res.status(200).json({
      message: "Glamex provider service is running",
    });
  }

  /**
   * Register a new provider with basic details
   */
  async register(req, res) {
    console.log("ProviderController@register");
    const data = req.body;
    const hashedPassword = bcrypt.hashSync(data.password, 10);

    try {
      // Step 1: Create user with user_type: 'provider' (NO ServiceProvider yet)
      const userData = {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: data.first_name + " " + data.last_name,
        user_type: "provider",
        email: data.email,
        phone_code: data.phone_code,
        phone_number: data.phone_number,
        password: hashedPassword,
        terms_and_condition: data.terms_and_condition || 1,
        gender: data.gender,
        is_verified: 0,
        status: 1, // User account is active by default
      };

      const user = await User.create(userData);

      // Note: Address record will be created later during onboarding process

      // Step 2: Create OTP using the user's phone number (not provider ID)
      try {
        const otpRecord = await OtpVerification.createForEntity(
          "provider",
          user.id,
          data.phone_code + data.phone_number,
          "registration"
        );
        console.log("Provider User OTP created:", {
          otp_code: otpRecord.otp_code,
          expires_at: otpRecord.expires_at,
        });
      } catch (error) {
        console.error("Error creating provider user OTP:", error);
      }

      const result = {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        gender: user.gender,
        verified_at: user.verified_at,
        is_verified: user.is_verified,
        user_type: user.user_type,
        status: user.status,
        notification: user.notification,
      };

      return response.success(
        "Account created successfully! Please verify your phone number with the OTP sent to your registered mobile number.",
        res,
        result
      );
    } catch (error) {
      console.error("Error in provider registration:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Unified OTP verification method for all OTP types
   */
  async verifyOtp(req, res) {
    console.log("ProviderController@verifyOtp");
    const data = req.body;

    try {
      // Validate otp_type
      if (
        !data.otp_type ||
        !["signup", "login", "forgot_password"].includes(data.otp_type)
      ) {
        return response.badRequest(
          "Invalid otp_type. Must be one of: signup, login, forgot_password",
          res,
          {
            error_code: "INVALID_OTP_TYPE",
            message: "Please provide a valid OTP type",
          }
        );
      }

      // Find user by phone number combination
      const user = await User.findOne({
        where: {
          phone_code: data.phone_code,
          phone_number: data.phone_number,
          user_type: "provider",
        },
      });

      if (!user) {
        return response.notFound("Provider user account not found", res, {
          error_code: "PROVIDER_NOT_FOUND",
          message: "No provider account found with this phone number",
        });
      }

      // Map otp_type to purpose
      const purposeMap = {
        signup: "registration",
        login: "login",
        forgot_password: "password_reset",
      };

      const purpose = purposeMap[data.otp_type];

      console.log("Attempting to verify OTP:", {
        entity_type: "provider",
        entity_id: user.id,
        otp: String(data.otp),
        purpose: purpose,
      });

      const verificationResult = await OtpVerification.verifyForEntity(
        "provider",
        user.id,
        String(data.otp),
        purpose
      );

      console.log("OTP verification result:", verificationResult);

      if (!verificationResult.success) {
        // Enhanced error handling with specific status codes
        if (verificationResult.message === "OTP not found or expired") {
          return response.unauthorized("OTP has expired or is invalid", res, {
            error_code: "OTP_EXPIRED",
            message:
              "The OTP has expired or is invalid. Please request a new one using the resend OTP functionality.",
          });
        } else if (verificationResult.message === "Too many failed attempts") {
          return response.forbidden("Too many failed OTP attempts", res, {
            error_code: "TOO_MANY_ATTEMPTS",
            message: "Too many failed attempts. Please request a new OTP.",
          });
        } else {
          return response.unauthorized("Invalid OTP", res, {
            error_code: "INVALID_OTP",
            message: "The OTP you entered is incorrect.",
          });
        }
      }

      // Handle different OTP types
      if (data.otp_type === "signup") {
        // Update user verification status and ensure user is active
        await user.update({
          verified_at: new Date(),
          is_verified: 1,
          status: 1, // Ensure user account is active
        });

        const userObj = {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };

        // Generate token for user (no provider profile yet)
        const accessToken = await genrateToken({
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
          userType: "provider",
        });

        const result = {
          access_token: accessToken,
          user: userObj,
        };

        return response.success(
          "Account verification successful. You can now create your provider profile.",
          res,
          result
        );
      } else if (data.otp_type === "login") {
        // For login OTP verification, also verify the user account if not already verified
        if (!user.is_verified) {
          await user.update({
            verified_at: new Date(),
            is_verified: 1,
            status: 1, // Ensure user account is active
          });
        }

        const userObj = {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };

        // Generate token for user
        const accessToken = await genrateToken({
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
          userType: "provider",
        });

        const result = {
          access_token: accessToken,
          user: userObj,
        };

        return response.success(
          "Login OTP verified successfully. You can now proceed with login.",
          res,
          result
        );
      } else if (data.otp_type === "forgot_password") {
        // For forgot password OTP verification, just return success
        const result = {
          user_id: user.id,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
        };

        return response.success(
          "Password reset OTP verified successfully. You can now reset your password.",
          res,
          result
        );
      }
    } catch (error) {
      console.error("Error in OTP verification:", error);
      return response.exception("Internal server error", res);
    }
  }

  /**
   * Verify provider's OTP to complete registration (legacy method - redirects to verifyOtp)
   */

  /**
   * Resend OTP to provider's phone number
   */
  async resendOtp(req, res) {
    console.log("ProviderController@resendOtp");
    const data = req.body;

    try {
      // Validate otp_type
      if (
        !data.otp_type ||
        !["signup", "login", "forgot_password"].includes(data.otp_type)
      ) {
        return response.badRequest(
          "Invalid otp_type. Must be one of: signup, login, forgot_password",
          res,
          {
            error_code: "INVALID_OTP_TYPE",
            message: "Please provide a valid OTP type",
          }
        );
      }

      // Find user by phone number combination
      const user = await User.findOne({
        where: {
          phone_code: data.phone_code,
          phone_number: data.phone_number,
          user_type: "provider",
        },
      });

      if (!user) {
        return response.notFound("Provider user account not found", res, {
          error_code: "PROVIDER_NOT_FOUND",
          message: "No provider account found with this phone number",
        });
      }

      // Map otp_type to purpose
      const purposeMap = {
        signup: "registration",
        login: "login",
        forgot_password: "password_reset",
      };

      const purpose = purposeMap[data.otp_type];

      // Check rate limiting for OTP requests
      try {
        const recentOtps = await OtpVerification.count({
          where: {
            entity_type: "provider",
            entity_id: user.id,
            purpose: purpose,
            created_at: {
              [Op.gte]: new Date(Date.now() - 60 * 60 * 1000), // Last 1 hour
            },
          },
        });

        if (recentOtps >= 3) {
          return response.custom(429, "Too many OTP requests", res, {
            error_code: "RATE_LIMIT_EXCEEDED",
            message:
              "You have exceeded the maximum OTP requests. Please try again later.",
            retry_after: 3600, // 1 hour in seconds
          });
        }
      } catch (error) {
        console.error("Error checking rate limit:", error);
        // Continue with OTP creation even if rate limit check fails
      }

      try {
        const otpRecord = await OtpVerification.createForEntity(
          "provider",
          user.id,
          user.phone_code + user.phone_number,
          purpose
        );
        console.log("Provider user resend OTP created:", {
          otp_code: otpRecord.otp_code,
          expires_at: otpRecord.expires_at,
          purpose: purpose,
        });
      } catch (error) {
        console.error("Error creating resend OTP:", error);
        return response.exception("Failed to create OTP", res);
      }

      const result = {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        otp_type: data.otp_type,
      };

      return response.created(
        "OTP has been resent to your registered phone number",
        res,
        result
      );
    } catch (error) {
      console.error("Error in resending OTP:", error);
      return response.exception("Internal server error", res);
    }
  }

  /**
   * Provider authentication (login)
   */
  async authenticate(req, res) {
    try {
      console.log("ProviderController@authenticate");
      const user = req.user; // User information from middleware (phone, password auth)

      // Check if user account is active
      if (user.status !== 1) {
        return response.forbidden("Your account is not active", res, {
          error_code: "ACCOUNT_INACTIVE",
          message:
            "Your account has been deactivated. Please contact support for assistance.",
        });
      }

      // Check if user is verified
      if (!user.is_verified) {
        // Check if there's already a valid login OTP
        const existingLoginOtp = await OtpVerification.findValidForEntity(
          "provider",
          user.id,
          "login"
        );

        if (!existingLoginOtp) {
          // Generate new login OTP if none exists
          try {
            const otpRecord = await OtpVerification.createForEntity(
              "provider",
              user.id,
              user.phone_code + user.phone_number,
              "login"
            );
            console.log(
              "Provider User login OTP created for unverified user:",
              {
                otp_code: otpRecord.otp_code,
                expires_at: otpRecord.expires_at,
              }
            );
          } catch (error) {
            console.error("Error creating provider user OTP:", error);
          }
        } else {
          console.log("Existing login OTP found for unverified user:", {
            otp_code: existingLoginOtp.otp_code,
            expires_at: existingLoginOtp.expires_at,
          });
        }

        return response.validationError(
          "Please verify your account first",
          res,
          {
            verification_required: true,
            otp_type: "login", // Specify the OTP type for frontend
            message:
              "Your account needs to be verified before you can login. OTP has been sent to your registered mobile number for verification.",
          }
        );
      }

      // Check if provider profile exists
      const serviceProvider = await ServiceProvider.findOne({
        where: { user_id: user.id },
      });

      if (!serviceProvider) {
        // Generate token with user data and let them create profile
        const userObj = {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
          userType: "provider",
        };

        const accessToken = await genrateToken(userObj);
        const result = {
          access_token: accessToken,
          user: {
            user_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            email: user.email,
            phone_code: user.phone_code,
            phone_number: user.phone_number,
            gender: user.gender,
            verified_at: user.verified_at,
            is_verified: user.is_verified,
            user_type: user.user_type,
            status: user.status,
            notification: user.notification,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          profile_required: true,
          message: "Please create your provider profile to continue",
        };

        return response.success(
          "Login successful. Please create your provider profile.",
          res,
          result
        );
      }

      // Check profile completion status
      if (serviceProvider.step_completed < 6) {
        console.log(
          `🔍 Provider ${serviceProvider.id}: Step ${serviceProvider.step_completed}/6 incomplete`
        );

        // Generate token even for incomplete steps so user can complete them
        const userObj = {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
          userType: "provider",
        };

        const accessToken = await genrateToken(userObj);
        return response.validationError(
          "Please complete your profile setup first",
          res,
          {
            access_token: accessToken,
            setup_required: true,
            current_step: serviceProvider.step_completed,
            total_steps: 6,
            message: `Complete all ${
              6 - serviceProvider.step_completed
            } remaining steps to access the app`,
          }
        );
      }

      // Check if profile is approved by admin (only if steps are completed)
      if (
        serviceProvider.step_completed === 6 &&
        serviceProvider.is_approved !== 1
      ) {
        console.log(
          `🔍 Provider ${serviceProvider.id}: Steps complete but approval status is ${serviceProvider.is_approved}`
        );

        // Generate token even for unapproved profiles so user can check status
        const userObj = {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
          userType: "provider",
        };

        const accessToken = await genrateToken(userObj);

        // Handle different approval states
        if (serviceProvider.is_approved === 0) {
          // Pending approval
          return response.validationError(
            "Wait for the admin to verify your profile",
            res,
            {
              access_token: accessToken,
              approval_required: true,
              approval_status: "pending",
              message:
                "Your profile is complete and under review by admin. You will be notified once approved.",
            }
          );
        } else if (serviceProvider.is_approved === 2) {
          // Rejected
          return response.validationError(
            "Your profile has been rejected by admin",
            res,
            {
              access_token: accessToken,
              approval_required: true,
              approval_status: "rejected",
              rejection_reason:
                serviceProvider.rejection_reason ||
                "No specific reason provided",
              message:
                "Your profile has been rejected. Please review the feedback and contact support if you have questions.",
              next_steps: [
                "Review the rejection reason provided",
                "Address any issues mentioned in the feedback",
                "Contact support for clarification if needed",
                "You may reapply after addressing the concerns",
              ],
            }
          );
        } else {
          // Unknown status
          return response.validationError(
            "Your profile approval status is unclear",
            res,
            {
              access_token: accessToken,
              approval_required: true,
              approval_status: "unknown",
              message:
                "There is an issue with your profile approval status. Please contact support.",
            }
          );
        }
      }

      // All checks passed - generate token with user model data
      const userObj = {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        gender: user.gender,
        verified_at: user.verified_at,
        is_verified: user.is_verified,
        user_type: user.user_type,
        status: user.status,
        notification: user.notification,
        created_at: user.created_at,
        updated_at: user.updated_at,
        userType: "provider",
      };

      // Get service provider address information
      const serviceProviderAddress = await ServiceProviderAddress.findOne({
        where: { user_id: user.id },
      });

      const accessToken = await genrateToken(userObj);
      const result = {
        access_token: accessToken,
        service_provider: {
          id: serviceProvider.id,
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          provider_type: serviceProvider.provider_type,
          salon_name: serviceProvider.salon_name,
          description: serviceProvider.description,
          location: serviceProviderAddress?.address || null,
          latitude: serviceProviderAddress?.latitude || null,
          longitude: serviceProviderAddress?.longitude || null,
          country_id: serviceProviderAddress?.country_id || null,
          city_id: serviceProviderAddress?.city_id || null,
          step_completed: serviceProvider.step_completed,
          verified_at: user.verified_at,
          is_verified: user.is_verified,
          user_type: user.user_type,
          is_approved: serviceProvider.is_approved,
          status: serviceProvider.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      };

      return response.success("Login successful", res, result);
    } catch (error) {
      console.error("Authentication error:", error);
      return response.exception("An error occurred during authentication", res);
    }
  }

  /**
   * Initiate password reset process by sending OTP
   */
  async forgotPassword(req, res) {
    console.log("ProviderController@forgotPassword");
    const data = req.body;

    // Find user by phone number (no need to find ServiceProvider)
    const user = await User.findOne({
      where: {
        phone_code: data.phone_code,
        phone_number: data.phone_number,
        user_type: "provider", // Ensure it's a provider user
      },
    });

    if (!user) {
      return response.badRequest(
        "No provider account found with this phone number",
        res,
        false
      );
    }

    try {
      const otpRecord = await OtpVerification.createForEntity(
        "provider",
        user.id, // Use user.id instead of serviceProvider.id
        data.phone_code + data.phone_number,
        "password_reset"
      );
    } catch (error) {
      console.error("Error creating password reset OTP:", error);
      return response.exception("Failed to create OTP", res);
    }

    const result = {
      user_id: user.id,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
    };

    return response.success(
      "OTP sent successfully for password reset",
      res,
      result
    );
  }

  /**
   * Reset provider's password after OTP verification
   */
  async resetPassword(req, res) {
    console.log("ProviderController@resetPassword");
    const data = req.body;

    // Find user by phone number combination
    const user = await User.findOne({
      where: {
        phone_code: data.phone_code,
        phone_number: data.phone_number,
        user_type: "provider", // Ensure it's a provider user
      },
    });

    if (!user) {
      return response.badRequest("Provider account not found", res, {
        error_code: "PROVIDER_NOT_FOUND",
        message: "No provider account found with this phone number",
      });
    }

    // Update password directly in user table
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    await user.update({ password: hashedPassword });

    return response.success(
      "Your password has been reset successfully",
      res,
      null
    );
  }

  /**
   * Step 4: Upload documents and bank details (mandatory for all providers)
   * - National ID image (mandatory for both individual and salon)
   * - Bank details (mandatory for both individual and salon)
   * - Freelance certificate image (optional for individual, not needed for salon)
   * - Commercial registration image (mandatory for salon, not needed for individual)
   */
  async step4UploadDocuments(req, res) {
    console.log("ProviderController@step4UploadDocuments - START");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log(
      "Request files:",
      req.files ? Object.keys(req.files) : "No files"
    );

    const provider = req.provider;
    const files = req.files;
    const bankDetails = req.body;

    try {
      // Store old document URLs for cleanup
      const oldDocumentUrls = {
        national_id_image_url: provider.national_id_image_url,
        freelance_certificate_image_url:
          provider.freelance_certificate_image_url,
        commercial_registration_image_url:
          provider.commercial_registration_image_url,
      };
      // Validate required fields based on provider type
      const errors = [];

      // National ID is mandatory for both
      if (!files.national_id_image_url || !files.national_id_image_url[0]) {
        errors.push("National ID image is required");
      }

      // Bank details validation
      if (!bankDetails.account_holder_name) {
        errors.push("Account holder name is required");
      }
      if (!bankDetails.bank_name) {
        errors.push("Bank name is required");
      }
      if (!bankDetails.iban) {
        errors.push("IBAN is required");
      }

      // Commercial registration is mandatory for salon
      if (provider.provider_type === "salon") {
        if (
          !files.commercial_registration_image_url ||
          !files.commercial_registration_image_url[0]
        ) {
          errors.push(
            "Commercial registration image is required for salon providers"
          );
        }
      }

      if (errors.length > 0) {
        return response.badRequest(errors.join(", "), res, false);
      }

      const uploadPromises = [];
      const documentUrls = {};

      // Upload national ID image (mandatory)
      if (files.national_id_image_url && files.national_id_image_url[0]) {
        const file = files.national_id_image_url[0];
        console.log("Processing national ID image upload...");

        // Validate S3 configuration
        if (!s3Helper.validateConfig()) {
          return response.badRequest(
            "S3 configuration is invalid. Please check AWS credentials and bucket settings.",
            res,
            false
          );
        }

        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          "providers",
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname,
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(
            `Failed to upload national ID image: ${uploadResult.error}`,
            res,
            false
          );
        }

        documentUrls.national_id_image_url = uploadResult.main.url;
      }

      // Upload freelance certificate image (optional for individual)
      if (
        provider.provider_type === "individual" &&
        files.freelance_certificate_image_url &&
        files.freelance_certificate_image_url[0]
      ) {
        const file = files.freelance_certificate_image_url[0];
        console.log("Processing freelance certificate image upload...");

        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          "providers",
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname,
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(
            `Failed to upload freelance certificate image: ${uploadResult.error}`,
            res,
            false
          );
        }

        documentUrls.freelance_certificate_image_url = uploadResult.main.url;
      }

      // Upload commercial registration image (mandatory for salon)
      if (
        provider.provider_type === "salon" &&
        files.commercial_registration_image_url &&
        files.commercial_registration_image_url[0]
      ) {
        const file = files.commercial_registration_image_url[0];
        console.log("Processing commercial registration image upload...");

        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          "providers",
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname,
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(
            `Failed to upload commercial registration image: ${uploadResult.error}`,
            res,
            false
          );
        }

        documentUrls.commercial_registration_image_url = uploadResult.main.url;
      }

      // Create or update bank details
      let bankDetailsRecord;
      const existingBankDetails = await BankDetails.findOne({
        where: { service_provider_id: provider.id },
      });

      if (existingBankDetails) {
        // Update existing bank details
        await existingBankDetails.update({
          account_holder_name: bankDetails.account_holder_name,
          bank_name: bankDetails.bank_name,
          iban: bankDetails.iban,
        });
        bankDetailsRecord = existingBankDetails;
      } else {
        // Create new bank details
        bankDetailsRecord = await BankDetails.create({
          service_provider_id: provider.id,
          account_holder_name: bankDetails.account_holder_name,
          bank_name: bankDetails.bank_name,
          iban: bankDetails.iban,
        });
      }

      // Update provider with document URLs
      await provider.update({
        ...documentUrls,
        step_completed: 4,
      });

      // Get updated provider with all details
      const updatedProvider = await ServiceProvider.findByPk(provider.id, {
        include: [
          {
            model: BankDetails,
            as: "bankDetails",
          },
        ],
      });

      const responseData = {
        id: updatedProvider.id,
        provider_type: updatedProvider.provider_type,
        national_id_image_url: updatedProvider.national_id_image_url,
        freelance_certificate_image_url:
          updatedProvider.freelance_certificate_image_url,
        commercial_registration_image_url:
          updatedProvider.commercial_registration_image_url,
        step_completed: updatedProvider.step_completed,
        bank_details:
          updatedProvider.bankDetails && updatedProvider.bankDetails.length > 0
            ? {
                id: updatedProvider.bankDetails[0].id,
                account_holder_name:
                  updatedProvider.bankDetails[0].account_holder_name,
                bank_name: updatedProvider.bankDetails[0].bank_name,
                iban: updatedProvider.bankDetails[0].iban,
              }
            : null,
        next_step: "service_setup",
      };

      // Clean up old document images if they were custom uploads
      console.log("Cleaning up old document images...");
      const cleanupPromises = [];

      // Clean up national ID image
      if (
        oldDocumentUrls.national_id_image_url &&
        s3Helper.isCustomUploadedImage(oldDocumentUrls.national_id_image_url)
      ) {
        console.log(
          "Cleaning up old national ID image:",
          oldDocumentUrls.national_id_image_url
        );
        cleanupPromises.push(
          s3Helper
            .deleteImageWithThumbnail(oldDocumentUrls.national_id_image_url)
            .then((result) => {
              if (result.success) {
                console.log("Old national ID image cleanup successful");
              } else {
                console.log(
                  "Old national ID image cleanup failed:",
                  result.error
                );
              }
            })
            .catch((error) => {
              console.error("Error during national ID image cleanup:", error);
            })
        );
      }

      // Clean up freelance certificate image
      if (
        oldDocumentUrls.freelance_certificate_image_url &&
        s3Helper.isCustomUploadedImage(
          oldDocumentUrls.freelance_certificate_image_url
        )
      ) {
        console.log(
          "Cleaning up old freelance certificate image:",
          oldDocumentUrls.freelance_certificate_image_url
        );
        cleanupPromises.push(
          s3Helper
            .deleteImageWithThumbnail(
              oldDocumentUrls.freelance_certificate_image_url
            )
            .then((result) => {
              if (result.success) {
                console.log(
                  "Old freelance certificate image cleanup successful"
                );
              } else {
                console.log(
                  "Old freelance certificate image cleanup failed:",
                  result.error
                );
              }
            })
            .catch((error) => {
              console.error(
                "Error during freelance certificate image cleanup:",
                error
              );
            })
        );
      }

      // Clean up commercial registration image
      if (
        oldDocumentUrls.commercial_registration_image_url &&
        s3Helper.isCustomUploadedImage(
          oldDocumentUrls.commercial_registration_image_url
        )
      ) {
        console.log(
          "Cleaning up old commercial registration image:",
          oldDocumentUrls.commercial_registration_image_url
        );
        cleanupPromises.push(
          s3Helper
            .deleteImageWithThumbnail(
              oldDocumentUrls.commercial_registration_image_url
            )
            .then((result) => {
              if (result.success) {
                console.log(
                  "Old commercial registration image cleanup successful"
                );
              } else {
                console.log(
                  "Old commercial registration image cleanup failed:",
                  result.error
                );
              }
            })
            .catch((error) => {
              console.error(
                "Error during commercial registration image cleanup:",
                error
              );
            })
        );
      }

      // Wait for all cleanup operations to complete (but don't fail if they don't)
      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
        console.log("Document image cleanup operations completed");
      }

      console.log("Step 4 completed successfully, returning result");
      return response.success(
        "Step 4 completed successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error in Step 4:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
      return response.exception("Failed to complete Step 4", res);
    }
  }

  /**
   * Setup services for the provider (Step 6)
   */
  async setupServices(req, res) {
    console.log("ProviderController@setupServices - Step 6");
    const user = req.user; // From provider auth middleware
    const provider = req.provider; // From provider auth middleware
    const { services } = req.body;
    const uploadedFiles = req.files; // Multer uploaded files

    try {
      // Get user_id from authenticated user (from token)
      const userId = user.id;
      console.log("User ID from token:", userId);

      // Find or create ServiceProvider record
      let serviceProvider = provider;
      if (!serviceProvider) {
        console.log("No provider profile found, creating one...");
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: "individual", // Default value
          step_completed: 6, // Skip to step 6 for service setup
        });
        console.log("Provider profile created with ID:", serviceProvider.id);
      }

      // Validate that services array is provided
      if (!services || !Array.isArray(services) || services.length === 0) {
        return response.badRequest("Services array is required", res);
      }

      // Get existing service lists for cleanup before deletion
      const existingServices = await ServiceList.findAll({
        where: { service_provider_id: serviceProvider.id },
        attributes: ["service_image"],
      });

      // Store old service image URLs for cleanup
      const oldServiceImageUrls = existingServices
        .map((service) => service.service_image)
        .filter((url) => url && s3Helper.isCustomUploadedImage(url));

      // Delete existing service lists for this provider
      await ServiceList.destroy({
        where: { service_provider_id: serviceProvider.id },
      });

      // Create new service lists
      const servicePromises = services.map(async (serviceData, index) => {
        let serviceImageUrl = null;

        // Handle service image - check for predefined image ID first
        if (serviceData.service_image_id) {
          console.log(
            "Using predefined service image ID:",
            serviceData.service_image_id
          );
          // User selected a predefined service image
          const serviceImage = await ServiceImage.findByPk(
            serviceData.service_image_id
          );
          console.log("Service image found:", serviceImage ? "YES" : "NO");
          if (!serviceImage || !serviceImage.is_active) {
            return response.badRequest(
              "Invalid service image selected",
              res,
              false
            );
          }
          serviceImageUrl = serviceImage.image_url;
          console.log("Using predefined service image URL:", serviceImageUrl);
        } else if (
          uploadedFiles &&
          uploadedFiles.service_images &&
          uploadedFiles.service_images[index]
        ) {
          // Handle file upload from multer using S3 like in step 3
          console.log("Processing custom service image upload (file)...");
          const file = uploadedFiles.service_images[index];
          console.log("File details:", {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            buffer: file.buffer ? "Buffer exists" : "No buffer",
          });

          // Validate S3 configuration
          console.log("Validating S3 config...");
          if (!s3Helper.validateConfig()) {
            console.log("S3 config validation failed");
            return response.badRequest(
              "S3 configuration is invalid. Please check AWS credentials and bucket settings.",
              res,
              false
            );
          }

          console.log("S3 config validation passed");

          // Upload to S3 using the same method as step 3
          console.log("Starting S3 upload...");
          const uploadResult = await s3Helper.uploadImage(
            file.buffer,
            file.originalname,
            "providers",
            `service-images/${serviceProvider.id}`,
            {
              maxSize: 5 * 1024 * 1024, // 5MB limit for service images
              generateThumbnail: true,
              thumbnailSize: { width: 300, height: 200 },
              uploadedBy: `provider_${provider.id}`,
              originalName: file.originalname,
            }
          );
          console.log("S3 upload result:", uploadResult);

          if (!uploadResult.success) {
            console.log("S3 upload failed:", uploadResult.error);
            return response.badRequest(
              `Failed to upload service image: ${uploadResult.error}`,
              res,
              false
            );
          }

          serviceImageUrl = uploadResult.main.url;
          console.log("S3 upload successful, URL:", serviceImageUrl);
        }

        return ServiceList.create({
          service_provider_id: serviceProvider.id,
          service_id: serviceData.service_id, // Add service_id for proper hierarchy
          category_id: serviceData.category_id,
          sub_category_id: serviceData.sub_category_id || null,
          title: serviceData.title || null, // Optional - can use category title
          price: serviceData.price,
          description: serviceData.description || null, // Optional
          service_image: serviceImageUrl,
          service_location: serviceData.service_location || 1, // Default to 1 if not provided
          is_sub_service: serviceData.is_sub_service || 0, // Optional - default to 0
          have_offers: serviceData.have_offers || 0, // Optional - default to 0
          status: 1,
        });
      });

      const createdServices = await Promise.all(servicePromises);

      await serviceProvider.update({
        step_completed: 6,
      });

      // Clean up old service images if they were custom uploads
      if (oldServiceImageUrls.length > 0) {
        console.log("Cleaning up old service images...");
        const cleanupPromises = oldServiceImageUrls.map(async (imageUrl) => {
          console.log("Cleaning up old service image:", imageUrl);
          try {
            const result = await s3Helper.deleteImageWithThumbnail(imageUrl);
            if (result.success) {
              console.log("Old service image cleanup successful");
            } else {
              console.log("Old service image cleanup failed:", result.error);
            }
          } catch (error) {
            console.error("Error during service image cleanup:", error);
          }
        });

        // Wait for all cleanup operations to complete (but don't fail if they don't)
        await Promise.allSettled(cleanupPromises);
        console.log("Service image cleanup operations completed");
      }

      // Get the created services with category, subcategory, and location details
      const servicesWithDetails = await ServiceList.findAll({
        where: { service_provider_id: serviceProvider.id },
        include: [
          {
            model: db.models.Category,
            as: "category",
            attributes: ["id", "title", "image"],
          },
          {
            model: db.models.subcategory,
            as: "subcategory",
            attributes: ["id", "title", "image"],
          },
          {
            model: db.models.ServiceLocation,
            as: "location",
            attributes: ["id", "title", "description"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return response.success("Services setup successfully", res, {
        provider: await ServiceProvider.findByPk(serviceProvider.id),
        services: servicesWithDetails,
        next_step: "profile_complete",
      });
    } catch (error) {
      console.error("Error setting up services:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Set simple subscription (one-time payment tracking)
   */
  async setSubscription(req, res) {
    console.log("ProviderController@setSubscription");
    const userId = req.user.id;
    const { subscription_type, payment_reference } = req.body;

    try {
      const provider = await ServiceProvider.findOne({
        where: { user_id: userId },
      });

      if (!provider) {
        return response.notFound("Provider profile not found", res);
      }

      // Simple subscription tracking:
      // 0 = free/trial, 1 = basic paid, 2 = premium paid
      const subscriptionId =
        subscription_type === "premium"
          ? 2
          : subscription_type === "basic"
          ? 1
          : 0;

      // Set expiry to 1 year from now for paid subscriptions
      const expiryDate =
        subscriptionId > 0
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null;

      await provider.update({
        subscription_id: subscriptionId,
        subscription_expiry: expiryDate,
        step_completed: Math.max(provider.step_completed, 6),
      });

      return response.success("Subscription updated successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id),
        subscription_type: subscription_type,
        expires_at: expiryDate,
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Set provider type (individual or business)
   */
  async setProviderType(req, res) {
    console.log("ProviderController@setServiceDetails");
    const data = {
      provider_type: req.body.provider_type,
      step_completed: 2,
    };

    const serviceProvider = await providerResources.updateProvider(data, {
      id: req.provider.id,
    });
    if (!serviceProvider) {
      return response.badRequest("Provider account not found", res, false);
    }

    // Get address information
    const serviceProviderAddress = await ServiceProviderAddress.findOne({
      where: { user_id: req.user.id },
    });

    const serviceProviderObj = {
      id: serviceProvider.id,
      first_name: serviceProvider.first_name,
      last_name: serviceProvider.last_name,
      full_name: serviceProvider.full_name,
      email: serviceProvider.email,
      phone_code: serviceProvider.phone_code,
      phone_number: serviceProvider.phone_number,
      provider_type: serviceProvider.provider_type,
      salon_name: serviceProvider.salon_name,
      city_id: serviceProviderAddress?.city_id || null,
      banner_image: serviceProvider.banner_image,
      description: serviceProvider.description,
      step_completed: serviceProvider.step_completed,
    };

    return response.success(
      "Provider type updated successfully",
      res,
      serviceProviderObj
    );
  }

  /**
   * Set provider's document details for verification
   */
  async setDocumentDetails(req, res) {
    console.log("ProviderController@setDocumentDetails");
    const data = {
      service_provider_id: req.provider.id,
      national_id: req.body.national_id,
      bank_account_name: req.body.bank_account_name,
      bank_name: req.body.bank_name,
      account_number: req.body.account_number,
      freelance_certificate: req.body.freelance_certificate,
      vat_number: req.body.vat_number,
      vat_amount: req.body.vat_amount,
      commertial_certificate: req.body.commertial_certificate,
    };

    const serviceProviderDetails =
      await providerResources.createUpdateProviderDetail(data, {
        service_provider_id: req.provider.id,
      });
    if (!serviceProviderDetails) {
      return response.badRequest(
        "Failed to update provider details",
        res,
        false
      );
    }

    const serviceProvider = await providerResources.updateProvider(
      { step_completed: 3 },
      { id: req.provider.id }
    );

    // Get address information
    const serviceProviderAddress = await ServiceProviderAddress.findOne({
      where: { user_id: req.user.id },
    });

    const serviceProviderObj = {
      id: serviceProvider.id,
      first_name: serviceProvider.first_name,
      last_name: serviceProvider.last_name,
      full_name: serviceProvider.full_name,
      email: serviceProvider.email,
      phone_code: serviceProvider.phone_code,
      phone_number: serviceProvider.phone_number,
      provider_type: serviceProvider.provider_type,
      salon_name: serviceProvider.salon_name,
      city_id: serviceProviderAddress?.city_id || null,
      banner_image: serviceProvider.banner_image,
      description: serviceProvider.description,
      step_completed: serviceProvider.step_completed,
      serviceProviderDetail: {
        id: serviceProviderDetails.id,
        national_id: serviceProviderDetails.national_id,
        bank_account_name: serviceProviderDetails.bank_account_name,
        bank_name: serviceProviderDetails.bank_name,
        account_number: serviceProviderDetails.account_number,
        freelance_certificate: serviceProviderDetails.freelance_certificate,
        commertial_certificate: serviceProviderDetails.commertial_certificate,
      },
    };

    return response.success(
      "Document details updated successfully",
      res,
      serviceProviderObj
    );
  }

  /**
   * Set provider's service details (salon info, location, etc.)
   */
  async setServiceDetails(req, res) {
    console.log("ProviderController@setServiceDetails");
    const data = {
      salon_name: req.body.salon_name,
      banner_image: req.body.banner_image,
      description: req.body.description,
      step_completed: 4,
    };

    // Update ServiceProvider
    const serviceProviderUpdate = await providerResources.updateProvider(data, {
      id: req.provider.id,
    });
    if (!serviceProviderUpdate) {
      return response.badRequest(
        "Failed to update service details",
        res,
        false
      );
    }

    // Update ServiceProviderAddress if city_id or country_id are provided
    if (req.body.city_id || req.body.country_id) {
      const serviceProviderAddress = await ServiceProviderAddress.findOne({
        where: { user_id: req.user.id },
      });

      if (serviceProviderAddress) {
        // Update existing address record
        const addressUpdateData = {};
        if (req.body.country_id)
          addressUpdateData.country_id = req.body.country_id;
        if (req.body.city_id) addressUpdateData.city_id = req.body.city_id;

        await serviceProviderAddress.update(addressUpdateData);
      } else {
        // Create new address record
        await ServiceProviderAddress.create({
          user_id: req.user.id,
          country_id: req.body.country_id || null,
          city_id: req.body.city_id || null,
          address: null, // Will be filled later
          latitude: null, // Will be filled later
          longitude: null, // Will be filled later
        });
      }
    }

    const serviceProvider = await providerResources.getAllDetails({
      id: req.provider.id,
    });

    // Get address information
    const serviceProviderAddress = await ServiceProviderAddress.findOne({
      where: { user_id: req.user.id },
    });

    const serviceProviderObj = {
      id: serviceProvider.id,
      first_name: serviceProvider.first_name,
      last_name: serviceProvider.last_name,
      full_name: serviceProvider.full_name,
      email: serviceProvider.email,
      phone_code: serviceProvider.phone_code,
      phone_number: serviceProvider.phone_number,
      provider_type: serviceProvider.provider_type,
      salon_name: serviceProvider.salon_name,
      city_id: serviceProviderAddress?.city_id || null,
      banner_image: serviceProvider.banner_image,
      description: serviceProvider.description,
      step_completed: serviceProvider.step_completed,
      serviceProviderDetail: {
        id: serviceProvider.serviceProviderDetail.id,
        national_id: serviceProvider.serviceProviderDetail.national_id,
        bank_account_name:
          serviceProvider.serviceProviderDetail.bank_account_name,
        bank_name: serviceProvider.serviceProviderDetail.bank_name,
        account_number: serviceProvider.serviceProviderDetail.account_number,
        freelance_certificate:
          serviceProvider.serviceProviderDetail.freelance_certificate,
        commertial_certificate: serviceProvider.commertial_certificate,
      },
    };

    return response.success(
      "Service details updated successfully",
      res,
      serviceProviderObj
    );
  }

  /**
   * Step 5: Set working days and hours for provider
   * This is the final step in the provider onboarding process
   */
  async step5WorkingHours(req, res) {
    console.log("ProviderController@step5WorkingHours - START");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const provider = req.provider;
    const availabilityData = req.body.availability;

    try {
      // Validate required fields
      if (
        !availabilityData ||
        !Array.isArray(availabilityData) ||
        availabilityData.length === 0
      ) {
        return response.badRequest(
          "Availability data is required and must be an array",
          res,
          false
        );
      }

      // Validate each availability record
      const errors = [];
      const daysOfWeek = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      availabilityData.forEach((item, index) => {
        if (!item.day) {
          errors.push(`Day is required for availability record ${index + 1}`);
        } else if (!daysOfWeek.includes(item.day.toLowerCase())) {
          errors.push(
            `Invalid day '${item.day}' for availability record ${index + 1}`
          );
        }

        if (!item.from_time) {
          errors.push(`From time is required for ${item.day}`);
        }

        if (!item.to_time) {
          errors.push(`To time is required for ${item.day}`);
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (item.from_time && !timeRegex.test(item.from_time)) {
          errors.push(
            `Invalid from_time format for ${item.day}. Use HH:MM format`
          );
        }
        if (item.to_time && !timeRegex.test(item.to_time)) {
          errors.push(
            `Invalid to_time format for ${item.day}. Use HH:MM format`
          );
        }

        // Validate time range
        if (item.from_time && item.to_time) {
          const fromTime = new Date(`2000-01-01T${item.from_time}:00`);
          const toTime = new Date(`2000-01-01T${item.to_time}:00`);
          if (fromTime >= toTime) {
            errors.push(`From time must be before to time for ${item.day}`);
          }
        }
      });

      if (errors.length > 0) {
        return response.badRequest(errors.join(", "), res, false);
      }

      // Delete existing availability records for this provider
      await ServiceProviderAvailability.destroy({
        where: { service_provider_id: provider.id },
      });

      // Create new availability records
      const availabilityRecords = availabilityData.map((item) => ({
        service_provider_id: provider.id,
        day: item.day.toLowerCase(),
        from_time: item.from_time,
        to_time: item.to_time,
        available: item.available !== undefined ? item.available : 1,
      }));

      await ServiceProviderAvailability.bulkCreate(availabilityRecords);

      // Update provider step completion
      await provider.update({
        step_completed: 5,
      });

      // Get updated provider with availability details
      const updatedProvider = await ServiceProvider.findByPk(provider.id, {
        include: [
          {
            model: ServiceProviderAvailability,
            as: "availability",
          },
        ],
      });

      const responseData = {
        id: updatedProvider.id,
        step_completed: updatedProvider.step_completed,
        availability: updatedProvider.availability.map((avail) => ({
          id: avail.id,
          day: avail.day,
          from_time: avail.from_time,
          to_time: avail.to_time,
          available: avail.available,
        })),
        next_step: "setup_services",
        message: "Working hours set successfully. Next step: Setup services",
      };

      console.log("Step 5 completed successfully, returning result");
      return response.success(
        "Step 5 completed successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error in Step 5:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
      return response.exception("Failed to complete Step 5", res);
    }
  }

  /**
   * Set provider's availability schedule (legacy method)
   */
  async setAvailability(req, res) {
    console.log("ProviderController@setAvailability");
    const data = req.body.availbilty;
    const availability =
      await providerResources.createUpdateProviderAvailability(
        data,
        req.provider.id
      );
    if (!availability) {
      return response.badRequest(
        "Failed to update availability schedule",
        res,
        false
      );
    }

    const serviceProviderUpdate = await providerResources.updateProvider(
      { step_completed: 5 },
      { id: req.provider.id }
    );

    const serviceProvider = await providerResources.getAllDetails({
      id: req.provider.id,
    });

    // Get address information
    const serviceProviderAddress = await ServiceProviderAddress.findOne({
      where: { user_id: req.user.id },
    });

    const serviceProviderObj = {
      id: serviceProvider.id,
      first_name: serviceProvider.first_name,
      last_name: serviceProvider.last_name,
      full_name: serviceProvider.full_name,
      email: serviceProvider.email,
      phone_code: serviceProvider.phone_code,
      phone_number: serviceProvider.phone_number,
      provider_type: serviceProvider.provider_type,
      salon_name: serviceProvider.salon_name,
      city_id: serviceProviderAddress?.city_id || null,
      banner_image: serviceProvider.banner_image,
      description: serviceProvider.description,
      step_completed: serviceProvider.step_completed,
      serviceProviderDetail: {
        id: serviceProvider.serviceProviderDetail.id,
        national_id: serviceProvider.serviceProviderDetail.national_id,
        bank_account_name:
          serviceProvider.serviceProviderDetail.bank_account_name,
        bank_name: serviceProvider.serviceProviderDetail.bank_name,
        account_number: serviceProvider.serviceProviderDetail.account_number,
        freelance_certificate:
          serviceProvider.serviceProviderDetail.freelance_certificate,
        commertial_certificate: serviceProvider.commertial_certificate,
      },
      serviceProviderAvailability:
        serviceProvider.serviceProviderAvailability.map((availability) => {
          return {
            id: availability.id,
            day: availability.day,
            from_time: availability.from_time,
            to_time: availability.to_time,
            available: availability.available,
          };
        }),
    };

    return response.success(
      "Availability schedule updated successfully",
      res,
      serviceProviderObj
    );
  }

  /**
   * Verify OTP for password reset
   */

  /**
   * Get paginated list of all providers with comprehensive data (similar to getProviderProfile)
   */
  async getAllProviders(req, res) {
    console.log("ProviderController@getAllProviders");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder = req.query.sortOrder || "DESC";
    const { search, type, status, provider_type } = req.query;

    // Build query for ServiceProvider table
    const providerQuery = {
      ...(search && {
        [Op.or]: [
          { "$user.first_name$": { [Op.like]: `%${search}%` } },
          { "$user.last_name$": { [Op.like]: `%${search}%` } },
          { "$user.email$": { [Op.like]: `%${search}%` } },
          { "$user.phone_number$": { [Op.like]: `%${search}%` } },
        ],
      }),
      ...(type !== undefined &&
        type !== null && {
          admin_verified: type == 1 ? 1 : type == 3 ? 2 : 0,
        }),
      ...(provider_type !== undefined &&
        provider_type !== null && {
          provider_type: Number(provider_type),
        }),
      ...(status && {
        "$user.status$": {
          [Op.like]: `%${status}%`,
        },
      }),
    };

    try {
      // Get all users with user_type = 'provider' first
      const userQuery = {
        user_type: "provider",
        ...(search && {
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
          ],
        }),
        ...(status && {
          status: {
            [Op.like]: `%${status}%`,
          },
        }),
      };

      const offset = (page - 1) * limit;

      // Get users with pagination
      const usersResult = await User.findAndCountAll({
        where: userQuery,
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0,
        order: [[sortBy, sortOrder]],
        attributes: [
          "id",
          "first_name",
          "last_name",
          "full_name",
          "email",
          "phone_code",
          "phone_number",
          "gender",
          "is_verified",
          "verified_at",
          "profile_image",
          "status",
          "notification",
          "created_at",
          "updated_at",
        ],
      });

      // Get comprehensive data for each user
      const formattedProviders = await Promise.all(
        usersResult.rows.map(async (user) => {
          // Check if provider profile exists
          const provider = await ServiceProvider.findOne({
            where: { user_id: user.id },
          });

          // If no provider record exists, return user data with profile_required flag
          if (!provider) {
            return {
              id: null,
              user_id: user.id,
              profile_required: true,
              message: "Please complete your provider profile setup",
              // User details
              first_name: user.first_name,
              last_name: user.last_name,
              full_name: user.full_name,
              email: user.email,
              phone_code: user.phone_code,
              phone_number: user.phone_number,
              gender: user.gender,
              is_verified: user.is_verified,
              verified_at: user.verified_at,
              profile_image: user.profile_image,
              status: user.status,
              notification: user.notification,
              created_at: user.created_at,
              updated_at: user.updated_at,
              // Provider details (null for incomplete profiles)
              provider_type: null,
              salon_name: null,
              banner_image: null,
              description: null,
              national_id_image_url: null,
              freelance_certificate_image_url: null,
              commercial_registration_image_url: null,
              overall_rating: null,
              total_reviews: null,
              total_bookings: null,
              total_customers: null,
              is_approved: null,
              is_available: null,
              step_completed: null,
              fcm_token: null,
              subscription_id: null,
              subscription_expiry: null,
              admin_verified: null,
              // Related data (empty for incomplete profiles)
              address: null,
              bank_details: [],
              availability: [],
              services: [],
              gallery: [],
            };
          }

          // Get address details
          let addressDetails = null;
          try {
            const address = await ServiceProviderAddress.findOne({
              where: { user_id: user.id },
              include: [
                {
                  model: db.models.Country,
                  as: "country",
                  attributes: ["id", "name"],
                },
                {
                  model: db.models.City,
                  as: "city",
                  attributes: ["id", "name"],
                },
              ],
            });

            if (address) {
              addressDetails = {
                id: address.id,
                address: address.address,
                latitude: address.latitude,
                longitude: address.longitude,
                country_id: address.country_id,
                city_id: address.city_id,
                country: address.country
                  ? {
                      id: address.country.id,
                      name: address.country.name,
                    }
                  : null,
                city: address.city
                  ? {
                      id: address.city.id,
                      name: address.city.name,
                    }
                  : null,
              };
            }
          } catch (addressError) {
            console.log("Address not found or error:", addressError.message);
            addressDetails = null;
          }

          // Get bank details
          let bankDetails = [];
          try {
            const bankDetailsData = await BankDetails.findAll({
              where: { service_provider_id: provider.id },
              attributes: ["id", "bank_name", "account_holder_name", "iban"],
            });

            bankDetails = bankDetailsData.map((bank) => ({
              id: bank.id,
              bank_name: bank.bank_name,
              account_holder_name: bank.account_holder_name,
              iban: bank.iban,
            }));
          } catch (bankError) {
            console.log("Bank details not found or error:", bankError.message);
            bankDetails = [];
          }

          // Get availability
          let availability = [];
          try {
            const availabilityData = await ServiceProviderAvailability.findAll({
              where: { service_provider_id: provider.id },
              attributes: ["id", "day", "from_time", "to_time", "available"],
            });

            availability = availabilityData.map((avail) => ({
              id: avail.id,
              day: avail.day,
              from_time: avail.from_time,
              to_time: avail.to_time,
              available: avail.available,
            }));
          } catch (availabilityError) {
            console.log(
              "Availability not found or error:",
              availabilityError.message
            );
            availability = [];
          }

          // Get services
          let services = [];
          try {
            const servicesData = await ServiceList.findAll({
              where: { service_provider_id: provider.id },
              include: [
                {
                  model: db.models.Category,
                  as: "category",
                  attributes: ["id", "title", "image"],
                },
                {
                  model: db.models.subcategory,
                  as: "subcategory",
                  attributes: ["id", "title", "image"],
                },
                {
                  model: db.models.ServiceLocation,
                  as: "location",
                  attributes: ["id", "title", "description"],
                },
              ],
              order: [["created_at", "DESC"]],
            });

            services = servicesData.map((service) => ({
              id: service.id,
              title: service.title,
              service_id: service.service_id,
              category_id: service.category_id,
              sub_category_id: service.sub_category_id,
              price: service.price,
              description: service.description,
              service_image: service.service_image,
              service_location: service.service_location,
              is_sub_service: service.is_sub_service,
              have_offers: service.have_offers,
              status: service.status,
              category: service.category,
              subcategory: service.subcategory,
              location: service.location,
            }));
          } catch (servicesError) {
            console.log("Services not found or error:", servicesError.message);
            services = [];
          }

          // Get gallery
          let gallery = [];
          try {
            const galleryData = await db.models.Gallery.findAll({
              where: { provider_id: provider.id },
              attributes: ["id", "image", "status", "type"],
            });

            gallery = galleryData.map((img) => ({
              id: img.id,
              image: img.image,
              status: img.status,
              type: img.type,
            }));
          } catch (galleryError) {
            console.log("Gallery not found or error:", galleryError.message);
            gallery = [];
          }

          // Return comprehensive provider data
          return {
            id: provider.id,
            user_id: provider.user_id,
            profile_required: false,
            // User details
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            email: user.email,
            phone_code: user.phone_code,
            phone_number: user.phone_number,
            gender: user.gender,
            is_verified: user.is_verified,
            verified_at: user.verified_at,
            profile_image: user.profile_image,
            status: user.status,
            notification: user.notification,
            // Provider details
            provider_type: provider.provider_type,
            salon_name: provider.salon_name,
            banner_image: provider.banner_image,
            description: provider.description,
            national_id_image_url: provider.national_id_image_url,
            freelance_certificate_image_url:
              provider.freelance_certificate_image_url,
            commercial_registration_image_url:
              provider.commercial_registration_image_url,
            overall_rating: provider.overall_rating,
            total_reviews: provider.total_reviews,
            total_bookings: provider.total_bookings,
            total_customers: provider.total_customers,
            is_approved: provider.is_approved,
            rejection_reason: provider.rejection_reason,
            is_available: provider.is_available,
            step_completed: provider.step_completed,
            fcm_token: provider.fcm_token,
            subscription_id: provider.subscription_id,
            subscription_expiry: provider.subscription_expiry,
            created_at: provider.created_at,
            updated_at: provider.updated_at,
            // Related data
            address: addressDetails,
            bank_details: bankDetails,
            availability: availability,
            services: services,
            gallery: gallery,
          };
        })
      );

      const totalPages = Math.ceil(usersResult.count / limit);
      const responseData = {
        providers: formattedProviders,
        pagination: {
          totalRecords: usersResult.count,
          perPage: limit,
          currentPage: page,
          totalPages,
        },
      };

      return response.success(
        "Providers list retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error fetching providers:", error);
      return response.exception("Failed to retrieve providers list", res);
    }
  }

  /**
   * Approve or reject provider profile by admin
   */
  async providerProfileAction(req, res) {
    console.log("ProviderController@providerProfileAction");
    console.log("Request body:", req.body);
    console.log("Request params:", req.params);

    // Check if request body exists and has required fields
    if (!req.body || Object.keys(req.body).length === 0) {
      return response.badRequest("Request body is required", res, {
        error_code: "MISSING_REQUEST_BODY",
        message: "Request body must contain approval action",
      });
    }

    const data = req.body;
    const providerId = parseInt(req.params.provider_id);

    // Validate that approve field exists
    if (!data.hasOwnProperty("approve")) {
      return response.badRequest("Approval action is required", res, {
        error_code: "MISSING_APPROVAL_ACTION",
        message:
          "Request body must contain approve field (1 for approve, 2 for reject)",
      });
    }

    try {
      // Find the service provider by ID
      const serviceProvider = await ServiceProvider.findByPk(providerId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "full_name",
              "email",
              "phone_code",
              "phone_number",
            ],
          },
        ],
      });

      if (!serviceProvider) {
        return response.notFound("Provider account not found", res, {
          error_code: "PROVIDER_NOT_FOUND",
          message: "No provider found with the specified ID",
        });
      }

      // Validate approval action
      if (![1, 2].includes(data.approve)) {
        return response.badRequest(
          "Invalid approval action. Use 1 for approve or 2 for reject",
          res,
          {
            error_code: "INVALID_APPROVAL_ACTION",
            message: "Approval action must be 1 (approve) or 2 (reject)",
          }
        );
      }

      // Validate rejection reason is provided when rejecting
      if (
        data.approve === 2 &&
        (!data.reason || data.reason.trim().length === 0)
      ) {
        return response.badRequest(
          "Rejection reason is required when rejecting a provider profile",
          res,
          {
            error_code: "REJECTION_REASON_REQUIRED",
            message: "Please provide a reason for rejection",
          }
        );
      }

      // Prepare update data
      const updateData = {
        is_approved: data.approve,
      };

      // Add rejection reason if rejecting
      if (data.approve === 2) {
        updateData.rejection_reason = data.reason.trim();
      } else {
        // Clear rejection reason when approving
        updateData.rejection_reason = null;
      }

      // Update the service provider
      await serviceProvider.update(updateData);

      // Prepare response message
      let responseMessage = "Provider profile has been approved successfully";
      let statusMessage = "approved";

      if (data.approve === 2) {
        responseMessage = "Provider profile has been rejected";
        statusMessage = "rejected";
      }

      // Get updated provider data
      const updatedProvider = await ServiceProvider.findByPk(providerId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "full_name",
              "email",
              "phone_code",
              "phone_number",
            ],
          },
        ],
      });

      const serviceProviderObj = {
        id: updatedProvider.id,
        user_id: updatedProvider.user_id,
        first_name: updatedProvider.user.first_name,
        last_name: updatedProvider.user.last_name,
        full_name: updatedProvider.user.full_name,
        email: updatedProvider.user.email,
        phone_code: updatedProvider.user.phone_code,
        phone_number: updatedProvider.user.phone_number,
        provider_type: updatedProvider.provider_type,
        salon_name: updatedProvider.salon_name,
        step_completed: updatedProvider.step_completed,
        is_approved: updatedProvider.is_approved,
        rejection_reason: updatedProvider.rejection_reason,
        status: statusMessage,
        updated_at: updatedProvider.updated_at,
      };

      return response.success(responseMessage, res, serviceProviderObj);
    } catch (error) {
      console.error("Error in providerProfileAction:", error);
      return response.exception(
        "An error occurred while processing the provider profile action",
        res
      );
    }
  }

  /**
   * Get comprehensive provider profile with all related data (for authenticated providers)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with provider profile data
   */
  async getProviderProfile(req, res) {
    console.log("ProviderController@getProviderProfile - START");
    console.log("Request headers:", req.headers);
    console.log("Request user:", req.user ? "User exists" : "No user");
    console.log(
      "Request provider:",
      req.provider ? "Provider exists" : "No provider"
    );

    try {
      // Validate that user exists in request
      if (!req.user) {
        console.error("❌ No user found in request");
        return response.unauthorized("User not authenticated", res, {
          error_code: "USER_NOT_FOUND",
          message: "User authentication required",
        });
      }

      const provider = req.provider;
      const user = req.user;
      // If no provider record exists, return error response as per industry standards
      if (!provider) {
        console.log("❌ Provider profile not found for user:", user.id);
        return response.notFound("Provider profile not found", res, {
          error_code: "PROVIDER_PROFILE_NOT_FOUND",
          message:
            "Provider profile has not been created yet. Please complete your profile setup.",
        });
      }

      // Get basic provider details first (without includes to avoid association errors)
      const basicProvider = await ServiceProvider.findByPk(provider.id);

      if (!basicProvider) {
        return response.notFound("Provider profile not found", res);
      }

      // Get user details separately
      const userDetails = await User.findByPk(user.id, {
        attributes: [
          "id",
          "first_name",
          "last_name",
          "full_name",
          "email",
          "phone_code",
          "phone_number",
          "gender",
          "is_verified",
          "verified_at",
          "profile_image",
          "status",
          "notification",
        ],
      });

      // Get address details separately (if exists)
      let addressDetails = null;
      try {
        const address = await ServiceProviderAddress.findOne({
          where: { user_id: user.id },
          include: [
            {
              model: db.models.Country,
              as: "country",
              attributes: ["id", "name"],
            },
            {
              model: db.models.City,
              as: "city",
              attributes: ["id", "name"],
            },
          ],
        });

        if (address) {
          addressDetails = {
            id: address.id,
            address: address.address,
            latitude: address.latitude,
            longitude: address.longitude,
            country_id: address.country_id,
            city_id: address.city_id,
            country: address.country
              ? {
                  id: address.country.id,
                  name: address.country.name,
                }
              : null,
            city: address.city
              ? {
                  id: address.city.id,
                  name: address.city.name,
                }
              : null,
          };
        }
      } catch (addressError) {
        console.log("Address not found or error:", addressError.message);
        addressDetails = null;
      }

      // Get bank details separately (if exists)
      let bankDetails = [];
      try {
        const bankDetailsData = await BankDetails.findAll({
          where: { service_provider_id: provider.id },
          attributes: ["id", "bank_name", "account_holder_name", "iban"],
        });

        bankDetails = bankDetailsData.map((bank) => ({
          id: bank.id,
          bank_name: bank.bank_name,
          account_holder_name: bank.account_holder_name,
          iban: bank.iban,
        }));
      } catch (bankError) {
        console.log("Bank details not found or error:", bankError.message);
        bankDetails = [];
      }

      // Get availability separately (if exists)
      let availability = [];
      try {
        const availabilityData = await ServiceProviderAvailability.findAll({
          where: { service_provider_id: provider.id },
          attributes: ["id", "day", "from_time", "to_time", "available"],
        });

        availability = availabilityData.map((avail) => ({
          id: avail.id,
          day: avail.day,
          from_time: avail.from_time,
          to_time: avail.to_time,
          available: avail.available,
        }));
      } catch (availabilityError) {
        console.log(
          "Availability not found or error:",
          availabilityError.message
        );
        availability = [];
      }

      // Get services separately (if exists)
      let services = [];
      try {
        const servicesData = await ServiceList.findAll({
          where: { service_provider_id: provider.id },
          include: [
            {
              model: db.models.Category,
              as: "category",
              attributes: ["id", "title", "image"],
            },
            {
              model: db.models.subcategory,
              as: "subcategory",
              attributes: ["id", "title", "image"],
            },
            {
              model: db.models.ServiceLocation,
              as: "location",
              attributes: ["id", "title", "description"],
            },
          ],
          order: [["created_at", "DESC"]],
        });

        services = servicesData.map((service) => ({
          id: service.id,
          title: service.title,
          service_id: service.service_id,
          category_id: service.category_id,
          sub_category_id: service.sub_category_id,
          price: service.price,
          description: service.description,
          service_image: service.service_image,
          service_location: service.service_location,
          is_sub_service: service.is_sub_service,
          have_offers: service.have_offers,
          status: service.status,
          category: service.category,
          subcategory: service.subcategory,
          location: service.location,
        }));
      } catch (servicesError) {
        console.log("Services not found or error:", servicesError.message);
        services = [];
      }

      // Get gallery separately (if exists)
      let gallery = [];
      try {
        const galleryData = await db.models.Gallery.findAll({
          where: { provider_id: provider.id },
          attributes: ["id", "image", "status", "type"],
        });

        gallery = galleryData.map((img) => ({
          id: img.id,
          image: img.image,
          status: img.status,
          type: img.type,
        }));
      } catch (galleryError) {
        console.log("Gallery not found or error:", galleryError.message);
        gallery = [];
      }

      // Transform the data into the required format
      const profileData = {
        // Basic Provider Info
        id: basicProvider.id,
        provider_type: basicProvider.provider_type,
        salon_name: basicProvider.salon_name,
        description: basicProvider.description,
        banner_image: basicProvider.banner_image,
        step_completed: basicProvider.step_completed,
        is_approved: basicProvider.is_approved,
        rejection_reason: basicProvider.rejection_reason,
        is_available: basicProvider.is_available,
        overall_rating: basicProvider.overall_rating,
        total_reviews: basicProvider.total_reviews,
        total_bookings: basicProvider.total_bookings,
        total_customers: basicProvider.total_customers,
        notification: basicProvider.notification,
        subscription_expiry: basicProvider.subscription_expiry,

        // Documents
        national_id_image_url: basicProvider.national_id_image_url,
        freelance_certificate_image_url:
          basicProvider.freelance_certificate_image_url,
        commercial_registration_image_url:
          basicProvider.commercial_registration_image_url,

        // User Info
        user: userDetails
          ? {
              id: userDetails.id,
              first_name: userDetails.first_name,
              last_name: userDetails.last_name,
              full_name: userDetails.full_name,
              email: userDetails.email,
              phone_code: userDetails.phone_code,
              phone_number: userDetails.phone_number,
              gender: userDetails.gender,
              is_verified: userDetails.is_verified,
              verified_at: userDetails.verified_at,
              profile_image: userDetails.profile_image,
              status: userDetails.status,
              notification: userDetails.notification,
            }
          : null,

        // Address Info
        address: addressDetails,

        // Bank Details
        bank_details: bankDetails,

        // Availability
        availability: availability,

        // Services
        services: services,

        // Gallery
        gallery: gallery,
      };

      console.log("✅ Provider profile retrieved successfully");
      return response.success(
        "Provider profile retrieved successfully",
        res,
        profileData
      );
    } catch (error) {
      console.error("❌ Error getting provider profile:", error);
      console.error("Error stack:", error.stack);
      return response.exception("Failed to retrieve provider profile", res);
    }
  }

  /**
   * Admin API to change service provider status (active/inactive)
   */
  async changeProviderStatus(req, res) {
    console.log("ProviderController@changeProviderStatus");
    const { provider_id, status } = req.body;

    try {
      // Validate required fields
      if (!provider_id) {
        return response.badRequest("Provider ID is required", res, {
          error_code: "MISSING_PROVIDER_ID",
          message: "Provider ID must be provided",
        });
      }

      if (status === undefined || status === null) {
        return response.badRequest("Status is required", res, {
          error_code: "MISSING_STATUS",
          message: "Status must be provided (1 for active, 0 for inactive)",
        });
      }

      // Validate status value
      if (![0, 1].includes(status)) {
        return response.badRequest(
          "Invalid status value. Use 1 for active or 0 for inactive",
          res,
          {
            error_code: "INVALID_STATUS_VALUE",
            message: "Status must be 1 (active) or 0 (inactive)",
          }
        );
      }

      // Find the provider by ID
      const provider = await ServiceProvider.findByPk(provider_id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "full_name",
              "email",
              "phone_code",
              "phone_number",
              "status",
            ],
          },
        ],
      });

      if (!provider) {
        return response.notFound("Provider account not found", res, {
          error_code: "PROVIDER_NOT_FOUND",
          message: "No provider found with the specified ID",
        });
      }

      // Check if user exists
      if (!provider.user) {
        return response.notFound("User account not found", res, {
          error_code: "USER_NOT_FOUND",
          message: "User account associated with this provider not found",
        });
      }

      // Update user status (this controls authentication)
      await provider.user.update({ status: status });

      // Prepare response message
      const statusText = status === 1 ? "active" : "inactive";
      const responseMessage = `Provider status has been changed to ${statusText} successfully`;

      // Get updated provider data
      const updatedProvider = await ServiceProvider.findByPk(provider_id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "full_name",
              "email",
              "phone_code",
              "phone_number",
              "status",
            ],
          },
        ],
      });

      const providerData = {
        id: updatedProvider.id,
        user_id: updatedProvider.user_id,
        first_name: updatedProvider.user.first_name,
        last_name: updatedProvider.user.last_name,
        full_name: updatedProvider.user.full_name,
        email: updatedProvider.user.email,
        phone_code: updatedProvider.user.phone_code,
        phone_number: updatedProvider.user.phone_number,
        provider_type: updatedProvider.provider_type,
        salon_name: updatedProvider.salon_name,
        status: updatedProvider.user.status,
        status_text: statusText,
        updated_at: updatedProvider.user.updated_at,
      };

      return response.success(responseMessage, res, providerData);
    } catch (error) {
      console.error("Error in changeProviderStatus:", error);
      return response.exception(
        "An error occurred while changing provider status",
        res
      );
    }
  }

  /**
   * Get specific provider details by ID with comprehensive data structure (similar to getAllProviders)
   */
  async getProvider(req, res) {
    console.log("ProviderController@getProvider");
    const providerId = parseInt(req.params.provider_id);

    try {
      // Find the provider by ID
      const provider = await ServiceProvider.findByPk(providerId);

      if (!provider) {
        return response.badRequest("Provider account not found", res, false);
      }

      // Get user details
      const user = await User.findByPk(provider.user_id);

      if (!user) {
        return response.badRequest("User account not found", res, false);
      }

      // Get address details
      let addressDetails = null;
      try {
        const address = await ServiceProviderAddress.findOne({
          where: { user_id: user.id },
          include: [
            {
              model: db.models.Country,
              as: "country",
              attributes: ["id", "name"],
            },
            {
              model: db.models.City,
              as: "city",
              attributes: ["id", "name"],
            },
          ],
        });

        if (address) {
          addressDetails = {
            id: address.id,
            address: address.address,
            latitude: address.latitude,
            longitude: address.longitude,
            country_id: address.country_id,
            city_id: address.city_id,
            country: address.country
              ? {
                  id: address.country.id,
                  name: address.country.name,
                }
              : null,
            city: address.city
              ? {
                  id: address.city.id,
                  name: address.city.name,
                }
              : null,
          };
        }
      } catch (addressError) {
        console.log("Address not found or error:", addressError.message);
        addressDetails = null;
      }

      // Get bank details
      let bankDetails = [];
      try {
        const bankDetailsData = await BankDetails.findAll({
          where: { service_provider_id: provider.id },
          attributes: ["id", "bank_name", "account_holder_name", "iban"],
        });

        bankDetails = bankDetailsData.map((bank) => ({
          id: bank.id,
          bank_name: bank.bank_name,
          account_holder_name: bank.account_holder_name,
          iban: bank.iban,
        }));
      } catch (bankError) {
        console.log("Bank details not found or error:", bankError.message);
        bankDetails = [];
      }

      // Get availability
      let availability = [];
      try {
        const availabilityData = await ServiceProviderAvailability.findAll({
          where: { service_provider_id: provider.id },
          attributes: ["id", "day", "from_time", "to_time", "available"],
        });

        availability = availabilityData.map((avail) => ({
          id: avail.id,
          day: avail.day,
          from_time: avail.from_time,
          to_time: avail.to_time,
          available: avail.available,
        }));
      } catch (availabilityError) {
        console.log(
          "Availability not found or error:",
          availabilityError.message
        );
        availability = [];
      }

      // Get services
      let services = [];
      try {
        const servicesData = await ServiceList.findAll({
          where: { service_provider_id: provider.id },
          include: [
            {
              model: db.models.Category,
              as: "category",
              attributes: ["id", "title", "image"],
            },
            {
              model: db.models.subcategory,
              as: "subcategory",
              attributes: ["id", "title", "image"],
            },
            {
              model: db.models.ServiceLocation,
              as: "location",
              attributes: ["id", "title", "description"],
            },
          ],
          order: [["created_at", "DESC"]],
        });

        services = servicesData.map((service) => ({
          id: service.id,
          title: service.title,
          service_id: service.service_id,
          category_id: service.category_id,
          sub_category_id: service.sub_category_id,
          price: service.price,
          description: service.description,
          service_image: service.service_image,
          service_location: service.service_location,
          is_sub_service: service.is_sub_service,
          have_offers: service.have_offers,
          status: service.status,
          category: service.category,
          subcategory: service.subcategory,
          location: service.location,
        }));
      } catch (servicesError) {
        console.log("Services not found or error:", servicesError.message);
        services = [];
      }

      // Get gallery
      let gallery = [];
      try {
        const galleryData = await db.models.Gallery.findAll({
          where: { provider_id: provider.id },
          attributes: ["id", "image", "status", "type"],
        });

        gallery = galleryData.map((img) => ({
          id: img.id,
          image: img.image,
          status: img.status,
          type: img.type,
        }));
      } catch (galleryError) {
        console.log("Gallery not found or error:", galleryError.message);
        gallery = [];
      }

      // Return comprehensive provider data (same structure as getAllProviders)
      const providerData = {
        id: provider.id,
        user_id: provider.user_id,
        profile_required: false,
        // User details
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        gender: user.gender,
        is_verified: user.is_verified,
        verified_at: user.verified_at,
        profile_image: user.profile_image,
        status: user.status,
        notification: user.notification,
        // Provider details
        provider_type: provider.provider_type,
        salon_name: provider.salon_name,
        banner_image: provider.banner_image,
        description: provider.description,
        national_id_image_url: provider.national_id_image_url,
        freelance_certificate_image_url:
          provider.freelance_certificate_image_url,
        commercial_registration_image_url:
          provider.commercial_registration_image_url,
        overall_rating: provider.overall_rating,
        total_reviews: provider.total_reviews,
        total_bookings: provider.total_bookings,
        total_customers: provider.total_customers,
        is_approved: provider.is_approved,
        rejection_reason: provider.rejection_reason,
        is_available: provider.is_available,
        step_completed: provider.step_completed,
        fcm_token: provider.fcm_token,
        subscription_id: provider.subscription_id,
        subscription_expiry: provider.subscription_expiry,
        admin_verified: provider.admin_verified,
        created_at: provider.created_at,
        updated_at: provider.updated_at,
        // Related data
        address: addressDetails,
        bank_details: bankDetails,
        availability: availability,
        services: services,
        gallery: gallery,
      };

      return response.success(
        "Provider details retrieved successfully",
        res,
        providerData
      );
    } catch (error) {
      console.error("Error fetching provider:", error);
      return response.exception("Failed to retrieve provider details", res);
    }
  }

  /**
   * Update provider's basic information
   */
  async updateProvider(req, res) {
    console.log("ProviderController@updateProvider");
    const updateData = req.body;
    const user = req.user;
    const provider = req.provider;

    try {
      // Validate that update data is provided
      if (!updateData || Object.keys(updateData).length === 0) {
        return response.badRequest("Update data is required", res, {
          error_code: "MISSING_UPDATE_DATA",
          message: "Please provide the fields you want to update",
        });
      }

      // Separate fields for each model
      const userFields = {};
      const providerFields = {};
      const addressFields = {};
      const bankFields = {};
      const availabilityFields = {};
      const serviceListFields = {};

      // Define allowed fields for each model
      const allowedUserFields = [
        "first_name",
        "last_name",
        "full_name",
        "email",
        "gender",
        "profile_image",
        "notification",
        "fcm_token",
      ];

      const allowedProviderFields = [
        "provider_type",
        "salon_name",
        "banner_image",
        "description",
        "national_id_image_url",
        "freelance_certificate_image_url",
        "commercial_registration_image_url",
        "is_available",
        "notification",
        "fcm_token",
        "subscription_id",
        "subscription_expiry",
      ];

      const allowedAddressFields = [
        "address",
        "latitude",
        "longitude",
        "country_id",
        "city_id",
      ];

      const allowedBankFields = ["account_holder_name", "bank_name", "iban"];

      const allowedAvailabilityFields = ["availability"];

      const allowedServiceListFields = ["service_list"];

      // Categorize fields
      Object.keys(updateData).forEach((key) => {
        if (allowedUserFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (allowedProviderFields.includes(key)) {
          providerFields[key] = updateData[key];
        } else if (allowedAddressFields.includes(key)) {
          addressFields[key] = updateData[key];
        } else if (allowedBankFields.includes(key)) {
          bankFields[key] = updateData[key];
        } else if (allowedAvailabilityFields.includes(key)) {
          availabilityFields[key] = updateData[key];
        } else if (allowedServiceListFields.includes(key)) {
          serviceListFields[key] = updateData[key];
        }
      });

      // Validate that at least one valid field is provided
      if (
        Object.keys(userFields).length === 0 &&
        Object.keys(providerFields).length === 0 &&
        Object.keys(addressFields).length === 0 &&
        Object.keys(bankFields).length === 0 &&
        Object.keys(availabilityFields).length === 0 &&
        Object.keys(serviceListFields).length === 0
      ) {
        return response.badRequest("No valid fields provided for update", res, {
          error_code: "INVALID_FIELDS",
          message: "Please provide valid fields to update",
          allowed_fields: {
            user: allowedUserFields,
            provider: allowedProviderFields,
            address: allowedAddressFields,
            bank: allowedBankFields,
            availability: allowedAvailabilityFields,
            service_list: allowedServiceListFields,
          },
        });
      }

      // Handle full_name update if first_name or last_name is updated
      if (userFields.first_name || userFields.last_name) {
        const currentUser = await User.findByPk(user.id);
        const firstName = userFields.first_name || currentUser.first_name;
        const lastName = userFields.last_name || currentUser.last_name;
        userFields.full_name = `${firstName} ${lastName}`;
      }

      // Update User model if user fields are provided
      if (Object.keys(userFields).length > 0) {
        await user.update(userFields);
        console.log("User fields updated:", Object.keys(userFields));
      }

      // Update ServiceProvider model if provider fields are provided
      if (Object.keys(providerFields).length > 0 && provider) {
        await provider.update(providerFields);
        console.log("Provider fields updated:", Object.keys(providerFields));
      }

      // Update address if address fields are provided
      if (Object.keys(addressFields).length > 0) {
        let address = await ServiceProviderAddress.findOne({
          where: { user_id: user.id },
        });

        if (address) {
          await address.update(addressFields);
        } else {
          // Create new address record
          await ServiceProviderAddress.create({
            user_id: user.id,
            ...addressFields,
          });
        }
        console.log("Address fields updated:", Object.keys(addressFields));
      }

      // Update bank details if bank fields are provided
      if (Object.keys(bankFields).length > 0 && provider) {
        let bankDetails = await BankDetails.findOne({
          where: { service_provider_id: provider.id },
        });

        if (bankDetails) {
          await bankDetails.update(bankFields);
        } else {
          // Create new bank details record
          await BankDetails.create({
            service_provider_id: provider.id,
            ...bankFields,
          });
        }
        console.log("Bank fields updated:", Object.keys(bankFields));
      }

      // Update availability if availability fields are provided
      if (Object.keys(availabilityFields).length > 0 && provider) {
        const availabilityData = availabilityFields.availability;

        if (Array.isArray(availabilityData) && availabilityData.length > 0) {
          // Validate availability data
          const daysOfWeek = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          const errors = [];

          availabilityData.forEach((item, index) => {
            if (!item.day) {
              errors.push(
                `Day is required for availability record ${index + 1}`
              );
            } else if (!daysOfWeek.includes(item.day.toLowerCase())) {
              errors.push(
                `Invalid day '${item.day}' for availability record ${index + 1}`
              );
            }

            if (!item.from_time) {
              errors.push(`From time is required for ${item.day}`);
            }

            if (!item.to_time) {
              errors.push(`To time is required for ${item.day}`);
            }

            // Validate time format (HH:MM)
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (item.from_time && !timeRegex.test(item.from_time)) {
              errors.push(
                `Invalid from_time format for ${item.day}. Use HH:MM format`
              );
            }
            if (item.to_time && !timeRegex.test(item.to_time)) {
              errors.push(
                `Invalid to_time format for ${item.day}. Use HH:MM format`
              );
            }

            // Validate time range
            if (item.from_time && item.to_time) {
              const fromTime = new Date(`2000-01-01T${item.from_time}:00`);
              const toTime = new Date(`2000-01-01T${item.to_time}:00`);
              if (fromTime >= toTime) {
                errors.push(`From time must be before to time for ${item.day}`);
              }
            }
          });

          if (errors.length > 0) {
            return response.badRequest(errors.join(", "), res, {
              error_code: "AVAILABILITY_VALIDATION_ERROR",
              message: "Invalid availability data provided",
            });
          }

          // Delete existing availability records for this provider
          await ServiceProviderAvailability.destroy({
            where: { service_provider_id: provider.id },
          });

          // Create new availability records
          const availabilityRecords = availabilityData.map((item) => ({
            service_provider_id: provider.id,
            day: item.day.toLowerCase(),
            from_time: item.from_time,
            to_time: item.to_time,
            available: item.available !== undefined ? item.available : 1,
          }));

          await ServiceProviderAvailability.bulkCreate(availabilityRecords);
          console.log(
            "Availability updated:",
            availabilityData.length,
            "records"
          );
        }
      }

      // Update service list if service list fields are provided
      if (Object.keys(serviceListFields).length > 0 && provider) {
        const serviceListData = serviceListFields.service_list;

        if (Array.isArray(serviceListData) && serviceListData.length > 0) {
          // Validate service list data
          const errors = [];

          serviceListData.forEach((item, index) => {
            if (!item.id) {
              errors.push(
                `Service ID is required for service list record ${index + 1}`
              );
            }

            if (item.title && typeof item.title !== "string") {
              errors.push(
                `Title must be a string for service list record ${index + 1}`
              );
            }

            if (
              item.price !== undefined &&
              (isNaN(item.price) || item.price < 0)
            ) {
              errors.push(
                `Price must be a positive number for service list record ${
                  index + 1
                }`
              );
            }

            if (item.description && typeof item.description !== "string") {
              errors.push(
                `Description must be a string for service list record ${
                  index + 1
                }`
              );
            }

            if (item.service_image && typeof item.service_image !== "string") {
              errors.push(
                `Service image must be a string for service list record ${
                  index + 1
                }`
              );
            }
          });

          if (errors.length > 0) {
            return response.badRequest(errors.join(", "), res, {
              error_code: "SERVICE_LIST_VALIDATION_ERROR",
              message: "Invalid service list data provided",
            });
          }

          // Update each service list item
          for (const item of serviceListData) {
            const updateData = {};

            if (item.title !== undefined) updateData.title = item.title;
            if (item.price !== undefined) updateData.price = item.price;
            if (item.description !== undefined)
              updateData.description = item.description;
            if (item.service_image !== undefined)
              updateData.service_image = item.service_image;
            if (item.status !== undefined) updateData.status = item.status;
            if (item.have_offers !== undefined)
              updateData.have_offers = item.have_offers;
            if (item.service_location !== undefined)
              updateData.service_location = item.service_location;

            if (Object.keys(updateData).length > 0) {
              await ServiceList.update(updateData, {
                where: {
                  id: item.id,
                  service_provider_id: provider.id,
                  deleted_at: null,
                },
              });
            }
          }
          console.log(
            "Service list updated:",
            serviceListData.length,
            "records"
          );
        }
      }

      // Get updated data for response
      const updatedUser = await User.findByPk(user.id);
      const updatedProvider = provider
        ? await ServiceProvider.findByPk(provider.id)
        : null;
      const updatedAddress = await ServiceProviderAddress.findOne({
        where: { user_id: user.id },
        include: [
          {
            model: db.models.Country,
            as: "country",
            attributes: ["id", "name"],
          },
          {
            model: db.models.City,
            as: "city",
            attributes: ["id", "name"],
          },
        ],
      });
      const updatedBankDetails = provider
        ? await BankDetails.findOne({
            where: { service_provider_id: provider.id },
          })
        : null;

      // Get updated availability
      let updatedAvailability = [];
      if (provider) {
        try {
          const availabilityData = await ServiceProviderAvailability.findAll({
            where: { service_provider_id: provider.id },
            attributes: ["id", "day", "from_time", "to_time", "available"],
          });

          updatedAvailability = availabilityData.map((avail) => ({
            id: avail.id,
            day: avail.day,
            from_time: avail.from_time,
            to_time: avail.to_time,
            available: avail.available,
          }));
        } catch (availabilityError) {
          console.log(
            "Availability not found or error:",
            availabilityError.message
          );
          updatedAvailability = [];
        }
      }

      // Get updated services
      let updatedServices = [];
      if (provider) {
        try {
          const servicesData = await ServiceList.findAll({
            where: {
              service_provider_id: provider.id,
              deleted_at: null,
            },
            attributes: [
              "id",
              "title",
              "service_id",
              "category_id",
              "sub_category_id",
              "price",
              "description",
              "service_image",
              "status",
              "have_offers",
              "service_location",
            ],
          });

          updatedServices = servicesData.map((service) => ({
            id: service.id,
            title: service.title,
            service_id: service.service_id,
            category_id: service.category_id,
            sub_category_id: service.sub_category_id,
            price: service.price,
            description: service.description,
            service_image: service.service_image,
            status: service.status,
            have_offers: service.have_offers,
            service_location: service.service_location,
          }));
        } catch (servicesError) {
          console.log("Services not found or error:", servicesError.message);
          updatedServices = [];
        }
      }

      // Prepare response data
      const responseData = {
        user: {
          id: updatedUser.id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          full_name: updatedUser.full_name,
          email: updatedUser.email,
          phone_code: updatedUser.phone_code,
          phone_number: updatedUser.phone_number,
          gender: updatedUser.gender,
          is_verified: updatedUser.is_verified,
          verified_at: updatedUser.verified_at,
          profile_image: updatedUser.profile_image,
          status: updatedUser.status,
          notification: updatedUser.notification,
          fcm_token: updatedUser.fcm_token,
        },
        provider: updatedProvider
          ? {
              id: updatedProvider.id,
              provider_type: updatedProvider.provider_type,
              salon_name: updatedProvider.salon_name,
              banner_image: updatedProvider.banner_image,
              description: updatedProvider.description,
              national_id_image_url: updatedProvider.national_id_image_url,
              freelance_certificate_image_url:
                updatedProvider.freelance_certificate_image_url,
              commercial_registration_image_url:
                updatedProvider.commercial_registration_image_url,
              overall_rating: updatedProvider.overall_rating,
              total_reviews: updatedProvider.total_reviews,
              total_bookings: updatedProvider.total_bookings,
              total_customers: updatedProvider.total_customers,
              is_approved: updatedProvider.is_approved,
              rejection_reason: updatedProvider.rejection_reason,
              is_available: updatedProvider.is_available,
              step_completed: updatedProvider.step_completed,
              notification: updatedProvider.notification,
              fcm_token: updatedProvider.fcm_token,
              subscription_id: updatedProvider.subscription_id,
              subscription_expiry: updatedProvider.subscription_expiry,
            }
          : null,
        address: updatedAddress
          ? {
              id: updatedAddress.id,
              address: updatedAddress.address,
              latitude: updatedAddress.latitude,
              longitude: updatedAddress.longitude,
              country_id: updatedAddress.country_id,
              city_id: updatedAddress.city_id,
              country: updatedAddress.country
                ? {
                    id: updatedAddress.country.id,
                    name: updatedAddress.country.name,
                  }
                : null,
              city: updatedAddress.city
                ? {
                    id: updatedAddress.city.id,
                    name: updatedAddress.city.name,
                  }
                : null,
            }
          : null,
        bank_details: updatedBankDetails
          ? {
              id: updatedBankDetails.id,
              account_holder_name: updatedBankDetails.account_holder_name,
              bank_name: updatedBankDetails.bank_name,
              iban: updatedBankDetails.iban,
            }
          : null,
        availability: updatedAvailability,
        services: updatedServices,
        updated_fields: {
          user: Object.keys(userFields),
          provider: Object.keys(providerFields),
          address: Object.keys(addressFields),
          bank: Object.keys(bankFields),
          availability: Object.keys(availabilityFields),
          service_list: Object.keys(serviceListFields),
        },
      };

      return response.success(
        "Provider profile updated successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error updating provider profile:", error);
      return response.exception("Failed to update provider profile", res);
    }
  }

  /**
   * Handle file uploads for provider documents
   */
  async uploadFiles(req, res) {
    console.log("ProviderController@uploadFiles");
    const file = req.file;

    if (!file) {
      return response.badRequest("No file was uploaded", res, false);
    }

    const result = {
      file: file.location,
    };

    return response.success("File uploaded successfully", res, result);
  }

  /**
   * Enhanced provider logout with industry-standard security features
   * Implements comprehensive token invalidation, security headers, and audit logging
   */
  async logOut(req, res) {
    const startTime = Date.now();
    const logoutId = `logout_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      console.log(`[${logoutId}] Provider logout initiated`);

      // Extract and validate authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log(`[${logoutId}] ❌ No authorization header provided`);
        return this.sendLogoutErrorResponse(
          res,
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication token is required",
          logoutId
        );
      }

      if (!authHeader.startsWith("Bearer ")) {
        console.log(`[${logoutId}] ❌ Invalid authorization header format`);
        return this.sendLogoutErrorResponse(
          res,
          401,
          "INVALID_TOKEN_FORMAT",
          "Invalid token format",
          logoutId
        );
      }

      const token = authHeader.split(" ")[1];
      if (!token || token.trim().length === 0) {
        console.log(`[${logoutId}] ❌ Empty token provided`);
        return this.sendLogoutErrorResponse(
          res,
          401,
          "EMPTY_TOKEN",
          "Token cannot be empty",
          logoutId
        );
      }

      // Validate token format (basic JWT structure check)
      if (!this.isValidJWTFormat(token)) {
        console.log(`[${logoutId}] ❌ Invalid JWT token format`);
        return this.sendLogoutErrorResponse(
          res,
          401,
          "INVALID_TOKEN_FORMAT",
          "Invalid token format",
          logoutId
        );
      }

      // Get user context for audit logging
      const user = req.user;
      const provider = req.provider;
      const userContext = {
        user_id: user?.id,
        provider_id: provider?.id,
        email: user?.email,
        phone: user?.phone_number,
      };

      console.log(`[${logoutId}] 🔍 Logging out provider:`, userContext);

      // Perform token invalidation with enhanced error handling
      const logoutResult = await this.performTokenInvalidation(token, logoutId);

      if (!logoutResult.success) {
        console.log(
          `[${logoutId}] ❌ Token invalidation failed:`,
          logoutResult.error
        );
        return this.sendLogoutErrorResponse(
          res,
          logoutResult.statusCode,
          logoutResult.errorCode,
          logoutResult.message,
          logoutId
        );
      }

      // Set comprehensive security headers
      this.setLogoutSecurityHeaders(res);

      // Log successful logout
      const duration = Date.now() - startTime;
      console.log(
        `[${logoutId}] ✅ Provider logout successful - Duration: ${duration}ms`,
        {
          user_id: userContext.user_id,
          provider_id: userContext.provider_id,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        }
      );

      // Return success response with audit information
      return this.sendLogoutSuccessResponse(
        res,
        logoutId,
        userContext,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${logoutId}] ❌ Unexpected error during logout:`, {
        error: error.message,
        stack: error.stack,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });

      return this.sendLogoutErrorResponse(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred during logout",
        logoutId
      );
    }
  }

  /**
   * Validate JWT token format (basic structure check)
   */
  isValidJWTFormat(token) {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split(".");
      if (parts.length !== 3) {
        return false;
      }

      // Each part should be base64url encoded
      const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
      return parts.every((part) => base64UrlRegex.test(part));
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform token invalidation with comprehensive error handling
   */
  async performTokenInvalidation(token, logoutId) {
    try {
      // Verify token exists and is valid before deletion
      const tokenExists = await this.verifyTokenExists(token);
      if (!tokenExists) {
        console.log(`[${logoutId}] ❌ Token not found in database`);
        return {
          success: false,
          statusCode: 401,
          errorCode: "TOKEN_NOT_FOUND",
          message: "Token not found or already invalidated",
        };
      }

      // Perform token deletion with transaction safety
      const deletedCount = await providerResources.logOut({ token: token });

      if (deletedCount === 0) {
        console.log(`[${logoutId}] ❌ No tokens were deleted`);
        return {
          success: false,
          statusCode: 500,
          errorCode: "TOKEN_DELETION_FAILED",
          message: "Failed to invalidate token",
        };
      }

      console.log(
        `[${logoutId}] ✅ Token successfully invalidated. Deleted count: ${deletedCount}`
      );
      return { success: true };
    } catch (error) {
      console.error(`[${logoutId}] ❌ Token invalidation error:`, error);

      // Categorize database errors
      if (
        error.name === "SequelizeConnectionError" ||
        error.name === "SequelizeDatabaseError"
      ) {
        return {
          success: false,
          statusCode: 503,
          errorCode: "DATABASE_ERROR",
          message: "Database service temporarily unavailable",
        };
      }

      return {
        success: false,
        statusCode: 500,
        errorCode: "TOKEN_INVALIDATION_ERROR",
        message: "Failed to invalidate token",
      };
    }
  }

  /**
   * Verify token exists in database before deletion
   */
  async verifyTokenExists(token) {
    try {
      const Token = require("../../../startup/model").models.Token;
      const tokenRecord = await Token.findOne({ where: { token: token } });
      return !!tokenRecord;
    } catch (error) {
      console.error("Error verifying token existence:", error);
      return false;
    }
  }

  /**
   * Set comprehensive security headers for logout response
   */
  setLogoutSecurityHeaders(res) {
    // Clear client-side tokens and cache
    res.setHeader("Clear-Site-Data", '"cache", "cookies", "storage"');
    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // CORS headers for logout
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  /**
   * Send standardized logout success response
   */
  sendLogoutSuccessResponse(res, logoutId, userContext, duration) {
    const responseData = {
      logout_id: logoutId,
      message: "Successfully logged out",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      security_info: {
        token_invalidated: true,
        cache_cleared: true,
        session_terminated: true,
      },
    };

    return res.status(200).json({
      statusCode: 200,
      api_ver: process.env.API_VER,
      success: true,
      message: "Successfully logged out",
      data: responseData,
    });
  }

  /**
   * Send standardized logout error response
   */
  sendLogoutErrorResponse(res, statusCode, errorCode, message, logoutId) {
    const errorResponse = {
      logout_id: logoutId,
      error_code: errorCode,
      message: message,
      timestamp: new Date().toISOString(),
      security_info: {
        token_invalidated: false,
        cache_cleared: false,
        session_terminated: false,
      },
    };

    // Set security headers even for error responses
    this.setLogoutSecurityHeaders(res);

    return res.status(statusCode).json({
      statusCode: statusCode,
      api_ver: process.env.API_VER,
      success: false,
      error: errorResponse,
    });
  }

  /**
   * Change provider's password after verifying old password
   * Implements industry-standard password change with security best practices
   */
  async changePassword(req, res) {
    console.log("ProviderController@changePassword");
    try {
      const { old_password, new_password } = req.body;
      const provider = req.provider;
      const user = req.user;

      // Verify current password
      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch) {
        return response.unauthorized(
          "Current password is incorrect",
          res,
          {
            error_code: "INVALID_CURRENT_PASSWORD",
            message: "The current password you entered is incorrect"
          }
        );
      }

      // Hash new password with industry-standard salt rounds
      const hashedNewPassword = await bcrypt.hash(new_password, 12);
      
      // Update user password
      await userResources.updateUser(
        { 
          password: hashedNewPassword,
          updated_at: new Date()
        },
        { id: user.id }
      );

      // Log password change for security audit (without sensitive data)
      console.log(`Password changed successfully for provider user ID: ${user.id} at ${new Date().toISOString()}`);

      return response.success(
        "Password changed successfully",
        res,
        {
          message: "Your password has been updated successfully. Please use your new password for future logins.",
          updated_at: new Date()
        }
      );
    } catch (error) {
      console.error("Error in changePassword:", error);
      return response.exception(
        "An error occurred while changing password. Please try again.",
        res
      );
    }
  }

  /**
   * Delete provider account after password verification
   */
  /**
   * Delete provider account with comprehensive soft deletion
   * Implements industry-level account deletion with proper cleanup
   */
  async deleteMyAccount(req, res) {
    console.log("ProviderController@deleteMyAccount");
    const { password, reason_id } = req.body;
    const user = req.user;
    const provider = req.provider;

    try {
      // Validate password
      if (!password) {
        return response.badRequest(
          "Password is required for account deletion",
          res,
          {
            error_code: "PASSWORD_REQUIRED",
            message: "Please provide your password to confirm account deletion",
          }
        );
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return response.unauthorized("Incorrect password", res, {
          error_code: "INVALID_PASSWORD",
          message: "The password you entered is incorrect",
        });
      }

      // Start transaction for atomic operations
      const transaction = await db.sequelize.transaction();

      try {
        // Soft delete related data first (if provider exists)
        if (provider) {
          // Soft delete service lists
          await ServiceList.update(
            { status: 0, deleted_at: new Date() },
            {
              where: { service_provider_id: provider.id },
              transaction,
            }
          );

          // Soft delete availability records
          await ServiceProviderAvailability.update(
            { available: 0, deleted_at: new Date() },
            {
              where: { service_provider_id: provider.id },
              transaction,
            }
          );

          // Soft delete bank details
          await BankDetails.update(
            { deleted_at: new Date() },
            {
              where: { service_provider_id: provider.id },
              transaction,
            }
          );

          // Soft delete gallery images
          await db.models.Gallery.update(
            { status: 0, deleted_at: new Date() },
            {
              where: { provider_id: provider.id },
              transaction,
            }
          );

          // Soft delete service provider address
          await ServiceProviderAddress.update(
            { deleted_at: new Date() },
            {
              where: { user_id: user.id },
              transaction,
            }
          );

          // Soft delete the service provider
          await ServiceProvider.update(
            {
              status: 0,
              is_available: 0,
              deleted_at: new Date(),
            },
            {
              where: { id: provider.id },
              transaction,
            }
          );

          console.log(
            `Service provider ${provider.id} soft deleted successfully`
          );
        }

        // Soft delete user account
        await User.update(
          {
            status: 0,
            notification: 0,
            deleted_at: new Date(),
          },
          {
            where: { id: user.id },
            transaction,
          }
        );

        // Invalidate all tokens for this user (if token model exists)
        try {
          if (db.models.Token) {
            await db.models.Token.update(
              {
                is_active: 0,
                deleted_at: new Date(),
              },
              {
                where: { user_id: user.id },
                transaction,
              }
            );
          }
        } catch (tokenError) {
          console.log(
            "Token invalidation skipped (Token model may not exist):",
            tokenError.message
          );
        }

        // Commit transaction
        await transaction.commit();

        // Log deletion for audit purposes
        console.log(`Provider account deletion completed:`, {
          user_id: user.id,
          provider_id: provider?.id,
          email: user.email,
          phone: user.phone_number,
          reason_id: reason_id,
          deleted_at: new Date().toISOString(),
        });

        return response.success(
          "Your account has been deleted successfully",
          res,
          {
            message: "Account deletion completed",
            user_id: user.id,
            provider_id: provider?.id,
            deletion_timestamp: new Date().toISOString(),
            note: "Your account has been soft deleted successfully.",
          }
        );
      } catch (transactionError) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error(
          "Transaction error during account deletion:",
          transactionError
        );
        throw transactionError;
      }
    } catch (error) {
      console.error("Error deleting provider account:", error);
      return response.exception(
        "An error occurred while deleting your account",
        res
      );
    }
  }

  /**
   * Set bank details for provider
   */
  async setBankDetails(req, res) {
    console.log("ProviderController@setBankDetails");
    const provider = req.provider; // From provider auth middleware
    const bankData = req.body;

    try {
      // Create or update bank details
      const [bankDetails, created] = await BankDetails.findOrCreate({
        where: { service_provider_id: provider.id },
        defaults: {
          service_provider_id: provider.id,
          account_holder_name: bankData.account_holder_name,
          bank_name: bankData.bank_name,
          account_number: bankData.account_number,
          routing_number: bankData.routing_number,
          iban: bankData.iban,
          swift_code: bankData.swift_code,
          is_verified: false,
        },
      });

      if (!created) {
        await bankDetails.update({
          account_holder_name: bankData.account_holder_name,
          bank_name: bankData.bank_name,
          account_number: bankData.account_number,
          routing_number: bankData.routing_number,
          iban: bankData.iban,
          swift_code: bankData.swift_code,
        });
      }

      await provider.update({
        step_completed: Math.max(provider.step_completed, 5),
      });

      return response.success("Bank details saved successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id),
        next_step: "subscription",
      });
    } catch (error) {
      console.error("Error setting bank details:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Toggle provider availability status
   * Follows industry standards for availability management
   */
  async toggleAvailability(req, res) {
    console.log("ProviderController@toggleAvailability");
    const provider = req.provider;

    try {
      // Check if provider has completed onboarding
      if (provider.step_completed < 6) {
        return response.validationError(
          "Cannot toggle availability. Please complete your profile setup first.",
          res,
          false
        );
      }

      // Validate provider status before allowing availability toggle
      if (!provider.is_approved) {
        return response.validationError(
          "Cannot toggle availability. Provider account is not approved yet.",
          res,
          false
        );
      }

      // Get current availability status
      const currentStatus = provider.is_available === 1;
      const newStatus = !currentStatus;

      // Update availability status
      await provider.update({
        is_available: newStatus ? 1 : 0,
      });

      // Log the availability change for audit purposes
      console.log(
        `Provider ${provider.id} availability changed from ${
          currentStatus ? "available" : "unavailable"
        } to ${newStatus ? "available" : "unavailable"}`
      );

      // Get updated provider data with availability schedule
      const updatedProvider = await ServiceProvider.findByPk(provider.id, {
        include: [
          {
            model: ServiceProviderAvailability,
            as: "availability",
            attributes: ["day", "from_time", "to_time", "available"],
          },
        ],
      });

      // Check if provider has any availability schedule set up
      const hasAvailabilitySchedule =
        updatedProvider.availability && updatedProvider.availability.length > 0;

      const result = {
        provider_id: updatedProvider.id,
        is_available: newStatus,
        availability_status: newStatus ? "available" : "unavailable",
        last_updated: updatedProvider.updated_at,
        has_availability_schedule: hasAvailabilitySchedule,
        availability_schedule: updatedProvider.availability || [],
        message: newStatus
          ? "Provider is now available for bookings"
          : "Provider is now unavailable for bookings",
      };

      return response.success(
        `Provider is now ${
          newStatus ? "available" : "unavailable"
        } for bookings`,
        res,
        result
      );
    } catch (error) {
      console.error("Error toggling availability:", error);
      return response.exception("Failed to toggle availability status", res);
    }
  }

  /**
   * Get current availability status
   * Returns detailed availability information
   */
  async getAvailabilityStatus(req, res) {
    console.log("ProviderController@getAvailabilityStatus");
    const provider = req.provider;

    try {
      // Get provider data with availability schedule
      const providerWithAvailability = await ServiceProvider.findByPk(
        provider.id,
        {
          include: [
            {
              model: ServiceProviderAvailability,
              as: "availability",
              attributes: ["day", "from_time", "to_time", "available"],
            },
          ],
        }
      );

      const hasAvailabilitySchedule =
        providerWithAvailability.availability &&
        providerWithAvailability.availability.length > 0;

      const result = {
        provider_id: providerWithAvailability.id,
        is_available: providerWithAvailability.is_available === 1,
        availability_status:
          providerWithAvailability.is_available === 1
            ? "available"
            : "unavailable",
        is_approved: providerWithAvailability.is_approved === 1,
        step_completed: providerWithAvailability.step_completed,
        has_availability_schedule: hasAvailabilitySchedule,
        availability_schedule: providerWithAvailability.availability || [],
        last_updated: providerWithAvailability.updated_at,
      };

      return response.success(
        "Availability status retrieved successfully",
        res,
        result
      );
    } catch (error) {
      console.error("Error getting availability status:", error);
      return response.exception("Failed to get availability status", res);
    }
  }

  /**
   * Subscription Payment
   * Mock payment that always returns true and creates/updates ServiceProvider with subscription details
   */
  async step1SubscriptionPayment(req, res) {
    console.log("ProviderController@step1SubscriptionPayment");
    console.log("Request body:", req.body);

    try {
      // Get user_id from authenticated user (from token)
      const userId = req.user.id;
      console.log("User ID from token:", userId);

      // Generate random subscription ID (6 digits)
      const subscriptionId = Math.floor(100000 + Math.random() * 900000);

      // Set subscription expiry to 1 year from now
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setFullYear(subscriptionExpiry.getFullYear() + 1);

      // Find or create ServiceProvider record
      let serviceProvider = await ServiceProvider.findOne({
        where: { user_id: userId },
      });

      if (serviceProvider) {
        // Update existing ServiceProvider
        await serviceProvider.update({
          subscription_id: subscriptionId,
          subscription_expiry: subscriptionExpiry,
          step_completed: Math.max(serviceProvider.step_completed, 1), // Keep highest step completed
        });
      } else {
        // Create new ServiceProvider
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: "individual", // Default value
          subscription_id: subscriptionId,
          subscription_expiry: subscriptionExpiry,
          step_completed: 1,
        });

        // Create service provider address record
        try {
          const serviceProviderAddressObj = {
            user_id: userId,
            country_id: null, // Will be filled later
            city_id: null, // Will be filled later
            address: null, // Will be filled later
            latitude: null, // Will be filled later
            longitude: null, // Will be filled later
          };
          await ServiceProviderAddress.create(serviceProviderAddressObj);
          console.log("Service provider address created for user:", {
            id: userId,
          });
        } catch (error) {
          console.error("Error creating service provider address:", error);
          // Continue without failing step completion
        }
      }

      const result = {
        user_id: userId,
        service_provider_id: serviceProvider.id,
        subscription_id: subscriptionId,
        subscription_expiry: subscriptionExpiry,
        step_completed: serviceProvider.step_completed,
        payment_status: "success",
        message: "Subscription payment successful",
      };

      return response.success("Subscription payment successful", res, result);
    } catch (error) {
      console.error("Error in step1SubscriptionPayment:", error);
      return response.exception("Failed to process subscription payment", res);
    }
  }

  /**
   * Set Provider Type (Individual or Salon)
   */
  async step2ProviderType(req, res) {
    console.log("ProviderController@step2ProviderType");
    const data = req.body;

    try {
      // Get user_id from authenticated user (from token)
      const userId = req.user.id;

      // Find or create ServiceProvider record
      let serviceProvider = await ServiceProvider.findOne({
        where: { user_id: userId },
      });

      if (!serviceProvider) {
        // Create new ServiceProvider if doesn't exist
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: data.provider_type,
          step_completed: 2,
        });
      } else {
        // Update existing ServiceProvider
        await serviceProvider.update({
          provider_type: data.provider_type,
          step_completed: Math.max(serviceProvider.step_completed, 2), // Keep highest step completed
        });
      }

      const result = {
        user_id: userId,
        service_provider_id: serviceProvider.id,
        provider_type: data.provider_type,
        step_completed: serviceProvider.step_completed,
        message: "Provider type set successfully",
      };

      return response.success("Provider type set successfully", res, result);
    } catch (error) {
      console.error("Error in step2ProviderType:", error);
      return response.exception("Failed to set provider type", res);
    }
  }

  /**
   * Set Salon Details (salon name, city, country, description, banner image)
   */
  async step3SalonDetails(req, res) {
    console.log("ProviderController@step3SalonDetails - START");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log(
      "Request files:",
      req.files ? Object.keys(req.files) : "No files"
    );
    if (req.files && req.files.banner_image) {
      console.log("Banner image file details:", {
        originalname: req.files.banner_image[0]?.originalname,
        size: req.files.banner_image[0]?.size,
        mimetype: req.files.banner_image[0]?.mimetype,
      });
    }

    const data = req.body;
    const files = req.files; // For custom banner image upload

    try {
      // Get user_id from authenticated user (from token)
      const userId = req.user.id;
      console.log("User ID from token:", userId);

      // Find or create ServiceProvider record
      let serviceProvider = await ServiceProvider.findOne({
        where: { user_id: userId },
      });

      if (!serviceProvider) {
        // Create new ServiceProvider if doesn't exist
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: "individual", // Default value
          step_completed: 3,
        });
      }

      // Validate required fields based on provider type
      if (!data.city_id || !data.country_id) {
        return response.badRequest("City and country are required", res, false);
      }

      // Conditional salon name validation
      if (serviceProvider.provider_type === "salon" && !data.salon_name) {
        return response.badRequest(
          "Salon name is required for salon providers",
          res,
          false
        );
      }

      // Prepare update data for ServiceProvider
      const updateData = {
        description: data.description || null, // Description is optional
        step_completed: Math.max(serviceProvider.step_completed, 3), // Keep highest step completed
      };

      // Add salon_name only if provided or if provider type is salon
      if (data.salon_name) {
        updateData.salon_name = data.salon_name;
      } else if (serviceProvider.provider_type === "salon") {
        // For salon providers, keep existing salon_name if not provided
        updateData.salon_name = serviceProvider.salon_name;
      }

      // Handle banner image with cleanup
      console.log("Starting banner image handling...");
      let bannerImageUrl = null;

      // Check if provider already has a custom banner image to clean up
      let oldBannerImageUrl = serviceProvider.banner_image;
      if (
        oldBannerImageUrl &&
        s3Helper.isCustomUploadedImage(oldBannerImageUrl)
      ) {
        console.log(
          "Provider has existing custom banner image, will clean up:",
          oldBannerImageUrl
        );
      }

      if (data.banner_image_id) {
        console.log("Using predefined banner image ID:", data.banner_image_id);
        // User selected a predefined banner image
        const bannerImage = await BannerImage.findByPk(data.banner_image_id);
        console.log("Banner image found:", bannerImage ? "YES" : "NO");
        if (!bannerImage || !bannerImage.is_active) {
          return response.badRequest(
            "Invalid banner image selected",
            res,
            false
          );
        }
        bannerImageUrl = bannerImage.image_url;
        console.log("Using predefined banner URL:", bannerImageUrl);
      } else if (files && files.banner_image && files.banner_image[0]) {
        console.log("Processing custom banner image upload...");
        // User uploaded a custom banner image
        const file = files.banner_image[0];
        console.log("File details:", {
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          buffer: file.buffer ? "Buffer exists" : "No buffer",
        });

        // Validate S3 configuration
        console.log("Validating S3 config...");
        if (!s3Helper.validateConfig()) {
          console.log("S3 config validation failed");
          return response.badRequest(
            "S3 configuration is invalid. Please check AWS credentials and bucket settings.",
            res,
            false
          );
        }

        console.log("S3 config validation passed");

        // Upload to S3
        console.log("Starting S3 upload...");
        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          "providers",
          `banners/${serviceProvider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit for banner images
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${serviceProvider.id}`,
            originalName: file.originalname,
          }
        );
        console.log("S3 upload result:", uploadResult);

        if (!uploadResult.success) {
          console.log("S3 upload failed:", uploadResult.error);
          return response.badRequest(
            `Failed to upload banner image: ${uploadResult.error}`,
            res,
            false
          );
        }

        bannerImageUrl = uploadResult.main.url;
        console.log("S3 upload successful, URL:", bannerImageUrl);
      } else {
        console.log("No banner image provided - this should not happen");
        // This should not happen due to validation, but adding as a safety check
        return response.badRequest(
          "Banner image (either predefined ID or custom upload) is required",
          res,
          false
        );
      }

      // Update banner image URL
      updateData.banner_image = bannerImageUrl;
      console.log("Update data prepared:", updateData);

      // Update ServiceProvider
      console.log("Updating ServiceProvider...");
      await serviceProvider.update(updateData);
      console.log("ServiceProvider updated successfully");

      // Update or create ServiceProviderAddress
      console.log("Updating ServiceProviderAddress...");
      const serviceProviderAddress = await ServiceProviderAddress.findOne({
        where: { user_id: userId },
      });

      if (serviceProviderAddress) {
        // Update existing address record
        await serviceProviderAddress.update({
          country_id: data.country_id,
          city_id: data.city_id,
          address: data.address, // Add mandatory address field
        });
        console.log("ServiceProviderAddress updated successfully");
      } else {
        // Create new address record
        await ServiceProviderAddress.create({
          user_id: userId,
          country_id: data.country_id,
          city_id: data.city_id,
          address: data.address, // Add mandatory address field
          latitude: null, // Will be filled later
          longitude: null, // Will be filled later
        });
        console.log("ServiceProviderAddress created successfully");
      }

      const result = {
        user_id: userId,
        service_provider_id: serviceProvider.id,
        salon_name: updateData.salon_name || null,
        city_id: data.city_id,
        country_id: data.country_id,
        address: data.address, // Include address in response
        description: data.description || null,
        banner_image: bannerImageUrl,
        step_completed: serviceProvider.step_completed,
        message: "Salon details updated successfully",
      };

      // Clean up old banner image if it was a custom upload
      if (
        oldBannerImageUrl &&
        s3Helper.isCustomUploadedImage(oldBannerImageUrl)
      ) {
        console.log("Cleaning up old custom banner image:", oldBannerImageUrl);
        try {
          const cleanupResult = await s3Helper.deleteImageWithThumbnail(
            oldBannerImageUrl
          );
          if (cleanupResult.success) {
            console.log("Old banner image cleanup successful");
          } else {
            console.log(
              "Old banner image cleanup failed:",
              cleanupResult.error
            );
            // Don't fail the main operation if cleanup fails
          }
        } catch (cleanupError) {
          console.error("Error during banner image cleanup:", cleanupError);
          // Don't fail the main operation if cleanup fails
        }
      }

      console.log("Salon details updated successfully, returning result");
      return response.success(
        "Salon details updated successfully",
        res,
        result
      );
    } catch (error) {
      console.error("Error in step3SalonDetails:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
      return response.exception("Failed to update salon details", res);
    }
  }

  /**
   * Get onboarding progress and current step data
   * Returns overall onboarding status and next step information
   */
  async getOnboardingProgress(req, res) {
    console.log("ProviderController@getOnboardingProgress");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.success("Onboarding not started", res, {
          onboarding_status: "not_started",
          current_step: 0,
          total_steps: 6,
          next_step: "subscription_payment",
          can_edit: false,
          message: "Please start the onboarding process",
        });
      }

      const currentStep = provider.step_completed || 0;
      const nextStep = currentStep < 6 ? currentStep + 1 : null;

      const stepNames = {
        1: "subscription_payment",
        2: "provider_type",
        3: "salon_details",
        4: "documents_bank",
        5: "working_hours",
        6: "services_setup",
      };

      const responseData = {
        onboarding_status: currentStep === 6 ? "completed" : "in_progress",
        current_step: currentStep,
        total_steps: 6,
        next_step: nextStep ? stepNames[nextStep] : null,
        can_edit: true,
        step_completion: {
          subscription_payment: currentStep >= 1,
          provider_type: currentStep >= 2,
          salon_details: currentStep >= 3,
          documents_bank: currentStep >= 4,
          working_hours: currentStep >= 5,
          services_setup: currentStep >= 6,
        },
        provider_id: provider.id,
        provider_type: provider.provider_type,
        is_approved: provider.is_approved === 1,
        subscription_expiry: provider.subscription_expiry,
        message:
          currentStep === 6
            ? "Onboarding completed successfully"
            : `Complete step ${nextStep} to continue`,
      };

      return response.success(
        "Onboarding progress retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting onboarding progress:", error);
      return response.exception("Failed to retrieve onboarding progress", res);
    }
  }

  /**
   * Get Step 1: Subscription Payment data
   */
  async getStep1SubscriptionPayment(req, res) {
    console.log("ProviderController@getStep1SubscriptionPayment");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      const responseData = {
        step: 1,
        step_name: "subscription_payment",
        status: provider.step_completed >= 1 ? "completed" : "incomplete",
        can_edit: true,
        data: {
          subscription_id: provider.subscription_id,
          subscription_expiry: provider.subscription_expiry,
          payment_status: provider.subscription_id > 0 ? "paid" : "pending",
        },
        next_step: provider.step_completed >= 1 ? "provider_type" : null,
        message:
          provider.step_completed >= 1
            ? "Subscription payment completed"
            : "Subscription payment required",
      };

      return response.success(
        "Step 1 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 1 data:", error);
      return response.exception("Failed to retrieve Step 1 data", res);
    }
  }

  /**
   * Get Step 2: Provider Type data
   */
  async getStep2ProviderType(req, res) {
    console.log("ProviderController@getStep2ProviderType");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      // Check if prerequisite step is completed
      if (provider.step_completed < 1) {
        return response.badRequest(
          "Please complete subscription payment first",
          res,
          false
        );
      }

      const responseData = {
        step: 2,
        step_name: "provider_type",
        status: provider.step_completed >= 2 ? "completed" : "incomplete",
        can_edit: provider.step_completed >= 2,
        data: {
          provider_type: provider.provider_type,
          available_types: ["individual", "salon"],
        },
        next_step: provider.step_completed >= 2 ? "salon_details" : null,
        message:
          provider.step_completed >= 2
            ? "Provider type set successfully"
            : "Provider type selection required",
      };

      return response.success(
        "Step 2 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 2 data:", error);
      return response.exception("Failed to retrieve Step 2 data", res);
    }
  }

  /**
   * Get Step 3: Salon Details data
   */
  async getStep3SalonDetails(req, res) {
    console.log("ProviderController@getStep3SalonDetails");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      // Check if prerequisite steps are completed
      if (provider.step_completed < 2) {
        return response.badRequest(
          "Please complete provider type selection first",
          res,
          false
        );
      }

      // Get address information
      const serviceProviderAddress = await ServiceProviderAddress.findOne({
        where: { user_id: user.id },
      });

      const responseData = {
        step: 3,
        step_name: "salon_details",
        status: provider.step_completed >= 3 ? "completed" : "incomplete",
        can_edit: provider.step_completed >= 3,
        data: {
          salon_name: provider.salon_name,
          description: provider.description,
          banner_image: provider.banner_image,
          country_id: serviceProviderAddress?.country_id || null,
          city_id: serviceProviderAddress?.city_id || null,
          address: serviceProviderAddress?.address || null,
          latitude: serviceProviderAddress?.latitude || null,
          longitude: serviceProviderAddress?.longitude || null,
        },
        next_step: provider.step_completed >= 3 ? "documents_bank" : null,
        message:
          provider.step_completed >= 3
            ? "Salon details completed"
            : "Salon details required",
      };

      return response.success(
        "Step 3 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 3 data:", error);
      return response.exception("Failed to retrieve Step 3 data", res);
    }
  }

  /**
   * Get Step 4: Documents and Bank Details data
   */
  async getStep4DocumentsBank(req, res) {
    console.log("ProviderController@getStep4DocumentsBank");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      // Check if prerequisite steps are completed
      if (provider.step_completed < 3) {
        return response.badRequest(
          "Please complete salon details first",
          res,
          false
        );
      }

      // Get bank details
      const bankDetails = await BankDetails.findOne({
        where: { service_provider_id: provider.id },
      });

      const responseData = {
        step: 4,
        step_name: "documents_bank",
        status: provider.step_completed >= 4 ? "completed" : "incomplete",
        can_edit: provider.step_completed >= 4,
        data: {
          documents: {
            national_id_image_url: provider.national_id_image_url,
            freelance_certificate_image_url:
              provider.freelance_certificate_image_url,
            commercial_registration_image_url:
              provider.commercial_registration_image_url,
          },
          bank_details: bankDetails
            ? {
                id: bankDetails.id,
                account_holder_name: bankDetails.account_holder_name,
                bank_name: bankDetails.bank_name,
                iban: bankDetails.iban,
              }
            : null,
          required_documents: {
            national_id: true,
            freelance_certificate: provider.provider_type === "individual",
            commercial_registration: provider.provider_type === "salon",
          },
        },
        next_step: provider.step_completed >= 4 ? "working_hours" : null,
        message:
          provider.step_completed >= 4
            ? "Documents and bank details completed"
            : "Documents and bank details required",
      };

      return response.success(
        "Step 4 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 4 data:", error);
      return response.exception("Failed to retrieve Step 4 data", res);
    }
  }

  /**
   * Get Step 5: Working Hours data
   */
  async getStep5WorkingHours(req, res) {
    console.log("ProviderController@getStep5WorkingHours");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      // Check if prerequisite steps are completed
      if (provider.step_completed < 4) {
        return response.badRequest(
          "Please complete documents and bank details first",
          res,
          false
        );
      }

      // Get availability data
      const availability = await ServiceProviderAvailability.findAll({
        where: { service_provider_id: provider.id },
        order: [["day", "ASC"]],
      });

      const responseData = {
        step: 5,
        step_name: "working_hours",
        status: provider.step_completed >= 5 ? "completed" : "incomplete",
        can_edit: provider.step_completed >= 5,
        data: {
          availability: availability.map((avail) => ({
            id: avail.id,
            day: avail.day,
            from_time: avail.from_time,
            to_time: avail.to_time,
            available: avail.available,
          })),
          days_of_week: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        next_step: provider.step_completed >= 5 ? "services_setup" : null,
        message:
          provider.step_completed >= 5
            ? "Working hours completed"
            : "Working hours setup required",
      };

      return response.success(
        "Step 5 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 5 data:", error);
      return response.exception("Failed to retrieve Step 5 data", res);
    }
  }

  /**
   * Get Step 6: Services Setup data
   */
  async getStep6ServicesSetup(req, res) {
    console.log("ProviderController@getStep6ServicesSetup");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.badRequest(
          "Provider profile not found. Please start onboarding first.",
          res,
          false
        );
      }

      // Check if prerequisite steps are completed
      if (provider.step_completed < 5) {
        return response.badRequest(
          "Please complete working hours setup first",
          res,
          false
        );
      }

      // Get services data with related information
      const services = await ServiceList.findAll({
        where: { service_provider_id: provider.id },
        include: [
          {
            model: db.models.Category,
            as: "category",
            attributes: ["id", "title", "image"],
          },
          {
            model: db.models.subcategory,
            as: "subcategory",
            attributes: ["id", "title", "image"],
          },
          {
            model: db.models.ServiceLocation,
            as: "location",
            attributes: ["id", "title", "description"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const responseData = {
        step: 6,
        step_name: "services_setup",
        status: provider.step_completed >= 6 ? "completed" : "incomplete",
        can_edit: provider.step_completed >= 6,
        data: {
          services: services.map((service) => ({
            id: service.id,
            title: service.title,
            service_id: service.service_id,
            category_id: service.category_id,
            sub_category_id: service.sub_category_id,
            price: service.price,
            description: service.description,
            service_image: service.service_image,
            service_location: service.service_location,
            is_sub_service: service.is_sub_service,
            have_offers: service.have_offers,
            status: service.status,
            category: service.category,
            subcategory: service.subcategory,
            location: service.location,
          })),
          total_services: services.length,
        },
        next_step: provider.step_completed >= 6 ? "onboarding_complete" : null,
        message:
          provider.step_completed >= 6
            ? "Services setup completed"
            : "Services setup required",
      };

      return response.success(
        "Step 6 data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting Step 6 data:", error);
      return response.exception("Failed to retrieve Step 6 data", res);
    }
  }

  /**
   * Get complete onboarding data for all steps
   */
  async getCompleteOnboardingData(req, res) {
    console.log("ProviderController@getCompleteOnboardingData");
    const user = req.user;
    const provider = req.provider;

    try {
      if (!provider) {
        return response.success("Onboarding not started", res, {
          onboarding_status: "not_started",
          current_step: 0,
          total_steps: 6,
          steps: {},
          message: "Please start the onboarding process",
        });
      }

      // Get all related data in parallel for efficiency
      const [serviceProviderAddress, bankDetails, availability, services] =
        await Promise.all([
          ServiceProviderAddress.findOne({ where: { user_id: user.id } }),
          BankDetails.findOne({ where: { service_provider_id: provider.id } }),
          ServiceProviderAvailability.findAll({
            where: { service_provider_id: provider.id },
            order: [["day", "ASC"]],
          }),
          ServiceList.findAll({
            where: { service_provider_id: provider.id },
            include: [
              {
                model: db.models.Category,
                as: "category",
                attributes: ["id", "title", "image"],
              },
              {
                model: db.models.subcategory,
                as: "subcategory",
                attributes: ["id", "title", "image"],
              },
              {
                model: db.models.ServiceLocation,
                as: "location",
                attributes: ["id", "title", "description"],
              },
            ],
            order: [["created_at", "DESC"]],
          }),
        ]);

      const currentStep = provider.step_completed || 0;

      const responseData = {
        onboarding_status: currentStep === 6 ? "completed" : "in_progress",
        current_step: currentStep,
        total_steps: 6,
        provider_id: provider.id,
        provider_type: provider.provider_type,
        is_approved: provider.is_approved === 1,
        subscription_expiry: provider.subscription_expiry,
        steps: {
          step_1: {
            step: 1,
            step_name: "subscription_payment",
            status: currentStep >= 1 ? "completed" : "incomplete",
            can_edit: true,
            data: {
              subscription_id: provider.subscription_id,
              subscription_expiry: provider.subscription_expiry,
              payment_status: provider.subscription_id > 0 ? "paid" : "pending",
            },
          },
          step_2: {
            step: 2,
            step_name: "provider_type",
            status: currentStep >= 2 ? "completed" : "incomplete",
            can_edit: currentStep >= 2,
            data: {
              provider_type: provider.provider_type,
              available_types: ["individual", "salon"],
            },
          },
          step_3: {
            step: 3,
            step_name: "salon_details",
            status: currentStep >= 3 ? "completed" : "incomplete",
            can_edit: currentStep >= 3,
            data: {
              salon_name: provider.salon_name,
              description: provider.description,
              banner_image: provider.banner_image,
              country_id: serviceProviderAddress?.country_id || null,
              city_id: serviceProviderAddress?.city_id || null,
              address: serviceProviderAddress?.address || null,
              latitude: serviceProviderAddress?.latitude || null,
              longitude: serviceProviderAddress?.longitude || null,
            },
          },
          step_4: {
            step: 4,
            step_name: "documents_bank",
            status: currentStep >= 4 ? "completed" : "incomplete",
            can_edit: currentStep >= 4,
            data: {
              documents: {
                national_id_image_url: provider.national_id_image_url,
                freelance_certificate_image_url:
                  provider.freelance_certificate_image_url,
                commercial_registration_image_url:
                  provider.commercial_registration_image_url,
              },
              bank_details: bankDetails
                ? {
                    id: bankDetails.id,
                    account_holder_name: bankDetails.account_holder_name,
                    bank_name: bankDetails.bank_name,
                    iban: bankDetails.iban,
                  }
                : null,
              required_documents: {
                national_id: true,
                freelance_certificate: provider.provider_type === "individual",
                commercial_registration: provider.provider_type === "salon",
              },
            },
          },
          step_5: {
            step: 5,
            step_name: "working_hours",
            status: currentStep >= 5 ? "completed" : "incomplete",
            can_edit: currentStep >= 5,
            data: {
              availability: availability.map((avail) => ({
                id: avail.id,
                day: avail.day,
                from_time: avail.from_time,
                to_time: avail.to_time,
                available: avail.available,
              })),
              days_of_week: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
            },
          },
          step_6: {
            step: 6,
            step_name: "services_setup",
            status: currentStep >= 6 ? "completed" : "incomplete",
            can_edit: currentStep >= 6,
            data: {
              services: services.map((service) => ({
                id: service.id,
                title: service.title,
                service_id: service.service_id,
                category_id: service.category_id,
                sub_category_id: service.sub_category_id,
                price: service.price,
                description: service.description,
                service_image: service.service_image,
                service_location: service.service_location,
                is_sub_service: service.is_sub_service,
                have_offers: service.have_offers,
                status: service.status,
                category: service.category,
                subcategory: service.subcategory,
                location: service.location,
              })),
              total_services: services.length,
            },
          },
        },
        next_step: currentStep < 6 ? currentStep + 1 : null,
        message:
          currentStep === 6
            ? "Onboarding completed successfully"
            : `Complete step ${currentStep + 1} to continue`,
      };

      return response.success(
        "Complete onboarding data retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error getting complete onboarding data:", error);
      return response.exception(
        "Failed to retrieve complete onboarding data",
        res
      );
    }
  }

  /**
   * Get provider user data only (for authenticated providers)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with user data only
   */
  async getProviderUser(req, res) {
    console.log("ProviderController@getProviderUser - START");
    console.log("Request headers:", req.headers);
    console.log("Request user:", req.user ? "User exists" : "No user");

    try {
      // Validate that user exists in request
      if (!req.user) {
        console.error("❌ No user found in request");
        return response.unauthorized("User not authenticated", res, {
          error_code: "USER_NOT_FOUND",
          message: "User authentication required",
        });
      }

      const user = req.user;
      console.log("User ID:", user.id);
      console.log("User type:", user.user_type);

      // Return only user data
      const userData = {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          is_verified: user.is_verified,
          verified_at: user.verified_at,
          profile_image: user.profile_image,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      };

      console.log("✅ User data retrieved successfully");
      return response.success(
        "User data retrieved successfully",
        res,
        userData
      );
    } catch (error) {
      console.error("❌ Error getting provider user data:", error);
      console.error("Error stack:", error.stack);
      return response.exception("Failed to retrieve user data", res);
    }
  }
};
