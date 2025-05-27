const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { genrateToken } = require("../../helpers/jwtToken.helpers");
const ResponseHelper = require("../../helpers/response.helpers");
const AdminResources = require("./admin.resources");

const response = new ResponseHelper();
const adminResources = new AdminResources();

module.exports = class AdminController {
    /**
     * Returns a welcome message for the admin route.
     */
    async getWelcome(req, res) {
        try {
            console.log('AdminController@getWelcome');
            return res.status(200).json({
                message: "I am Galmex Admin........",
            });
        } catch (error) {
            console.error("Error in getWelcome:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Authenticate admin and generate JWT token.
     */
    async authenticate(req, res) {
        try {
            console.log('AdminController@authenticate');
            const admin = req.admin;
            const adminObj = {
                id: admin.id,
                email: admin.email,
                first_name: admin.first_name,
                last_name: admin.last_name,
                full_name: admin.full_name,
                name: admin.name,
                role: {
                    id: admin.roleData.id,
                    title: admin.roleData.title,
                },
                status: admin.status,
                userType: "admin"
            };
            const accessToken = await genrateToken(adminObj);
            const result = {
                accessToken: accessToken,
                admin: adminObj
            };
            return response.success("Admin authenticated successfully", res, result);
        } catch (error) {
            console.error("Error in authenticate:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Get current admin profile.
     */
    async profile(req, res) {
        try {
            console.log('AdminController@profile');
            const admin = req.admin;
            const adminObj = {
                id: admin.id,
                email: admin.email,
                first_name: admin.first_name,
                last_name: admin.last_name,
                full_name: admin.full_name,
                name: admin.name,
                role: {
                    id: admin.roleData.id,
                    title: admin.roleData.title,
                },
                status: admin.status,
            };
            return response.success("Admin profile fetched successfully", res, adminObj);
        } catch (error) {
            console.error("Error in profile:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Send OTP to admin's email for password reset.
     */
    async forgotPassword(req, res) {
        try {
            console.log('AdminController@forgotPassword');
            const data = req.body;
            const admin = await adminResources.findOne({ email: data.email });
            if (!admin) {
                return response.badRequest('Admin not found', res, false);
            }
            const otp = 1111; // In production, generate a secure random OTP
            const adminResult = await adminResources.updateAdmin(
                { verification_otp: otp, verification_otp_created_at: new Date() },
                { id: admin.id }
            );
            const result = {
                id: adminResult.id,
                email: adminResult.email,
            };
            return response.success('OTP sent successfully', res, result);
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Verify OTP entered by the admin for password reset.
     */
    async verifyForgotPasswordOtp(req, res) {
        try {
            console.log('AdminController@verifyForgotPasswordOtp');
            const data = req.body;
            const admin = await adminResources.findOne({ id: data.admin_id });
            if (!admin) {
                return response.badRequest('Admin not found', res, false);
            }
            if (admin.verification_otp !== data.otp) {
                return response.badRequest('Invalid OTP', res, false);
            }
            const rememberToken = crypto.randomBytes(42).toString("hex").slice(0, 55);
            await adminResources.updateAdmin(
                { verification_otp: null, verification_otp_created_at: null, remember_token: rememberToken },
                { id: data.admin_id }
            );
            const result = {
                id: admin.id,
                remember_token: rememberToken
            };
            return response.success('OTP Verified successfully', res, result);
        } catch (error) {
            console.error("Error in verifyForgotPasswordOtp:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Reset admin password after OTP verification.
     */
    async resetPassword(req, res) {
        try {
            console.log('AdminController@resetPassword');
            const data = req.body;
            const admin = await adminResources.findOne({ id: data.admin_id });
            if (!admin) {
                return response.badRequest('Admin not found', res, false);
            }
            if (admin.remember_token !== data.remember_token) {
                return response.badRequest("Your password token got expired", res);
            }
            const hashedPassword = bcrypt.hashSync(data.password, 10);
            await adminResources.updateAdmin(
                { password: hashedPassword, remember_token: null },
                { id: data.admin_id }
            );
            return response.success('Password updated successfully', res);
        } catch (error) {
            console.error("Error in resetPassword:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Resend OTP for password reset.
     */
    async resendOtp(req, res) {
        try {
            console.log('AdminController@resendOtp');
            const data = req.query;
            const admin = await adminResources.findOne({ id: data.admin_id });
            if (!admin) {
                return response.badRequest('Admin not found', res, false);
            }
            const otp = 1111; // In production, generate a secure random OTP
            await adminResources.updateAdmin(
                { verification_otp: otp, verification_otp_created_at: new Date() },
                { id: data.admin_id }
            );
            const result = {
                id: admin.id,
                email: admin.email
            };
            return response.success('OTP resent successfully', res, result);
        } catch (error) {
            console.error("Error in resendOtp:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Handle file uploads (e.g., to S3).
     */
    async uploadFiles(req, res) {
        try {
            console.log('AdminController@uploadFiles');
            const file = req.file;
            if (!file) {
                return response.badRequest('File not found', res, false);
            }
            const result = {
                file: file.location,
            };
            return response.success('File uploaded successfully', res, result);
        } catch (error) {
            console.error("Error in uploadFiles:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Log out the admin by invalidating the token.
     */
    async logOut(req, res) {
        try {
            console.log('AdminController@logOut');
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return response.forbidden('Authorization token missing', res);
            }
            const token = authHeader.split(' ')[1];
            await adminResources.logOut({ token: token });
            return response.success("Admin logged out successfully", res);
        } catch (error) {
            console.error("Error in logOut:", error);
            return response.exception("Server error", res);
        }
    }

    /**
     * Change current admin's password.
     */
    async changePassword(req, res) {
        try {
            console.log('AdminController@changePassword');
            const { old_password, new_password } = req.body;
            const admin = req.admin;
            const isMatch = await bcrypt.compare(old_password, admin.password);
            if (!isMatch) {
                return response.badRequest("Old password is incorrect", res);
            }
            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            await adminResources.updateAdmin({ password: hashedNewPassword }, { id: admin.id });
            return response.success("Password changed successfully", res);
        } catch (error) {
            console.error("Error in changePassword:", error);
            return response.exception("Server error", res);
        }
    }
};