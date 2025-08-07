require('dotenv').config();

module.exports = class ResponseHelper {
    success(msg, res, data) {
        return this.sendResponse(200, msg, res, data);
    };

    created(msg, res, data) {
        return this.sendResponse(200, msg, res, data);
    };

    disallowed(msg, res, data) {
        return this.sendResponse(400, msg, res, data);
    };

    noContent(msg, res, data) {
        return this.sendResponse(200, msg, res, data);
    };

    redirect(url, res) {
        return res.status(200).send({
            api_ver: process.env.API_VER,
            redirect_to: url,
        });
    };

    badRequest(msg, res, data) {
        return this.sendResponse(400, msg, res, data);
    };

    validationError(msg, res, data) {
        return this.sendResponse(422, msg, res, data);
    };
    
    unauthorized(msg, res, data) {
        return this.sendResponse(401, msg, res, data);
    };

    forbidden(msg, res, data) {
        return this.sendResponse(401, msg, res, data);
    };

    notFound(msg, res, data) {
        return this.sendResponse(404, msg, res, data);
    };

    exception(msg, res, data) {
        return this.sendResponse(500, msg, res, data);
    };

    conflict(msg, res, data) {
        return this.sendResponse(400, msg, res, data);
    };

    custom(code, msg, res, data) {
        return this.sendResponse(code, msg, res, data);
    }

    twoFactorEnabled(res) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.status(200).send({
            api_ver: process.env.API_VER,
            msg: 'TwoFactor authentication has been enabled for your account. We have sent you an access code to the phone associated to your account. Please verify the code to proceed',
            two_factor: true
        });
    };

    sendResponse(code, msg, res, data) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS');
        
        if (!data) {
            return res.status(code).send({
                statusCode: code,
                api_ver: process.env.API_VER,
                message: msg,
            });
        } else {
            return res.status(code).send({
                statusCode: code,
                api_ver: process.env.API_VER,
                message: msg,
                data: data,
            });
        }
    }
}