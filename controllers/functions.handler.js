const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const UsedEmail = require('../models/UsedEmail');  // Importa el modelo correctamente
const correosUsados = require('../models/correosUsados');  // Importa el modelo correctamente
const db = require('../db.js');

const token = "7278375841:AAFiyXbAwxPrZjW3rFWIeioeyPxQXGqFhHk";
const bot = new TelegramBot(token, { polling: true });

const channel = { id: '-1002233147218', name: 'Club Griko 💎' };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userStates = {};
db();

const handleEmailValidation = async (chatId, text) => {
  if (emailRegex.test(text)) {
    try {
      // Verificar si el correo ya ha sido usado
      const usedEmail = await correosUsados.findOne({ email: text });
      if (usedEmail) {
        await bot.sendMessage(chatId, 'Este correo ya ha sido usado. Por favor, usa otro correo electrónico.');
        return;
      }

      const userEmail = await UsedEmail.findOne({ email: text });
      if (userEmail && userEmail.isActive) {
        // Crear una invitación de un solo uso para el canal
        const inviteLink = await bot.createChatInviteLink(channel.id, {
          expire_date: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          member_limit: 1
        });
        await bot.sendMessage(chatId, 'Gracias por enviar tu correo. Aquí está tu invitación:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Unirse al Club Griko 💎', url: inviteLink.invite_link }]
            ]
          }
        });

        // Mensajes adicionales después de enviar el enlace
        await bot.sendMessage(chatId, 'Gracias por tu compra.');
        await bot.sendMessage(chatId, 'Espero que tengas buena suerte en tus inversiones deportivas.');

        // Guardar el correo en la base de datos
        const newUsedEmail = new correosUsados({ email: text });
        await newUsedEmail.save();
      } else {
        await bot.sendMessage(chatId, 'No hemos encontrado tu suscripción activa. Por favor verifica tu correo e intenta nuevamente.');
      }
    } catch (err) {
      console.log(`Error al verificar el correo: ${err}`);
      await bot.sendMessage(chatId, 'Ocurrió un error al verificar tu correo. Por favor intenta nuevamente más tarde.');
    }
    // Reset user state after processing email
    userStates[chatId] = 'waiting_for_welcome';
  } else {
    // Handle invalid email
    await bot.sendMessage(chatId, 'Solo puedo recibir correos electrónicos. Por favor, envía un correo electrónico válido.');
  }
};

const welcomeUser = () => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Verificar si el mensaje proviene de un usuario individual
    if (msg.chat.type === 'private') {
      if (!userStates[chatId] || userStates[chatId] === 'waiting_for_welcome') {
        // Enviar mensaje de bienvenida si este es el primer mensaje o después de la validación del correo
        await bot.sendMessage(chatId, `"Bienvenido al ${channel.name}, Prepárate para obtener los mejores pronósticos y maximizar tus ganancias."`);
        await bot.sendMessage(chatId, `Por favor, envía tu email de usuario de Sharpods para verificar tu suscripción`);
        
        // Establecer el estado del usuario a esperando el correo electrónico
        userStates[chatId] = 'waiting_for_email';
      } else if (userStates[chatId] === 'waiting_for_email') {
        // Validar el correo electrónico si el estado del usuario es esperando el correo electrónico
        await handleEmailValidation(chatId, text);
      }
    } else {
      console.log(`Mensaje recibido de un chat de tipo: ${msg.chat.type}. Ignorando...`);
    }
  });
};

welcomeUser();

const unbanChatMember = (userId) => {
  bot.unbanChatMember(channel.id, userId)
    .then(() => {
      console.log(`User unbanned from the channel ${channel.name}`);
    })
    .catch(err => console.log(`Error to unban user: ${err}`));
};

const kickChatMember = (userId) => {
  bot.banChatMember(channel.id, userId)
    .then(() => {
      console.log(`User kicked from the channel ${channel.name}`);
    })
    .catch(err => console.log(`Error to kick user: ${err}`));
};
