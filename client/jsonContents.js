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
      value: "10000600",
    },
    {
      key: "sender_first_name",
      value: "John",
    },
    {
      key: "sender_country_code",
      value: "US",
    },
    {
      key: "sender_popularity_score",
      value: "low",
    },
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