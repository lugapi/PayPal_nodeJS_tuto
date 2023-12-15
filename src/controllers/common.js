// common.js
import dotenv from 'dotenv';
import fetch from "node-fetch";
dotenv.config();

const {
  PAYPAL_BASE,
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET
} = dotenv.config().parsed;

export const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

export const generateAccessTokenVault = async (req, res) => {
  try {
    const {
      customerID
    } = req.body;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }

    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");

    let curlPostValue;

    if (customerID || !customerID === "") {
      curlPostValue = `grant_type=client_credentials&response_type=id_token&target_customer_id=${customerID}`;
    } else {
      curlPostValue = "grant_type=client_credentials&response_type=id_token";
    }

    const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      body: curlPostValue,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();

    // Créez un objet contenant les deux valeurs
    const responseData = {
      data: data,
      curlPostValue: curlPostValue,
    };

    // Renvoyez l'objet
    res.json(responseData);
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
};


export const handleResponse = async (response) => {
  try {
    const text = await response.text();

    const jsonResponse = JSON.parse(text);

    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    return {
      jsonResponse: {
        error: response.statusText || "Failed to parse response"
      },
      httpStatusCode: response.status,
    };
  }
};