const checkAuth = require("../middleware/checkAuth");
const workerController = require("../controllers/WorkerController");
const upload = require("../middleware/upload");
const checkCredentials = require('../middleware/checkCredentials')

const express = require('express')

const router = express.Router()

router.get('/show-all', workerController.showAllWorkers)

router.post('/create', upload('workers').single('image'), checkAuth.checkWorker, workerController.createWorker)

router.delete('/delete', workerController.deleteWorker)
router.get('/show-worker-details/:worker_id', checkAuth.checkIfSuper, workerController.showWorkerDetails)

router.post('/login',checkCredentials,workerController.login);

router.post('/show-reservations',workerController.showReservationsForWorker);
router.post('/confirmArrival',workerController.confirmArrival);
router.post('/retractConfirmation',workerController.retractConfirmation);


router.post('/approveOrder',workerController.approveOrder);

router.post('/retractOrder', workerController.retractOrder)

router.post('/makeOrderByWorker', workerController.makeOrderByWorker);
router.post('/deleteOrderByWorker', workerController.deleteOrderByWorker);


module.exports = router
