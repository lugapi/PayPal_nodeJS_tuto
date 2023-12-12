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
              document.querySelector("#response").innerHTML += JSON.stringify(orderData, null, 2);
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
            resultMessage(JSON.stringify(orderData, null, 2));

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
      document.querySelector(".waitForSTC").classList.add("hidden");
      document.querySelector(".stcResultDiv").classList.remove("hidden");
      // document.querySelector(".stcResultDiv pre.stcResultHeader").innerHTML = JSON.stringify(data, null, 2);
      document.querySelector(".stcResultDiv pre.stcResultHeader").innerHTML = "PayPal Debug ID : " + data["paypal-debug-id"]
      // check if data.fullResponse exist
      if (data.error !== undefined && data.error !== null) {
        console.log('data.error ', data.error);
        document.querySelector(".stcResultDiv").innerHTML = JSON.stringify(data.error, null, 2);
        document
          .querySelector(".stcResultDiv pre.stcResultBody")
          .classList.remove("hidden");
      }
      stcProcessCompleted = true;
      return data;
    });
}
