const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const UserResources = require("./user.resources");
const ResponseHelper = require("../../helpers/response.helpers");
const { genrateToken } = require("../../helpers/jwtToken.helpers");
const db = require("../../../startup/model");
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
        address: null, // Will be filled later
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

  // Get all users with pagination, search, and filters
  async getAllUsers(req, res) {
    console.log("ProviderController@getAllUsers");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder = req.query.sortOrder || "DESC";
    const { search, type, status } = req.query;
    // Build query for search and filters
    const query = {
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
      is_verified: 1,
    };
    const attributes = [
      "id",
      "first_name",
      "last_name",
      "full_name",
      "type",
      "phone_code",
      "status",
      "profile_image",
      "phone_number",
      "email",
      "gender",
      "is_verified",
      "created_at",
    ];
    try {
      const providers = await userResources.getAllWithPagination(
        query,
        attributes,
        sortBy,
        sortOrder,
        page,
        limit
      );
      return response.success("Providers fetched successfully", res, providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      return response.exception("Error fetching users", res);
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

  // Get user details by user_id
  async getUser(req, res) {
    console.log("UserController@getUser");
    const data = req.query;
    let user = await userResources.getAllDetails({ id: data.user_id });
    if (!user) {
      return response.badRequest("User not found", res, false);
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
      email: user.email,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
      profile_image: user.profile_image,
      status: user.status,
      gender: user.gender,
      country_id: userAddress?.country_id || null,
      city_id: userAddress?.city_id || null,
      address: userAddress?.address || null,
      latitude: userAddress?.latitude || null,
      longitude: userAddress?.longitude || null,
      created_at: user.created_at,
    };
    return response.success("User fetched successfully", res, result);
  }

  // Update user profile
  async updateUser(req, res) {
    console.log("UserController@updateUser");
    try {
      const data = req.body;
      // Find the user
      let user = await userResources.findOne({ id: data.user_id });
      if (!user) {
        return response.badRequest("User not found", res, false);
      }
      // Remove user_id to prevent updating it
      const { user_id, country_id, city_id, ...updateData } = data;
      
      // Only include valid keys for user update
      const allowedUserFields = [
        "first_name",
        "last_name",
        "email",
        "profile_image",
        "status",
        "gender",
      ];
      const finalUserUpdateData = {};
      for (const key of allowedUserFields) {
        if (key in updateData) {
          // includes keys with null values too
          finalUserUpdateData[key] = updateData[key];
        }
      }
      
      // Update the user
      await userResources.updateUser(finalUserUpdateData, {
        id: data.user_id,
      });
      
      // Update address information if provided
      if (country_id !== undefined || city_id !== undefined) {
        const userAddress = await UserAddress.findOne({
          where: { user_id: data.user_id }
        });
        
        if (userAddress) {
          // Update existing address record
          const addressUpdateData = {};
          if (country_id !== undefined) addressUpdateData.country_id = country_id;
          if (city_id !== undefined) addressUpdateData.city_id = city_id;
          
          await userAddress.update(addressUpdateData);
        } else {
          // Create new address record
          await UserAddress.create({
            user_id: data.user_id,
            country_id: country_id || null,
            city_id: city_id || null,
            address: null,
            latitude: null,
            longitude: null,
          });
        }
      }
      
      return response.success("User updated successfully", res);
    } catch (error) {
      console.error("Error in updateUser:", error);
      return response.exception("Server error occurred", res);
    }
  }

  // Logout user (invalidate token)
  async logOut(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.forbidden("Authorization token missing", res);
      }
      const token = authHeader.split(" ")[1];
      await userResources.logOut({ token: token });
      return response.success("Admin logged out successfully", res);
    } catch (error) {
      console.log(error);
      return response.exception("server error", res);
    }
  }

  // Change user password
  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const user = req.user;
      // Check if old password matches
      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch) {
        return response.badRequest("Old password is incorrect", res);
      }
      // Hash and update new password
      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      await userResources.updateUser(
        { password: hashedNewPassword },
        { id: user.id }
      );
      return response.success("Password changed successfully", res);
    } catch (error) {
      console.log(error);
      return response.exception("server error", res);
    }
  }

  // Delete user account (soft delete)
  async deleteMyAccount(req, res) {
    try {
      const { password } = req.body;
      const user = req.user;
      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return response.badRequest("You have entered wrong password.", res);
      }
      // Soft delete by setting deleted_at
      await userResources.updateUser(
        { deleted_at: new Date() },
        { id: user.id }
      );
      return response.success("Account deleted successfully.", res);
    } catch (error) {
      console.log(error);
      return response.exception("server error", res);
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
      // Get user address information
      const userAddress = await UserAddress.findOne({
        where: { user_id: user.id }
      });

      // Return user data with address information
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
          country_id: userAddress?.country_id || null,
          city_id: userAddress?.city_id || null,
          address: userAddress?.address || null,
          latitude: userAddress?.latitude || null,
          longitude: userAddress?.longitude || null,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      };
      
      return response.success("User profile data retrieved successfully", res, userData);
    } catch (error) {
      console.error("Error getting user profile data:", error);
      return response.exception("Failed to retrieve user profile data", res);
    }
  }
};
