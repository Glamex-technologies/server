const bcrypt = require('bcryptjs');
const ProviderResources = require('./provider.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const { genrateToken } = require('../../helpers/jwtToken.helpers');
const { Op } = require('sequelize');
const db = require("../../../startup/model");
const OtpVerification = db.models.OtpVerification;
const response = new ResponseHelper();
const providerResources = new ProviderResources();

module.exports = class ProviderController {
    /**
     * Simple welcome endpoint to check if service is running
     */
    async getWelcome(req, res) {
        return res.status(200).json({
            message: "Galmex provider service is running",
        });
    };

    /**
     * Register a new provider with basic details
     */
    async register(req, res) {
        console.log('ProviderController@register');
        const data = req.body;
        const otp = 1111; // Default OTP for development
        const hashedPassword = bcrypt.hashSync(data.password, 10);

        const serviceProvider = {
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: data.first_name + ' ' + data.last_name,
            type: 'service_provider',
            email: data.email,
            phone_code: data.phone_code,
            phone_number: data.phone_number,
            password: hashedPassword,
            terms_and_condition: 1,
            step_completed: 0,
            gender: data.gender
        }

        const provider = await providerResources.create(serviceProvider);
        
        // Create OTP using the new system
        try {
            const otpRecord = await OtpVerification.createForEntity(
                'provider',
                provider.id,
                data.phone_code + data.phone_number,
                'registration'
            );
            console.log("Provider OTP created:", {
                otp_code: otpRecord.otp_code,
                expires_at: otpRecord.expires_at,
            });
        } catch (error) {
            console.error("Error creating provider OTP:", error);
            // Continue without failing registration
        }
        const result = {
            id: provider.id,
            first_name: provider.first_name,
            last_name: provider.last_name,
            full_name: provider.full_name,
            type: provider.type,
            email: provider.email,
            phone_code: provider.phone_code,
            phone_number: provider.phone_number,
            step_completed: provider.step_completed,
            gender: provider.gender
        };

        return response.success('Registration successful. Please verify your account with the OTP sent to your phone.', res, result);
    }

    /**
     * Verify provider's OTP to complete registration
     */
    async verifyVerificationOtp(req, res) {
        console.log('ProviderController@verifyVerificationOtp');
        const data = req.body;
        let serviceProvider = await providerResources.findOne({ id: data.provider_id });
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
        }
        // Verify OTP using the new system
        const verificationResult = await OtpVerification.verifyForEntity(
            'provider',
            serviceProvider.id,
            String(data.otp),
            'registration'
        );

        if (!verificationResult.success) {
            return response.badRequest(verificationResult.message, res, false);
        }

        console.log("Provider OTP verified successfully");

        serviceProvider = await providerResources.updateProvider(
            { verified_at: new Date(), step_completed: 1 },
            { id: data.provider_id }
        );
        
        const serviceProviderObj = {
            id: serviceProvider.id,
            first_name: serviceProvider.first_name,
            last_name: serviceProvider.last_name,
            full_name: serviceProvider.full_name,
            type: serviceProvider.type,
            email: serviceProvider.email,
            phone_code: serviceProvider.phone_code,
            phone_number: serviceProvider.phone_number,
            step_completed: serviceProvider.step_completed
        };
        
        const accessToken = await genrateToken({ ...serviceProviderObj, userType: 'provider' });
        const result = {
            access_token: accessToken,
            service_provider: serviceProviderObj
        }
        
        return response.success('Account verification successful. You can now complete your profile setup.', res, result);
    }

    /**
     * Resend OTP to provider's phone number
     */
    async resendOtp(req, res) {
        console.log('ProviderController@resendOtp');
        const data = req.query;
        const serviceProvider = await providerResources.findOne({ id: data.provider_id });
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
        }
        
        // Create new OTP using the new system
        try {
            const otpRecord = await OtpVerification.createForEntity(
                'provider',
                serviceProvider.id,
                serviceProvider.phone_code + serviceProvider.phone_number,
                'registration'
            );
            console.log("Provider resend OTP created:", {
                otp_code: otpRecord.otp_code,
                expires_at: otpRecord.expires_at,
            });
        } catch (error) {
            console.error("Error creating resend OTP:", error);
            return response.exception("Failed to create OTP", res);
        }
        
        const provider = serviceProvider; // Use existing provider data
        
        const result = {
            id: provider.id,
            first_name: provider.first_name,
            last_name: provider.last_name,
            full_name: provider.full_name,
            type: provider.type,
            email: provider.email,
            phone_code: provider.phone_code,
            phone_number: provider.phone_number,
            step_completed: provider.step_completed
        };
        
        return response.success('OTP has been resent to your registered phone number', res, result);
    }

    /**
     * Set provider type (individual or business)
     */
    async setProviderType(req, res) {
        console.log('ProviderController@setServiceDetails');
        const data = {
            provider_type: req.body.provider_type,
            step_completed: 2
        }
        
        const serviceProvider = await providerResources.updateProvider(data, { id: req.provider.id });
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
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
            step_completed: serviceProvider.step_completed
        };
        
        return response.success('Provider type updated successfully', res, serviceProviderObj);
    }

    /**
     * Set provider's document details for verification
     */
    async setDocumentDetails(req, res) {
        console.log('ProviderController@setDocumentDetails');
        const data = {
            service_provider_id: req.provider.id,
            national_id: req.body.national_id,
            bank_account_name: req.body.bank_account_name,
            bank_name: req.body.bank_name,
            account_number: req.body.account_number,
            freelance_certificate: req.body.freelance_certificate,
            vat_number: req.body.vat_number,
            vat_amount: req.body.vat_amount,
            commertial_certificate: req.body.commertial_certificate
        }
        
        const serviceProviderDetails = await providerResources.createUpdateProviderDetail(data, { service_provider_id: req.provider.id });
        if (!serviceProviderDetails) {
            return response.badRequest('Failed to update provider details', res, false);
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
                commertial_certificate: serviceProviderDetails.commertial_certificate
            }
        };
        
        return response.success('Document details updated successfully', res, serviceProviderObj);
    }

    /**
     * Set provider's service details (salon info, location, etc.)
     */
    async setServiceDetails(req, res) {
        console.log('ProviderController@setServiceDetails');
        const data = {
            salon_name: req.body.salon_name,
            city_id: req.body.city_id,
            banner_image: req.body.banner_image,
            description: req.body.description,
            country_id: req.body.country_id,
            step_completed: 4
        }
        
        const serviceProviderUpdate = await providerResources.updateProvider(data, { id: req.provider.id });
        if (!serviceProviderUpdate) {
            return response.badRequest('Failed to update service details', res, false);
        }
        
        const serviceProvider = await providerResources.getAllDetails({ id: req.provider.id });
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
                bank_account_name: serviceProvider.serviceProviderDetail.bank_account_name,
                bank_name: serviceProvider.serviceProviderDetail.bank_name,
                account_number: serviceProvider.serviceProviderDetail.account_number,
                freelance_certificate: serviceProvider.serviceProviderDetail.freelance_certificate,
                commertial_certificate: serviceProvider.commertial_certificate
            }
        };
        
        return response.success('Service details updated successfully', res, serviceProviderObj);
    }

    /**
     * Set provider's availability schedule
     */
    async setAvailability(req, res) {
        console.log('ProviderController@setAvailability');
        const data = req.body.availbilty;
        const availability = await providerResources.createUpdateProviderAvailability(data, req.provider.id);
        if (!availability) {
            return response.badRequest('Failed to update availability schedule', res, false);
        }
        
        const serviceProviderUpdate = await providerResources.updateProvider(
            { step_completed: 5 },
            { id: req.provider.id }
        );
        
        const serviceProvider = await providerResources.getAllDetails({ id: req.provider.id });
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
                bank_account_name: serviceProvider.serviceProviderDetail.bank_account_name,
                bank_name: serviceProvider.serviceProviderDetail.bank_name,
                account_number: serviceProvider.serviceProviderDetail.account_number,
                freelance_certificate: serviceProvider.serviceProviderDetail.freelance_certificate,
                commertial_certificate: serviceProvider.commertial_certificate
            },
            serviceProviderAvailability: serviceProvider.serviceProviderAvailability.map((availability) => {
                return {
                    id: availability.id,
                    day: availability.day,
                    from_time: availability.from_time,
                    to_time: availability.to_time,
                    available: availability.available
                }
            })
        };
        
        return response.success('Availability schedule updated successfully', res, serviceProviderObj);
    }

    /**
     * Authenticate provider and generate access token
     */
    async authenticate(req, res) {
        try {
            console.log('ProviderController@authenticate');
            const serviceProvider = req.provider;
            
            if (!serviceProvider.verified_at) {
                // Create OTP for login verification using new system
                try {
                    const otpRecord = await OtpVerification.createForEntity(
                        'provider',
                        serviceProvider.id,
                        serviceProvider.phone_code + serviceProvider.phone_number,
                        'login'
                    );
                    console.log("Provider login OTP created:", {
                        otp_code: otpRecord.otp_code,
                        expires_at: otpRecord.expires_at,
                    });
                } catch (error) {
                    console.error("Error creating provider login OTP:", error);
                }
                
                const result = {
                    id: serviceProvider.id,
                    first_name: serviceProvider.first_name,
                    last_name: serviceProvider.last_name,
                    full_name: serviceProvider.full_name,
                    email: serviceProvider.email,
                    phone_code: serviceProvider.phone_code,
                    phone_number: serviceProvider.phone_number,
                    step_completed: serviceProvider.step_completed,
                    verified_at: serviceProvider.verified_at,
                };
                
                return response.success('An OTP has been sent to your registered phone number for verification', res, result);
            }
            
            const serviceProviderObj = {
                id: serviceProvider.id,
                phone_code: serviceProvider.phone_code,
                phone_number: serviceProvider.phone_number,
                provider_type: serviceProvider.provider_type,
                step_completed: serviceProvider.step_completed,
                userType: 'provider'
            };
            
            const accessToken = await genrateToken(serviceProviderObj);
            const result = {
                access_token: accessToken,
                service_provider: {
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
                    verified_at: serviceProvider.verified_at,
                    admin_verified: serviceProvider.admin_verified,
                    status: serviceProvider.status,
                    serviceProviderDetail: serviceProvider.serviceProviderDetail ? {
                        id: serviceProvider.serviceProviderDetail.id,
                        national_id: serviceProvider.serviceProviderDetail.national_id,
                        bank_account_name: serviceProvider.serviceProviderDetail.bank_account_name,
                        bank_name: serviceProvider.serviceProviderDetail.bank_name,
                        account_number: serviceProvider.serviceProviderDetail.account_number,
                        freelance_certificate: serviceProvider.serviceProviderDetail.freelance_certificate,
                        commertial_certificate: serviceProvider.commertial_certificate
                    } : null,
                    serviceProviderAvailability: serviceProvider.serviceProviderAvailability.length ? serviceProvider.serviceProviderAvailability.map((availability) => {
                        return {
                            id: availability.id,
                            day: availability.day,
                            from_time: availability.from_time,
                            to_time: availability.to_time,
                            available: availability.available
                        }
                    }) : null
                }
            }
            
            return response.success('Login successful', res, result);
        } catch (error) {
            console.error('Authentication error:', error);
            return response.exception('An error occurred during authentication', res);
        }
    }

    /**
     * Initiate password reset process by sending OTP
     */
    async forgotPassword(req, res) {
        console.log('ProviderController@forgotPassword');
        const data = req.body;
        const serviceProvider = await providerResources.findOne({ phone_code: data.phone_code, phone_number: data.phone_number });
        
        if (!serviceProvider) {
            return response.badRequest('No account found with this phone number', res, false);
        }
        
        // Create OTP for password reset using new system
        try {
            const otpRecord = await OtpVerification.createForEntity(
                'provider',
                serviceProvider.id,
                data.phone_code + data.phone_number,
                'password_reset'
            );
            console.log("Provider password reset OTP created:", {
                otp_code: otpRecord.otp_code,
                expires_at: otpRecord.expires_at,
            });
        } catch (error) {
            console.error("Error creating password reset OTP:", error);
            return response.exception("Failed to create OTP", res);
        }
        
        const provider = serviceProvider; // Use existing provider data
        
        const result = {
            id: provider.id,
            phone_code: provider.phone_code,
            phone_number: provider.phone_number,
        };
        
        return response.success('OTP sent successfully for password reset', res, result);
    }

    /**
     * Verify OTP for password reset
     */
    async verifyForgotPasswordOtp(req, res) {
        console.log('ProviderController@verifyForgotPasswordOtp');
        const data = req.body;
        const serviceProvider = await providerResources.findOne({ id: data.provider_id });
        
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
        }
        
        // Verify OTP using the new system
        const verificationResult = await OtpVerification.verifyForEntity(
            'provider',
            serviceProvider.id,
            String(data.otp),
            'password_reset'
        );

        if (!verificationResult.success) {
            return response.badRequest(verificationResult.message, res, false);
        }

        console.log("Provider password reset OTP verified successfully");
        
        const provider = serviceProvider; // Use existing provider data
        
        const result = {
            id: provider.id
        };
        
        return response.success('OTP verified successfully. You can now reset your password.', res, result);
    }

    /**
     * Reset provider's password after OTP verification
     */
    async resetPassword(req, res) {
        console.log('ProviderController@resetPassword');
        const data = req.body;
        const serviceProvider = await providerResources.findOne({ id: data.provider_id });
        
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
        }
        
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        await providerResources.updateProvider(
            { password: hashedPassword },
            { id: data.provider_id }
        );
        
        return response.success('Your password has been reset successfully', res, null);
    }

    /**
     * Get paginated list of all providers with filtering options
     */
    async getAllProviders(req, res) {
        console.log('ProviderController@getAllProviders');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';
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
            ...(type !== undefined && type !== null && {
                admin_verified: type == 1 ? 1 : (type == 3 ? 2 : 0),
            }),
            ...(provider_type !== undefined && provider_type !== null && {
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
            'id',
            'first_name',
            'last_name',
            'full_name',
            'phone_code',
            'phone_number',
            'email',
            'provider_type',
            'gender',
            'status',
            'admin_verified',
            'step_completed',
            'created_at'
        ];
        
        try {
            const providers = await providerResources.getAllWithPagination(query, attributes, sortBy, sortOrder, page, limit);
            return response.success('Providers list retrieved successfully', res, providers);
        } catch (error) {
            console.error('Error fetching providers:', error);
            return response.exception('Failed to retrieve providers list', res);
        }
    }

    /**
     * Approve or reject provider profile by admin
     */
    async providerProfileAction(req, res) {
        console.log('ProviderController@providerProfileAction');
        const data = req.body;
        let serviceProvider = await providerResources.findOne({ id: data.provider_id });
        
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
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
            admin_verified: serviceProvider.admin_verified
        };
        
        return response.success(responseMessage, res, serviceProviderObj);
    }

    /**
     * Get detailed information about a specific provider
     */
    async getProvider(req, res) {
        console.log('ProviderController@getProvider');
        const data = req.query;
        const serviceProvider = await providerResources.getAllDetails({ id: data.provider_id });
        
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
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
                bank_account_name: serviceProvider.serviceProviderDetail.bank_account_name,
                bank_name: serviceProvider.serviceProviderDetail.bank_name,
                account_number: serviceProvider.serviceProviderDetail.account_number,
                freelance_certificate: serviceProvider.serviceProviderDetail.freelance_certificate,
                commertial_certificate: serviceProvider.commertial_certificate
            },
            serviceProviderAvailability: serviceProvider.serviceProviderAvailability.map((availability) => {
                return {
                    id: availability.id,
                    day: availability.day,
                    from_time: availability.from_time,
                    to_time: availability.to_time,
                    available: availability.available
                }
            })
        };
        
        return response.success('Provider details retrieved successfully', res, serviceProviderObj);
    }

    /**
     * Update provider's basic information
     */
    async updateProvider(req, res) {
        console.log('ProviderController@updateProvider');
        const data = req.body;
        const serviceProvider = await providerResources.findOne({ id: data.provider_id });
        
        if (!serviceProvider) {
            return response.badRequest('Provider account not found', res, false);
        }
        
        // Remove provider_id to prevent updating it
        const { provider_id, ...updateData } = data;
        
        // Only include valid keys for update
        const allowedFields = ['first_name', 'last_name', 'email', 'country_id', 'city_id', 'status'];
        const finalUpdateData = {};
        
        for (const key of allowedFields) {
            if (updateData.hasOwnProperty(key)) {
                finalUpdateData[key] = updateData[key];
            }
        }
        
        await providerResources.updateProvider(
            finalUpdateData,
            { id: data.provider_id }
        );
        
        return response.success('Provider information updated successfully', res);
    }

    /**
     * Handle file uploads for provider documents
     */
    async uploadFiles(req, res) {
        console.log('ProviderController@uploadFiles');
        const file = req.file;
        
        if (!file) {
            return response.badRequest('No file was uploaded', res, false);
        }
        
        const result = {
            file: file.location,
        };
        
        return response.success('File uploaded successfully', res, result);
    }

    /**
     * Log out provider by invalidating token
     */
    async logOut(req, res) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return response.forbidden('Authentication token is required', res);
            }
            
            const token = authHeader.split(' ')[1];
            await providerResources.logOut({ token: token });
            
            return response.success("Logged out successfully", res);
        } catch (error) {
            console.log(error)
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
            const isMatch = await bcrypt.compare(old_password, provider.password);
            
            if (!isMatch) {
                return response.badRequest("The current password you entered is incorrect", res);
            }
            
            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            await providerResources.updateProvider({ password: hashedNewPassword }, { id: provider.id });
            
            return response.success("Password changed successfully", res);
        } catch (error) {
            console.log(error)
            return response.exception("An error occurred while changing password", res);
        }
    }

    /**
     * Delete provider account after password verification
     */
    async deleteMyAccount(req, res) {
        try {
            const { password } = req.body;
            const provider = req.provider;
            const isMatch = await bcrypt.compare(password, provider.password);
            
            if (!isMatch) {
                return response.badRequest("The password you entered is incorrect", res);
            }
            
            await providerResources.updateProvider({ deleted_at: new Date() }, { id: provider.id });
            
            return response.success("Your account has been deleted successfully", res);
        } catch (error) {
            console.log(error)
            return response.exception("An error occurred while deleting account", res);
        }
    }
};