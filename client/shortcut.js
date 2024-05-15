// create the editor
const container = document.getElementById("jsoneditor");
const containerSTC = document.getElementById("jsoneditorSTC");
const options = {
  modes: ["text", "code", "tree", "form", "view"],
  mode: "tree",
  search: true,
};
const editor = new JSONEditor(container, options);
const editorSTC = new JSONEditor(containerSTC, options);

// Create the JSON files
const json = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: currency,
        value: "100",
        breakdown: {
          item_total: {
            currency_code: currency,
            value: "100",
          },
        },
      },
      invoice_id: "invoice_test_1684148394061",
      items: [
        {
          name: "First Product Name",
          description: "Optional descriptive text..",
          unit_amount: {
            currency_code: currency,
            value: "50",
          },
          quantity: "2",
        },
      ],
    },
  ],
};

const jsonS2S = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: currency,
        value: "100",
        breakdown: {
          item_total: {
            currency_code: currency,
            value: "100",
          },
        },
      },
      invoice_id: getinvoiceID(),
      items: [
        {
          name: "First Product Name",
          description: "Optional descriptive text..",
          unit_amount: {
            currency_code: currency,
            value: "50",
          },
          quantity: "2",
        },
      ],
      shipping: {
        name: {
          full_name: "S2S AME ET ESPRIT DU VIN",
        },
        address: {
          address_line_1: "21 rue de la banque",
          address_line_2: "Floor 6",
          admin_area_2: "San Francisco",
          admin_area_1: "CA",
          postal_code: "94107",
          country_code: "US",
        },
      },
    },
  ],
  application_context: {
    shipping_preference: "SET_PROVIDED_ADDRESS",
  },
};

const jsonWithAddressFeature = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: currency,
        value: "100",
        breakdown: {
          item_total: {
            currency_code: currency,
            value: "100",
          },
        },
      },
      items: [
        {
          name: "First Product Name",
          description: "Optional descriptive text..",
          unit_amount: {
            currency_code: currency,
            value: "50",
          },
          quantity: "2",
        },
      ],
      shipping: {
        options: [
          {
            id: "SHIP1",
            type: "SHIPPING",
            label: "Free Shipping",
            selected: true,
            amount: {
              currency_code: currency,
              value: "0.00",
            },
          },
          {
            id: "SHIP2",
            type: "SHIPPING",
            label: "2-Day Shipping",
            selected: false,
            amount: {
              currency_code: currency,
              value: "4.00",
            },
          },
        ],
      },
    },
  ],
};

editor.set(json);
editor.expandAll();

editorSTC.set({
  additional_data: [
    {
      key: "sender_account_id",
      value: "10000600"
    },
    {
      key: "sender_first_name",
      value: "John"
    },
    {
      key: "sender_country_code",
      value: "US"
    },
    {
      key: "sender_popularity_score",
      value: "low"
    }
  ],
});
editorSTC.expandAll();

function updateInvoiceID() {
    var invoiceID = getinvoiceID();
    if (document.querySelector("#shippingChoice").checked === true) {
      jsonWithAddressFeature.purchase_units[0].invoice_id = invoiceID;
    } else if (document.querySelector("#S2S").checked === true) {
      jsonS2S.purchase_units[0].invoice_id = invoiceID;
    } else {
      json.purchase_units[0].invoice_id = invoiceID;
    }
  }
  
  function getinvoiceID() {
    var timestp = Date.now();
    var invoiceID = "invoice_test_" + timestp;
    return invoiceID;
  }

let stcProcessCompleted = false;

document.getElementById("getJSON").onclick = function () {
  const jsonToSend = editor.get();
  const headerValue = document.getElementById("negativetesting").value;

  // Met à jour l'invoice ID si checkbox avec l'id updateInvoiceID est coché
  if (document.getElementById("updateInvoiceID").checked) {
    const currentDate = new Date();
    const invoiceIDinitial = jsonToSend.purchase_units[0].invoice_id;
    const invoiceID = invoiceIDinitial + currentDate.getTime();
    jsonToSend.purchase_units[0].invoice_id = invoiceID;
  }

  if (document.getElementById("sendSTC").checked) {
    var uuid = generateUUID();
    doSTC(editorSTC.get(), uuid).then(() => {
      if (stcProcessCompleted) {
        createPayPalButton(jsonToSend, headerValue, uuid);
      } else {
        console.log("STC process is not completed yet.");
      }
    });
  } else {
    createPayPalButton(jsonToSend, headerValue);
  }
};

