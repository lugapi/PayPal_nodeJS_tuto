// stcController.js
import dotenv from 'dotenv';
import fetch from "node-fetch";

import { generateAccessToken, handleResponse } from './common.js';

dotenv.config();

const {
  PAYPAL_BASE,
  PAYPAL_MERCHANTID
} = dotenv.config().parsed;

export const stcController = async (req, res) => {
  try {
    const {
      uuid,
      contentBody
    } = req.body;
    const {
      httpStatusCode,
      headers
    } = await stc(uuid, contentBody);
    res.status(httpStatusCode).json(headers);
  } catch (error) {
    console.error("Failed to STC:", error);
    res.status(500).json({
      error: "Failed to STC. Check environment variables."
    });
  }
};


const stc = async (uuid, contentBody) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${PAYPAL_BASE}/v1/risk/transaction-contexts/` + PAYPAL_MERCHANTID + "/" + uuid;

    console.log("url stc", url)

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(contentBody),
    });

    console.log("response.ok", response.ok);
    console.log("response.status", response.status);
    console.log("response.headers", response.headers.raw());

    // Ajoutez cette vérification pour s'assurer que le statut HTTP est défini
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.text(); // Corps de la réponse JSON
    const headers = response.headers.raw(); // En-têtes de la réponse

    return {
      jsonResponse,
      headers,
      httpStatusCode: response.status,
    };

  } catch (error) {
    return {
      error: `Error: ${error.message}`
    };
  }
};