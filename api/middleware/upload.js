const multer = require('multer');
const path = require('path');
const util = require('util'), fs = require('fs');


const upload = (des) => {
    !fs.existsSync(`./images/${des}`) && fs.mkdirSync(`./images/${des}`, { recursive: true })


    const storage = multer.diskStorage(
        {
            destination: (_, _2, cb) => {
                cb(null, `./images/${des}`)
            },
            filename: (_, file, cb) => {
                cb(null, Date.now() + path.extname(file.originalname))
            },
        });
    return multer({storage});
};

module.exports = upload;