function createPayPalButton(jsonToSend, headerValue, uuid = null) {
  var e = document.getElementById("paypal-button-container");
  e.innerHTML = "";
  var i = document.getElementById("response");
  i.innerHTML = "";

  paypal
    .Buttons({
      style: [
        {
          layout: "vertical",
          color: "blue",
          shape: "pill",
          label: "paypal",
        },
      ],
      createOrder: function (data, actions) {
        return fetch("/api/orders", {
          method: "post",
          body: JSON.stringify({
              contentBody: jsonToSend,
              header: headerValue,
              trackingID: uuid
          }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (orderData) {
            console.log(orderData);
            if (orderData.name) {
              document.querySelector("#response").innerHTML += prettyPrintObject(orderData);
              document.querySelector("#response").classList.remove("hidden");
            }
            console.log(orderData.id);
            return orderData.id;
          });
      },
      async onApprove(data, actions) {
        console.log("dataOnApprove", data);
        try {
          const response = await fetch(`/api/orders/${data.orderID}/capture`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const orderData = await response.json();
          // Three cases to handle:
          //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          //   (2) Other non-recoverable errors -> Show a failure message
          //   (3) Successful transaction -> Show confirmation or thank you message

          const errorDetail = orderData?.details?.[0];

          if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
            // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
            // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
            return actions.restart();
          } else if (errorDetail) {
            // (2) Other non-recoverable errors -> Show a failure message
            throw new Error(
              `${errorDetail.description} (${orderData.debug_id})`
            );
          } else if (!orderData.purchase_units) {
            throw new Error(JSON.stringify(orderData));
          } else {
            // (3) Successful transaction -> Show confirmation or thank you message
            // Or go to another URL:  actions.redirect('thank_you.html');
            const transaction =
              orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
              orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
            resultMessage(
              `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`
            );
            console.log(
              "Capture result",
              orderData,
              JSON.stringify(orderData, null, 2)
            );
            resultMessage(prettyPrintObject(orderData));

          }
        } catch (error) {
          console.error(error);
          resultMessage(
            `Sorry, your transaction could not be processed...<br><br>${error}`
          );
        }
      },
      onError(err) {
        console.log("ERROR OCCURED", err);
      },
      onCancel(data) {
        console.log("CANCELED", data);
      },
    })
    .render("#paypal-button-container");
}

function resultMessage(message) {
  const container = document.querySelector("#response");
  document.querySelector("#response").classList.remove('hidden');
  container.innerHTML = message;
}

function toggleShippingAddress() {
  console.log("toggleShippingAddress");
  if (document.querySelector("#shippingChoice").checked === true) {
    editor.set(jsonWithAddressFeature);
    editor.expandAll();
  } else if (document.querySelector("#shippingChoice").checked === false) {
    editor.set(json);
    editor.expandAll();
  }
  updateInvoiceID();
}

function toggleS2S() {
  console.log("toggleS2S");
  if (document.querySelector("#S2S").checked === true) {
    editor.set(jsonS2S);
    editor.expandAll();
  } else if (document.querySelector("#S2S").checked === false) {
    editor.set(json);
    editor.expandAll();
  }
  updateInvoiceID();
}

function handleCheckboxChange() {
  var checkbox = document.getElementById("sendSTC");
  var divForSTC = document.getElementById("divForSTC");

  if (checkbox.checked) {
    divForSTC.classList.remove("hidden");
  } else {
    divForSTC.classList.add("hidden");
  }
}

document.getElementById("sendSTC").addEventListener("change", handleCheckboxChange);

function generateUUID() {
  // Génère quatre segments aléatoires
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  // Concatène les segments pour former l'UUID
  return (
    s4() +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    s4() +
    s4()
  );
}

function doSTC(contentToSend, uuid) {
  console.log("content STC to send : ", contentToSend);
  console.log("UUID to send : ", uuid);

  document.querySelector(".stcResultDiv h3").innerHTML = "<span class='waitForSTC'>Wait for Result of STC</span>";
  document.querySelector(".stcUuid").innerText = "Tracking ID : " + uuid;
  document.querySelector(".stcUuid").classList.remove("hidden");

  
  return fetch(`/api/stc`, {
    method: "post",
    body: JSON.stringify({
      contentBody: contentToSend,
      uuid: uuid,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(function (res) {
      console.log("res", res);
      return res.json();
    })
    .then(function (data) {
      console.log("data", data);
      // check if data.fullResponse exist
      if (data.error !== undefined && data.error !== null) {
        console.log('data.error ', data.error);
        document.querySelector(".stcResultDiv pre.stcResultBody").innerHTML = prettyPrintObject(data.error);
      }else{
        document.querySelector(".stcResultDiv pre.stcResultHeader").innerHTML = "PayPal Debug ID : " + data.headers["paypal-debug-id"];
        document.querySelector(".stcResultDiv pre.stcResultBody").innerHTML = data.jsonResponse;
      }
      document.querySelector(".stcResultDiv h3").classList.add("hidden");
      document.querySelector(".stcResultDiv").classList.remove("hidden");
      document.querySelector(".stcResultDiv pre.stcResultBody").classList.remove("hidden");

      stcProcessCompleted = true;
      return data;
    });
}