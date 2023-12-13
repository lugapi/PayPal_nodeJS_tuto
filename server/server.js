import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_CURRENCY,
  PAYPAL_MERCHANTID,
  PORT = 8887
} = process.env;
const base = "https://api-m.sandbox.paypal.com";
const app = express();

// host static files
app.use(express.static("client"));

// parse post params sent in body in json format
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join("views"));

/**
 * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 * @see https://developer.paypal.com/api/rest/authentication/
 */
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
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

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (cart, header, trackingID = null) => {
  try {
    console.log("trackingID", trackingID);
    // use the cart information passed from the front-end to calculate the purchase unit details
    console.log(
      "shopping cart information passed from the frontend createOrder() callback:",
      cart,
    );

    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;

    const requestHeader = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    if (header !== "none") {
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
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

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

const stc = async (uuid, contentBody) => {
  try {
    const accessToken = await generateAccessToken();
    const url = "https://api-m.sandbox.paypal.com/v1/risk/transaction-contexts/" + PAYPAL_MERCHANTID + "/" + uuid;

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
    return { error: `Error: ${error.message}` };
  }
};



async function handleResponse(response) {
  try {
    const text = await response.text(); // Copie le texte de la réponse avant de le consommer

    const jsonResponse = JSON.parse(text); // Essaye de convertir le texte en JSON

    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    // Si la conversion JSON échoue, renvoie une erreur avec le texte brut
    return {
      jsonResponse: { error: response.statusText || "Failed to parse response" },
      httpStatusCode: response.status,
    };
  }
}

app.post("/api/orders", async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    // const { cart } = req.body;
    const {
      contentBody,
      header,
      trackingID
    } = req.body;
    const cart = contentBody;
    console.log(
      "contentBody", JSON.stringify(contentBody)
    )
    const {
      jsonResponse,
      httpStatusCode
    } = await createOrder(cart, header, trackingID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({
      error: "Failed to create order."
    });
  }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const {
      orderID
    } = req.params;
    const {
      jsonResponse,
      httpStatusCode
    } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({
      error: "Failed to capture order."
    });
  }
});

app.post("/api/stc", async (req, res) => {
  try {
    const {uuid, contentBody} = req.body;
    
    // console.log('req.params contentBody', contentBody)
    // console.log('req.params trackingID', uuid)

    const { httpStatusCode, headers } = await stc(uuid, contentBody);

    res.status(httpStatusCode).json(headers);
    
  } catch (error) {
    console.error("Failed to STC:", error);
    res.status(500).json({
      error: "Failed to STC. Check environment variables."
    });
  }
});

app.get("/", (req, res) => {
  res.render("index", {
    clientId: PAYPAL_CLIENT_ID,
    envCurrency: PAYPAL_CURRENCY
  });
});

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});