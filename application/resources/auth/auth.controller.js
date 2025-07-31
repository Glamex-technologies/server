const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const AuthResources = require('./auth.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const { genrateToken } = require('../../helpers/jwtToken.helpers');

const authResources = new AuthResources();
const response = new ResponseHelper();

module.exports = class AuthController {
    /**
     * Unified authentication - checks both user and provider tables
     * First checks user table, if not found then checks provider table
     */
    async authenticate(req, res) {
        try {
            console.log('AuthController@authenticate');
            const { phone_code, phone_number, password } = req.body;

            // First try to find in user table
            let user = await authResources.findUser({ phone_code, phone_number });
            
            if (user) {
                console.log('User found in users table');
                
                // Validate password
                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return response.validationError('Invalid credentials', res, false);
                }

                // Check if user is active
                if (user.status !== 1) {
                    return response.validationError('Your account is not active', res, false);
                }

                // Check if user is verified
                if (!user.is_verified) {
                    // Send OTP for verification
                    const otp = "1111";
                    await authResources.updateUser(
                        { verification_otp: otp, verification_otp_created_at: new Date() },
                        { id: user.id }
                    );
                    
                    const result = {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        full_name: user.full_name,
                        type: user.type,
                        email: user.email,
                        phone_code: user.phone_code,
                        phone_number: user.phone_number,
                        city_id: user.city_id,
                        is_verified: user.is_verified,
                        user_type: 'user'
                    };
                    
                    return response.success(
                        'We have sent a OTP over your registered phone number. Please verify by using the OTP.',
                        res,
                        result
                    );
                }

                // Generate token for verified user
                const userObj = {
                    id: user.id,
                    phone_code: user.phone_code,
                    phone_number: user.phone_number,
                    type: user.type,
                    userType: 'user'
                };
                
                const accessToken = await genrateToken(userObj);
                const result = {
                    access_token: accessToken,
                    user_type: 'user',
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        full_name: user.full_name,
                        type: user.type,
                        email: user.email,
                        phone_code: user.phone_code,
                        phone_number: user.phone_number,
                        city_id: user.city_id,
                        is_verified: user.is_verified,
                    },
                };
                
                return response.success('Login successfully', res, result);
            }

            // If not found in user table, try provider table
            let provider = await authResources.findProvider({ phone_code, phone_number });
            
            if (provider) {
                console.log('Provider found in service_providers table');
                
                // Validate password
                const isPasswordValid = await bcrypt.compare(password, provider.password);
                if (!isPasswordValid) {
                    return response.validationError('Invalid credentials', res, false);
                }

                // Check if provider is active
                if (provider.status !== 1) {
                    return response.validationError('Your account is not active', res, false);
                }

                // Check if provider is verified
                if (!provider.verified_at) {
                    // Send OTP for verification
                    const otp = 1111;
                    await authResources.updateProvider(
                        { verification_otp: otp, verification_otp_created_at: new Date() },
                        { id: provider.id }
                    );
                    
                    const result = {
                        id: provider.id,
                        first_name: provider.first_name,
                        last_name: provider.last_name,
                        full_name: provider.full_name,
                        email: provider.email,
                        phone_code: provider.phone_code,
                        phone_number: provider.phone_number,
                        step_completed: provider.step_completed,
                        verified_at: provider.verified_at,
                        user_type: 'provider'
                    };
                    
                    return response.success('An OTP has been sent to your registered phone number for verification', res, result);
                }

                // Additional provider verification checks
                const serviceList = await authResources.findProviderServiceList({ service_provider_id: provider.id, deleted_at: null });
                if (provider.step_completed == 6 && provider.admin_verified != 1 && serviceList) {
                    return response.forbidden('Wait for the admin to verify your profile', res, null);
                }

                // Generate token for verified provider
                const providerObj = {
                    id: provider.id,
                    phone_code: provider.phone_code,
                    phone_number: provider.phone_number,
                    provider_type: provider.provider_type,
                    step_completed: provider.step_completed,
                    userType: 'provider'
                };
                
                const accessToken = await genrateToken(providerObj);
                const result = {
                    access_token: accessToken,
                    user_type: 'provider',
                    service_provider: {
                        id: provider.id,
                        first_name: provider.first_name,
                        last_name: provider.last_name,
                        full_name: provider.full_name,
                        email: provider.email,
                        phone_code: provider.phone_code,
                        phone_number: provider.phone_number,
                        provider_type: provider.provider_type,
                        salon_name: provider.salon_name,
                        city_id: provider.city_id,
                        banner_image: provider.banner_image,
                        description: provider.description,
                        step_completed: provider.step_completed,
                        verified_at: provider.verified_at,
                        admin_verified: provider.admin_verified
                    },
                };
                
                return response.success('Login successfully', res, result);
            }

            // Neither user nor provider found
            return response.validationError('Invalid credentials', res, false);

        } catch (error) {
            console.error('AuthController@authenticate Error:', error);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Unified forgot password - checks both user and provider tables
     */
    async forgotPassword(req, res) {
        try {
            console.log('AuthController@forgotPassword');
            const { phone_code, phone_number } = req.body;

            // First check user table
            let user = await authResources.findUser({ phone_code, phone_number });
            
            if (user) {
                console.log('User found in users table for forgot password');
                const otp = "1111";
                
                await authResources.updateUser(
                    { verification_otp: otp, verification_otp_created_at: new Date() },
                    { id: user.id }
                );
                
                const result = {
                    id: user.id,
                    phone_code: user.phone_code,
                    phone_number: user.phone_number,
                    user_type: 'user'
                };
                
                return response.success('OTP sent successfully', res, result);
            }

            // If not found in user table, check provider table
            let provider = await authResources.findProvider({ phone_code, phone_number });
            
            if (provider) {
                console.log('Provider found in service_providers table for forgot password');
                const otp = 1111;
                
                await authResources.updateProvider(
                    { verification_otp: otp, verification_otp_created_at: new Date() },
                    { id: provider.id }
                );
                
                const result = {
                    id: provider.id,
                    phone_code: provider.phone_code,
                    phone_number: provider.phone_number,
                    user_type: 'provider'
                };
                
                return response.success('OTP sent successfully for password reset', res, result);
            }

            // Neither user nor provider found
            return response.badRequest('No account found with this phone number', res, false);

        } catch (error) {
            console.error('AuthController@forgotPassword Error:', error);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Unified OTP verification for forgot password
     * Determines user type and verifies accordingly
     */
    async verifyForgotPasswordOtp(req, res) {
        try {
            console.log('AuthController@verifyForgotPasswordOtp');
            const { id, otp, user_type } = req.body;

            if (user_type === 'user') {
                let user = await authResources.findUser({ id });
                if (!user) {
                    return response.badRequest('User not found', res, false);
                }
                
                if (user.verification_otp !== otp) {
                    return response.badRequest('Invalid OTP', res, false);
                }
                
                await authResources.updateUser(
                    { verification_otp: null, verification_otp_created_at: null },
                    { id }
                );
                
                const result = {
                    id: user.id,
                    user_type: 'user'
                };
                
                return response.success('User verified successfully', res, result);
            }

            if (user_type === 'provider') {
                let provider = await authResources.findProvider({ id });
                if (!provider) {
                    return response.badRequest('Provider account not found', res, false);
                }
                
                if (provider.verification_otp !== parseInt(otp)) {
                    return response.badRequest('The OTP you entered is incorrect', res, false);
                }
                
                await authResources.updateProvider(
                    { verification_otp: null, verification_otp_created_at: null },
                    { id }
                );
                
                const result = {
                    id: provider.id,
                    user_type: 'provider'
                };
                
                return response.success('OTP verified successfully. You can now reset your password.', res, result);
            }

            return response.badRequest('Invalid user type', res, false);

        } catch (error) {
            console.error('AuthController@verifyForgotPasswordOtp Error:', error);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Unified password reset after OTP verification
     */
    async resetPassword(req, res) {
        try {
            console.log('AuthController@resetPassword');
            const { id, password, user_type } = req.body;
            const hashedPassword = bcrypt.hashSync(password, 10);

            if (user_type === 'user') {
                let user = await authResources.findUser({ id });
                if (!user) {
                    return response.badRequest('User not found', res, false);
                }
                
                await authResources.updateUser(
                    { password: hashedPassword },
                    { id }
                );
                
                return response.success('Password reset successfully', res, true);
            }

            if (user_type === 'provider') {
                let provider = await authResources.findProvider({ id });
                if (!provider) {
                    return response.badRequest('Provider account not found', res, false);
                }
                
                await authResources.updateProvider(
                    { password: hashedPassword },
                    { id }
                );
                
                return response.success('Password reset successfully', res, true);
            }

            return response.badRequest('Invalid user type', res, false);

        } catch (error) {
            console.error('AuthController@resetPassword Error:', error);
            return response.exception('Server error occurred', res);
        }
    }
};