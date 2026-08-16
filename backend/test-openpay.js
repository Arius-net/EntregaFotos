

async function testOpenPay() {
  const merchantId = 'mktd5c3iik6oeyntnmy5'; // dummy sandbox merchant id
  const privateKey = 'sk_39a1ca0d5403487f89fb73dff4b13a30'; // dummy sandbox private key

  const url = `https://sandbox-api.openpay.mx/v1/${merchantId}/checkouts`;
  const credentials = Buffer.from(privateKey + ':').toString('base64');

  const payload = {
    amount: 100.00,
    description: "Prueba de compra",
    currency: "MXN",
    redirect_url: "http://localhost:3000",
    customer: {
       name: "Juan",
       last_name: "Perez",
       email: "test@example.com",
       phone_number: "5555555555"
    },
    send_email: false,
    expiration_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + "T23:59:00-06:00"
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (error) {
    console.error(error);
  }
}

testOpenPay();
