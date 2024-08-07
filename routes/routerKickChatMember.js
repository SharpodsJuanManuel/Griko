const express = require('express');
const { KickChatMember } = require('../controllers/functions.handler');
const router = express.Router();

router.post("/", (req, res) => {
    const { telegram_id } = req.body;
    res.send("Expulsado exitosamente")
    KickChatMember(telegram_id);
    res.sendStatus(200);
});

module.exports = router