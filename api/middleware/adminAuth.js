const jwt = require("jsonwebtoken");

const db = require("../models/index");

const RError = require("./error.js");


const Admin = db.admins;


const adminAuth = async (token)=>{

    if (!token) {
        throw new RError(401,"unauthorized");
    }



    const decodedToken = jwt.verify(token, process.env.SECRET);


        const admin_id = decodedToken.admin.admin_id;



        const admin = await Admin.findByPk(admin_id);


        if (admin == null) {

            throw new RError(404, "admin not found")
            
        }


        return admin;

}

module.exports = adminAuth;