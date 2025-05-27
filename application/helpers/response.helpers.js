require('dotenv').config();

module.exports = class ResponseHelper {
    async success(msg, res, data) {
        this.sendResponse(200, msg, res, data);
    };

    async created(msg, res, data) {
        this.sendResponse(200, msg, res, data);
    };

    async disallowed(msg, res, data) {
        this.sendResponse(400, msg, res, data);
    };

    async noContent(msg, res, data) {
        this.sendResponse(200, msg, res, data);
    };

    async redirect(url, res) {
        return res.status(200).send({
            api_ver: process.env.API_VER,
            redirect_to: url,
        });
    };

    async badRequest(msg, res, data) {
        this.sendResponse(400, msg, res, data);
    };

    async validationError(msg, res, data) {
        this.sendResponse(422, msg, res, data);
    };
    async unauthorized(msg, res, data) {
        this.sendResponse(401, msg, res, data);
    };

    async forbidden(msg, res, data) {
        this.sendResponse(401, msg, res, data);
    };

    async notFound(msg, res, data) {
        this.sendResponse(404, msg, res, data);
    };

    async exception(msg, res, data) {
        this.sendResponse(500,msg, res, data);
    };

    async conflict(msg, res, data) {
        this.sendResponse(400, msg, res, data);
    };

    async custom(code, msg, res, data) {
        this.sendResponse(code, msg, res, data);
    }

    async twoFactorEnabled(res) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.status(200).send({
            api_ver: process.env.API_VER,
            msg: 'TwoFactor authentication has been enabled for your account. We have sent you an access code to the phone associated to your account. Please verify the code to proceed',
            two_factor: true
        });
    };

    async sendResponse(code, msg, res, data) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS');
        if (!data) {
            
            return res.status(code).send({
                statusCode:code,
                api_ver: process.env.API_VER,
                message: msg,
            });
        } else {
            return res.status(code).send({
                statusCode:code,
                api_ver: process.env.API_VER,
                message: msg,
                data: data,
            });
        }
    }
}