const db = require("../models/index");
const jwt = require("jsonwebtoken");

const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const customerAuth = require("../middleware/customerAuth");




const Op = db.Op;
const sequelize = db.sequelize;
const Report = db.reports;
const Customer_reports = db.customers_reports;
const ValidationError = db.ValidationError;






const makeReport = async (req, res)=>{


    const token = req.headers["x-access-token"];
   

    const title  = req.body.title;
    const description = req.body.description;


    if(!title){


        return res.status(400).send(responseMessage(false, "enter name"));

    }

    if (!description) {
        
        return res.status(400).send(responseMessage(false, "enter description"));


    }

    let transaction;

    try {

        
        transaction = await sequelize.transaction();

        const customer = await customerAuth(token);


        const customer_id = customer.customer_id;


    const report = await Report.create({

        title,
        description

    },
    {
        transaction
    });


    const customer_report = await Customer_reports.create({

        customer_id,
        report_id: report.report_id


    }, {transaction});
     
        
        await transaction.commit();
        rep = {report, customer_report};
        return res.status(201).send(responseMessage(true, "report is saved", rep));

    } catch (errors) {

        await transaction.rollback();

       
        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;
            
        }

        return res.status(statusCode).send(responseMessage(false, errors.message));


        
    }




}



const showReports = async (req, res)=>{


    const token = req.headers["x-access-token"];

   

    try {

       const customer = await customerAuth(token);
       const customer_id = customer.customer_id;


        
    const customer_reports = await Customer_reports.findAll({

    where:{
        customer_id
    }


    });

    if (customer_reports.length === 0) {
        throw new RError(404, "No reports found");
    }

    const report_id = customer_reports.map(v=> v.report_id);

    console.log(report_id)

    const reports = await Report.findAll({

    
        where:{
            [Op.or]: {report_id}
        }

    });
        

    return res.status(200).send(responseMessage(true, "reports have been retrieved", reports));

        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

        
    }




}



const viewReport = async (req, res)=>{

    const token = req.headers["x-access-token"];
   
    const report_id = req.body.report_id;

    if (!report_id) {
        return res.status(400).send(responseMessage(false, "choose report"));
    }

    try {

      await customerAuth(token);

        

   
    const report = await Report.findByPk(report_id);


    if (report == null) {

        throw new RError(404, "report not found");
        
    }


     
        
        res.status(200).send(responseMessage(true, "report has been retrieved", report));

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }




}



const updateReport = async (req, res)=>{

    const {title, description} = req.body;

    const token = req.headers["x-access-token"];
    

    const report_id = req.body.report_id;

    if (!report_id) {
        return res.status(400).send(responseMessage(false, "choose report"));

    }
    if(!title && !description){
        return res.status(400).send(responseMessage(false,  "update something!!"));
    }

    try {

       await customerAuth(token);
 

        const report = await Report.findByPk(report_id);

        if (report == null) {

            throw new RError(404, "report not found")
            
        }

        if(title){
            report.title = title;
        }                                                                                                                                                                       
        if(description){
            report.description = description;
        }
    
        
        await report.save();


        res.status(200).send(responseMessage(true, "report has been updated", report));

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }

}


const deleteReport = async (req, res)=>{


    const token = req.headers["x-access-token"];


    const report_id = req.body.report_id;

    if (!report_id) {
        return res.status(400).send(responseMessage(false, "choose report"));

    }

    try {

       await customerAuth(token);



        const report = await Report.findByPk(report_id);

        if (report == null) {

            throw new RError(404, "report not found");
            
        }
        
        await report.destroy();

        res.status(200).send(responseMessage(true, "report has been deleted", report));

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }

}



// for admin only
const showAllReports = async (req, res)=>{
   

    try {

    

// need admin auth?
        
    const customer_reports = await Customer_reports.findAll();

    if (customer_reports.length === 0) {
        throw new RError(404, "No reports found");
    }

    const report_id = customer_reports.map(v=> v.report_id);


    const reports = await Report.findAll({

    
        where:{
            [Op.or]: {report_id}
        }

    });
        

    return res.status(200).send(responseMessage(true, "reports have been retrieved", reports));

        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

        
    }




}

module.exports = { makeReport, showReports, viewReport, updateReport, deleteReport, showAllReports};