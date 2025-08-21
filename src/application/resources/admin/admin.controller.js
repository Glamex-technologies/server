const bcrypt = require("bcrypt");

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
                access_token: accessToken, // Changed from accessToken to access_token for consistency
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
                first_name: admin.first_name,
                last_name: admin.last_name,
                email: admin.email,
                full_name: admin.full_name,
                phone_code: admin.phone_code,
                phone_number: admin.phone_number,
                role: {
                    id: admin.roleData.id,
                    title: admin.roleData.title,
                },
                status: admin.status,
                profile_image: admin.profile_image,
                created_at: admin.created_at,
                updated_at: admin.updated_at,
            };
            return response.success("Admin profile fetched successfully", res, adminObj);
        } catch (error) {
            console.error("Error in profile:", error);
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
     * Logout admin (invalidate token)
     */
    async logOut(req, res) {
        try {
            console.log('AdminController@logOut');
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return response.forbidden("Authorization token missing", res);
            }
            const token = authHeader.split(" ")[1];
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