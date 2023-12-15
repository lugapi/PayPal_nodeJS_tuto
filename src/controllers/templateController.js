// templateController.js
import dotenv from 'dotenv';

dotenv.config();

const { PAYPAL_CLIENT_ID, PAYPAL_CURRENCY } = process.env;

export const renderShortcut = (req, res) => {
  res.render('template', {
    clientId: PAYPAL_CLIENT_ID,
    envCurrency: PAYPAL_CURRENCY,
    body: 'shortcut',
  });
};

export const renderVault = (req, res) => {
  res.render('template', {
    clientId: PAYPAL_CLIENT_ID,
    envCurrency: PAYPAL_CURRENCY,
    body: 'vault',
  });
};