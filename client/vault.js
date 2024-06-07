// create the editor
const container = document.getElementById("jsoneditor");
const options = {
  modes: ["text", "code", "tree", "form", "view"],
  mode: "tree",
  search: true,
};
const editorVault = new JSONEditor(container, options);

// New timestamp
const timestamp = new Date().getTime();

const jsonFirstTime = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: "EUR",
        value: "100.00",
      },
      shipping: {
        type: "SHIPPING",
        name: {
          full_name: "John Doe",
        },
        address: {
          country_code: "FR",
          postal_code: "75002",
          address_line_1: "21 Rue de la banque",
          admin_area_1: "France",
          admin_area_2: "Paris",
        },
      },
    },
  ],
  payment_source: {
    paypal: {
      attributes: {
        vault: {
          store_in_vault: "ON_SUCCESS",
          usage_type: "MERCHANT",
          customer_type: "CONSUMER",
          description: `Test description for BA - ${timestamp}`,
        },
      },
      experience_context: {
        return_url: "https://example.com/returnUrl",
        cancel_url: "https://example.com/cancelUrl",
        shipping_preference: "SET_PROVIDED_ADDRESS",
      },
    },
  },
};

const jsonReturning = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: "EUR",
        value: "100.00",
      },
      shipping: {
        type: "SHIPPING",
        name: {
          full_name: "John Doe",
        },
        address: {
          country_code: "FR",
          postal_code: "75002",
          address_line_1: "21 Rue de la banque",
          admin_area_1: "France",
          admin_area_2: "Paris",
        },
      },
    },
  ],
  payment_source: {
    paypal: {
      experience_context: {
        shipping_preference: "SET_PROVIDED_ADDRESS",
      },
    },
  },
};
editorVault.set(jsonFirstTime);
editorVault.expandAll();

var jsonToSend = jsonFirstTime;

function toggleFirstTime() {
  console.log("toggleFirstTime");
  editorVault.set(jsonFirstTime);
  jsonToSend = jsonFirstTime;
  editorVault.expandAll();
  updateInvoiceID();
  document.getElementById("getJSON").disabled = false;
  document.getElementById("getJSON").classList.remove("disabled");
}

function toggleReturning() {
  console.log("toggleReturning");
  editorVault.set(jsonReturning);
  jsonToSend = jsonReturning;
  editorVault.expandAll();
  updateInvoiceID();
}

document.getElementById("getJSON").onclick = function () {
  jsonToSend = editorVault.get();

  // CHECK WHICH SCENARIO IS SELECTED
  if (!document.getElementById("firstTimeOption").checked) {
    custIdToSend = document.querySelector(".customerID").value;
  } else {
    custIdToSend = "";
  }
  console.log("custID ===> " + custIdToSend);

  return fetch(`api/generateTokenVault`, {
    method: "post",
    body: JSON.stringify({
      customerID: custIdToSend,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      console.log(data);
      document.getElementById("requestHeader").innerHTML = prettyPrintObject(data.curlPostValue);
      document.getElementById("requestHeaderResponse").innerHTML = prettyPrintObject(data.data);
      document.getElementById("headers").classList.remove("hidden");

      removePPButtons();

      // // Add script to document
      var scriptElement = document.createElement("script");
      scriptElement.src =
        "https://www.paypal.com/sdk/js?client-id=" +
        encodeURIComponent(clientID) +
        "&currency=" +
        encodeURIComponent(currency) +
        "&enable-funding=paylater&disable-funding=card,bancontact,sepa,giropay,sofort&components=messages,buttons&buyer-country=FR";

      scriptElement.id = "paypalScript";

      if (document.querySelector("#returningOption").checked) {
        // add data-user-id-token to the script
        scriptElement.setAttribute("data-user-id-token", data.data.id_token);
      }

      document.head.appendChild(scriptElement);

      console.log("scriptElement", scriptElement);

      scriptElement.onload = function () {
        console.log("scriptElement", scriptElement);

        paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "pill",
              label: "paypal",
            },

            // Sets up the transaction when a payment button is clicked
            createOrder: function (data, actions) {
              return fetch("/api/orders", {
                method: "post",
                body: JSON.stringify({
                  contentBody: jsonToSend,
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
                  document.querySelector("#orderDataResponse").innerHTML = prettyPrintObject(orderData);
                  return orderData.id;
                });
            },
            // Finalize the transaction after payer approval
            async onApprove(data, actions) {
              console.log("dataOnApprove", data);
              try {
                const response = await fetch(
                  `/api/orders/${data.orderID}/capture`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  }
                );

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
                    orderData?.purchase_units?.[0]?.payments
                      ?.authorizations?.[0];
                  resultMessage(
                    `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`
                  );
                  console.log(
                    "Capture result",
                    orderData,
                    JSON.stringify(orderData, null, 2)
                  );
                  resultMessage(JSON.stringify(orderData, null, 2));
                  if (
                    orderData.payment_source.paypal.hasOwnProperty("attributes")
                  ) {
                    document.querySelector(".customerID").value =
                      orderData.payment_source.paypal.attributes.vault.customer.id;
                    document.querySelector("#returningOption").checked = true;
                    document.getElementById("returningOption").checked = true;
                    document.querySelector(".customerInput").style.display =
                      "flex";
                    removePPButtons();
                    toggleReturning();
                  }
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
      };
    });
};

function resultMessage(message) {
  const container = document.querySelector("#responseCapture");
  document.querySelector(".responses").classList.remove("hidden");
  container.innerHTML = message;
}

function removePPButtons() {
  var e = document.getElementById("paypal-button-container");
  e.innerHTML = "";
}

function updateInvoiceID() {
  var invoiceID = getinvoiceID();
  jsonFirstTime.purchase_units[0].invoice_id = invoiceID;
  jsonReturning.purchase_units[0].invoice_id = invoiceID;
}

function getinvoiceID() {
  var timestp = Date.now();
  var invoiceID = "invoice_test_" + timestp;
  return invoiceID;
}

document.addEventListener("DOMContentLoaded", function () {
  var firstRadio = document.getElementById("firstTimeOption");
  var secondRadio = document.getElementById("returningOption");
  var customerInput = document.querySelector(".customerInput");

  // Display Customer ID
  function showCustomerID() {
    customerInput.style.display = "flex";
  }

  // Hide Customer ID
  function hideCustomerID() {
    customerInput.style.display = "none";
  }

  // Listener for radio boutons
  function handleRadioChange() {
    removePPButtons();
    if (firstRadio.checked) {
      hideCustomerID();
    } else if (secondRadio.checked) {
      showCustomerID();
    }
  }

  firstRadio.addEventListener("change", handleRadioChange);
  secondRadio.addEventListener("change", handleRadioChange);

  handleRadioChange();
});