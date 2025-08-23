const Joi = require("joi");
const bcrypt = require("bcryptjs");
module.exports = class JoiHelper {
    async joiValidation(reqBody, schema, language = 'en') {
        console.log('DataHelper@joiValidation');
        try {
            await Joi.object(schema).validateAsync(reqBody, { 
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: false
            });
            return false;
        } catch (err) {
            let parsedErrors = [];
            const errors = err.details;
            
            for (let e = 0; e < errors?.length; e++) {
                let errorDetail = {
                    field: errors[e].path.join('.'),
                    message: errors[e].message.replace(/["']/g, ""),
                    type: errors[e].type,
                    value: errors[e].context?.value
                };
                
                // Capitalize first letter of message
                errorDetail.message = errorDetail.message.charAt(0).toUpperCase() + errorDetail.message.slice(1);
                
                parsedErrors.push(errorDetail);
            }

            if (parsedErrors.length > 0) {
                return parsedErrors;
            }
        }
    }

    async hashPassword(password) {
        console.log('DataHelper@hashPassword');
        try {
            if (!password || typeof password !== 'string') {
                throw new Error('Invalid password provided for hashing');
            }
            
            let hashedPassword = await bcrypt.hash(password, 10);

            if (!hashedPassword) {
                throw new Error('Error generating password hash');
            }

            return hashedPassword;
        } catch (error) {
            console.error('Password hashing error:', error);
            throw new Error('Failed to hash password');
        }
    }

    async validatePassword(passwordString, passwordHash) {
        console.log("DataHelper@validatePassword");
        try {
            if (!passwordString || !passwordHash) {
                return false;
            }
            
            let isPasswordValid = await bcrypt.compare(passwordString, passwordHash);

            return isPasswordValid;
        } catch (error) {
            console.error('Password validation error:', error);
            return false;
        }
    }
};
