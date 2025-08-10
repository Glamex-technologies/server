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

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const response = new ResponseHelper();
const providerResources = new ProviderResources();
const userResources = new UserResources();

// Models
const User = db.models.User;
const ServiceProvider = db.models.ServiceProvider;
const BankDetails = db.models.BankDetails;
const ServiceProviderAvailability = db.models.ServiceProviderAvailability;
const Service = db.models.Service;
const ServiceList = db.models.ServiceList;
const OtpVerification = db.models.OtpVerification;

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
        country_id: data.country_id || 1, // Default to first country if not provider
        city_id: data.city_id || 1, // Default to first city if not provided
        is_verified: 0,
        status: 1, // User account is active by default
      };

      const user = await User.create(userData);

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
          location: serviceProvider.location,
          latitude: serviceProvider.latitude,
          longitude: serviceProvider.longitude,
          country_id: serviceProvider.country_id,
          city_id: serviceProvider.city_id,
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
   * Upload documents with AWS S3 integration
   */
  async uploadDocuments(req, res) {
    console.log("ProviderController@uploadDocuments");
    const provider = req.provider; // From provider auth middleware
    const files = req.files;

    try {
      const uploadPromises = [];
      const documentUrls = {};

      // Define allowed document types
      const allowedDocuments = [
        "national_id_image_url",
        "freelance_certificate_image_url",
        "commercial_registration_image_url",
        "banner_image",
      ];

      // Upload each file to S3
      for (const fieldName of allowedDocuments) {
        if (files[fieldName] && files[fieldName][0]) {
          const file = files[fieldName][0];
          const fileName = `providers/${
            provider.id
          }/${fieldName}_${Date.now()}${path.extname(file.originalname)}`;

          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
          };

          const uploadPromise = s3
            .upload(uploadParams)
            .promise()
            .then((result) => {
              documentUrls[fieldName] = result.Location;
            });

          uploadPromises.push(uploadPromise);
        }
      } 

      await Promise.all(uploadPromises);

      // Update provider with document URLs
      await provider.update({
        ...documentUrls,
        step_completed: 2,
      });

      return response.success("Documents uploaded successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id),
        next_step: "service_setup",
      });
    } catch (error) {
      console.error("Error uploading documents:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available services from master catalog
   */
  async getAvailableServices(req, res) {
    console.log("ProviderController@getAvailableServices");

    try {
      const services = await Service.findAll({
        where: { status: 1 }, // Only active services
        attributes: ["id", "title", "image"],
        order: [["title", "ASC"]],
      });

      // Also get categories and subcategories for service setup
      const categories = await db.models.Category.findAll({
        where: { status: 1 },
        include: [
          {
            model: db.models.SubCategory,
            as: "subcategories",
            where: { status: 1 },
            required: false,
          },
        ],
        order: [["name", "ASC"]],
      });

      return response.success(
        res,
        "Available services retrieved successfully",
        {
          services: services,
          categories: categories,
        }
      );
    } catch (error) {
      console.error("Error getting available services:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Setup services for the provider
   */
  async setupServices(req, res) {
    console.log("ProviderController@setupServices");
    const provider = req.provider; // From provider auth middleware
    const { services } = req.body;

    try {
      // Validate that services array is provided
      if (!services || !Array.isArray(services) || services.length === 0) {
        return response.badRequest("Services array is required", res);
      }

      // Delete existing service lists for this provider
      await ServiceList.destroy({
        where: { service_provider_id: provider.id },
      });

      // Create new service lists
      const servicePromises = services.map((serviceData) => {
        return ServiceList.create({
          service_provider_id: provider.id,
          service_id: serviceData.service_id,
          category_id: serviceData.category_id,
          sub_category_id: serviceData.sub_category_id || null,
          title: serviceData.title || null,
          price: serviceData.price,
          description: serviceData.description || null,
          service_location: serviceData.service_location || 1,
          is_sub_service: serviceData.is_sub_service || 0,
          have_offers: serviceData.have_offers || 0,
          status: 1,
        });
      });

      await Promise.all(servicePromises);

      await provider.update({
        step_completed: 3,
      });

      return response.success("Services setup successfully", res, {
        provider: await ServiceProvider.findByPk(provider.id),
        next_step: "availability_setup",
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
      city_id: serviceProvider.city_id,
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
      city_id: serviceProvider.city_id,
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
      city_id: req.body.city_id,
      banner_image: req.body.banner_image,
      description: req.body.description,
      country_id: req.body.country_id,
      step_completed: 4,
    };

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

    const serviceProvider = await providerResources.getAllDetails({
      id: req.provider.id,
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
      city_id: serviceProvider.city_id,
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
   * Set provider's availability schedule
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
      city_id: serviceProvider.city_id,
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
      city_id: serviceProvider.city_id,
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
   * Log out provider by invalidating token
   */
  async logOut(req, res) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.forbidden("Authentication token is required", res);
      }

      const token = authHeader.split(" ")[1];
      await providerResources.logOut({ token: token });

      return response.success("Logged out successfully", res);
    } catch (error) {
      console.log(error);
      return response.exception("An error occurred during logout", res);
    }
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
   * Get countries and cities for location dropdowns
   */
  async getLocations(req, res) {
    console.log("ProviderController@getLocations");

    try {
      const countries = await db.models.Country.findAll({
        where: { status: 1 },
        include: [
          {
            model: db.models.City,
            as: "cities",
            where: { status: 1 },
            required: false,
          },
        ],
        order: [["name", "ASC"]],
      });

      return response.success("Locations retrieved successfully", res, {
        countries: countries,
      });
    } catch (error) {
      console.error("Error getting locations:", error);
      return response.exception(error.message, res);
    }
  }
};
