const db = require("../models/index");
const dotenv = require('dotenv');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require('./MailController');

const {consumers} = require("stream");

const responseMessage = require("../middleware/responseHandler");
const customerAuth = require("../middleware/customerAuth");
const RError = require("../middleware/error.js");


dotenv.config();
const Customer = db.customers;
const ValidationError = db.ValidationError;
const Op = db.Op;


const signUp = async (req, res) => {

    const {first_name, last_name, email, phone_number, password} = req.body;


    Customer.create({
        first_name,
        last_name,
        phone_number,
        email,
        password: await bcrypt.hash(password, 10),
    }).then((data) => {

        res.status(201).send(responseMessage(true, "customer is registered", data));

    }).catch(({errors}) => {

        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;

        }

        return res.status(statusCode).send(responseMessage(false, errors[0].message));

    });

}


const login = async (req, res) => {

    const {email, phone_number, password} = req.body;


    try {

        let customer = null;

        if (email) {
            customer = await Customer.findOne({where: {email}});

        } else {
            customer = await Customer.findOne({where: {phone_number}});

        }

        if (customer == null) {


            throw new RError(401, "wrong credentials");

        } else {

            const check = await bcrypt.compare(password, customer.password);
            if (!check) {

                throw new RError(401, "wrong credentials");
            } else {
                const {customer_id, first_name} = customer;

                const token = jwt.sign({customer_id, first_name}, process.env.SECRET, {expiresIn: '3d'});
           const data = {customer_id, token};
                res.status(200).send(responseMessage(true, "token is generated", data));

            }


        }

    } catch (error) {


        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

    }

}

const deleteCustomer = async (req, res) => {

    const token = req.headers["x-access-token"];

    try {

        const customer = await customerAuth(token);

        await customer.destroy();
        res.status(200).send(responseMessage(true, "customer has been deleted successfully")
        );


    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }


}

const update = async (req, res) => {

    const {first_name, last_name} = req.body;
    const token = req.headers["x-access-token"];

    try {

        const customer = await customerAuth(token);

        if (first_name) {
            customer.first_name = first_name;
        }
        if (last_name) {
            customer.last_name = last_name;
        }

        await customer.save();
        res.status(200).send(responseMessage(true, "customer has been updated successfully", customer));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }
}

const changeNumber = async (req, res) => {
    change(req, res, "phone_number");
}


const changeEmail = async (req, res) => {
    change(req, res, "email");
}

const resetPassword = async (req, res) => {

    const token = req.headers["x-access-token"];

    const {password, new_password} = req.body;


    try {

        const customer = await customerAuth(token);


        if (!password || !new_password) {
            throw new RError(400, "enter the old and the new passwords");


        }

        const check = await bcrypt.compare(password, customer.password);
        if (!check) {

            throw new RError(401, "wrong credentials");
        } else {

            customer.password = await bcrypt.hash(new_password, 10);
            await customer.save();
            res.status(200).json(responseMessage(true, "password  has been updated"));


        }
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }


}

const forgotPassword = async (req, res) => {

    const email = req.body.email;

    if (!email) {
        return res.status(400).json(responseMessage(false, "enter your email"));

    }

    try {

        const customer = await Customer.findOne({where: {email}});

        if (customer == null) {
            throw new RError(404, "customer not found");

        } else {

            const newPassword = Math.random().toString(36).slice(-8);

            customer.password = await bcrypt.hash(newPassword, 10);
            customer.save();

            const subject = "your new password";
            const text = `${newPassword} is your new password, change it when you login`;

            sendEmail(email, subject, text).then(
                message => {
                    res.status(200).json(responseMessage(true, message));
                }
            ).catch(error => {

                return res.status(500).json(responseMessage(false, error));

            });
        }
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

    }


}


const change = async (req, res, name) => {


    const token = req.headers["x-access-token"];

    const password = req.body.password;
    const target = {};
    target.name = name;
    target.value = req.body[name];


    try {


        const customer = await customerAuth(token);


        if (!target.value || !password) {
            throw new RError(400, `please enter the new ${target.name} and the password`)

        }

        const check = await bcrypt.compare(password, customer.password);
        if (!check) {

            throw new RError(401, "wrong credentials");
        }

        const query = {};
        query[target.name] = {
            [Op.eq]: target.value
        }


        const existingCustomer = await Customer.findOne({where: query});
        if (existingCustomer && existingCustomer.customer_id !== customer.customer_id) {
            return res.status(409).json(responseMessage(false, `${target.name} is already taken`));

        } else {
            customer[target.name] = target.value;

            await customer.save();
            res.status(200).json(responseMessage(true, `${target.name}  has been updated`, target.value));


        }

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }


}


module.exports = {signUp, login, deleteCustomer, update, changeNumber, changeEmail, resetPassword, forgotPassword};