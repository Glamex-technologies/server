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

      // Create address record for the provider user
      try {
        const addressObj = {
          user_id: user.id,
          country_id: data.country_id || 1, // Default to first country if not provided
          city_id: data.city_id || 1, // Default to first city if not provided
          address: null, // Will be filled later
          latitude: null, // Will be filled later
          longitude: null, // Will be filled later
        };
        await ServiceProviderAddress.create(addressObj);
        console.log("Provider address created for user:", { id: user.id });
      } catch (error) {
        console.error("Error creating provider address:", error);
        // Continue without failing registration
      }

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

      // Get provider address information for response
      const providerAddress = await ServiceProviderAddress.findOne({
        where: { user_id: user.id }
      });

      const result = {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        gender: user.gender,
        country_id: providerAddress?.country_id || null,
        city_id: providerAddress?.city_id || null,
        verified_at: user.verified_at,
        is_verified: user.is_verified,
        user_type: user.user_type,
      };

      return response.success(
        "Registration successful. Please verify your account with the OTP sent to your phone.",
        res,
        result
      );
    } catch (error) {
      console.error("Error in provider registration:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Verify provider's OTP to complete registration
   */
  async verifyVerificationOtp(req, res) {
    console.log("ProviderController@verifyVerificationOtp");
    const data = req.body;

    try {
      // Find user by user_id (no ServiceProvider exists yet)
      const user = await User.findByPk(data.user_id);

      if (!user || user.user_type !== "provider") {
        return response.badRequest("Provider user account not found", res, false);
      }

      const verificationResult = await OtpVerification.verifyForEntity(
        "provider",
        user.id,
        String(data.otp),
        "registration"
      );

      if (!verificationResult.success) {
        return response.badRequest(verificationResult.message, res, false);
      }

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
        verified_at: user.verified_at,
      };

      // Generate token for user (no provider profile yet)
      const accessToken = await genrateToken({
        user_id: user.id,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
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
    } catch (error) {
      console.error("Error in OTP verification:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Resend OTP to provider's phone number
   */
  async resendOtp(req, res) {
    console.log("ProviderController@resendOtp");
    const data = req.body;

    try {
      // Find user by user_id (no ServiceProvider exists yet)
      const user = await User.findByPk(data.user_id);

      if (!user || user.user_type !== "provider") {
        return response.badRequest("Provider user account not found", res, false);
      }

      try {
        const otpRecord = await OtpVerification.createForEntity(
          "provider",
          user.id,
          user.phone_code + user.phone_number,
          "registration"
        );
        console.log("Provider user resend OTP created:", {
          otp_code: otpRecord.otp_code,
          expires_at: otpRecord.expires_at,
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
      };

      return response.success(
        "OTP has been resent to your registered phone number",
        res,
        result
      );
    } catch (error) {
      console.error("Error in resending OTP:", error);
      return response.exception(error.message, res);
    }
  }




  /**
   * Provider authentication (login)
   */
  async authenticate(req, res) {
    try {
      console.log("ProviderController@authenticate");
      const user = req.user; // User information from middleware (phone, password auth)

      // Check if user is verified
      if (!user.is_verified) {
        // Generate OTP and set it in database (hardcoded as 1111 for now)
        try {
          const otpRecord = await OtpVerification.createForEntity(
            "provider",
            user.id,
            user.phone_code + user.phone_number,
            "registration"
          );
          console.log("Provider User OTP created for unverified user:", {
            otp_code: otpRecord.otp_code,
            expires_at: otpRecord.expires_at,
          });
        } catch (error) {
          console.error("Error creating provider user OTP:", error);
        }

        return response.validationError('Please verify your account first', res, {
          verification_required: true,
          message: 'Your account needs to be verified before you can login'
        });
      }

      // Check if provider profile exists
      const serviceProvider = await ServiceProvider.findOne({
        where: { user_id: user.id }
      });

      if (!serviceProvider) {
        // Generate token with user data and let them create profile
        const userObj = {
          user_id: user.id,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
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
            verified_at: user.verified_at,
          },
          profile_required: true,
          message: 'Please create your provider profile to continue'
        };

        return response.success("Login successful. Please create your provider profile.", res, result);
      }

      // Check profile completion status
      if (serviceProvider.step_completed < 6) {
        console.log(`🔍 Provider ${serviceProvider.id}: Step ${serviceProvider.step_completed}/6 incomplete`);
        
        // Generate token even for incomplete steps so user can complete them
        const userObj = {
          user_id: user.id,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          userType: "provider",
        };

        const accessToken = await genrateToken(userObj);
        return response.validationError('Please complete your profile setup first', res, {
          access_token: accessToken,
          setup_required: true,
          current_step: serviceProvider.step_completed,
          total_steps: 6,
          message: `Complete all ${6 - serviceProvider.step_completed} remaining steps to access the app`
        });
      }

      // Check if profile is approved by admin (only if steps are completed)
      if (serviceProvider.step_completed === 6 && serviceProvider.is_approved !== 1) {
        console.log(`🔍 Provider ${serviceProvider.id}: Steps complete but not approved by admin`);
        
        // Generate token even for unapproved profiles so user can check status
        const userObj = {
          user_id: user.id,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          userType: "provider",
        };

        const accessToken = await genrateToken(userObj);
        return response.validationError('Wait for the admin to verify your profile', res, {
          access_token: accessToken,
          approval_required: true,
          message: 'Your profile is complete and under review by admin. You will be notified once approved.'
        });
      }

      // All checks passed - generate token with user model data
      const userObj = {
        user_id: user.id,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        userType: "provider",
      };

      // Get service provider address information
      const serviceProviderAddress = await ServiceProviderAddress.findOne({
        where: { user_id: user.id }
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
          is_approved: serviceProvider.is_approved,
          status: serviceProvider.status,
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
   * Verify OTP for password reset
   */
  async verifyForgotPasswordOtp(req, res) {
    console.log("ProviderController@verifyForgotPasswordOtp");
    const data = req.body;
    
    // Find user by user_id (no need to find ServiceProvider)
    const user = await User.findByPk(data.user_id);

    if (!user) {
      return response.badRequest("User account not found", res, false);
    }

    // Verify OTP against user (not serviceProvider)
    const verificationResult = await OtpVerification.verifyForEntity(
      "provider",
      user.id, // Use user.id instead of serviceProvider.id
      String(data.otp),
      "password_reset"
    );

    if (!verificationResult.success) {
      return response.badRequest(verificationResult.message, res, false);
    }

    const result = {
      user_id: user.id,
    };

    return response.success(
      "OTP verified successfully. You can now reset your password.",
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
    
    // Find user directly by user_id (no need to find ServiceProvider)
    const user = await User.findByPk(data.user_id);

    if (!user) {
      return response.badRequest("User account not found", res, false);
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
    console.log("Request files:", req.files ? Object.keys(req.files) : 'No files');
    
    const provider = req.provider;
    const files = req.files;
    const bankDetails = req.body;

    try {
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
      if (provider.provider_type === 'salon') {
        if (!files.commercial_registration_image_url || !files.commercial_registration_image_url[0]) {
          errors.push("Commercial registration image is required for salon providers");
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
          return response.badRequest("S3 configuration is invalid. Please check AWS credentials and bucket settings.", res, false);
        }

        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          'providers',
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(`Failed to upload national ID image: ${uploadResult.error}`, res, false);
        }

        documentUrls.national_id_image_url = uploadResult.main.url;
      }

      // Upload freelance certificate image (optional for individual)
      if (provider.provider_type === 'individual' && files.freelance_certificate_image_url && files.freelance_certificate_image_url[0]) {
        const file = files.freelance_certificate_image_url[0];
        console.log("Processing freelance certificate image upload...");
        
        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          'providers',
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(`Failed to upload freelance certificate image: ${uploadResult.error}`, res, false);
        }

        documentUrls.freelance_certificate_image_url = uploadResult.main.url;
      }

      // Upload commercial registration image (mandatory for salon)
      if (provider.provider_type === 'salon' && files.commercial_registration_image_url && files.commercial_registration_image_url[0]) {
        const file = files.commercial_registration_image_url[0];
        console.log("Processing commercial registration image upload...");
        
        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          'providers',
          `documents/${provider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${provider.id}`,
            originalName: file.originalname
          }
        );

        if (!uploadResult.success) {
          return response.badRequest(`Failed to upload commercial registration image: ${uploadResult.error}`, res, false);
        }

        documentUrls.commercial_registration_image_url = uploadResult.main.url;
      }

      // Create or update bank details
      let bankDetailsRecord;
      const existingBankDetails = await BankDetails.findOne({
        where: { service_provider_id: provider.id }
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
            as: 'bankDetails'
          }
        ]
      });

      const responseData = {
        id: updatedProvider.id,
        provider_type: updatedProvider.provider_type,
        national_id_image_url: updatedProvider.national_id_image_url,
        freelance_certificate_image_url: updatedProvider.freelance_certificate_image_url,
        commercial_registration_image_url: updatedProvider.commercial_registration_image_url,
        step_completed: updatedProvider.step_completed,
        bank_details: updatedProvider.bankDetails && updatedProvider.bankDetails.length > 0 ? {
          id: updatedProvider.bankDetails[0].id,
          account_holder_name: updatedProvider.bankDetails[0].account_holder_name,
          bank_name: updatedProvider.bankDetails[0].bank_name,
          iban: updatedProvider.bankDetails[0].iban,
        } : null,
        next_step: "service_setup"
      };

      console.log("Step 4 completed successfully, returning result");
      return response.success("Step 4 completed successfully", res, responseData);
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
          provider_type: 'individual', // Default value
          step_completed: 6 // Skip to step 6 for service setup
        });
        console.log("Provider profile created with ID:", serviceProvider.id);
      }

      // Validate that services array is provided
      if (!services || !Array.isArray(services) || services.length === 0) {
        return response.badRequest("Services array is required", res);
      }

      // Delete existing service lists for this provider
      await ServiceList.destroy({
        where: { service_provider_id: serviceProvider.id },
      });

      // Create new service lists
      const servicePromises = services.map(async (serviceData, index) => {
        let serviceImageUrl = null;

        // Handle service image - check for predefined image ID first
        if (serviceData.service_image_id) {
          console.log("Using predefined service image ID:", serviceData.service_image_id);
          // User selected a predefined service image
          const serviceImage = await ServiceImage.findByPk(serviceData.service_image_id);
          console.log("Service image found:", serviceImage ? 'YES' : 'NO');
          if (!serviceImage || !serviceImage.is_active) {
            return response.badRequest("Invalid service image selected", res, false);
          }
          serviceImageUrl = serviceImage.image_url;
          console.log("Using predefined service image URL:", serviceImageUrl);
        } else if (uploadedFiles && uploadedFiles.service_images && uploadedFiles.service_images[index]) {
          // Handle file upload from multer using S3 like in step 3
          console.log("Processing custom service image upload (file)...");
          const file = uploadedFiles.service_images[index];
          console.log("File details:", {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            buffer: file.buffer ? 'Buffer exists' : 'No buffer'
          });
          
          // Validate S3 configuration
          console.log("Validating S3 config...");
          if (!s3Helper.validateConfig()) {
            console.log("S3 config validation failed");
            return response.badRequest("S3 configuration is invalid. Please check AWS credentials and bucket settings.", res, false);
          }

          console.log("S3 config validation passed");

          // Upload to S3 using the same method as step 3
          console.log("Starting S3 upload...");
          const uploadResult = await s3Helper.uploadImage(
            file.buffer,
            file.originalname,
            'providers',
            `service-images/${serviceProvider.id}`,
            {
              maxSize: 5 * 1024 * 1024, // 5MB limit for service images
              generateThumbnail: true,
              thumbnailSize: { width: 300, height: 200 },
              uploadedBy: `provider_${provider.id}`,
              originalName: file.originalname
            }
          );
          console.log("S3 upload result:", uploadResult);

          if (!uploadResult.success) {
            console.log("S3 upload failed:", uploadResult.error);
            return response.badRequest(`Failed to upload service image: ${uploadResult.error}`, res, false);
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

      // Get the created services with category, subcategory, and location details
      const servicesWithDetails = await ServiceList.findAll({
        where: { service_provider_id: serviceProvider.id },
        include: [
          {
            model: db.models.Category,
            as: 'category',
            attributes: ['id', 'title', 'image']
          },
          {
            model: db.models.subcategory,
            as: 'subcategory',
            attributes: ['id', 'title', 'image']
          },
          {
            model: db.models.ServiceLocation,
            as: 'location',
            attributes: ['id', 'title', 'description']
          }
        ],
        order: [['created_at', 'DESC']]
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
      where: { user_id: req.user.id }
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
      where: { user_id: req.user.id }
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
        where: { user_id: req.user.id }
      });

      if (serviceProviderAddress) {
        // Update existing address record
        const addressUpdateData = {};
        if (req.body.country_id) addressUpdateData.country_id = req.body.country_id;
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
      where: { user_id: req.user.id }
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
      if (!availabilityData || !Array.isArray(availabilityData) || availabilityData.length === 0) {
        return response.badRequest("Availability data is required and must be an array", res, false);
      }

      // Validate each availability record
      const errors = [];
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      availabilityData.forEach((item, index) => {
        if (!item.day) {
          errors.push(`Day is required for availability record ${index + 1}`);
        } else if (!daysOfWeek.includes(item.day.toLowerCase())) {
          errors.push(`Invalid day '${item.day}' for availability record ${index + 1}`);
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
          errors.push(`Invalid from_time format for ${item.day}. Use HH:MM format`);
        }
        if (item.to_time && !timeRegex.test(item.to_time)) {
          errors.push(`Invalid to_time format for ${item.day}. Use HH:MM format`);
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
        where: { service_provider_id: provider.id }
      });

      // Create new availability records
      const availabilityRecords = availabilityData.map(item => ({
        service_provider_id: provider.id,
        day: item.day.toLowerCase(),
        from_time: item.from_time,
        to_time: item.to_time,
        available: item.available !== undefined ? item.available : 1
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
            as: 'availability'
          }
        ]
      });

      const responseData = {
        id: updatedProvider.id,
        step_completed: updatedProvider.step_completed,
        availability: updatedProvider.availability.map(avail => ({
          id: avail.id,
          day: avail.day,
          from_time: avail.from_time,
          to_time: avail.to_time,
          available: avail.available
        })),
        next_step: "setup_services",
        message: "Working hours set successfully. Next step: Setup services"
      };

      console.log("Step 5 completed successfully, returning result");
      return response.success("Step 5 completed successfully", res, responseData);

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
      where: { user_id: req.user.id }
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
   * Get paginated list of all providers with filtering options
   */
  async getAllProviders(req, res) {
    console.log("ProviderController@getAllProviders");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder = req.query.sortOrder || "DESC";
    const { search, type, status, provider_type } = req.query;

    const query = {
      ...(search && {
        [Op.or]: [
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },
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
        status: {
          [Op.like]: `%${status}%`,
        },
      }),
      step_completed: {
        [Op.gte]: 5,
      },
    };

    const attributes = [
      "id",
      "first_name",
      "last_name",
      "full_name",
      "phone_code",
      "phone_number",
      "email",
      "provider_type",
      "gender",
      "status",
      "admin_verified",
      "step_completed",
      "created_at",
    ];

    try {
      const providers = await providerResources.getAllWithPagination(
        query,
        attributes,
        sortBy,
        sortOrder,
        page,
        limit
      );
      return response.success(
        "Providers list retrieved successfully",
        res,
        providers
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
    const data = req.body;
    let serviceProvider = await providerResources.findOne({
      id: data.provider_id,
    });

    if (!serviceProvider) {
      return response.badRequest("Provider account not found", res, false);
    }

    let responseMessage = "Provider profile has been approved successfully";
    if (data.approve == 2) {
      responseMessage = "Provider profile has been rejected";
    }

    serviceProvider = await providerResources.updateProvider(
      { admin_verified: data.approve },
      { id: data.provider_id }
    );

    const serviceProviderObj = {
      id: serviceProvider.id,
      first_name: serviceProvider.first_name,
      last_name: serviceProvider.last_name,
      full_name: serviceProvider.full_name,
      email: serviceProvider.email,
      phone_code: serviceProvider.phone_code,
      phone_number: serviceProvider.phone_number,
      step_completed: serviceProvider.step_completed,
      admin_verified: serviceProvider.admin_verified,
    };

    return response.success(responseMessage, res, serviceProviderObj);
  }

  /**
   * Get detailed information about a specific provider
   */
  async getProvider(req, res) {
    console.log("ProviderController@getProvider");
    const data = req.query;
    const serviceProvider = await providerResources.getAllDetails({
      id: data.provider_id,
    });

    if (!serviceProvider) {
      return response.badRequest("Provider account not found", res, false);
    }

    // Get address information
    const serviceProviderAddress = await ServiceProviderAddress.findOne({
      where: { user_id: serviceProvider.user_id }
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
      admin_verified: serviceProvider.admin_verified,
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
      "Provider details retrieved successfully",
      res,
      serviceProviderObj
    );
  }

  /**
   * Update provider's basic information
   */
  async updateProvider(req, res) {
    console.log("ProviderController@updateProvider");
    const data = req.body;
    const serviceProvider = await providerResources.findOne({
      id: data.provider_id,
    });

    if (!serviceProvider) {
      return response.badRequest("Provider account not found", res, false);
    }

    // Remove provider_id to prevent updating it
    const { provider_id, ...updateData } = data;

    // Only include valid keys for update
    const allowedFields = [
      "first_name",
      "last_name",
      "email",
      "country_id",
      "city_id",
      "status",
    ];
    const finalUpdateData = {};

    for (const key of allowedFields) {
      if (updateData.hasOwnProperty(key)) {
        finalUpdateData[key] = updateData[key];
      }
    }

    await providerResources.updateProvider(finalUpdateData, {
      id: data.provider_id,
    });

    return response.success("Provider information updated successfully", res);
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
    const logoutId = `logout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${logoutId}] Provider logout initiated`);
      
      // Extract and validate authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log(`[${logoutId}] ❌ No authorization header provided`);
        return this.sendLogoutErrorResponse(res, 401, "AUTHENTICATION_REQUIRED", "Authentication token is required", logoutId);
      }

      if (!authHeader.startsWith("Bearer ")) {
        console.log(`[${logoutId}] ❌ Invalid authorization header format`);
        return this.sendLogoutErrorResponse(res, 401, "INVALID_TOKEN_FORMAT", "Invalid token format", logoutId);
      }

      const token = authHeader.split(" ")[1];
      if (!token || token.trim().length === 0) {
        console.log(`[${logoutId}] ❌ Empty token provided`);
        return this.sendLogoutErrorResponse(res, 401, "EMPTY_TOKEN", "Token cannot be empty", logoutId);
      }

      // Validate token format (basic JWT structure check)
      if (!this.isValidJWTFormat(token)) {
        console.log(`[${logoutId}] ❌ Invalid JWT token format`);
        return this.sendLogoutErrorResponse(res, 401, "INVALID_TOKEN_FORMAT", "Invalid token format", logoutId);
      }

      // Get user context for audit logging
      const user = req.user;
      const provider = req.provider;
      const userContext = {
        user_id: user?.id,
        provider_id: provider?.id,
        email: user?.email,
        phone: user?.phone_number
      };

      console.log(`[${logoutId}] 🔍 Logging out provider:`, userContext);

      // Perform token invalidation with enhanced error handling
      const logoutResult = await this.performTokenInvalidation(token, logoutId);
      
      if (!logoutResult.success) {
        console.log(`[${logoutId}] ❌ Token invalidation failed:`, logoutResult.error);
        return this.sendLogoutErrorResponse(res, logoutResult.statusCode, logoutResult.errorCode, logoutResult.message, logoutId);
      }

      // Set comprehensive security headers
      this.setLogoutSecurityHeaders(res);

      // Log successful logout
      const duration = Date.now() - startTime;
      console.log(`[${logoutId}] ✅ Provider logout successful - Duration: ${duration}ms`, {
        user_id: userContext.user_id,
        provider_id: userContext.provider_id,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });

      // Return success response with audit information
      return this.sendLogoutSuccessResponse(res, logoutId, userContext, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${logoutId}] ❌ Unexpected error during logout:`, {
        error: error.message,
        stack: error.stack,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });

      return this.sendLogoutErrorResponse(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred during logout", logoutId);
    }
  }

  /**
   * Validate JWT token format (basic structure check)
   */
  isValidJWTFormat(token) {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Each part should be base64url encoded
      const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
      return parts.every(part => base64UrlRegex.test(part));
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
          message: "Token not found or already invalidated"
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
          message: "Failed to invalidate token"
        };
      }

      console.log(`[${logoutId}] ✅ Token successfully invalidated. Deleted count: ${deletedCount}`);
      return { success: true };

    } catch (error) {
      console.error(`[${logoutId}] ❌ Token invalidation error:`, error);
      
      // Categorize database errors
      if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeDatabaseError') {
        return {
          success: false,
          statusCode: 503,
          errorCode: "DATABASE_ERROR",
          message: "Database service temporarily unavailable"
        };
      }
      
      return {
        success: false,
        statusCode: 500,
        errorCode: "TOKEN_INVALIDATION_ERROR",
        message: "Failed to invalidate token"
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
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // CORS headers for logout
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        session_terminated: true
      }
    };

    return res.status(200).json({
      statusCode: 200,
      api_ver: process.env.API_VER,
      success: true,
      message: "Successfully logged out",
      data: responseData
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
        session_terminated: false
      }
    };

    // Set security headers even for error responses
    this.setLogoutSecurityHeaders(res);

    return res.status(statusCode).json({
      statusCode: statusCode,
      api_ver: process.env.API_VER,
      success: false,
      error: errorResponse
    });
  }

  /**
   * Change provider's password after verifying old password
   */
  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const provider = req.provider;
      const user = req.user;
      
      const isMatch = await bcrypt.compare(old_password, user.password);

      if (!isMatch) {
        return response.badRequest(
          "The current password you entered is incorrect",
          res
        );
      }

      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      await userResources.updateUser(
        { password: hashedNewPassword },
        { id: user.id }
      );

      return response.success("Password changed successfully", res);
    } catch (error) {
      console.log(error);
      return response.exception(
        "An error occurred while changing password",
        res
      );
    }
  }

  /**
   * Delete provider account after password verification
   */
  async deleteMyAccount(req, res) {
    try {
      const { password } = req.body;
      const provider = req.provider;
      const user = req.user;
      
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return response.badRequest(
          "The password you entered is incorrect",
          res
        );
      }

      // Soft delete both provider and user
      await providerResources.updateProvider(
        { status: 0 },
        { id: provider.id }
      );
      
      await userResources.updateUser(
        { status: 0 },
        { id: user.id }
      );

      return response.success(
        "Your account has been deleted successfully",
        res
      );
    } catch (error) {
      console.log(error);
      return response.exception(
        "An error occurred while deleting account",
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
   */
  async toggleAvailability(req, res) {
    console.log("ProviderController@toggleAvailability");
    const provider = req.provider;
    const { is_available } = req.body;

    try {
      await provider.update({
        is_available: is_available ? 1 : 0,
      });

      return response.success("Availability status updated successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id),
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get provider profile with all related data (for authenticated providers)
   */
  async getProvider(req, res) {
    console.log("ProviderController@getProvider");
    const provider = req.provider;
    const user = req.user;

    try {
      // Get full provider details with all related data
      const fullProvider = await ServiceProvider.findByPk(provider.id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "email",
              "phone_code",
              "phone_number",
              "verified_at",
              "is_verified",
            ],
          },
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
          {
            model: BankDetails,
            as: "bankDetails",
          },
          {
            model: ServiceProviderAvailability,
            as: "availability",
          },
          {
            model: ServiceList,
            as: "services",
          },
        ],
      });

      if (!fullProvider) {
        return response.notFound("Provider profile not found", res);
      }

      return response.success("Provider profile retrieved successfully", res, {
        provider: fullProvider,
      });
    } catch (error) {
      console.error("Error getting provider:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Update provider profile (for authenticated providers)
   */
  async updateProvider(req, res) {
    console.log("ProviderController@updateProvider");
    const provider = req.provider;
    const updateData = req.body;

    try {
      // Filter allowed update fields including location data
      const allowedFields = [
        "provider_type",
        "salon_name",
        "description",
        "location",
        "latitude",
        "longitude",
        "country_id",
        "city_id",
        "banner_image",
        "is_available",
        "notification",
      ];

      const filteredData = {};
      allowedFields.forEach((field) => {
        if (updateData.hasOwnProperty(field)) {
          filteredData[field] = updateData[field];
        }
      });

      await provider.update(filteredData);

      return response.success("Provider profile updated successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id, {
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "first_name", "last_name", "email"],
            },
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
        }),
      });
    } catch (error) {
      console.error("Error updating provider:", error);
      return response.exception(error.message, res);
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
        where: { user_id: userId }
      });

      if (serviceProvider) {
        // Update existing ServiceProvider
        await serviceProvider.update({
          subscription_id: subscriptionId,
          subscription_expiry: subscriptionExpiry,
          step_completed: Math.max(serviceProvider.step_completed, 1) // Keep highest step completed
        });
      } else {
        // Create new ServiceProvider
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: 'individual', // Default value
          subscription_id: subscriptionId,
          subscription_expiry: subscriptionExpiry,
          step_completed: 1
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
          console.log("Service provider address created for user:", { id: userId });
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
        message: "Subscription payment successful"
      };

      return response.success(
        "Subscription payment successful",
        res,
        result
      );

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
        where: { user_id: userId }
      });

      if (!serviceProvider) {
        // Create new ServiceProvider if doesn't exist
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: data.provider_type,
          step_completed: 2
        });
      } else {
        // Update existing ServiceProvider
        await serviceProvider.update({
          provider_type: data.provider_type,
          step_completed: Math.max(serviceProvider.step_completed, 2) // Keep highest step completed
        });
      }

      const result = {
        user_id: userId,
        service_provider_id: serviceProvider.id,
        provider_type: data.provider_type,
        step_completed: serviceProvider.step_completed,
        message: "Provider type set successfully"
      };

      return response.success(
        "Provider type set successfully",
        res,
        result
      );

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
    console.log("Request files:", req.files ? Object.keys(req.files) : 'No files');
    if (req.files && req.files.banner_image) {
      console.log("Banner image file details:", {
        originalname: req.files.banner_image[0]?.originalname,
        size: req.files.banner_image[0]?.size,
        mimetype: req.files.banner_image[0]?.mimetype
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
        where: { user_id: userId }
      });

      if (!serviceProvider) {
        // Create new ServiceProvider if doesn't exist
        serviceProvider = await ServiceProvider.create({
          user_id: userId,
          provider_type: 'individual', // Default value
          step_completed: 3
        });
      }

      // Validate required fields based on provider type
      if (!data.city_id || !data.country_id) {
        return response.badRequest("City and country are required", res, false);
      }

      // Conditional salon name validation
      if (serviceProvider.provider_type === 'salon' && !data.salon_name) {
        return response.badRequest("Salon name is required for salon providers", res, false);
      }

      // Prepare update data for ServiceProvider
      const updateData = {
        description: data.description || null, // Description is optional
        step_completed: Math.max(serviceProvider.step_completed, 3) // Keep highest step completed
      };

      // Add salon_name only if provided or if provider type is salon
      if (data.salon_name) {
        updateData.salon_name = data.salon_name;
      } else if (serviceProvider.provider_type === 'salon') {
        // For salon providers, keep existing salon_name if not provided
        updateData.salon_name = serviceProvider.salon_name;
      }

      // Handle banner image
      console.log("Starting banner image handling...");
      let bannerImageUrl = null;

      if (data.banner_image_id) {
        console.log("Using predefined banner image ID:", data.banner_image_id);
        // User selected a predefined banner image
        const bannerImage = await BannerImage.findByPk(data.banner_image_id);
        console.log("Banner image found:", bannerImage ? 'YES' : 'NO');
        if (!bannerImage || !bannerImage.is_active) {
          return response.badRequest("Invalid banner image selected", res, false);
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
          buffer: file.buffer ? 'Buffer exists' : 'No buffer'
        });
        
        // Validate S3 configuration
        console.log("Validating S3 config...");
        if (!s3Helper.validateConfig()) {
          console.log("S3 config validation failed");
          return response.badRequest("S3 configuration is invalid. Please check AWS credentials and bucket settings.", res, false);
        }

        console.log("S3 config validation passed");

        // Upload to S3
        console.log("Starting S3 upload...");
        const uploadResult = await s3Helper.uploadImage(
          file.buffer,
          file.originalname,
          'providers',
          `banners/${serviceProvider.id}`,
          {
            maxSize: 5 * 1024 * 1024, // 5MB limit for banner images
            generateThumbnail: true,
            thumbnailSize: { width: 300, height: 200 },
            uploadedBy: `provider_${serviceProvider.id}`,
            originalName: file.originalname
          }
        );
        console.log("S3 upload result:", uploadResult);

        if (!uploadResult.success) {
          console.log("S3 upload failed:", uploadResult.error);
          return response.badRequest(`Failed to upload banner image: ${uploadResult.error}`, res, false);
        }

        bannerImageUrl = uploadResult.main.url;
        console.log("S3 upload successful, URL:", bannerImageUrl);
      } else {
        console.log("No banner image provided - this should not happen");
        // This should not happen due to validation, but adding as a safety check
        return response.badRequest("Banner image (either predefined ID or custom upload) is required", res, false);
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
        where: { user_id: userId }
      });

      if (serviceProviderAddress) {
        // Update existing address record
        await serviceProviderAddress.update({
          country_id: data.country_id,
          city_id: data.city_id,
        });
        console.log("ServiceProviderAddress updated successfully");
      } else {
        // Create new address record
        await ServiceProviderAddress.create({
          user_id: userId,
          country_id: data.country_id,
          city_id: data.city_id,
          address: null, // Will be filled later
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
        description: data.description || null,
        banner_image: bannerImageUrl,
        step_completed: serviceProvider.step_completed,
        message: "Salon details updated successfully"
      };

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


}

