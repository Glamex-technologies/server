const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const UserResources = require("./user.resources");
const ResponseHelper = require("../../helpers/response.helpers");
const { genrateToken } = require("../../helpers/jwtToken.helpers");
const db = require("../../../startup/model");
const OtpVerification = db.models.OtpVerification;
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
      country_id: data.country_id,
      city_id: data.city_id,
      gender: data.gender,
    };
    console.log("Creating user with data:", {
      ...userObj,
      password: "[HIDDEN]",
    });
    const user = await userResources.create(userObj);
    console.log("User created:", { id: user.id });

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
    };

    return response.success("User registered successfully", res, result);
  }

  // Verify OTP for registration
  async verifyVerificationOtp(req, res) {
    try {
      console.log("UserController@verifyVerificationOtp");
      const data = req.body;
      console.log("Verification request data:", data);

      let user = await userResources.findOne({ id: data.user_id });
      if (!user) {
        return response.badRequest("User not found", res, false);
      }

      console.log("User found:", {
        id: user.id,
        is_verified: user.is_verified,
      });

      // Verify OTP using the new system
      const verificationResult = await OtpVerification.verifyForEntity(
        "user",
        user.id,
        String(data.otp),
        "registration"
      );

      if (!verificationResult.success) {
        return response.badRequest(verificationResult.message, res, false);
      }

      console.log("OTP verified successfully");

      // Mark user as verified
      user = await userResources.updateUser(
        {
          is_verified: 1,
          verified_at: new Date(),
        },
        { id: data.user_id }
      );
      // Prepare user object for token
      const userObj = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        user_type: user.user_type,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        country_id: user.country_id,
        city_id: user.city_id,
        is_verified: user.is_verified,
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
    } catch (err) {
      console.log(err);
      return response.exception("server error", res);
    }
  }

  // Resend OTP to user
  async resendOtp(req, res) {
    console.log("UserController@resendOtp");
    const data = req.body;
    let user = await userResources.findOne({ id: data.user_id });
    if (!user) {
      return response.badRequest("User not found", res, false);
    }

    // Create new OTP using the new system
    try {
      const otpRecord = await OtpVerification.createForEntity(
        "user",
        user.id,
        user.phone_code + user.phone_number,
        "registration"
      );
      console.log("New OTP created:", {
        otp_code: otpRecord.otp_code,
        expires_at: otpRecord.expires_at,
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
    };
    return response.success("OTP resent successfully", res, result);
  }

  // Authenticate user (login)
  async authenticate(req, res) {
    console.log("UserController@authenticate");
    const user = req.user;
    if (!user.is_verified) {
      // If not verified, send OTP using new system
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
      const result = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        user_type: user.user_type,
        email: user.email,
        phone_code: user.phone_code,
        phone_number: user.phone_number,
        city_id: user.city_id,
        is_verified: user.is_verified,
      };
      return response.success(
        "We have sent a OTP over your registered phone number. Please verify by using the OTP.",
        res,
        result
      );
    }
    // If verified, generate token
    const userObj = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email,
      phone_code: user.phone_code,
      phone_number: user.phone_number,
      country_id: user.country_id,
      city_id: user.city_id,
      is_verified: user.is_verified,
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
        city_id: user.city_id,
        is_verified: user.is_verified,
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

  // Verify OTP for forgot password
  async verifyForgotPasswordOtp(req, res) {
    console.log("UserController@verifyForgotPasswordOtp");
    const data = req.body;
    let user = await userResources.findOne({ id: data.user_id });
    if (!user) {
      return response.badRequest("User not found", res, false);
    }
    // Verify OTP using the new system
    const verificationResult = await OtpVerification.verifyForEntity(
      "user",
      user.id,
      String(data.otp),
      "password_reset"
    );

    if (!verificationResult.success) {
      return response.badRequest(verificationResult.message, res, false);
    }

    console.log("Password reset OTP verified successfully");
    const result = {
      id: user.id,
    };
    return response.success("user verified successfully", res, result);
  }

  // Reset password after OTP verification
  async resetPassword(req, res) {
    console.log("UserController@resetPassword");
    const data = req.body;
    let user = await userResources.findOne({ id: data.user_id });
    if (!user) {
      return response.badRequest("User not found", res, false);
    }
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    user = await userResources.updateUser(
      { password: hashedPassword },
      { id: data.user_id }
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
      country: user.country,
      city: user.city,
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
      const { user_id, ...updateData } = data;
      // Only include valid keys for update
      const allowedFields = [
        "first_name",
        "last_name",
        "email",
        "country_id",
        "city_id",
        "profile_image",
        "status",
        "gender",
      ];
      const finalUpdateData = {};
      for (const key of allowedFields) {
        if (key in updateData) {
          // includes keys with null values too
          finalUpdateData[key] = updateData[key];
        }
      }
      // Update the user
      const result = await userResources.updateUser(finalUpdateData, {
        id: data.user_id,
      });
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
};
