const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const UserResources = require("./user.resources");
const ResponseHelper = require("../../helpers/response.helpers");
const { genrateToken } = require("../../helpers/jwtToken.helpers");
const db = require("../../../startup/model");
const User = db.models.User;
const OtpVerification = db.models.OtpVerification;
const UserAddress = db.models.UserAddress;
const userResources = new UserResources();
const response = new ResponseHelper();

module.exports = class UserController {
  // Welcome endpoint
  async getWelcome(req, res) {
    return res.status(200).json({
      message: "I am Galmex........",
    });
  }

  // Register a new user
  async register(req, res) {
    console.log("UserController@register");
    const data = req.body;
    const hashedPassword = bcrypt.hashSync(data.password, 10);

    // Prepare user object for creation
    const userObj = {
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: data.first_name + " " + data.last_name,
      user_type: "user",
      email: data.email,
      phone_code: data.phone_code,
      phone_number: data.phone_number,
      password: hashedPassword,
      terms_and_condition: 1,
      gender: data.gender,
    };
    console.log("Creating user with data:", {
      ...userObj,
      password: "[HIDDEN]",
    });
    const user = await userResources.create(userObj);
    console.log("User created:", { id: user.id });

    // Create address record for the user
    try {
      const addressObj = {
        user_id: user.id,
        country_id: data.country_id,
        city_id: data.city_id,
        address: data.address, // Use the address from signup
        latitude: null, // Will be filled later
        longitude: null, // Will be filled later
      };
      await UserAddress.create(addressObj);
      console.log("User address created for user:", { id: user.id });
    } catch (error) {
      console.error("Error creating user address:", error);
      // Continue without failing registration
    }

    // Create OTP using the new system
    try {
      const otpRecord = await OtpVerification.createForEntity(
        "user",
        user.id,
        data.phone_code + data.phone_number,
        "registration"
      );
      console.log("OTP created:", {
        otp_code: otpRecord.otp_code,
        expires_at: otpRecord.expires_at,
      });
    } catch (error) {
      console.error("Error creating OTP:", error);
      // Continue without failing registration
    }
    // Get user address information for response
    const userAddress = await UserAddress.findOne({
      where: { user_id: user.id }
    });

    // Prepare response object
    const result = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
      gender: user.gender,
      country_id: userAddress?.country_id || null,
      city_id: userAddress?.city_id || null,
      address: userAddress?.address || null,
      is_verified: user.is_verified,
      verified_at: user.verified_at,
      status: user.status,
      notification: user.notification,
    };

    return response.success("Account created successfully! Please verify your phone number with the OTP sent to your registered mobile number.", res, result);
  }

  // Unified OTP verification method for all OTP types
  async verifyOtp(req, res) {
    try {
      console.log("UserController@verifyOtp");
      const data = req.body;
      console.log("Verification request data:", data);

      // Validate otp_type
      if (!data.otp_type || !['signup', 'login', 'forgot_password'].includes(data.otp_type)) {
        return response.badRequest("Invalid otp_type. Must be one of: signup, login, forgot_password", res, {
          error_code: 'INVALID_OTP_TYPE',
          message: 'Please provide a valid OTP type'
        });
      }

      // Find user by phone number combination
      let user = await userResources.findOne({ 
        phone_code: data.phone_code,
        phone_number: data.phone_number 
      });
      
      if (!user) {
        return response.notFound("User not found with the provided phone number", res, {
          error_code: 'USER_NOT_FOUND',
          message: 'No user account found with this phone number'
        });
      }

      console.log("User found:", {
        id: user.id,
        is_verified: user.is_verified,
      });

      // Map otp_type to purpose
      const purposeMap = {
        'signup': 'registration',
        'login': 'login',
        'forgot_password': 'password_reset'
      };
      
      const purpose = purposeMap[data.otp_type];

      console.log("Attempting to verify OTP:", {
        entity_type: "user",
        entity_id: user.id,
        otp: String(data.otp),
        purpose: purpose
      });

      // Verify OTP using the new system
      const verificationResult = await OtpVerification.verifyForEntity(
        "user",
        user.id,
        String(data.otp),
        purpose
      );

      console.log("OTP verification result:", verificationResult);

      if (!verificationResult.success) {
        // Enhanced error handling with specific status codes
        if (verificationResult.message === 'OTP not found or expired') {
          return response.unauthorized("OTP has expired or is invalid", res, {
            error_code: 'OTP_EXPIRED',
            message: 'The OTP has expired or is invalid. Please request a new one using the resend OTP functionality.'
          });
        } else if (verificationResult.message === 'Too many failed attempts') {
          return response.forbidden("Too many failed OTP attempts", res, {
            error_code: 'TOO_MANY_ATTEMPTS',
            message: 'Too many failed attempts. Please request a new OTP.'
          });
        } else {
          return response.unauthorized("Invalid OTP", res, {
            error_code: 'INVALID_OTP',
            message: 'The OTP you entered is incorrect.'
          });
        }
      }

      console.log("OTP verified successfully");

      // Handle different OTP types
      if (data.otp_type === 'signup') {
        // Mark user as verified
        user = await userResources.updateUser(
          {
            is_verified: 1,
            verified_at: new Date(),
          },
          { id: user.id }
        );
        
        // Get user address information
        const userAddress = await UserAddress.findOne({
          where: { user_id: user.id }
        });

        const userObj = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          user_type: user.user_type,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          country_id: userAddress?.country_id || null,
          city_id: userAddress?.city_id || null,
          address: userAddress?.address || null,
          is_verified: user.is_verified,
          verified_at: user.verified_at,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
        
        // Generate JWT token
        const accessToken = await genrateToken({ ...userObj, userType: "user" });
        const result = {
          access_token: accessToken,
          user: userObj,
        };
        
        return response.success(
          "User verified and registered successfully",
          res,
          result
        );
      } else if (data.otp_type === 'login') {
        // For login OTP verification, also verify the user account if not already verified
        if (!user.is_verified) {
          user = await userResources.updateUser(
            {
              is_verified: 1,
              verified_at: new Date(),
            },
            { id: user.id }
          );
        }
        
        // Get user address information
        const userAddress = await UserAddress.findOne({
          where: { user_id: user.id }
        });

        const userObj = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          user_type: user.user_type,
          email: user.email,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
          gender: user.gender,
          country_id: userAddress?.country_id || null,
          city_id: userAddress?.city_id || null,
          address: userAddress?.address || null,
          is_verified: user.is_verified,
          verified_at: user.verified_at,
          status: user.status,
          notification: user.notification,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
        
        // Generate JWT token
        const accessToken = await genrateToken({ ...userObj, userType: "user" });
        const result = {
          access_token: accessToken,
          user: userObj,
        };

        return response.success(
          "Login OTP verified successfully. You can now proceed with login.",
          res,
          result
        );
      } else if (data.otp_type === 'forgot_password') {
        // For forgot password OTP verification, just return success
        const result = {
          id: user.id,
          phone_code: user.phone_code,
          phone_number: user.phone_number,
        };

        return response.success(
          "Password reset OTP verified successfully. You can now reset your password.",
          res,
          result
        );
      }
    } catch (err) {
      console.error("Error in OTP verification:", err);
      return response.exception("Internal server error", res);
    }
  }

  // Verify OTP for registration (legacy method - redirects to verifyOtp)
  async verifyVerificationOtp(req, res) {
    // Redirect to the new unified verifyOtp method
    req.body.otp_type = 'signup';
    return this.verifyOtp(req, res);
  }

  // Resend OTP to user
  async resendOtp(req, res) {
    console.log("UserController@resendOtp");
    const data = req.body;
    
    // Validate otp_type
    if (!data.otp_type || !['signup', 'login', 'forgot_password'].includes(data.otp_type)) {
      return response.badRequest("Invalid otp_type. Must be one of: signup, login, forgot_password", res, {
        error_code: 'INVALID_OTP_TYPE',
        message: 'Please provide a valid OTP type'
      });
    }
    
    // Find user by phone number combination
    let user = await userResources.findOne({ 
      phone_code: data.phone_code,
      phone_number: data.phone_number 
    });
    
    if (!user) {
      return response.notFound("User not found with the provided phone number", res, {
        error_code: 'USER_NOT_FOUND',
        message: 'No user account found with this phone number'
      });
    }

    // Map otp_type to purpose
    const purposeMap = {
      'signup': 'registration',
      'login': 'login',
      'forgot_password': 'password_reset'
    };
    
          const purpose = purposeMap[data.otp_type];

    // Check rate limiting for OTP requests
    try {
      const recentOtps = await OtpVerification.count({
        where: {
          entity_type: 'user',
          entity_id: user.id,
          purpose: purpose,
          created_at: {
            [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
          }
        }
      });

      if (recentOtps >= 3) {
        return response.custom(429, "Too many OTP requests", res, {
          error_code: 'RATE_LIMIT_EXCEEDED',
          message: 'You have exceeded the maximum OTP requests. Please try again later.',
          retry_after: 3600 // 1 hour in seconds
        });
      }
    } catch (error) {
      console.error("Error checking rate limit:", error);
      // Continue with OTP creation even if rate limit check fails
    }

    // Create new OTP using the new system
    try {
      const otpRecord = await OtpVerification.createForEntity(
        "user",
        user.id,
        user.phone_code + user.phone_number,
        purpose
      );
      console.log("New OTP created:", {
        otp_code: otpRecord.otp_code,
        expires_at: otpRecord.expires_at,
        purpose: purpose
      });
    } catch (error) {
      console.error("Error creating OTP:", error);
      return response.exception("Failed to create OTP", res);
    }
    
    const result = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
      otp_type: data.otp_type
    };
    
    return response.created("OTP resent successfully", res, result);
  }

  // Authenticate user (login)
  async authenticate(req, res) {
    console.log("UserController@authenticate");
    const user = req.user;
    if (!user.is_verified) {
      // Check if there's already a valid login OTP
      const existingLoginOtp = await OtpVerification.findValidForEntity(
        "user",
        user.id,
        "login"
      );

      if (!existingLoginOtp) {
        // Generate new login OTP if none exists
        try {
          const otpRecord = await OtpVerification.createForEntity(
            "user",
            user.id,
            user.phone_code + user.phone_number,
            "login"
          );
          console.log("Login OTP created:", {
            otp_code: otpRecord.otp_code,
            expires_at: otpRecord.expires_at,
          });
        } catch (error) {
          console.error("Error creating login OTP:", error);
        }
      } else {
        console.log("Existing login OTP found:", {
          otp_code: existingLoginOtp.otp_code,
          expires_at: existingLoginOtp.expires_at,
        });
      }
      // Get user address information
      const userAddress = await UserAddress.findOne({
        where: { user_id: user.id }
      });

      const result = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        user_type: user.user_type,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        country_id: userAddress?.country_id || null,
        city_id: userAddress?.city_id || null,
        address: userAddress?.address || null,
        is_verified: user.is_verified,
      };
      return response.success(
        "Your account needs to be verified before you can login. OTP has been sent to your registered mobile number for verification.",
        res,
        {
          ...result,
          verification_required: true,
          otp_type: 'login' // Specify the OTP type for frontend
        }
      );
    }
    // If verified, generate token
    // Get user address information
    const userAddress = await UserAddress.findOne({
      where: { user_id: user.id }
    });

    const userObj = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
      gender: user.gender,
      country_id: userAddress?.country_id || null,
      city_id: userAddress?.city_id || null,
      address: userAddress?.address || null,
      is_verified: user.is_verified,
      verified_at: user.verified_at,
      status: user.status,
      notification: user.notification,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
    const accessToken = await genrateToken({ ...userObj, userType: "user" });
    const result = {
      access_token: accessToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        user_type: user.user_type,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        gender: user.gender,
        country_id: userAddress?.country_id || null,
        city_id: userAddress?.city_id || null,
        address: userAddress?.address || null,
        is_verified: user.is_verified,
        verified_at: user.verified_at,
        status: user.status,
        notification: user.notification,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
    return response.success("Login successfully", res, result);
  }

  // Forgot password - send OTP
  async forgotPassword(req, res) {
    console.log("UserController@forgotPassword");
    const data = req.body;
    let user = await userResources.findOne({
      phone_code: data.phone_code,
      phone_number: data.phone_number,
    });
    if (!user) {
      return response.badRequest("User not found", res, false);
    }

    // Create OTP for password reset using new system
    try {
      const otpRecord = await OtpVerification.createForEntity(
        "user",
        user.id,
        data.phone_code + data.phone_number,
        "password_reset"
      );
      console.log("Password reset OTP created:", {
        otp_code: otpRecord.otp_code,
        expires_at: otpRecord.expires_at,
      });
    } catch (error) {
      console.error("Error creating password reset OTP:", error);
      return response.exception("Failed to create OTP", res);
    }
    const result = {
      id: user.id,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
    };
    return response.success("OTP sent successfully", res, result);
  }



  // Reset password after OTP verification
  async resetPassword(req, res) {
    console.log("UserController@resetPassword");
    const data = req.body;
    
    // Find user by phone number combination
    let user = await userResources.findOne({ 
      phone_code: data.phone_code, 
      phone_number: data.phone_number 
    });
    
    if (!user) {
      return response.badRequest("User not found", res, {
        error_code: 'USER_NOT_FOUND',
        message: 'No user account found with this phone number'
      });
    }
    
    // Update password
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    user = await userResources.updateUser(
      { password: hashedPassword },
      { id: user.id }
    );
    
    return response.success("Password updated successfully", res, null);
  }

  // Get all users with pagination, search, and filters - Following provider module structure
  async getAllUsers(req, res) {
    console.log("UserController@getAllUsers");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder = req.query.sortOrder || "DESC";
    const { search, status } = req.query;

    // Build query for User table
    const userQuery = {
      user_type: "user", // Only get regular users, not providers
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

    try {
      // Get users with pagination
      const offset = (page - 1) * limit;
      
      const usersResult = await User.findAndCountAll({
        where: userQuery,
        limit: limit,
        offset: offset,
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
      const formattedUsers = await Promise.all(
        usersResult.rows.map(async (user) => {
          // Get address details
          let addressDetails = null;
          try {
            const address = await UserAddress.findOne({
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

          // Return comprehensive user data
          return {
            id: user.id,
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
            // Related data
            address: addressDetails,
          };
        })
      );

      // Prepare response data
      const totalPages = Math.ceil(usersResult.count / limit);
      const responseData = {
        users: formattedUsers,
        totalRecords: usersResult.count,
        pagination: {
          currentPage: page,
          perPage: limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        query: {
          search: search || null,
          status: status || null,
          sortBy,
          sortOrder,
        }
      };

      return response.success(
        "Users list retrieved successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      return response.exception("Failed to retrieve users list", res);
    }
  }

  // Upload user files (e.g., profile image)
  async uploadFiles(req, res) {
    console.log("UserController@uploadFiles");
    const file = req.file;
    console.log("File:", file);
    if (!file) {
      return response.badRequest("File not found", res, false);
    }
    const result = {
      file: file.location,
    };
    return response.success("File uploaded successfully", res, result);
  }

  // Get user details by user_id - Following provider module structure
  async getUser(req, res) {
    console.log("UserController@getUser");
    const userId = parseInt(req.params.user_id);

    try {
      // Find the user by ID
      const user = await User.findByPk(userId);

      if (!user) {
        return response.badRequest("User account not found", res, false);
      }

      // Get address details
      let addressDetails = null;
      try {
        const address = await UserAddress.findOne({
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

      // Return comprehensive user data (same structure as getAllUsers)
      const userData = {
        id: user.id,
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
        // Related data
        address: addressDetails,
      };

      return response.success(
        "User details retrieved successfully",
        res,
        userData
      );
    } catch (error) {
      console.error("Error fetching user:", error);
      return response.exception("Failed to retrieve user details", res);
    }
  }

  // Update user profile by admin - Following updateUserProfile logic
  async updateUser(req, res) {
    console.log("UserController@updateUser");
    const updateData = req.body;
    const userId = parseInt(req.params.user_id);

    try {
      // Find the user by ID
      const user = await db.models.User.findByPk(userId);
      if (!user) {
        return response.badRequest("User not found", res, {
          error_code: "USER_NOT_FOUND",
          message: "The specified user does not exist",
        });
      }

      // Validate that update data is provided
      if (!updateData || Object.keys(updateData).length === 0) {
        return response.badRequest("Update data is required", res, {
          error_code: "MISSING_UPDATE_DATA",
          message: "Please provide the fields you want to update",
        });
      }

      // Separate fields for each model
      const userFields = {};
      const addressFields = {};

      // Define allowed fields for each model
      const allowedUserFields = [
        "first_name",
        "last_name",
        "full_name",
        "email",
        "gender",
        "profile_image",
        "status",
        "notification",
        "fcm_token",
      ];

      const allowedAddressFields = [
        "address",
        "latitude",
        "longitude",
        "country_id",
        "city_id",
      ];

      // Categorize fields
      Object.keys(updateData).forEach((key) => {
        if (allowedUserFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (allowedAddressFields.includes(key)) {
          addressFields[key] = updateData[key];
        }
      });

      // Validate that at least one valid field is provided
      if (
        Object.keys(userFields).length === 0 &&
        Object.keys(addressFields).length === 0
      ) {
        return response.badRequest("No valid fields provided for update", res, {
          error_code: "INVALID_FIELDS",
          message: "Please provide valid fields to update",
          allowed_fields: {
            user: allowedUserFields,
            address: allowedAddressFields,
          },
        });
      }

      // Handle full_name update if first_name or last_name is updated
      if (userFields.first_name || userFields.last_name) {
        const firstName = userFields.first_name || user.first_name;
        const lastName = userFields.last_name || user.last_name;
        userFields.full_name = `${firstName} ${lastName}`;
      }

      // Update User model if user fields are provided
      if (Object.keys(userFields).length > 0) {
        await userResources.updateUser(userFields, { id: userId });
        console.log("User fields updated:", Object.keys(userFields));
      }

      // Update address if address fields are provided
      if (Object.keys(addressFields).length > 0) {
        let userAddress = await UserAddress.findOne({
          where: { user_id: userId },
        });

        if (userAddress) {
          await userAddress.update(addressFields);
        } else {
          // Create new address record
          await UserAddress.create({
            user_id: userId,
            ...addressFields,
          });
        }
        console.log("Address fields updated:", Object.keys(addressFields));
      }

      // Get updated data for response
      const updatedUser = await userResources.findOne({ id: userId });
      const updatedAddress = await UserAddress.findOne({
        where: { user_id: userId },
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
        updated_fields: {
          user: Object.keys(userFields),
          address: Object.keys(addressFields),
        },
      };

      return response.success(
        "User updated successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error in updateUser:", error);
      return response.exception("Server error occurred", res);
    }
  }

  // Delete user account by admin - Following deleteMyAccount logic
  async deleteUser(req, res) {
    console.log("UserController@deleteUser");
    const userId = parseInt(req.params.user_id);

    try {
      // Find the user by ID
      const user = await User.findByPk(userId);
      if (!user) {
        return response.badRequest("User not found", res, {
          error_code: "USER_NOT_FOUND",
          message: "The specified user does not exist",
        });
      }

      // Start transaction for atomic operations
      const transaction = await db.sequelize.transaction();

      try {
        // Soft delete user address records
        await UserAddress.update(
          { deleted_at: new Date() },
          {
            where: { user_id: userId },
            transaction,
          }
        );

        // Soft delete user account
        await userResources.updateUser(
          {
            status: 0,
            notification: 0,
            deleted_at: new Date(),
          },
          { id: userId },
          transaction
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
                where: { user_id: userId },
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
        console.log(`User account deletion by admin completed:`, {
          user_id: userId,
          email: user.email,
          phone: user.phone_number,
          deleted_at: new Date().toISOString(),
        });

        return response.success(
          "User account has been deleted successfully",
          res,
          {
            message: "Account deletion completed",
            user_id: userId,
            deletion_timestamp: new Date().toISOString(),
            note: "User account has been soft deleted successfully by admin.",
          }
        );
      } catch (transactionError) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error(
          "Transaction error during account deletion:",
          transactionError
        );
        return response.exception(
          "Failed to delete user account. Please try again.",
          res
        );
      }
    } catch (error) {
      console.error("Error in deleteUser:", error);
      return response.exception("Server error occurred", res);
    }
  }

  // Logout user (invalidate token) - Following provider module logic
  async logOut(req, res) {
    const startTime = Date.now();
    const logoutId = `user_logout_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      console.log(`[${logoutId}] User logout initiated`);

      // Extract and validate authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log(`[${logoutId}] ❌ No authorization header provided`);
        return response.unauthorized("Authentication token is required", res, {
          error_code: "AUTHENTICATION_REQUIRED",
          message: "Authentication token is required"
        });
      }

      if (!authHeader.startsWith("Bearer ")) {
        console.log(`[${logoutId}] ❌ Invalid authorization header format`);
        return response.unauthorized("Invalid token format", res, {
          error_code: "INVALID_TOKEN_FORMAT",
          message: "Invalid token format"
        });
      }

      const token = authHeader.split(" ")[1];
      if (!token || token.trim().length === 0) {
        console.log(`[${logoutId}] ❌ Empty token provided`);
        return response.unauthorized("Token cannot be empty", res, {
          error_code: "EMPTY_TOKEN",
          message: "Token cannot be empty"
        });
      }

      // Validate token format (basic JWT structure check)
      if (!this.isValidJWTFormat(token)) {
        console.log(`[${logoutId}] ❌ Invalid JWT token format`);
        return response.unauthorized("Invalid token format", res, {
          error_code: "INVALID_TOKEN_FORMAT",
          message: "Invalid token format"
        });
      }

      // Get user context for audit logging
      const user = req.user;
      const userContext = {
        user_id: user?.id,
        email: user?.email,
        phone: user?.phone_number,
      };

      console.log(`[${logoutId}] 🔍 Logging out user:`, userContext);

      // Perform token invalidation
      const logoutResult = await this.performTokenInvalidation(token, logoutId);

      if (!logoutResult.success) {
        console.log(
          `[${logoutId}] ❌ Token invalidation failed:`,
          logoutResult.error
        );
        return response.custom(logoutResult.statusCode, logoutResult.message, res, {
          error_code: logoutResult.errorCode,
          message: logoutResult.message
        });
      }

      // Log successful logout
      const duration = Date.now() - startTime;
      console.log(
        `[${logoutId}] ✅ User logout successful - Duration: ${duration}ms`,
        {
          user_id: userContext.user_id,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        }
      );

      return response.success("User logged out successfully", res, {
        message: "You have been successfully logged out",
        logout_id: logoutId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${logoutId}] ❌ Unexpected error during logout:`, {
        error: error.message,
        stack: error.stack,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });

      return response.exception("An unexpected error occurred during logout", res);
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
      // Perform token deletion
      const deletedCount = await userResources.logOut({ token: token });

      if (deletedCount === 0) {
        console.log(`[${logoutId}] ❌ No tokens were deleted`);
        return {
          success: false,
          statusCode: 401,
          errorCode: "TOKEN_NOT_FOUND",
          message: "Token not found or already invalidated",
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
        errorCode: "INTERNAL_SERVER_ERROR",
        message: "Failed to invalidate token",
      };
    }
  }

  // Change user password - Following provider module logic
  async changePassword(req, res) {
    console.log("UserController@changePassword");
    try {
      const { old_password, new_password } = req.body;
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
      console.log(`Password changed successfully for user ID: ${user.id} at ${new Date().toISOString()}`);

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

  // Delete user account with comprehensive soft deletion - Following provider module logic
  async deleteMyAccount(req, res) {
    console.log("UserController@deleteMyAccount");
    const { password, reason_id } = req.body;
    const user = req.user;

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
        // Soft delete user address records
        await UserAddress.update(
          { deleted_at: new Date() },
          {
            where: { user_id: user.id },
            transaction,
          }
        );

        // Soft delete user account
        await userResources.updateUser(
          {
            status: 0,
            notification: 0,
            deleted_at: new Date(),
          },
          { id: user.id },
          transaction
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
        console.log(`User account deletion completed:`, {
          user_id: user.id,
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
      console.error("Error deleting user account:", error);
      return response.exception(
        "An error occurred while deleting your account",
        res
      );
    }
  }

  /**
   * Get user profile data (for authenticated users)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with user data
   */
  async getUserProfile(req, res) {
    console.log("UserController@getUserProfile");
    const user = req.user;

    try {
      // Get user address information with country and city details
      const userAddress = await UserAddress.findOne({
        where: { user_id: user.id },
        include: [
          {
            model: db.models.Country,
            as: "country",
            attributes: ['id', 'name']
          },
          {
            model: db.models.City,
            as: "city",
            attributes: ['id', 'name']
          }
        ]
      });

      // Prepare user data (without address fields)
      const userData = {
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
        notification: user.notification
      };

      // Prepare address data
      const addressData = userAddress ? {
        id: userAddress.id,
        address: userAddress.address,
        latitude: userAddress.latitude,
        longitude: userAddress.longitude,
        country_id: userAddress.country_id,
        city_id: userAddress.city_id,
        country: userAddress.country ? {
          id: userAddress.country.id,
          name: userAddress.country.name
        } : null,
        city: userAddress.city ? {
          id: userAddress.city.id,
          name: userAddress.city.name
        } : null
      } : null;

      const result = {
        user: userData,
        address: addressData
      };
      
      return response.success("User profile data retrieved successfully", res, result);
    } catch (error) {
      console.error("Error getting user profile data:", error);
      return response.exception("Failed to retrieve user profile data", res);
    }
  }

  /**
   * Update user profile (for authenticated users)
   * Allows users to update their own profile fields similar to provider module
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated user data
   */
  async updateUserProfile(req, res) {
    console.log("UserController@updateUserProfile");
    const updateData = req.body;
    const user = req.user;

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
      const addressFields = {};

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

      const allowedAddressFields = [
        "address",
        "latitude",
        "longitude",
        "country_id",
        "city_id",
      ];

      // Categorize fields
      Object.keys(updateData).forEach((key) => {
        if (allowedUserFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (allowedAddressFields.includes(key)) {
          addressFields[key] = updateData[key];
        }
      });

      // Validate that at least one valid field is provided
      if (
        Object.keys(userFields).length === 0 &&
        Object.keys(addressFields).length === 0
      ) {
        return response.badRequest("No valid fields provided for update", res, {
          error_code: "INVALID_FIELDS",
          message: "Please provide valid fields to update",
          allowed_fields: {
            user: allowedUserFields,
            address: allowedAddressFields,
          },
        });
      }

      // Handle full_name update if first_name or last_name is updated
      if (userFields.first_name || userFields.last_name) {
        const currentUser = await userResources.findOne({ id: user.id });
        const firstName = userFields.first_name || currentUser.first_name;
        const lastName = userFields.last_name || currentUser.last_name;
        userFields.full_name = `${firstName} ${lastName}`;
      }

      // Update User model if user fields are provided
      if (Object.keys(userFields).length > 0) {
        await userResources.updateUser(userFields, { id: user.id });
        console.log("User fields updated:", Object.keys(userFields));
      }

      // Update address if address fields are provided
      if (Object.keys(addressFields).length > 0) {
        let userAddress = await UserAddress.findOne({
          where: { user_id: user.id },
        });

        if (userAddress) {
          await userAddress.update(addressFields);
        } else {
          // Create new address record
          await UserAddress.create({
            user_id: user.id,
            ...addressFields,
          });
        }
        console.log("Address fields updated:", Object.keys(addressFields));
      }

      // Get updated data for response
      const updatedUser = await userResources.findOne({ id: user.id });
      const updatedAddress = await UserAddress.findOne({
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
        updated_fields: {
          user: Object.keys(userFields),
          address: Object.keys(addressFields),
        },
      };

      return response.success(
        "User profile updated successfully",
        res,
        responseData
      );
    } catch (error) {
      console.error("Error updating user profile:", error);
      return response.exception("Failed to update user profile", res);
    }
  }
};
