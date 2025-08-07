const Joi = require("joi");
const bcrypt = require("bcryptjs");
module.exports = class JoiHelper {
    async joiValidation(reqBody, schema, language = 'en') {
        console.log('DataHelper@joiValidation');
        try {
            await Joi.object(schema).validateAsync(reqBody, { abortEarly: false });
            return false;
        } catch (err) {
            let parsedErrors = [];
            const errors = err.details;
            for (let e = 0; e < errors?.length; e++) {
                let msg = errors[e].message;
                msg = msg.replace(/["']/g, "");
                parsedErrors.push(msg.charAt(0).toUpperCase() + msg.slice(1));
            }

            if (parsedErrors.length > 0) {
                return parsedErrors;
            }
        }
    }

    async hashPassword(password) {
        console.log('DataHelper@hashPassword');
        let hashedPassword = await bcrypt.hash(password, 10);

        if (!hashedPassword) {
            throw new Error('error generating password hash');
        }

        return hashedPassword;
    }

    async validatePassword(passwordString, passwordHash) {
        console.log("DataHelper@validatePassword")
        let isPasswordValid = await bcrypt.compare(passwordString, passwordHash)

        if (!isPasswordValid) {
            return false
        }

        return true
    }
};
