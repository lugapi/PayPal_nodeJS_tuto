// orderController.js
import dotenv from 'dotenv';
import fetch from "node-fetch";

import { generateAccessToken, handleResponse } from './common.js';

dotenv.config();

const {
  PAYPAL_BASE
} = dotenv.config().parsed;

export const createOrderController = async (req, res) => {
  try {
    const { contentBody, header, trackingID } = req.body;
    const cart = contentBody;
    const { jsonResponse, httpStatusCode } = await createOrder(cart, header, trackingID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
};

export const captureOrderController = async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
};

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (cart, header = null, trackingID = null) => {
  try {
    // use the cart information passed from the front-end to calculate the purchase unit details
    console.log(
      "shopping cart information passed from the frontend createOrder() callback:",
      cart,
    );

    const accessToken = await generateAccessToken();
    const url = `${PAYPAL_BASE}/v2/checkout/orders`;

    const requestHeader = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    if (header !== null && header !== "none") {
      requestHeader["PayPal-Mock-Response"] = '{"mock_application_codes": "'+ header +'"}';
    }
    if (trackingID !== null) {
      requestHeader["PayPal-Client-Metadata-Id"] = trackingID;
    }

    var response = await fetch(url, {
      headers: requestHeader,
      method: "POST",
      body: JSON.stringify(cart),
    });

    return handleResponse(response);
  } catch (error) {
    console.error("Error in createOrder:", error);
    throw error;
  }
};

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse(response);
};
