const validator = require('validator');

const sanitize = (value) => {
    if (typeof value === 'string') {
        return validator.escape(validator.trim(value));
    }
    return value;
};

const validateEmail = (email) => {
    return validator.isEmail(email);
};

const validatePassword = (password) => {
    return password && password.length >= 6;
};

const validateInput = (req, res, next) => {
    // Sanitize body fields
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string' && key !== 'password') {
                req.body[key] = validator.trim(req.body[key]);
            }
        });
    }

    // Sanitize query params
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitize(req.query[key]);
            }
        });
    }

    next();
};

module.exports = { sanitize, validateEmail, validatePassword, validateInput };
