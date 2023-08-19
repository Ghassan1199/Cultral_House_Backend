//importing modules
const db = require("../models");
const jwt = require('jsonwebtoken')
const {response} = require("express");
//Assigning db.admins to Admin variable
const Admin = db.admins;
const Worker = db.workers;


//Function to check if adminName or email already exist in the database
//this is to avoid having two admins with the same adminName and email
const saveAdmin = async (req, res, next) => {
    //search the database to see if admin exist
    try {
        if (!req.body.email || !req.body.password || !req.body.admin_name) {
            return res.status(400).json({
                msg: "validation error"
            })
        }

        //checking if email already exist
        const emailCheck = await Admin.findOne({
            where: {
                email: req.body.email,
            },
        });

        //if email exist in the database respond with a status of 409
        if (emailCheck) {
            return res.status(400).json({
                msg: "Email does exist in the data base"
            });
        }

        next();
    } catch (error) {
        console.log(error);
    }
};

const checkWorker = async (req, res, next) => {
    //search the database to see if admin exist

    try {
        if (!req.body.email || !req.body.password || !req.body.first_name,!req.body.last_name,!req.body.phone_number) {
            console.log(req.body)
            return res.status(400).json({
                msg: "validation error"
            })
        }

        //checking if email already exist
        const emailCheck = await Worker.findOne({
            where: {
                email: req.body.email,
            },
        });

        //if email exist in the database respond with a status of 409
        if (emailCheck) {
            return res.status(409).json({
                msg: "Email does exist in the data base"
            });
        }
        next();
    } catch (error) {
        console.log(error);
    }
};

const checkIfSuper = async (req, res, next) => {
    let token = req.headers["x-access-token"];
    if (!token) {
        res.status(403).json({
            msg: "No token provided!"
        })
    } else {
        jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            if (err) {
                res.status(401).json({
                    msg: "Unauthorized!"
                })
            } else {
                if (decoded.admin.is_super === 0) {
                    res.status(401).json({
                        msg: 'you are not the super admin'
                    })
                } else {
                    req.admin_id = decoded.admin.admin_id
                    next()
                }
            }
        });

    }

}

const getAdminId= async (req,res,next)=>{
    let token = req.headers["x-access-token"];
    if (!token) {
        res.status(403).send();
    } else {
        jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            if (err) {
                res.status(401).json({
                    msg: "Unauthorized!"
                })
            } else {
                req.body.admin_id = decoded.admin.admin_id;
                next();
            }
        });

    }
}

const checkUser = async (req,res,next)=>{
    let token = req.headers["x-access-token"];
    if (!token) {
        res.status(403).send();
    } else {
        jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            if (err) {
                res.status(401).json({
                    msg: "Unauthorized!"
                })
            } else {
                req.body.customer_id = decoded.admin.customer_id;
                next();
            }
        });

    }
}


//exporting module
module.exports = {
    saveAdmin,
    checkIfSuper,
    checkWorker,
    getAdminId

};